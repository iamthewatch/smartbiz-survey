package com.smartbiz.survey.survey;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface SurveyRepository extends JpaRepository<Survey, Long> {

    boolean existsBySlug(String slug);

    @EntityGraph(attributePaths = "questions")
    Optional<Survey> findWithQuestionsById(Long id);

    @EntityGraph(attributePaths = "questions")
    Optional<Survey> findWithQuestionsBySlug(String slug);

    List<Survey> findAllByOrderByUpdatedAtDesc();

    long countByStatus(SurveyStatus status);

    @Query("select q.survey.id, count(q) from Question q group by q.survey.id")
    List<Object[]> countQuestionsPerSurvey();
}
