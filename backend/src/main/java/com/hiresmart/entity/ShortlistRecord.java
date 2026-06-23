package com.hiresmart.entity;

import lombok.*;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "shortlist_records")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShortlistRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "resume_analysis_id", nullable = false)
    private String resumeAnalysisId;

    @Column(name = "job_id", nullable = false)
    private String jobId;

    @Column(name = "organization_id", nullable = false)
    private String organizationId;

    @Column(name = "candidate_name", nullable = false)
    private String candidateName;

    @Column(name = "candidate_email")
    private String candidateEmail;

    @Column(name = "shortlisted_by", nullable = false)
    private String shortlistedBy;

    @Column(name = "shortlisted_by_role")
    private String shortlistedByRole;

    @Column(name = "shortlisted_by_email")
    private String shortlistedByEmail;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private ShortlistMethod method;

    @Column(name = "ats_score")
    private Double atsScore;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "shortlisted_at", nullable = false)
    private LocalDateTime shortlistedAt;

    public enum ShortlistMethod {
        MANUAL, AI
    }

    @PrePersist
    protected void onCreate() {
        shortlistedAt = LocalDateTime.now();
    }
}
