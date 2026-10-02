package com.smartbiz.survey.survey;

import com.smartbiz.survey.survey.SurveyDtos.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/surveys")
@RequiredArgsConstructor
public class SurveyController {

    private final SurveyService service;

    @GetMapping
    public List<SurveySummary> list(@RequestParam(required = false) SurveyStatus status,
                                    @RequestParam(required = false) String q) {
        return service.list(status, q);
    }

    @GetMapping("/templates")
    public List<TemplateInfo> templates() {
        return service.templates();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SurveyDetail create(@Valid @RequestBody(required = false) CreateSurveyRequest req) {
        return service.create(req);
    }

    @GetMapping("/{id}")
    public SurveyDetail get(@PathVariable Long id) {
        return service.get(id);
    }

    @PutMapping("/{id}")
    public SurveyDetail update(@PathVariable Long id, @Valid @RequestBody UpdateSurveyRequest req) {
        return service.update(id, req);
    }

    @PostMapping("/{id}/publish")
    public SurveyDetail publish(@PathVariable Long id) {
        return service.publish(id);
    }

    @PostMapping("/{id}/close")
    public SurveyDetail close(@PathVariable Long id) {
        return service.close(id);
    }

    @PostMapping("/{id}/draft")
    public SurveyDetail toDraft(@PathVariable Long id) {
        return service.toDraft(id);
    }

    @PostMapping("/{id}/duplicate")
    @ResponseStatus(HttpStatus.CREATED)
    public SurveyDetail duplicate(@PathVariable Long id) {
        return service.duplicate(id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
