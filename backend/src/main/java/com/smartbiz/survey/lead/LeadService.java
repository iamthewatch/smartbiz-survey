package com.smartbiz.survey.lead;

import com.smartbiz.survey.common.ApiException;
import com.smartbiz.survey.common.PageResponse;
import com.smartbiz.survey.invitation.InvitationRepository;
import com.smartbiz.survey.lead.LeadDtos.*;
import com.smartbiz.survey.response.SurveyResponseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class LeadService {

    private final LeadRepository leads;
    private final InvitationRepository invitations;
    private final SurveyResponseRepository responses;

    @Transactional(readOnly = true)
    public PageResponse<LeadDto> search(String query, int page, int size) {
        String pattern = query == null || query.isBlank()
                ? "%"
                : "%" + query.trim().toLowerCase(Locale.ROOT).replace("%", "\\%").replace("_", "\\_") + "%";
        Page<Lead> result = leads.search(pattern, PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200),
                Sort.by(Sort.Direction.DESC, "createdAt")));
        Map<Long, Long> counts = new HashMap<>();
        if (!result.isEmpty()) {
            responses.countPerLead(result.map(Lead::getId).getContent())
                    .forEach(row -> counts.put((Long) row[0], ((Number) row[1]).longValue()));
        }
        return PageResponse.of(result, l -> toDto(l, counts.getOrDefault(l.getId(), 0L)));
    }

    @Transactional(readOnly = true)
    public LeadDetail get(Long id) {
        Lead lead = load(id);
        List<LeadInvitation> inv = invitations.findAllByLeadIdOrderByCreatedAtDesc(id).stream()
                .map(i -> new LeadInvitation(i.getId(), i.getSurvey().getId(), i.getSurvey().getTitle(), i.getToken(),
                        i.getStatus(), i.getCreatedAt(), i.getOpenedAt(), i.getCompletedAt()))
                .toList();
        List<LeadResponseItem> resp = responses.findAllByLeadIdOrderBySubmittedAtDesc(id).stream()
                .map(r -> new LeadResponseItem(r.getId(), r.getSurvey().getId(), r.getSurvey().getTitle(),
                        r.getSubmittedAt(), r.getDurationSeconds()))
                .toList();
        return new LeadDetail(toDto(lead, resp.size()), inv, resp);
    }

    @Transactional
    public LeadDto create(LeadRequest req) {
        Lead lead = new Lead();
        apply(lead, req);
        return toDto(leads.save(lead), 0);
    }

    @Transactional
    public BulkResult createBulk(List<LeadRequest> requests) {
        if (requests.size() > 1000) throw ApiException.badRequest("За один раз можно импортировать не более 1000 лидов");
        List<Lead> batch = requests.stream().map(r -> {
            Lead l = new Lead();
            apply(l, r);
            l.setSource(Lead.Source.IMPORT);
            return l;
        }).toList();
        leads.saveAll(batch);
        return new BulkResult(batch.size());
    }

    @Transactional
    public LeadDto update(Long id, LeadRequest req) {
        Lead lead = load(id);
        apply(lead, req);
        return toDto(lead, 0);
    }

    @Transactional
    public void delete(Long id) {
        leads.delete(load(id));
    }

    Lead load(Long id) {
        return leads.findById(id).orElseThrow(() -> ApiException.notFound("Лид"));
    }

    private void apply(Lead lead, LeadRequest req) {
        lead.setFullName(req.fullName().trim());
        lead.setEmail(blankToNull(req.email()));
        lead.setPhone(blankToNull(req.phone()));
        lead.setCompany(blankToNull(req.company()));
        lead.setNote(blankToNull(req.note()));
    }

    public static LeadDto toDto(Lead l, long responseCount) {
        return new LeadDto(l.getId(), l.getFullName(), l.getEmail(), l.getPhone(), l.getCompany(), l.getNote(),
                l.getSource(), l.getCreatedAt(), responseCount);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
