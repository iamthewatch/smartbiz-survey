package com.smartbiz.survey.publicapi;

import com.smartbiz.survey.common.ApiException;
import com.smartbiz.survey.invitation.Invitation;
import com.smartbiz.survey.invitation.InvitationRepository;
import com.smartbiz.survey.lead.Lead;
import com.smartbiz.survey.lead.LeadRepository;
import com.smartbiz.survey.publicapi.PublicDtos.*;
import com.smartbiz.survey.response.Answer;
import com.smartbiz.survey.response.AnswerValidator;
import com.smartbiz.survey.response.SurveyResponse;
import com.smartbiz.survey.response.SurveyResponseRepository;
import com.smartbiz.survey.survey.Survey;
import com.smartbiz.survey.survey.SurveyMapper;
import com.smartbiz.survey.survey.SurveyRepository;
import com.smartbiz.survey.survey.SurveyStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PublicSurveyService {

    private static final String DEFAULT_THANKS = "Спасибо! Ваши ответы успешно отправлены.";

    private final InvitationRepository invitations;
    private final SurveyRepository surveys;
    private final LeadRepository leads;
    private final SurveyResponseRepository responses;
    private final AnswerValidator validator;

    // ---------------------------------------------------------- персональная ссылка

    @Transactional
    public PublicSurvey openInvitation(String token) {
        Invitation inv = invitations.findByToken(token).orElseThrow(() -> ApiException.notFound("Ссылка"));
        if (inv.getCompletedAt() != null) {
            throw ApiException.conflict("ALREADY_COMPLETED", "Вы уже прошли эту анкету. Спасибо!");
        }
        Survey survey = loadActive(inv.getSurvey().getId());
        if (inv.getOpenedAt() == null) inv.setOpenedAt(OffsetDateTime.now());
        return toPublic(survey, false, inv.getLead().getFullName());
    }

    @Transactional
    public SubmitResult submitInvitation(String token, SubmitRequest req, String userAgent) {
        Invitation inv = invitations.findByTokenForUpdate(token).orElseThrow(() -> ApiException.notFound("Ссылка"));
        if (inv.getCompletedAt() != null) {
            throw ApiException.conflict("ALREADY_COMPLETED", "Вы уже прошли эту анкету. Спасибо!");
        }
        Survey survey = loadActive(inv.getSurvey().getId());
        List<Answer> answers = validator.validateAndBuild(survey, req.answers());

        OffsetDateTime now = OffsetDateTime.now();
        SurveyResponse r = newResponse(survey, req, userAgent, now);
        r.setLead(inv.getLead());
        r.setInvitation(inv);
        answers.forEach(r::addAnswer);
        responses.save(r);

        if (inv.getOpenedAt() == null) inv.setOpenedAt(now);
        inv.setCompletedAt(now);
        return new SubmitResult(r.getId(), thanks(survey));
    }

    // ---------------------------------------------------------- общая публичная ссылка

    @Transactional(readOnly = true)
    public PublicSurvey openPublic(String slug) {
        Survey survey = loadPublic(slug);
        return toPublic(survey, survey.isCollectContact(), null);
    }

    @Transactional
    public SubmitResult submitPublic(String slug, SubmitRequest req, String userAgent) {
        Survey survey = loadPublic(slug);
        Lead lead = null;
        if (survey.isCollectContact()) {
            ContactInput c = req.contact();
            if (c == null || c.fullName() == null || c.fullName().isBlank()) {
                throw ApiException.validation(Map.of("contact.fullName", "Представьтесь, пожалуйста"));
            }
            lead = resolveLead(c);
        }
        List<Answer> answers = validator.validateAndBuild(survey, req.answers());
        SurveyResponse r = newResponse(survey, req, userAgent, OffsetDateTime.now());
        r.setLead(lead);
        answers.forEach(r::addAnswer);
        responses.save(r);
        return new SubmitResult(r.getId(), thanks(survey));
    }

    // ---------------------------------------------------------- helpers

    /** Лид ищется по email, чтобы повторные ответы одного человека собирались в одной карточке. */
    private Lead resolveLead(ContactInput c) {
        String email = c.email() == null || c.email().isBlank() ? null : c.email().trim();
        if (email != null) {
            Lead existing = leads.findFirstByEmailIgnoreCase(email).orElse(null);
            if (existing != null) {
                if (existing.getPhone() == null && c.phone() != null && !c.phone().isBlank()) {
                    existing.setPhone(c.phone().trim());
                }
                return existing;
            }
        }
        Lead lead = new Lead();
        lead.setFullName(c.fullName().trim());
        lead.setEmail(email);
        lead.setPhone(c.phone() == null || c.phone().isBlank() ? null : c.phone().trim());
        lead.setSource(Lead.Source.PUBLIC_LINK);
        return leads.save(lead);
    }

    private SurveyResponse newResponse(Survey survey, SubmitRequest req, String userAgent, OffsetDateTime now) {
        SurveyResponse r = new SurveyResponse();
        r.setSurvey(survey);
        r.setSubmittedAt(now);
        OffsetDateTime started = req.startedAt();
        // защищаемся от некорректных часов на клиенте
        if (started != null && started.isBefore(now) && started.isAfter(now.minusDays(7))) {
            r.setStartedAt(started);
            r.setDurationSeconds((int) Duration.between(started, now).toSeconds());
        }
        if (userAgent != null) r.setUserAgent(userAgent.length() > 512 ? userAgent.substring(0, 512) : userAgent);
        return r;
    }

    private Survey loadActive(Long surveyId) {
        Survey survey = surveys.findWithQuestionsById(surveyId).orElseThrow(() -> ApiException.notFound("Анкета"));
        ensureActive(survey);
        return survey;
    }

    private Survey loadPublic(String slug) {
        // общая ссылка доступна у любой опубликованной анкеты — флаг publicLinkEnabled больше не проверяется
        Survey survey = surveys.findWithQuestionsBySlug(slug).orElseThrow(() -> ApiException.notFound("Анкета"));
        ensureActive(survey);
        return survey;
    }

    private void ensureActive(Survey survey) {
        if (survey.getStatus() == SurveyStatus.CLOSED) {
            throw new ApiException(HttpStatus.GONE, "SURVEY_CLOSED", "Приём ответов на эту анкету завершён");
        }
        if (survey.getStatus() != SurveyStatus.PUBLISHED) {
            throw new ApiException(HttpStatus.GONE, "SURVEY_NOT_PUBLISHED", "Анкета пока недоступна");
        }
    }

    private PublicSurvey toPublic(Survey s, boolean collectContact, String respondentName) {
        return new PublicSurvey(s.getTitle(), s.getDescription(), s.getAccentColor(), s.getWelcomeMessage(),
                thanks(s), collectContact, s.isOneQuestionPerPage(), respondentName,
                s.getQuestions().stream().map(SurveyMapper::toDto).toList());
    }

    private String thanks(Survey s) {
        return s.getThankYouMessage() == null ? DEFAULT_THANKS : s.getThankYouMessage();
    }
}
