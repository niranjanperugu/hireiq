package com.hiresmart.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterviewSessionQuestionDTO {

    private UUID id;

    private UUID questionId;

    private Integer sequenceNumber;

    private LocalDateTime askedAt;

    @Size(max = 5000, message = "Candidate answer must not exceed 5000 characters")
    private String candidateAnswer;

    @Size(max = 1000, message = "Notes must not exceed 1000 characters")
    private String notes;

    // Read-only field
    private String questionText;
}
