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

    /** Complete structured ATS analysis JSON from Claude */
    @Column(name = "full_analysis_json", columnDefinition = "TEXT")
    private String fullAnalysisJson;

    /** JSON array of project objects: [{name, description, responsibilities[], technologies[], duration}] */
    @Column(name = "projects_json", columnDefinition = "TEXT")
    private String projectsJson;

    /** JSON object: {skillMatch, experienceFit, jdRelevance, education, resumeQuality, total} */
    @Column(name = "score_breakdown_json", columnDefinition = "TEXT")
    private String scoreBreakdownJson;

    /** JSON array of top strength strings for this role */
    @Column(name = "key_strengths_json", columnDefinition = "TEXT")
    private String keyStrengthsJson;

    /** JSON array of improvement area strings */
    @Column(name = "areas_for_improvement_json", columnDefinition = "TEXT")
    private String areasForImprovementJson;

    /** STRONG_FIT | GOOD_FIT | POTENTIAL_FIT | NOT_FIT */
    @Column(name = "hiring_recommendation", length = 20)
    private String hiringRecommendation;

    /** 2-3 sentence JD alignment narrative */
    @Column(name = "jd_alignment", columnDefinition = "TEXT")
    private String jdAlignment;

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
