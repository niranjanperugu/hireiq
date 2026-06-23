package com.hiresmart.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Entity
@Table(name = "job_requirements")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobRequirement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @Column(name = "requirement_type", nullable = false)
    private String requirementType; // 'SKILL', 'CERTIFICATION', 'EDUCATION'

    @Column(name = "requirement_value", nullable = false)
    private String requirementValue;

    @Column(name = "is_mandatory")
    private Boolean isMandatory = true;

    @Column(name = "priority_level")
    private Integer priorityLevel = 1;
}
