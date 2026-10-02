package com.smartbiz.survey.invitation;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface InvitationRepository extends JpaRepository<Invitation, Long> {

    @EntityGraph(attributePaths = {"survey", "lead"})
    Optional<Invitation> findByToken(String token);

    /** Блокировка строки защищает от двойной отправки ответа по одной персональной ссылке. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Invitation i where i.token = :token")
    Optional<Invitation> findByTokenForUpdate(@Param("token") String token);

    @EntityGraph(attributePaths = "lead")
    List<Invitation> findAllBySurveyIdOrderByCreatedAtDesc(Long surveyId);

    long countByCompletedAtIsNotNull();

    @EntityGraph(attributePaths = "survey")
    List<Invitation> findAllByLeadIdOrderByCreatedAtDesc(Long leadId);

    List<Invitation> findAllBySurveyIdAndLeadIdIn(Long surveyId, Collection<Long> leadIds);

    long countBySurveyId(Long surveyId);

    long countBySurveyIdAndOpenedAtIsNotNull(Long surveyId);

    long countBySurveyIdAndCompletedAtIsNotNull(Long surveyId);

    @Query("select i.survey.id, count(i) from Invitation i group by i.survey.id")
    List<Object[]> countPerSurvey();
}
