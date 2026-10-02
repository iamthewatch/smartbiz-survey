package com.smartbiz.survey.survey;

public enum SurveyStatus {
    /** Черновик — можно редактировать, ответы не принимаются */
    DRAFT,
    /** Опубликована — принимает ответы */
    PUBLISHED,
    /** Закрыта — ответы больше не принимаются */
    CLOSED
}
