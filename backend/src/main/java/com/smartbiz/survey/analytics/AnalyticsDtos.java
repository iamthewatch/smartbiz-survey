package com.smartbiz.survey.analytics;

import com.smartbiz.survey.invitation.InvitationDtos.LeadBrief;
import com.smartbiz.survey.survey.QuestionType;
import com.smartbiz.survey.survey.SurveyStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public final class AnalyticsDtos {

    private AnalyticsDtos() {}

    public record Totals(long responses, long invitations, long opened, long completed,
                         double completionRate, Double avgDurationSeconds) {}

    public record DayCount(LocalDate date, long count) {}

    public record OptionStat(Long optionId, String label, long count, double percent) {}

    public record ValueCount(BigDecimal value, long count) {}

    public record NumericStat(Double average, BigDecimal min, BigDecimal max, Double median,
                              List<ValueCount> distribution, Double nps) {}

    public record TextAnswer(Long responseId, String leadName, String text, OffsetDateTime submittedAt) {}

    public record QuestionStat(
            Long questionId,
            int position,
            QuestionType type,
            String title,
            long answered,
            long skipped,
            List<OptionStat> options,
            long otherCount,
            List<TextAnswer> otherAnswers,
            NumericStat numeric,
            List<TextAnswer> textAnswers) {}

    public record SurveyAnalytics(
            Long surveyId,
            String title,
            SurveyStatus status,
            LeadBrief lead,
            Totals totals,
            List<DayCount> timeline,
            List<QuestionStat> questions) {}

    public record ResponseListItem(Long id, LeadBrief lead, OffsetDateTime submittedAt, Integer durationSeconds,
                                   int answeredCount) {}

    public record AnswerView(
            Long questionId,
            int position,
            QuestionType type,
            String title,
            boolean answered,
            List<String> selectedOptions,
            String otherText,
            String textValue,
            BigDecimal numberValue,
            Integer maxValue,
            String display) {}

    public record ResponseDetail(
            Long id,
            Long surveyId,
            String surveyTitle,
            LeadBrief lead,
            OffsetDateTime startedAt,
            OffsetDateTime submittedAt,
            Integer durationSeconds,
            List<AnswerView> answers) {}

    public record RecentResponse(Long id, Long surveyId, String surveyTitle, String leadName, OffsetDateTime submittedAt) {}

    public record TopSurvey(Long id, String title, SurveyStatus status, long responses) {}

    public record Dashboard(
            long surveys,
            long publishedSurveys,
            long draftSurveys,
            long leads,
            long responses,
            long responsesLast7Days,
            long invitations,
            double completionRate,
            List<DayCount> timeline,
            List<RecentResponse> recentResponses,
            List<TopSurvey> topSurveys) {}
}
