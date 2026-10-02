package com.smartbiz.survey.lead;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.List;

public final class LeadDtos {

    private LeadDtos() {}

    public record LeadRequest(
            @NotBlank(message = "Укажите имя") @Size(max = 255) String fullName,
            @Email(message = "Некорректный email") @Size(max = 255) String email,
            @Size(max = 64) String phone,
            @Size(max = 255) String company,
            @Size(max = 5000) String note) {}

    public record LeadDto(
            Long id,
            String fullName,
            String email,
            String phone,
            String company,
            String note,
            Lead.Source source,
            OffsetDateTime createdAt,
            long responseCount) {}

    public record LeadInvitation(
            Long id,
            Long surveyId,
            String surveyTitle,
            String token,
            String status,
            OffsetDateTime createdAt,
            OffsetDateTime openedAt,
            OffsetDateTime completedAt) {}

    public record LeadResponseItem(
            Long id,
            Long surveyId,
            String surveyTitle,
            OffsetDateTime submittedAt,
            Integer durationSeconds) {}

    public record LeadDetail(LeadDto lead, List<LeadInvitation> invitations, List<LeadResponseItem> responses) {}

    public record BulkResult(int created) {}
}
