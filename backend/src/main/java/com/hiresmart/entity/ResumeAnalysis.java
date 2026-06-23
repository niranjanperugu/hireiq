package com.hiresmart.entity;

import lombok.*;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "resume_analysis")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResumeAnalysis {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String organizationId;

    @Column(nullable = false)
    private String jobId;

    @Column(nullable = false)
    private String candidateName;

    @Column
    private String email;

    @Column(name = "candidate_role")
    private String currentRole;

    @Column
    private String phone;

    @Column(nullable = false)
    private Double atsScore;

    @Column(name = "matched_skills")
    private String matchedSkillsJson;

    @Column(name = "missing_skills")
    private String missingSkillsJson;

    @Column
    private Integer yearsOfExperience;

    @Column
    private String education;

    @Column(columnDefinition = "TEXT")
    private String professionalSummary;

    @Column
    private String resumeFileName;

    @Column(name = "resume_s3_url", columnDefinition = "TEXT")
    private String resumeS3Url;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private ATSRating rating;

    @Column(nullable = false)
    private LocalDateTime analyzedAt;

    @Column
    private LocalDateTime createdAt;

    @Column
    private String analyzedBy;

    @Column(name = "is_applied", nullable = false)
    private boolean isApplied = false;

    /** "HR_ANALYZED" — uploaded via Resume Analyzer | "PUBLIC_APPLY" — submitted via public form */
    @Column(name = "source", length = 32)
    private String source;

    @Column(name = "job_title")
    private String jobTitle;

    @PrePersist
    protected void onCreate() {
        analyzedAt = LocalDateTime.now();
        createdAt = LocalDateTime.now();
        if (atsScore == null) {
            atsScore = 0.0;
        }
    }

    public enum ATSRating {
        EXCELLENT,  // 80-100
        GOOD,       // 60-79
        FAIR,       // 40-59
        POOR        // 0-39
    }
}
