package com.hiresmart.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "interview_session_questions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterviewSessionQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "interview_session_id", nullable = false)
    private InterviewSession interviewSession;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private InterviewQuestion question;

    @Column(name = "sequence_number")
    private Integer sequenceNumber;

    @Column(name = "asked_at")
    private LocalDateTime askedAt;

    @Column(name = "candidate_answer", columnDefinition = "TEXT")
    private String candidateAnswer;

    private String notes;
}
