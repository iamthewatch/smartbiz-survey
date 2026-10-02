package com.smartbiz.survey.invitation;

import com.smartbiz.survey.invitation.InvitationDtos.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class InvitationController {

    private final InvitationService service;

    @GetMapping("/surveys/{surveyId}/invitations")
    public List<InvitationDto> list(@PathVariable Long surveyId) {
        return service.list(surveyId);
    }

    @PostMapping("/surveys/{surveyId}/invitations")
    @ResponseStatus(HttpStatus.CREATED)
    public List<InvitationDto> create(@PathVariable Long surveyId, @Valid @RequestBody CreateInvitationsRequest req) {
        return service.create(surveyId, req);
    }

    @PostMapping("/surveys/{surveyId}/invitations/quick")
    @ResponseStatus(HttpStatus.CREATED)
    public InvitationDto quick(@PathVariable Long surveyId, @Valid @RequestBody QuickInviteRequest req) {
        return service.quickInvite(surveyId, req);
    }

    @DeleteMapping("/invitations/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
