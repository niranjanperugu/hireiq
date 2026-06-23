package com.hiresmart.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "jobs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Job {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    private User createdByUser;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "min_experience_years")
    private Integer minExperienceYears;

    @Column(name = "max_experience_years")
    private Integer maxExperienceYears;

    @Enumerated(EnumType.STRING)
    @Column(name = "employment_type", nullable = false)
    private Enums.EmploymentType employmentType;

    @Enumerated(EnumType.STRING)
    @Column(name = "work_mode", nullable = false)
    private Enums.WorkMode workMode;

    @Column(name = "salary_min", precision = 12, scale = 2)
    private BigDecimal salaryMin;

    @Column(name = "salary_max", precision = 12, scale = 2)
    private BigDecimal salaryMax;

    @Column(name = "salary_currency")
    private String salaryCurrency = "USD";

    @Column(nullable = false)
    private String location;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private Enums.JobStatus status = Enums.JobStatus.DRAFT;

    @Column(name = "job_code", unique = true, length = 20)
    private String jobCode;

    @Column(name = "is_featured", nullable = false)
    private boolean featured = false;

    @Column(name = "deadline")
    private LocalDateTime deadline;

    @Column(name = "posted_date")
    private LocalDateTime postedDate;

    @Column(name = "closed_date")
    private LocalDateTime closedDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "filled_by_candidate_id")
    private Candidate filledByCandidate;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "job", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<JobRequirement> requirements;

    @OneToMany(mappedBy = "job", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<Application> applications;

    @OneToMany(mappedBy = "job", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<InterviewPanel> panels;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
