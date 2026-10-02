package com.smartbiz.survey.survey;

import com.smartbiz.survey.survey.SurveyDtos.*;

import java.util.List;

public final class SurveyMapper {

    private SurveyMapper() {}

    public static QuestionDto toDto(Question q) {
        List<OptionDto> options = q.getOptions().stream()
                .map(o -> new OptionDto(o.getId(), o.getLabel()))
                .toList();
        return new QuestionDto(q.getId(), q.getType(), q.getTitle(), q.getDescription(), q.isRequired(),
                q.isAllowOther(), q.getPlaceholder(), q.getMinValue(), q.getMaxValue(), q.getMinLabel(),
                q.getMaxLabel(), q.getMinSelections(), q.getMaxSelections(), options);
    }

    public static SurveyDetail toDetail(Survey s, long responseCount) {
        return new SurveyDetail(s.getId(), s.getTitle(), s.getDescription(), s.getStatus(), s.getSlug(),
                s.getAccentColor(), s.getWelcomeMessage(), s.getThankYouMessage(), s.isPublicLinkEnabled(),
                s.isCollectContact(), s.isOneQuestionPerPage(), s.getVersion(), responseCount,
                s.getCreatedAt(), s.getUpdatedAt(), s.getPublishedAt(), s.getClosedAt(),
                s.getQuestions().stream().map(SurveyMapper::toDto).toList());
    }
}
