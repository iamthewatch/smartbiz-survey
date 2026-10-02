package com.smartbiz.survey.response;

import com.smartbiz.survey.common.ApiException;
import com.smartbiz.survey.publicapi.PublicDtos.AnswerInput;
import com.smartbiz.survey.survey.Question;
import com.smartbiz.survey.survey.QuestionOption;
import com.smartbiz.survey.survey.QuestionType;
import com.smartbiz.survey.survey.Survey;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Проверяет ответы респондента против структуры анкеты и превращает их в сущности {@link Answer}.
 * Ошибки возвращаются по ключу "q_{questionId}", чтобы фронт мог подсветить нужный вопрос.
 */
@Component
public class AnswerValidator {

    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final int SHORT_TEXT_MAX = 1000;

    public List<Answer> validateAndBuild(Survey survey, List<AnswerInput> inputs) {
        Map<Long, AnswerInput> byQuestion = new HashMap<>();
        Map<Long, Question> questions = survey.getQuestions().stream()
                .collect(Collectors.toMap(Question::getId, Function.identity()));
        for (AnswerInput in : inputs) {
            if (!questions.containsKey(in.questionId())) {
                throw ApiException.badRequest("Анкета была изменена. Обновите страницу и попробуйте снова.");
            }
            byQuestion.put(in.questionId(), in);
        }

        Map<String, String> errors = new LinkedHashMap<>();
        List<Answer> answers = new ArrayList<>();
        for (Question q : survey.getQuestions()) {
            AnswerInput in = byQuestion.get(q.getId());
            String key = "q_" + q.getId();
            if (isEmpty(q.getType(), in)) {
                if (q.isRequired()) errors.put(key, "Это обязательный вопрос");
                continue;
            }
            try {
                answers.add(build(q, in));
            } catch (InvalidAnswer e) {
                errors.put(key, e.getMessage());
            }
        }
        if (!errors.isEmpty()) throw ApiException.validation(errors);
        return answers;
    }

    private Answer build(Question q, AnswerInput in) {
        Answer a = new Answer();
        a.setQuestion(q);
        QuestionType type = q.getType();

        if (type.isChoice()) {
            Map<Long, QuestionOption> options = q.getOptions().stream()
                    .collect(Collectors.toMap(QuestionOption::getId, Function.identity()));
            Set<Long> selected = new LinkedHashSet<>(in.optionIds() == null ? List.of() : in.optionIds());
            for (Long id : selected) {
                QuestionOption o = options.get(id);
                if (o == null) throw new InvalidAnswer("Выбран несуществующий вариант. Обновите страницу.");
                a.getSelectedOptions().add(o);
            }
            String other = trimToNull(in.otherText());
            if (other != null && !q.isAllowOther()) throw new InvalidAnswer("Свой вариант ответа здесь не предусмотрен");
            a.setOtherText(other);
            int total = selected.size() + (other != null ? 1 : 0);
            if (type != QuestionType.MULTIPLE_CHOICE && total > 1) {
                throw new InvalidAnswer("Выберите только один вариант");
            }
            if (type == QuestionType.MULTIPLE_CHOICE) {
                if (q.getMinSelections() != null && total < q.getMinSelections()) {
                    throw new InvalidAnswer("Выберите минимум " + q.getMinSelections());
                }
                if (q.getMaxSelections() != null && total > q.getMaxSelections()) {
                    throw new InvalidAnswer("Можно выбрать не более " + q.getMaxSelections());
                }
            }
            return a;
        }

        if (type.isNumeric()) {
            BigDecimal v = in.numberValue();
            switch (type) {
                case YES_NO -> {
                    if (v.compareTo(BigDecimal.ZERO) != 0 && v.compareTo(BigDecimal.ONE) != 0) {
                        throw new InvalidAnswer("Ответьте «Да» или «Нет»");
                    }
                }
                case RATING, SCALE -> {
                    if (v.stripTrailingZeros().scale() > 0) throw new InvalidAnswer("Выберите значение на шкале");
                    checkRange(q, v);
                }
                case NUMBER -> {
                    if (v.abs().compareTo(new BigDecimal("1000000000000")) > 0) throw new InvalidAnswer("Слишком большое число");
                    checkRange(q, v);
                }
                default -> { }
            }
            a.setNumberValue(v);
            return a;
        }

        String text = in.textValue().trim();
        switch (type) {
            case SHORT_TEXT -> {
                if (text.length() > SHORT_TEXT_MAX) throw new InvalidAnswer("Не более " + SHORT_TEXT_MAX + " символов");
            }
            case EMAIL -> {
                if (!EMAIL.matcher(text).matches()) throw new InvalidAnswer("Введите корректный email");
            }
            case PHONE -> {
                String digits = text.replaceAll("\\D", "");
                if (digits.length() < 7 || digits.length() > 15 || !text.matches("^[+\\d\\s()\\-]+$")) {
                    throw new InvalidAnswer("Введите корректный номер телефона");
                }
            }
            case DATE -> {
                try {
                    LocalDate.parse(text);
                } catch (DateTimeParseException e) {
                    throw new InvalidAnswer("Введите корректную дату");
                }
            }
            default -> { }
        }
        a.setTextValue(text);
        return a;
    }

    private void checkRange(Question q, BigDecimal v) {
        if (q.getMinValue() != null && v.compareTo(BigDecimal.valueOf(q.getMinValue())) < 0) {
            throw new InvalidAnswer("Значение должно быть не меньше " + q.getMinValue());
        }
        if (q.getMaxValue() != null && v.compareTo(BigDecimal.valueOf(q.getMaxValue())) > 0) {
            throw new InvalidAnswer("Значение должно быть не больше " + q.getMaxValue());
        }
    }

    private static boolean isEmpty(QuestionType type, AnswerInput in) {
        if (in == null) return true;
        if (type.isChoice()) {
            return (in.optionIds() == null || in.optionIds().isEmpty()) && trimToNull(in.otherText()) == null;
        }
        if (type.isNumeric()) return in.numberValue() == null;
        return trimToNull(in.textValue()) == null;
    }

    private static String trimToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static class InvalidAnswer extends RuntimeException {
        InvalidAnswer(String message) {
            super(message, null, false, false);
        }
    }
}
