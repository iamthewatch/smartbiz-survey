package com.smartbiz.survey.response;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface SurveyResponseRepository extends JpaRepository<SurveyResponse, Long> {

    long countBySurveyId(Long surveyId);

    long countBySubmittedAtAfter(OffsetDateTime since);

    @Query("select r.survey.id, count(r) from SurveyResponse r group by r.survey.id")
    List<Object[]> countPerSurvey();

    @Query("select r.lead.id, count(r) from SurveyResponse r where r.lead.id in :leadIds group by r.lead.id")
    List<Object[]> countPerLead(@Param("leadIds") java.util.Collection<Long> leadIds);

    @EntityGraph(attributePaths = "lead")
    @Query("""
            select r from SurveyResponse r
            where r.survey.id = :surveyId and (:leadId is null or r.lead.id = :leadId)
            """)
    Page<SurveyResponse> findPage(@Param("surveyId") Long surveyId, @Param("leadId") Long leadId, Pageable pageable);

    @EntityGraph(attributePaths = "lead")
    @Query("""
            select r from SurveyResponse r
            where r.survey.id = :surveyId and (:leadId is null or r.lead.id = :leadId)
            order by r.submittedAt desc
            """)
    List<SurveyResponse> findAllForSurvey(@Param("surveyId") Long surveyId, @Param("leadId") Long leadId);

    @EntityGraph(attributePaths = "survey")
    List<SurveyResponse> findAllByLeadIdOrderBySubmittedAtDesc(Long leadId);

    @EntityGraph(attributePaths = {"survey", "lead", "answers"})
    Optional<SurveyResponse> findDetailedById(Long id);

    @EntityGraph(attributePaths = {"survey", "lead"})
    List<SurveyResponse> findTop8ByOrderBySubmittedAtDesc();

    @Query("select avg(r.durationSeconds) from SurveyResponse r where r.survey.id = :surveyId and (:leadId is null or r.lead.id = :leadId)")
    Double averageDuration(@Param("surveyId") Long surveyId, @Param("leadId") Long leadId);

    @Query(value = """
            select cast(date_trunc('day', submitted_at) as date) as d, count(*) as c
            from survey_response
            where submitted_at >= :since and (cast(:surveyId as bigint) is null or survey_id = cast(:surveyId as bigint))
            group by d order by d
            """, nativeQuery = true)
    List<Object[]> dailyCounts(@Param("since") OffsetDateTime since, @Param("surveyId") Long surveyId);
}
