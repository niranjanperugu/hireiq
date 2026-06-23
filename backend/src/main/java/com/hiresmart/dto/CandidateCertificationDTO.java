package com.hiresmart.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.*;
import org.hibernate.validator.constraints.URL;
import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateCertificationDTO {

    private UUID id;

    @NotBlank(message = "Certification name is required")
    @Size(min = 2, max = 255, message = "Certification name must be between 2 and 255 characters")
    private String certificationName;

    @Size(min = 2, max = 255, message = "Issuing organization must be between 2 and 255 characters")
    private String issuingOrganization;

    @PastOrPresent(message = "Issue date must be in the past or present")
    private LocalDate issueDate;

    private LocalDate expiryDate;

    @URL(message = "Credential URL format is invalid")
    private String credentialUrl;

    @AssertTrue(message = "Expiry date must be after issue date")
    private boolean isValidDates() {
        if (issueDate != null && expiryDate != null) {
            return expiryDate.isAfter(issueDate);
        }
        return true;
    }
}
