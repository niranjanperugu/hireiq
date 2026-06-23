package com.hiresmart.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "interview_questions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterviewQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_id", nullable = false)
    private Organization organization;

    @Enumerated(EnumType.STRING)
    @Column(name = "interview_type", nullable = false)
    private Enums.InterviewType interviewType;

    @Column(name = "skill_tag")
    private String skillTag; // For technical interviews

    @Column(name = "difficulty_level")
    private String difficultyLevel; // 'EASY', 'MEDIUM', 'HARD'

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Column(name = "expected_answer", columnDefinition = "TEXT")
    private String expectedAnswer;

    @Column(name = "follow_up_questions", columnDefinition = "TEXT")
    private String followUpQuestions;

    @Column(name = "ai_generated")
    private Boolean aiGenerated = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    private User createdByUser;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
