package com.hiresmart.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateEducationDTO {

    private UUID id;

    @NotBlank(message = "Institution name is required")
    @Size(min = 2, max = 255, message = "Institution name must be between 2 and 255 characters")
    private String institutionName;

    @NotBlank(message = "Degree is required")
    @Size(min = 2, max = 100, message = "Degree must be between 2 and 100 characters")
    private String degree;

    @Size(min = 2, max = 100, message = "Field of study must be between 2 and 100 characters")
    private String fieldOfStudy;

    @PastOrPresent(message = "Graduation date must be in the past or present")
    private LocalDate graduationDate;

    @DecimalMin(value = "0.0", message = "GPA must be at least 0.0")
    @DecimalMax(value = "4.0", message = "GPA must not exceed 4.0")
    private BigDecimal gpa;
}
