package com.hiresmart.dto;

import com.hiresmart.entity.Enums;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.*;
import org.hibernate.validator.constraints.URL;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterviewSessionDTO {

    private UUID id;

    @NotNull(message = "Application ID is required")
    private UUID applicationId;

    @NotNull(message = "Panel ID is required")
    private UUID panelId;

    @NotNull(message = "Round ID is required")
    private UUID roundId;

    @NotNull(message = "Scheduled date is required")
    @FutureOrPresent(message = "Scheduled date must be in the future")
    private LocalDateTime scheduledAt;

    private LocalDateTime estimatedEndTime;

    private LocalDateTime actualStartTime;

    private LocalDateTime actualEndTime;

    private Enums.InterviewStatus status;

    @URL(message = "Meeting link format is invalid")
    private String meetingLink;

    @Size(max = 2000, message = "Meeting notes must not exceed 2000 characters")
    private String meetingNotes;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    // Nested DTOs
    private List<InterviewSessionQuestionDTO> sessionQuestions;

    private FeedbackFormDTO feedbackForm;

    // Read-only fields
    private String candidateName;

    private String candidateEmail;

    private String roundName;

    private Enums.InterviewType interviewType;
}
