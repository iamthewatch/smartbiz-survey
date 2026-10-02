package com.smartbiz.survey.survey;

import com.smartbiz.survey.survey.SurveyDtos.TemplateInfo;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Готовые шаблоны анкет, чтобы администратор мог начать не с чистого листа.
 */
public final class SurveyTemplates {

    private record Q(QuestionType type, String title, boolean required, boolean allowOther,
                     Integer min, Integer max, String minLabel, String maxLabel, List<String> options) {}

    private record T(String title, String description, String welcome, List<Q> questions) {}

    private static final Map<String, T> TEMPLATES = new LinkedHashMap<>();

    static {
        TEMPLATES.put("blank", new T("Новая анкета", null, null, List.of()));

        TEMPLATES.put("lead-qualification", new T(
                "Квалификация лида",
                "Помогите нам лучше понять ваши задачи — это займёт 2 минуты.",
                "Здравствуйте! Ответьте на несколько вопросов, чтобы мы подготовили для вас лучшее предложение.",
                List.of(
                        new Q(QuestionType.SINGLE_CHOICE, "Какой размер вашей компании?", true, false, null, null, null, null,
                                List.of("1–10 сотрудников", "11–50 сотрудников", "51–200 сотрудников", "Более 200")),
                        new Q(QuestionType.MULTIPLE_CHOICE, "Какие задачи вы хотите решить?", true, true, null, null, null, null,
                                List.of("Увеличить продажи", "Автоматизировать процессы", "Снизить расходы", "Улучшить сервис")),
                        new Q(QuestionType.DROPDOWN, "Планируемый бюджет", false, false, null, null, null, null,
                                List.of("До 100 000 ₸", "100 000 – 500 000 ₸", "500 000 – 2 000 000 ₸", "Более 2 000 000 ₸")),
                        new Q(QuestionType.SINGLE_CHOICE, "Когда планируете начать?", true, false, null, null, null, null,
                                List.of("В течение месяца", "В течение квартала", "Через полгода и позже", "Пока изучаю рынок")),
                        new Q(QuestionType.PHONE, "Ваш номер телефона для связи", false, false, null, null, null, null, List.of()),
                        new Q(QuestionType.LONG_TEXT, "Что ещё нам важно знать?", false, false, null, null, null, null, List.of())
                )));

        TEMPLATES.put("nps", new T(
                "Индекс лояльности (NPS)",
                "Короткий опрос о вашем опыте работы с нами.",
                null,
                List.of(
                        new Q(QuestionType.SCALE, "Насколько вероятно, что вы порекомендуете нас друзьям или коллегам?", true, false,
                                0, 10, "Точно нет", "Обязательно", List.of()),
                        new Q(QuestionType.MULTIPLE_CHOICE, "Что вам нравится больше всего?", false, true, null, null, null, null,
                                List.of("Качество", "Скорость", "Цена", "Поддержка")),
                        new Q(QuestionType.LONG_TEXT, "Что нам стоит улучшить?", false, false, null, null, null, null, List.of())
                )));

        TEMPLATES.put("feedback", new T(
                "Обратная связь клиента",
                "Расскажите, как прошло ваше взаимодействие с нами.",
                null,
                List.of(
                        new Q(QuestionType.RATING, "Оцените качество обслуживания", true, false, 1, 5, null, null, List.of()),
                        new Q(QuestionType.YES_NO, "Решили ли мы вашу задачу?", true, false, null, null, null, null, List.of()),
                        new Q(QuestionType.SINGLE_CHOICE, "Как вы о нас узнали?", false, true, null, null, null, null,
                                List.of("Instagram", "Рекомендация знакомых", "Поиск в интернете", "Реклама")),
                        new Q(QuestionType.SHORT_TEXT, "Одним словом — какие у вас впечатления?", false, false, null, null, null, null, List.of())
                )));
    }

    private SurveyTemplates() {}

    public static List<TemplateInfo> list() {
        List<TemplateInfo> result = new ArrayList<>();
        TEMPLATES.forEach((key, t) -> result.add(new TemplateInfo(key, t.title(), t.description(), t.questions().size())));
        return result;
    }

    /** Заполняет анкету содержимым шаблона. Возвращает false, если шаблон не найден. */
    public static boolean apply(String key, Survey survey) {
        T t = TEMPLATES.get(key == null ? "blank" : key);
        if (t == null) return false;
        if (survey.getTitle() == null || survey.getTitle().isBlank()) survey.setTitle(t.title());
        survey.setDescription(t.description());
        survey.setWelcomeMessage(t.welcome());
        int pos = 0;
        for (Q tq : t.questions()) {
            Question q = new Question();
            q.setSurvey(survey);
            q.setPosition(pos++);
            q.setType(tq.type());
            q.setTitle(tq.title());
            q.setRequired(tq.required());
            q.setAllowOther(tq.allowOther());
            q.setMinValue(tq.min());
            q.setMaxValue(tq.max());
            q.setMinLabel(tq.minLabel());
            q.setMaxLabel(tq.maxLabel());
            int op = 0;
            for (String label : tq.options()) {
                QuestionOption o = new QuestionOption();
                o.setQuestion(q);
                o.setPosition(op++);
                o.setLabel(label);
                q.getOptions().add(o);
            }
            survey.getQuestions().add(q);
        }
        return true;
    }
}
