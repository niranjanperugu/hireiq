package com.hiresmart.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateDTO {

    private UUID id;

    @NotBlank(message = "First name is required")
    @Size(min = 2, max = 100, message = "First name must be between 2 and 100 characters")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(min = 2, max = 100, message = "Last name must be between 2 and 100 characters")
    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email format is invalid")
    private String email;

    @Pattern(regexp = "^\\+?[0-9]{10,15}$", message = "Phone number format is invalid")
    private String phone;

    private String location;

    private String currentCompany;

    private String currentDesignation;

    @DecimalMin(value = "0.0", message = "Experience years must be non-negative")
    @DecimalMax(value = "70.0", message = "Experience years must not exceed 70")
    private BigDecimal totalExperienceYears;

    @Size(max = 2000, message = "Summary must not exceed 2000 characters")
    private String summary;

    private String profilePictureUrl;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    // Nested DTOs
    private List<CandidateSkillDTO> skills;

    private List<CandidateExperienceDTO> experiences;

    private List<CandidateEducationDTO> educations;

    private List<CandidateCertificationDTO> certifications;

    public String getFullName() {
        return firstName + " " + lastName;
    }
}
