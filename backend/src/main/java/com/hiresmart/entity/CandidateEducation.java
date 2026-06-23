package com.hiresmart.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "candidate_education")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateEducation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    @Column(name = "institution_name", nullable = false)
    private String institutionName;

    @Column(nullable = false)
    private String degree;

    @Column(name = "field_of_study")
    private String fieldOfStudy;

    @Column(name = "graduation_date")
    private LocalDate graduationDate;

    private BigDecimal gpa;

    @Column(name = "added_at", nullable = false, updatable = false)
    private LocalDateTime addedAt;

    @PrePersist
    protected void onCreate() {
        addedAt = LocalDateTime.now();
    }
}
