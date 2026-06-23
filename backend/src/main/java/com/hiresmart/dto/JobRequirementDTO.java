package com.hiresmart.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.*;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobRequirementDTO {

    private UUID id;

    @NotBlank(message = "Requirement type is required")
    @Pattern(regexp = "^(SKILL|CERTIFICATION|EDUCATION)$", message = "Requirement type must be SKILL, CERTIFICATION, or EDUCATION")
    private String requirementType;

    @NotBlank(message = "Requirement value is required")
    @Size(min = 2, max = 255, message = "Requirement value must be between 2 and 255 characters")
    private String requirementValue;

    private Boolean isMandatory = true;

    @Min(value = 1, message = "Priority level must be at least 1")
    private Integer priorityLevel = 1;
}
