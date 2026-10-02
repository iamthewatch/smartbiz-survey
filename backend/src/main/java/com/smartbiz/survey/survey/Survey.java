package com.smartbiz.survey.survey;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "survey")
@Getter
@Setter
public class Survey {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private SurveyStatus status = SurveyStatus.DRAFT;

    @Column(nullable = false, unique = true, length = 32)
    private String slug;

    @Column(name = "accent_color", length = 16)
    private String accentColor;

    @Column(name = "welcome_message")
    private String welcomeMessage;

    @Column(name = "thank_you_message")
    private String thankYouMessage;

    @Column(name = "public_link_enabled", nullable = false)
    private boolean publicLinkEnabled;

    @Column(name = "collect_contact", nullable = false)
    private boolean collectContact = true;

    @Column(name = "one_question_per_page", nullable = false)
    private boolean oneQuestionPerPage = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "published_at")
    private OffsetDateTime publishedAt;

    @Column(name = "closed_at")
    private OffsetDateTime closedAt;

    @Version
    private long version;

    @OneToMany(mappedBy = "survey", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<Question> questions = new ArrayList<>();

    @PrePersist
    void prePersist() {
        OffsetDateTime now = OffsetDateTime.now();
        createdAt = now;
        updatedAt = now;
    }
}
