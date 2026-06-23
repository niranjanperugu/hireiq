package com.hiresmart.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "candidate_skills")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateSkill {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    @Column(name = "skill_name", nullable = false)
    private String skillName;

    @Enumerated(EnumType.STRING)
    @Column(name = "skill_level", nullable = false)
    private Enums.SkillLevel skillLevel;

    @Column(name = "years_of_experience")
    private BigDecimal yearsOfExperience;

    @Column(name = "is_primary")
    private Boolean isPrimary = false;

    @Column(name = "added_at", nullable = false, updatable = false)
    private LocalDateTime addedAt;

    @PrePersist
    protected void onCreate() {
        addedAt = LocalDateTime.now();
    }
}
