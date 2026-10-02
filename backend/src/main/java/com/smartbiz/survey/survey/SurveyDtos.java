package com.smartbiz.survey.survey;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.time.OffsetDateTime;
import java.util.List;

public final class SurveyDtos {

    private SurveyDtos() {}

    public record OptionDto(Long id, String label) {}

    public record QuestionDto(
            Long id,
            QuestionType type,
            String title,
            String description,
            boolean required,
            boolean allowOther,
            String placeholder,
            Integer minValue,
            Integer maxValue,
            String minLabel,
            String maxLabel,
            Integer minSelections,
            Integer maxSelections,
            List<OptionDto> options) {}

    public record SurveySummary(
            Long id,
            String title,
            String description,
            SurveyStatus status,
            String slug,
            String accentColor,
            boolean publicLinkEnabled,
            long questionCount,
            long responseCount,
            long invitationCount,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            OffsetDateTime publishedAt) {}

    public record SurveyDetail(
            Long id,
            String title,
            String description,
            SurveyStatus status,
            String slug,
            String accentColor,
            String welcomeMessage,
            String thankYouMessage,
            boolean publicLinkEnabled,
            boolean collectContact,
            boolean oneQuestionPerPage,
            long version,
            long responseCount,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            OffsetDateTime publishedAt,
            OffsetDateTime closedAt,
            List<QuestionDto> questions) {}

    public record CreateSurveyRequest(
            @Size(max = 255, message = "Название не длиннее 255 символов") String title,
            String template) {}

    public record OptionUpsert(
            Long id,
            @NotNull(message = "Укажите текст варианта") @Size(max = 500, message = "Вариант не длиннее 500 символов") String label) {}

    public record QuestionUpsert(
            Long id,
            @NotNull(message = "Укажите тип вопроса") QuestionType type,
            @NotNull @Size(max = 1000, message = "Вопрос не длиннее 1000 символов") String title,
            @Size(max = 5000) String description,
            boolean required,
            boolean allowOther,
            @Size(max = 255) String placeholder,
            @Min(-1_000_000) @Max(1_000_000) Integer minValue,
            @Min(-1_000_000) @Max(1_000_000) Integer maxValue,
            @Size(max = 128) String minLabel,
            @Size(max = 128) String maxLabel,
            @Min(0) Integer minSelections,
            @Min(0) Integer maxSelections,
            @Size(max = 100, message = "Не более 100 вариантов") List<@Valid OptionUpsert> options) {}

    public record UpdateSurveyRequest(
            @NotBlank(message = "Укажите название анкеты") @Size(max = 255) String title,
            @Size(max = 5000) String description,
            @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "Цвет в формате #RRGGBB") String accentColor,
            @Size(max = 5000) String welcomeMessage,
            @Size(max = 5000) String thankYouMessage,
            boolean publicLinkEnabled,
            boolean collectContact,
            boolean oneQuestionPerPage,
            Long version,
            @NotNull @Size(max = 200, message = "Не более 200 вопросов") List<@Valid QuestionUpsert> questions) {}

    public record TemplateInfo(String key, String title, String description, int questionCount) {}
}
