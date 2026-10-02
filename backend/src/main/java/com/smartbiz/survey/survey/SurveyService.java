package com.smartbiz.survey.survey;

import com.smartbiz.survey.common.ApiException;
import com.smartbiz.survey.common.TokenGenerator;
import com.smartbiz.survey.invitation.InvitationRepository;
import com.smartbiz.survey.response.SurveyResponseRepository;
import com.smartbiz.survey.survey.SurveyDtos.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SurveyService {

    private static final String DEFAULT_ACCENT = "#C65A1E";

    private final SurveyRepository surveys;
    private final SurveyResponseRepository responses;
    private final InvitationRepository invitations;

    // ---------------------------------------------------------------- queries

    @Transactional(readOnly = true)
    public List<SurveySummary> list(SurveyStatus status, String query) {
        Map<Long, Long> questionCounts = toCountMap(surveys.countQuestionsPerSurvey());
        Map<Long, Long> responseCounts = toCountMap(responses.countPerSurvey());
        Map<Long, Long> invitationCounts = toCountMap(invitations.countPerSurvey());
        String q = query == null ? null : query.trim().toLowerCase(Locale.ROOT);

        return surveys.findAllByOrderByUpdatedAtDesc().stream()
                .filter(s -> status == null || s.getStatus() == status)
                .filter(s -> q == null || q.isEmpty() || s.getTitle().toLowerCase(Locale.ROOT).contains(q))
                .map(s -> new SurveySummary(s.getId(), s.getTitle(), s.getDescription(), s.getStatus(), s.getSlug(),
                        s.getAccentColor(), s.isPublicLinkEnabled(),
                        questionCounts.getOrDefault(s.getId(), 0L),
                        responseCounts.getOrDefault(s.getId(), 0L),
                        invitationCounts.getOrDefault(s.getId(), 0L),
                        s.getCreatedAt(), s.getUpdatedAt(), s.getPublishedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public SurveyDetail get(Long id) {
        Survey s = load(id);
        return SurveyMapper.toDetail(s, responses.countBySurveyId(id));
    }

    public List<TemplateInfo> templates() {
        return SurveyTemplates.list();
    }

    // ---------------------------------------------------------------- commands

    @Transactional
    public SurveyDetail create(CreateSurveyRequest req) {
        Survey s = new Survey();
        s.setTitle(req == null || req.title() == null || req.title().isBlank() ? null : req.title().trim());
        s.setSlug(uniqueSlug());
        s.setAccentColor(DEFAULT_ACCENT);
        s.setThankYouMessage("Спасибо! Ваши ответы успешно отправлены.");
        if (!SurveyTemplates.apply(req == null ? null : req.template(), s)) {
            throw ApiException.badRequest("Неизвестный шаблон анкеты");
        }
        surveys.save(s);
        return SurveyMapper.toDetail(s, 0);
    }

    /**
     * Сохраняет анкету целиком: метаданные + упорядоченный список вопросов и вариантов.
     * Вопросы/варианты с id обновляются, без id — создаются, отсутствующие в запросе — удаляются.
     * Благодаря этому id остаются стабильными и уже собранные ответы не теряются.
     */
    @Transactional
    public SurveyDetail update(Long id, UpdateSurveyRequest req) {
        Survey s = load(id);
        if (req.version() != null && req.version() != s.getVersion()) {
            throw ApiException.conflict("CONCURRENT_MODIFICATION",
                    "Анкета была изменена в другой вкладке. Обновите страницу, чтобы не потерять изменения.");
        }
        s.setTitle(req.title().trim());
        s.setDescription(blankToNull(req.description()));
        s.setAccentColor(req.accentColor() == null ? DEFAULT_ACCENT : req.accentColor());
        s.setWelcomeMessage(blankToNull(req.welcomeMessage()));
        s.setThankYouMessage(blankToNull(req.thankYouMessage()));
        s.setPublicLinkEnabled(req.publicLinkEnabled());
        s.setCollectContact(req.collectContact());
        s.setOneQuestionPerPage(req.oneQuestionPerPage());
        s.setUpdatedAt(OffsetDateTime.now());

        mergeQuestions(s, req.questions());

        // опубликованная анкета должна всегда оставаться корректной
        if (s.getStatus() == SurveyStatus.PUBLISHED) {
            validateForPublish(s);
        }
        surveys.saveAndFlush(s);
        return SurveyMapper.toDetail(s, responses.countBySurveyId(id));
    }

    @Transactional
    public SurveyDetail publish(Long id) {
        Survey s = load(id);
        validateForPublish(s);
        s.setStatus(SurveyStatus.PUBLISHED);
        if (s.getPublishedAt() == null) s.setPublishedAt(OffsetDateTime.now());
        s.setClosedAt(null);
        s.setUpdatedAt(OffsetDateTime.now());
        surveys.saveAndFlush(s);
        return SurveyMapper.toDetail(s, responses.countBySurveyId(id));
    }

    @Transactional
    public SurveyDetail close(Long id) {
        Survey s = load(id);
        if (s.getStatus() != SurveyStatus.PUBLISHED) {
            throw ApiException.conflict("INVALID_STATUS", "Закрыть можно только опубликованную анкету");
        }
        s.setStatus(SurveyStatus.CLOSED);
        s.setClosedAt(OffsetDateTime.now());
        s.setUpdatedAt(OffsetDateTime.now());
        surveys.saveAndFlush(s);
        return SurveyMapper.toDetail(s, responses.countBySurveyId(id));
    }

    @Transactional
    public SurveyDetail toDraft(Long id) {
        Survey s = load(id);
        s.setStatus(SurveyStatus.DRAFT);
        s.setUpdatedAt(OffsetDateTime.now());
        surveys.saveAndFlush(s);
        return SurveyMapper.toDetail(s, responses.countBySurveyId(id));
    }

    @Transactional
    public SurveyDetail duplicate(Long id) {
        Survey src = load(id);
        Survey copy = new Survey();
        copy.setTitle(truncate(src.getTitle() + " (копия)", 255));
        copy.setDescription(src.getDescription());
        copy.setSlug(uniqueSlug());
        copy.setAccentColor(src.getAccentColor());
        copy.setWelcomeMessage(src.getWelcomeMessage());
        copy.setThankYouMessage(src.getThankYouMessage());
        copy.setPublicLinkEnabled(src.isPublicLinkEnabled());
        copy.setCollectContact(src.isCollectContact());
        copy.setOneQuestionPerPage(src.isOneQuestionPerPage());
        for (Question sq : src.getQuestions()) {
            Question q = new Question();
            q.setSurvey(copy);
            q.setPosition(sq.getPosition());
            q.setType(sq.getType());
            q.setTitle(sq.getTitle());
            q.setDescription(sq.getDescription());
            q.setRequired(sq.isRequired());
            q.setAllowOther(sq.isAllowOther());
            q.setPlaceholder(sq.getPlaceholder());
            q.setMinValue(sq.getMinValue());
            q.setMaxValue(sq.getMaxValue());
            q.setMinLabel(sq.getMinLabel());
            q.setMaxLabel(sq.getMaxLabel());
            q.setMinSelections(sq.getMinSelections());
            q.setMaxSelections(sq.getMaxSelections());
            for (QuestionOption so : sq.getOptions()) {
                QuestionOption o = new QuestionOption();
                o.setQuestion(q);
                o.setPosition(so.getPosition());
                o.setLabel(so.getLabel());
                q.getOptions().add(o);
            }
            copy.getQuestions().add(q);
        }
        surveys.save(copy);
        return SurveyMapper.toDetail(copy, 0);
    }

    @Transactional
    public void delete(Long id) {
        Survey s = surveys.findById(id).orElseThrow(() -> ApiException.notFound("Анкета"));
        surveys.delete(s);
    }

    // ---------------------------------------------------------------- internals

    Survey load(Long id) {
        return surveys.findWithQuestionsById(id).orElseThrow(() -> ApiException.notFound("Анкета"));
    }

    private void mergeQuestions(Survey s, List<QuestionUpsert> incoming) {
        Map<Long, Question> existing = s.getQuestions().stream()
                .collect(Collectors.toMap(Question::getId, Function.identity()));
        List<Question> ordered = new ArrayList<>(incoming.size());
        int position = 0;
        for (QuestionUpsert qr : incoming) {
            Question q = qr.id() == null ? null : existing.remove(qr.id());
            if (q == null) {
                q = new Question();
                q.setSurvey(s);
            }
            applyQuestion(q, qr, position++);
            ordered.add(q);
        }
        // всё, что осталось в existing, удалится через orphanRemoval
        s.getQuestions().clear();
        s.getQuestions().addAll(ordered);
    }

    private void applyQuestion(Question q, QuestionUpsert r, int position) {
        QuestionType type = r.type();
        q.setPosition(position);
        q.setType(type);
        q.setTitle(r.title().trim());
        q.setDescription(blankToNull(r.description()));
        q.setRequired(r.required());
        q.setPlaceholder(blankToNull(r.placeholder()));
        q.setAllowOther(type.isChoice() && r.allowOther());

        if (type.hasRange()) {
            Integer min = r.minValue();
            Integer max = r.maxValue();
            if (type == QuestionType.RATING) {
                min = 1;
                max = clamp(max == null ? 5 : max, 3, 10);
            } else if (type == QuestionType.SCALE) {
                min = clamp(min == null ? 0 : min, 0, 1);
                max = clamp(max == null ? 10 : max, min + 2, 10);
            }
            q.setMinValue(min);
            q.setMaxValue(max);
            q.setMinLabel(type == QuestionType.NUMBER ? null : blankToNull(r.minLabel()));
            q.setMaxLabel(type == QuestionType.NUMBER ? null : blankToNull(r.maxLabel()));
        } else {
            q.setMinValue(null);
            q.setMaxValue(null);
            q.setMinLabel(null);
            q.setMaxLabel(null);
        }

        if (type == QuestionType.MULTIPLE_CHOICE) {
            q.setMinSelections(r.minSelections() == null || r.minSelections() == 0 ? null : r.minSelections());
            q.setMaxSelections(r.maxSelections() == null || r.maxSelections() == 0 ? null : r.maxSelections());
        } else {
            q.setMinSelections(null);
            q.setMaxSelections(null);
        }

        if (type.isChoice()) {
            mergeOptions(q, r.options() == null ? List.of() : r.options());
        } else {
            q.getOptions().clear();
        }
    }

    private void mergeOptions(Question q, List<OptionUpsert> incoming) {
        Map<Long, QuestionOption> existing = q.getOptions().stream()
                .collect(Collectors.toMap(QuestionOption::getId, Function.identity()));
        List<QuestionOption> ordered = new ArrayList<>(incoming.size());
        int position = 0;
        for (OptionUpsert or : incoming) {
            QuestionOption o = or.id() == null ? null : existing.remove(or.id());
            if (o == null) {
                o = new QuestionOption();
                o.setQuestion(q);
            }
            o.setPosition(position++);
            o.setLabel(or.label().trim());
            ordered.add(o);
        }
        q.getOptions().clear();
        q.getOptions().addAll(ordered);
    }

    /** Строгая проверка перед публикацией: ошибки возвращаются по ключам вида questions[2].options */
    private void validateForPublish(Survey s) {
        Map<String, String> errors = new LinkedHashMap<>();
        if (s.getTitle() == null || s.getTitle().isBlank()) {
            errors.put("title", "Укажите название анкеты");
        }
        if (s.getQuestions().isEmpty()) {
            errors.put("questions", "Добавьте хотя бы один вопрос");
        }
        for (int i = 0; i < s.getQuestions().size(); i++) {
            Question q = s.getQuestions().get(i);
            String key = "questions[" + i + "]";
            if (q.getTitle() == null || q.getTitle().isBlank()) {
                errors.put(key + ".title", "Вопрос №" + (i + 1) + ": укажите текст вопроса");
            }
            if (q.getType().isChoice()) {
                long filled = q.getOptions().stream().filter(o -> !o.getLabel().isBlank()).count();
                if (filled != q.getOptions().size()) {
                    errors.put(key + ".options", "Вопрос №" + (i + 1) + ": есть пустые варианты ответа");
                } else if (filled + (q.isAllowOther() ? 1 : 0) < 2) {
                    errors.put(key + ".options", "Вопрос №" + (i + 1) + ": нужно минимум 2 варианта ответа");
                } else {
                    Set<String> unique = new HashSet<>();
                    boolean dup = q.getOptions().stream()
                            .anyMatch(o -> !unique.add(o.getLabel().trim().toLowerCase(Locale.ROOT)));
                    if (dup) errors.put(key + ".options", "Вопрос №" + (i + 1) + ": варианты ответа повторяются");
                }
            }
            if (q.getType() == QuestionType.MULTIPLE_CHOICE && q.getMinSelections() != null && q.getMaxSelections() != null
                    && q.getMinSelections() > q.getMaxSelections()) {
                errors.put(key + ".selections", "Вопрос №" + (i + 1) + ": минимум выбранных больше максимума");
            }
            if (q.getType() == QuestionType.NUMBER && q.getMinValue() != null && q.getMaxValue() != null
                    && q.getMinValue() > q.getMaxValue()) {
                errors.put(key + ".range", "Вопрос №" + (i + 1) + ": минимальное значение больше максимального");
            }
        }
        if (!errors.isEmpty()) {
            throw ApiException.validation(errors);
        }
    }

    private String uniqueSlug() {
        for (int i = 0; i < 10; i++) {
            String slug = TokenGenerator.generate(10);
            if (!surveys.existsBySlug(slug)) return slug;
        }
        throw new IllegalStateException("Не удалось сгенерировать уникальную ссылку");
    }

    static Map<Long, Long> toCountMap(List<Object[]> rows) {
        Map<Long, Long> map = new HashMap<>();
        for (Object[] row : rows) map.put((Long) row[0], ((Number) row[1]).longValue());
        return map;
    }

    private static int clamp(int v, int min, int max) {
        return Math.max(min, Math.min(max, v));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max);
    }
}
