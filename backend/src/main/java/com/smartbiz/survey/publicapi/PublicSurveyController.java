package com.smartbiz.survey.publicapi;

import com.smartbiz.survey.publicapi.PublicDtos.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * Публичные эндпоинты для респондентов — без авторизации.
 */
@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicSurveyController {

    private final PublicSurveyService service;

    @GetMapping("/invitations/{token}")
    public PublicSurvey openInvitation(@PathVariable String token) {
        return service.openInvitation(token);
    }

    @PostMapping("/invitations/{token}/responses")
    @ResponseStatus(HttpStatus.CREATED)
    public SubmitResult submitInvitation(@PathVariable String token,
                                         @Valid @RequestBody SubmitRequest req,
                                         @RequestHeader(value = HttpHeaders.USER_AGENT, required = false) String ua) {
        return service.submitInvitation(token, req, ua);
    }

    @GetMapping("/surveys/{slug}")
    public PublicSurvey openPublic(@PathVariable String slug) {
        return service.openPublic(slug);
    }

    @PostMapping("/surveys/{slug}/responses")
    @ResponseStatus(HttpStatus.CREATED)
    public SubmitResult submitPublic(@PathVariable String slug,
                                     @Valid @RequestBody SubmitRequest req,
                                     @RequestHeader(value = HttpHeaders.USER_AGENT, required = false) String ua) {
        return service.submitPublic(slug, req, ua);
    }
}
