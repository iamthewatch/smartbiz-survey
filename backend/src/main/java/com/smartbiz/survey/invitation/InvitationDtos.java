package com.smartbiz.survey.invitation;

import com.smartbiz.survey.lead.LeadDtos.LeadRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.List;

public final class InvitationDtos {

    private InvitationDtos() {}

    public record LeadBrief(Long id, String fullName, String email, String phone, String company) {}

    public record InvitationDto(
            Long id,
            String token,
            String status,
            OffsetDateTime createdAt,
            OffsetDateTime openedAt,
            OffsetDateTime completedAt,
            LeadBrief lead) {}

    public record CreateInvitationsRequest(
            @NotEmpty(message = "Выберите хотя бы одного лида")
            @Size(max = 1000, message = "Не более 1000 лидов за раз") List<@NotNull Long> leadIds) {}

    public record QuickInviteRequest(@NotNull @Valid LeadRequest lead) {}

    public record InvitationStats(long total, long opened, long completed) {}
}
