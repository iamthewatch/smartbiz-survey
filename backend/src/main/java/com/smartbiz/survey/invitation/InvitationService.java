package com.smartbiz.survey.invitation;

import com.smartbiz.survey.common.ApiException;
import com.smartbiz.survey.common.TokenGenerator;
import com.smartbiz.survey.invitation.InvitationDtos.*;
import com.smartbiz.survey.lead.Lead;
import com.smartbiz.survey.lead.LeadDtos.LeadRequest;
import com.smartbiz.survey.lead.LeadRepository;
import com.smartbiz.survey.survey.Survey;
import com.smartbiz.survey.survey.SurveyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InvitationService {

    private static final int TOKEN_LENGTH = 24;

    private final InvitationRepository invitations;
    private final SurveyRepository surveys;
    private final LeadRepository leads;

    @Transactional(readOnly = true)
    public List<InvitationDto> list(Long surveyId) {
        ensureSurvey(surveyId);
        return invitations.findAllBySurveyIdOrderByCreatedAtDesc(surveyId).stream().map(InvitationService::toDto).toList();
    }

    @Transactional(readOnly = true)
    public InvitationStats stats(Long surveyId) {
        return new InvitationStats(invitations.countBySurveyId(surveyId),
                invitations.countBySurveyIdAndOpenedAtIsNotNull(surveyId),
                invitations.countBySurveyIdAndCompletedAtIsNotNull(surveyId));
    }

    /**
     * Идемпотентно создаёт персональные ссылки: если лиду уже отправлялась эта анкета,
     * возвращается существующее приглашение, а не создаётся дубликат.
     */
    @Transactional
    public List<InvitationDto> create(Long surveyId, CreateInvitationsRequest req) {
        Survey survey = ensureSurvey(surveyId);
        Set<Long> ids = new LinkedHashSet<>(req.leadIds());
        Map<Long, Lead> found = leads.findAllById(ids).stream()
                .collect(Collectors.toMap(Lead::getId, Function.identity()));
        if (found.size() != ids.size()) {
            throw ApiException.badRequest("Некоторые лиды не найдены — обновите список");
        }
        Map<Long, Invitation> existing = invitations.findAllBySurveyIdAndLeadIdIn(surveyId, ids).stream()
                .collect(Collectors.toMap(i -> i.getLead().getId(), Function.identity()));

        List<Invitation> result = new ArrayList<>();
        for (Long leadId : ids) {
            Invitation inv = existing.get(leadId);
            if (inv == null) {
                inv = newInvitation(survey, found.get(leadId));
                invitations.save(inv);
            }
            result.add(inv);
        }
        return result.stream().map(InvitationService::toDto).toList();
    }

    @Transactional
    public InvitationDto quickInvite(Long surveyId, QuickInviteRequest req) {
        Survey survey = ensureSurvey(surveyId);
        LeadRequest lr = req.lead();
        Lead lead = new Lead();
        lead.setFullName(lr.fullName().trim());
        lead.setEmail(blankToNull(lr.email()));
        lead.setPhone(blankToNull(lr.phone()));
        lead.setCompany(blankToNull(lr.company()));
        lead.setNote(blankToNull(lr.note()));
        leads.save(lead);
        return toDto(invitations.save(newInvitation(survey, lead)));
    }

    @Transactional
    public void delete(Long invitationId) {
        Invitation inv = invitations.findById(invitationId).orElseThrow(() -> ApiException.notFound("Приглашение"));
        if (inv.getCompletedAt() != null) {
            throw ApiException.conflict("HAS_RESPONSE",
                    "Лид уже ответил по этой ссылке — удалите ответ в аналитике, если это необходимо");
        }
        invitations.delete(inv);
    }

    private Invitation newInvitation(Survey survey, Lead lead) {
        Invitation inv = new Invitation();
        inv.setSurvey(survey);
        inv.setLead(lead);
        inv.setToken(TokenGenerator.generate(TOKEN_LENGTH));
        return inv;
    }

    private Survey ensureSurvey(Long surveyId) {
        return surveys.findById(surveyId).orElseThrow(() -> ApiException.notFound("Анкета"));
    }

    static InvitationDto toDto(Invitation i) {
        Lead l = i.getLead();
        return new InvitationDto(i.getId(), i.getToken(), i.getStatus(), i.getCreatedAt(), i.getOpenedAt(),
                i.getCompletedAt(), new LeadBrief(l.getId(), l.getFullName(), l.getEmail(), l.getPhone(), l.getCompany()));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
