package com.smartbiz.survey.analytics;

import com.smartbiz.survey.analytics.AnalyticsDtos.*;
import com.smartbiz.survey.common.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService service;

    @GetMapping("/dashboard")
    public Dashboard dashboard() {
        return service.dashboard();
    }

    /** Аналитика по анкете: по всем ответам или (leadId) по одному лиду. */
    @GetMapping("/surveys/{surveyId}/analytics")
    public SurveyAnalytics analytics(@PathVariable Long surveyId, @RequestParam(required = false) Long leadId) {
        return service.surveyAnalytics(surveyId, leadId);
    }

    @GetMapping("/surveys/{surveyId}/responses")
    public PageResponse<ResponseListItem> responses(@PathVariable Long surveyId,
                                                    @RequestParam(required = false) Long leadId,
                                                    @RequestParam(defaultValue = "0") int page,
                                                    @RequestParam(defaultValue = "20") int size) {
        return service.responses(surveyId, leadId, page, size);
    }

    @GetMapping("/surveys/{surveyId}/export")
    public ResponseEntity<byte[]> export(@PathVariable Long surveyId) {
        byte[] body = service.exportCsv(surveyId).getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename("survey-" + surveyId + "-responses.csv", StandardCharsets.UTF_8).build().toString())
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(body);
    }

    @GetMapping("/responses/{id}")
    public ResponseDetail response(@PathVariable Long id) {
        return service.responseDetail(id);
    }

    @DeleteMapping("/responses/{id}")
    public ResponseEntity<Void> deleteResponse(@PathVariable Long id) {
        service.deleteResponse(id);
        return ResponseEntity.noContent().build();
    }
}
