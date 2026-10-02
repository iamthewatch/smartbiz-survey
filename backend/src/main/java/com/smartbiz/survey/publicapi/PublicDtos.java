package com.smartbiz.survey.publicapi;

import com.smartbiz.survey.survey.SurveyDtos.QuestionDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public final class PublicDtos {

    private PublicDtos() {}

    public record PublicSurvey(
            String title,
            String description,
            String accentColor,
            String welcomeMessage,
            String thankYouMessage,
            boolean collectContact,
            boolean oneQuestionPerPage,
            String respondentName,
            List<QuestionDto> questions) {}

    public record AnswerInput(
            @NotNull Long questionId,
            @Size(max = 100) List<Long> optionIds,
            @Size(max = 2000, message = "Слишком длинный ответ") String otherText,
            @Size(max = 10000, message = "Слишком длинный ответ") String textValue,
            BigDecimal numberValue) {}

    public record ContactInput(
            @Size(max = 255) String fullName,
            @Email(message = "Некорректный email") @Size(max = 255) String email,
            @Size(max = 64) String phone) {}

    public record SubmitRequest(
            OffsetDateTime startedAt,
            @Valid ContactInput contact,
            @NotNull @Size(max = 500) List<@Valid AnswerInput> answers) {}

    public record SubmitResult(Long responseId, String thankYouMessage) {}
}
