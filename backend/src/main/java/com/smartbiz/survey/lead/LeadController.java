package com.smartbiz.survey.lead;

import com.smartbiz.survey.common.PageResponse;
import com.smartbiz.survey.lead.LeadDtos.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/leads")
@RequiredArgsConstructor
public class LeadController {

    private final LeadService service;

    @GetMapping
    public PageResponse<LeadDto> search(@RequestParam(required = false) String q,
                                        @RequestParam(defaultValue = "0") int page,
                                        @RequestParam(defaultValue = "20") int size) {
        return service.search(q, page, size);
    }

    @GetMapping("/{id}")
    public LeadDetail get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LeadDto create(@Valid @RequestBody LeadRequest req) {
        return service.create(req);
    }

    @PostMapping("/bulk")
    @ResponseStatus(HttpStatus.CREATED)
    public BulkResult bulk(@RequestBody List<@Valid LeadRequest> req) {
        return service.createBulk(req);
    }

    @PutMapping("/{id}")
    public LeadDto update(@PathVariable Long id, @Valid @RequestBody LeadRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
