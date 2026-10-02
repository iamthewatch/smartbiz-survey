package com.smartbiz.survey.survey;

public enum QuestionType {
    /** Короткий текстовый ответ */
    SHORT_TEXT,
    /** Развёрнутый текстовый ответ */
    LONG_TEXT,
    /** Один вариант из списка (радиокнопки) */
    SINGLE_CHOICE,
    /** Несколько вариантов из списка (чекбоксы) */
    MULTIPLE_CHOICE,
    /** Один вариант из выпадающего списка */
    DROPDOWN,
    /** Оценка звёздами 1..N */
    RATING,
    /** Шкала min..max (например NPS 0..10) */
    SCALE,
    /** Да / Нет */
    YES_NO,
    /** Число */
    NUMBER,
    /** Дата */
    DATE,
    /** Email */
    EMAIL,
    /** Телефон */
    PHONE;

    public boolean isChoice() {
        return this == SINGLE_CHOICE || this == MULTIPLE_CHOICE || this == DROPDOWN;
    }

    public boolean isNumeric() {
        return this == RATING || this == SCALE || this == NUMBER || this == YES_NO;
    }

    public boolean isText() {
        return this == SHORT_TEXT || this == LONG_TEXT || this == DATE || this == EMAIL || this == PHONE;
    }

    public boolean hasRange() {
        return this == RATING || this == SCALE || this == NUMBER;
    }
}
