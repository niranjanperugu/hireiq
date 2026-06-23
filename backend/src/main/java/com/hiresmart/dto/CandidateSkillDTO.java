package com.hiresmart.dto;

import com.hiresmart.entity.Enums;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateSkillDTO {

    private UUID id;

    @NotBlank(message = "Skill name is required")
    @Size(min = 2, max = 100, message = "Skill name must be between 2 and 100 characters")
    private String skillName;

    @NotNull(message = "Skill level is required")
    private Enums.SkillLevel skillLevel;

    @DecimalMin(value = "0.0", message = "Years of experience must be non-negative")
    @DecimalMax(value = "70.0", message = "Years of experience must not exceed 70")
    private BigDecimal yearsOfExperience;

    private Boolean isPrimary = false;
}
