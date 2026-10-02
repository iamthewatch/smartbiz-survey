package com.smartbiz.survey.response;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface AnswerRepository extends JpaRepository<Answer, Long> {

    /** Все ответы анкеты (опционально — только конкретного лида) вместе с выбранными вариантами. */
    @Query("""
            select distinct a from Answer a
            join fetch a.response r
            left join fetch a.selectedOptions
            where r.survey.id = :surveyId and (:leadId is null or r.lead.id = :leadId)
            """)
    List<Answer> findAllForAnalytics(@Param("surveyId") Long surveyId, @Param("leadId") Long leadId);

    @Query("""
            select distinct a from Answer a
            left join fetch a.selectedOptions
            where a.response.id in :responseIds
            """)
    List<Answer> findAllByResponseIds(@Param("responseIds") Collection<Long> responseIds);
}
