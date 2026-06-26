package com.hiresmart.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "assessments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Assessment {

    @Id
    @Column(length = 36)
    private String id;

    @Column(unique = true, nullable = false)
    private String token;

    @Column(nullable = false)
    private String organizationId;

    @Column(nullable = false)
    private String jobId;

    // Link back to the ResumeAnalysis record
    private String candidateId;

    private String jobTitle;

    @Column(columnDefinition = "TEXT")
    private String jobDescription;

    @Column(columnDefinition = "TEXT")
    private String requiredSkillsJson;

    // Candidate details — pre-populated at creation, shown read-only to candidate
    private String candidateName;
    private String candidateEmail;
    private String candidatePhone;
    private String candidateRole;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Enums.AssessmentStatus status;

    private Integer currentQuestionIndex;

    // JSON array: [{index, question, answer, inputMethod, timestamp, answeredAt}]
    @Column(columnDefinition = "TEXT")
    private String questionsAnswersJson;

    // JSON: {overallScore, technicalScore, recommendation, strengths, gaps, summary, questionInsights}
    @Column(columnDefinition = "TEXT")
    private String evaluationJson;

    private String createdBy;

    private LocalDateTime createdAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private LocalDateTime expiresAt;

    @PrePersist
    public void prePersist() {
        if (id == null)                 id = UUID.randomUUID().toString();
        if (createdAt == null)          createdAt = LocalDateTime.now();
        if (expiresAt == null)          expiresAt = LocalDateTime.now().plusDays(7);
        if (status == null)             status = Enums.AssessmentStatus.PENDING;
        if (currentQuestionIndex == null) currentQuestionIndex = -1;
    }
}
