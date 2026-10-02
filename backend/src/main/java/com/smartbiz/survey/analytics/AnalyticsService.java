package com.smartbiz.survey.analytics;

import com.smartbiz.survey.analytics.AnalyticsDtos.*;
import com.smartbiz.survey.common.ApiException;
import com.smartbiz.survey.common.PageResponse;
import com.smartbiz.survey.invitation.Invitation;
import com.smartbiz.survey.invitation.InvitationDtos.LeadBrief;
import com.smartbiz.survey.invitation.InvitationRepository;
import com.smartbiz.survey.lead.Lead;
import com.smartbiz.survey.lead.LeadRepository;
import com.smartbiz.survey.response.Answer;
import com.smartbiz.survey.response.AnswerRepository;
import com.smartbiz.survey.response.SurveyResponse;
import com.smartbiz.survey.response.SurveyResponseRepository;
import com.smartbiz.survey.survey.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private static final int TEXT_ANSWERS_LIMIT = 100;
    private static final int TIMELINE_DAYS = 30;

    private final SurveyRepository surveys;
    private final SurveyResponseRepository responses;
    private final AnswerRepository answers;
    private final InvitationRepository invitations;
    private final LeadRepository leads;

    // ------------------------------------------------------------------ аналитика анкеты

    @Transactional(readOnly = true)
    public SurveyAnalytics surveyAnalytics(Long surveyId, Long leadId) {
        Survey survey = surveys.findWithQuestionsById(surveyId).orElseThrow(() -> ApiException.notFound("Анкета"));
        LeadBrief leadBrief = null;
        if (leadId != null) {
            leadBrief = brief(leads.findById(leadId).orElseThrow(() -> ApiException.notFound("Лид")));
        }

        List<SurveyResponse> resp = responses.findAllForSurvey(surveyId, leadId);
        Map<Long, SurveyResponse> responseById = resp.stream()
                .collect(Collectors.toMap(SurveyResponse::getId, r -> r));
        Map<Long, List<Answer>> byQuestion = answers.findAllForAnalytics(surveyId, leadId).stream()
                .collect(Collectors.groupingBy(a -> a.getQuestion().getId()));

        List<QuestionStat> stats = new ArrayList<>();
        for (Question q : survey.getQuestions()) {
            stats.add(questionStat(q, byQuestion.getOrDefault(q.getId(), List.of()), resp.size(), responseById));
        }

        Totals totals;
        if (leadId == null) {
            long inv = invitations.countBySurveyId(surveyId);
            long opened = invitations.countBySurveyIdAndOpenedAtIsNotNull(surveyId);
            long completed = invitations.countBySurveyIdAndCompletedAtIsNotNull(surveyId);
            totals = new Totals(resp.size(), inv, opened, completed, inv == 0 ? 0 : round1(completed * 100.0 / inv),
                    responses.averageDuration(surveyId, null));
        } else {
            totals = new Totals(resp.size(), 0, 0, 0, 0, responses.averageDuration(surveyId, leadId));
        }

        return new SurveyAnalytics(survey.getId(), survey.getTitle(), survey.getStatus(), leadBrief, totals,
                leadId == null ? timeline(surveyId) : List.of(), stats);
    }

    private QuestionStat questionStat(Question q, List<Answer> list, int totalResponses,
                                      Map<Long, SurveyResponse> responseById) {
        long answered = list.size();
        long skipped = Math.max(0, totalResponses - answered);
        List<OptionStat> options = null;
        long otherCount = 0;
        List<TextAnswer> otherAnswers = null;
        NumericStat numeric = null;
        List<TextAnswer> textAnswers = null;

        if (q.getType().isChoice()) {
            Map<Long, Long> counts = new HashMap<>();
            for (Answer a : list) {
                a.getSelectedOptions().forEach(o -> counts.merge(o.getId(), 1L, Long::sum));
            }
            options = q.getOptions().stream()
                    .map(o -> {
                        long c = counts.getOrDefault(o.getId(), 0L);
                        return new OptionStat(o.getId(), o.getLabel(), c, answered == 0 ? 0 : round1(c * 100.0 / answered));
                    })
                    .toList();
            List<Answer> others = list.stream().filter(a -> a.getOtherText() != null).toList();
            otherCount = others.size();
            otherAnswers = others.stream()
                    .sorted(byNewest())
                    .limit(TEXT_ANSWERS_LIMIT)
                    .map(a -> textAnswer(a, a.getOtherText(), responseById))
                    .toList();
        } else if (q.getType().isNumeric()) {
            numeric = numericStat(q, list);
        } else {
            textAnswers = list.stream()
                    .sorted(byNewest())
                    .limit(TEXT_ANSWERS_LIMIT)
                    .map(a -> textAnswer(a, a.getTextValue(), responseById))
                    .toList();
        }
        return new QuestionStat(q.getId(), q.getPosition(), q.getType(), q.getTitle(), answered, skipped,
                options, otherCount, otherAnswers, numeric, textAnswers);
    }

    private NumericStat numericStat(Question q, List<Answer> list) {
        List<BigDecimal> values = list.stream().map(Answer::getNumberValue).filter(Objects::nonNull).sorted().toList();
        TreeMap<BigDecimal, Long> dist = new TreeMap<>();
        // для шкал показываем все деления, даже если их никто не выбрал — так график честнее
        if ((q.getType() == QuestionType.RATING || q.getType() == QuestionType.SCALE)
                && q.getMinValue() != null && q.getMaxValue() != null) {
            for (int i = q.getMinValue(); i <= q.getMaxValue(); i++) dist.put(BigDecimal.valueOf(i), 0L);
        }
        if (q.getType() == QuestionType.YES_NO) {
            dist.put(BigDecimal.ONE, 0L);
            dist.put(BigDecimal.ZERO, 0L);
        }
        // TreeMap сравнивает через compareTo, поэтому 1.0000 и 1 попадут в одно деление
        for (BigDecimal v : values) dist.merge(normalize(v), 1L, Long::sum);

        List<ValueCount> distribution = dist.entrySet().stream()
                .map(e -> new ValueCount(e.getKey(), e.getValue()))
                .toList();
        if (values.isEmpty()) {
            return new NumericStat(null, null, null, null, distribution, null);
        }
        double avg = values.stream().mapToDouble(BigDecimal::doubleValue).average().orElse(0);
        int n = values.size();
        double median = n % 2 == 1 ? values.get(n / 2).doubleValue()
                : (values.get(n / 2 - 1).doubleValue() + values.get(n / 2).doubleValue()) / 2;

        Double nps = null;
        if (q.getType() == QuestionType.SCALE && Objects.equals(q.getMinValue(), 0) && Objects.equals(q.getMaxValue(), 10)) {
            long promoters = values.stream().filter(v -> v.intValue() >= 9).count();
            long detractors = values.stream().filter(v -> v.intValue() <= 6).count();
            nps = round1((promoters - detractors) * 100.0 / n);
        }
        return new NumericStat(round2(avg), normalize(values.getFirst()), normalize(values.getLast()), round2(median),
                distribution, nps);
    }

    // ------------------------------------------------------------------ список и детали ответов

    @Transactional(readOnly = true)
    public PageResponse<ResponseListItem> responses(Long surveyId, Long leadId, int page, int size) {
        if (!surveys.existsById(surveyId)) throw ApiException.notFound("Анкета");
        Page<SurveyResponse> result = responses.findPage(surveyId, leadId,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), Sort.by(Sort.Direction.DESC, "submittedAt")));
        Map<Long, Long> answeredCounts = new HashMap<>();
        if (!result.isEmpty()) {
            answers.findAllByResponseIds(result.map(SurveyResponse::getId).getContent())
                    .forEach(a -> answeredCounts.merge(a.getResponse().getId(), 1L, Long::sum));
        }
        return PageResponse.of(result, r -> new ResponseListItem(r.getId(), brief(r.getLead()), r.getSubmittedAt(),
                r.getDurationSeconds(), answeredCounts.getOrDefault(r.getId(), 0L).intValue()));
    }

    @Transactional(readOnly = true)
    public ResponseDetail responseDetail(Long responseId) {
        SurveyResponse r = responses.findDetailedById(responseId).orElseThrow(() -> ApiException.notFound("Ответ"));
        Survey survey = surveys.findWithQuestionsById(r.getSurvey().getId()).orElseThrow();
        Map<Long, Answer> byQuestion = r.getAnswers().stream()
                .collect(Collectors.toMap(a -> a.getQuestion().getId(), a -> a, (a, b) -> a));
        List<AnswerView> views = survey.getQuestions().stream()
                .map(q -> answerView(q, byQuestion.get(q.getId())))
                .toList();
        return new ResponseDetail(r.getId(), survey.getId(), survey.getTitle(), brief(r.getLead()), r.getStartedAt(),
                r.getSubmittedAt(), r.getDurationSeconds(), views);
    }

    @Transactional
    public void deleteResponse(Long responseId) {
        SurveyResponse r = responses.findById(responseId).orElseThrow(() -> ApiException.notFound("Ответ"));
        Invitation inv = r.getInvitation();
        if (inv != null) inv.setCompletedAt(null); // лид снова сможет пройти анкету по своей ссылке
        responses.delete(r);
    }

    // ------------------------------------------------------------------ экспорт

    @Transactional(readOnly = true)
    public String exportCsv(Long surveyId) {
        Survey survey = surveys.findWithQuestionsById(surveyId).orElseThrow(() -> ApiException.notFound("Анкета"));
        List<SurveyResponse> resp = responses.findAllForSurvey(surveyId, null);
        Map<Long, Map<Long, Answer>> answersByResponse = new HashMap<>();
        answers.findAllForAnalytics(surveyId, null).forEach(a ->
                answersByResponse.computeIfAbsent(a.getResponse().getId(), k -> new HashMap<>()).put(a.getQuestion().getId(), a));

        StringBuilder sb = new StringBuilder("﻿"); // BOM — чтобы Excel корректно открыл кириллицу
        List<String> header = new ArrayList<>(List.of("ID ответа", "Дата", "Лид", "Email", "Телефон", "Компания", "Длительность, сек"));
        survey.getQuestions().forEach(q -> header.add(q.getTitle()));
        appendRow(sb, header);
        for (SurveyResponse r : resp) {
            Lead l = r.getLead();
            List<String> row = new ArrayList<>();
            row.add(String.valueOf(r.getId()));
            row.add(r.getSubmittedAt().toString());
            row.add(l == null ? "Аноним" : l.getFullName());
            row.add(l == null ? "" : nvl(l.getEmail()));
            row.add(l == null ? "" : nvl(l.getPhone()));
            row.add(l == null ? "" : nvl(l.getCompany()));
            row.add(r.getDurationSeconds() == null ? "" : String.valueOf(r.getDurationSeconds()));
            Map<Long, Answer> ans = answersByResponse.getOrDefault(r.getId(), Map.of());
            for (Question q : survey.getQuestions()) {
                row.add(answerView(q, ans.get(q.getId())).display());
            }
            appendRow(sb, row);
        }
        return sb.toString();
    }

    // ------------------------------------------------------------------ дашборд

    @Transactional(readOnly = true)
    public Dashboard dashboard() {
        long totalSurveys = surveys.count();
        long published = surveys.countByStatus(SurveyStatus.PUBLISHED);
        long drafts = surveys.countByStatus(SurveyStatus.DRAFT);
        long inv = invitations.count();
        long completed = invitations.countByCompletedAtIsNotNull();

        Map<Long, Long> perSurvey = new HashMap<>();
        responses.countPerSurvey().forEach(row -> perSurvey.put((Long) row[0], ((Number) row[1]).longValue()));
        List<TopSurvey> top = surveys.findAllById(perSurvey.keySet()).stream()
                .map(s -> new TopSurvey(s.getId(), s.getTitle(), s.getStatus(), perSurvey.get(s.getId())))
                .sorted(Comparator.comparingLong(TopSurvey::responses).reversed())
                .limit(5)
                .toList();

        List<RecentResponse> recent = responses.findTop8ByOrderBySubmittedAtDesc().stream()
                .map(r -> new RecentResponse(r.getId(), r.getSurvey().getId(), r.getSurvey().getTitle(),
                        r.getLead() == null ? null : r.getLead().getFullName(), r.getSubmittedAt()))
                .toList();

        return new Dashboard(totalSurveys, published, drafts, leads.count(), responses.count(),
                responses.countBySubmittedAtAfter(OffsetDateTime.now().minusDays(7)), inv,
                inv == 0 ? 0 : round1(completed * 100.0 / inv), timeline(null), recent, top);
    }

    // ------------------------------------------------------------------ helpers

    private List<DayCount> timeline(Long surveyId) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate from = today.minusDays(TIMELINE_DAYS - 1);
        Map<LocalDate, Long> counts = new HashMap<>();
        for (Object[] row : responses.dailyCounts(from.atStartOfDay().atOffset(ZoneOffset.UTC), surveyId)) {
            LocalDate d = row[0] instanceof Date sql ? sql.toLocalDate() : (LocalDate) row[0];
            counts.put(d, ((Number) row[1]).longValue());
        }
        List<DayCount> result = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(today); d = d.plusDays(1)) {
            result.add(new DayCount(d, counts.getOrDefault(d, 0L)));
        }
        return result;
    }

    private AnswerView answerView(Question q, Answer a) {
        if (a == null) {
            return new AnswerView(q.getId(), q.getPosition(), q.getType(), q.getTitle(), false, List.of(), null, null,
                    null, q.getMaxValue(), "");
        }
        List<String> selected = q.getOptions().stream()
                .filter(o -> a.getSelectedOptions().stream().anyMatch(s -> s.getId().equals(o.getId())))
                .map(QuestionOption::getLabel)
                .toList();
        String display;
        if (q.getType().isChoice()) {
            List<String> parts = new ArrayList<>(selected);
            if (a.getOtherText() != null) parts.add("Другое: " + a.getOtherText());
            display = String.join("; ", parts);
        } else if (q.getType() == QuestionType.YES_NO) {
            display = a.getNumberValue() == null ? "" : (a.getNumberValue().compareTo(BigDecimal.ONE) == 0 ? "Да" : "Нет");
        } else if (q.getType().isNumeric()) {
            display = a.getNumberValue() == null ? "" : normalize(a.getNumberValue()).toPlainString();
        } else {
            display = nvl(a.getTextValue());
        }
        return new AnswerView(q.getId(), q.getPosition(), q.getType(), q.getTitle(), true, selected, a.getOtherText(),
                a.getTextValue(), a.getNumberValue() == null ? null : normalize(a.getNumberValue()), q.getMaxValue(), display);
    }

    private TextAnswer textAnswer(Answer a, String text, Map<Long, SurveyResponse> responseById) {
        SurveyResponse r = responseById.get(a.getResponse().getId());
        String leadName = r != null && r.getLead() != null ? r.getLead().getFullName() : null;
        return new TextAnswer(a.getResponse().getId(), leadName, text, a.getResponse().getSubmittedAt());
    }

    private static Comparator<Answer> byNewest() {
        return Comparator.comparing((Answer a) -> a.getResponse().getSubmittedAt()).reversed();
    }

    static LeadBrief brief(Lead l) {
        return l == null ? null : new LeadBrief(l.getId(), l.getFullName(), l.getEmail(), l.getPhone(), l.getCompany());
    }

    private static BigDecimal normalize(BigDecimal v) {
        BigDecimal s = v.stripTrailingZeros();
        return s.scale() < 0 ? s.setScale(0) : s;
    }

    private static void appendRow(StringBuilder sb, List<String> cells) {
        sb.append(cells.stream().map(AnalyticsService::csv).collect(Collectors.joining(";"))).append("\r\n");
    }

    private static String csv(String v) {
        if (v == null) return "";
        // защита от CSV-инъекций формул в Excel
        // (телефоны и числа вида +7 701 ... не трогаем)
        if (!v.isEmpty() && "=+-@".indexOf(v.charAt(0)) >= 0 && !v.matches("^[+-][\\d\\s().\\-]+$")) v = "'" + v;
        if (v.contains(";") || v.contains("\"") || v.contains("\n") || v.contains("\r")) {
            return "\"" + v.replace("\"", "\"\"") + "\"";
        }
        return v;
    }

    private static String nvl(String s) {
        return s == null ? "" : s;
    }

    private static double round1(double v) {
        return Math.round(v * 10) / 10.0;
    }

    private static double round2(double v) {
        return Math.round(v * 100) / 100.0;
    }
}
