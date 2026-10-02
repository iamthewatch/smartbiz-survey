package com.smartbiz.survey.lead;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "lead")
@Getter
@Setter
public class Lead {

    public enum Source { MANUAL, IMPORT, PUBLIC_LINK }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    private String email;

    @Column(length = 64)
    private String phone;

    private String company;

    private String note;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private Source source = Source.MANUAL;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }
}
