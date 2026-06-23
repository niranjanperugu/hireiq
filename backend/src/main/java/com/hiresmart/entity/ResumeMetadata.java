package com.hiresmart.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "resume_metadata")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResumeMetadata {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "file_url", nullable = false)
    private String fileUrl;

    @Column(name = "file_size_bytes")
    private Integer fileSizeBytes;

    @Column(name = "upload_date", nullable = false, updatable = false)
    private LocalDateTime uploadDate;

    @Column(name = "parsed_at")
    private LocalDateTime parsedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "parsing_status")
    private Enums.ParsingStatus parsingStatus = Enums.ParsingStatus.PENDING;

    @Column(name = "parsing_error_message")
    private String parsingErrorMessage;

    @Column(name = "version")
    private Integer version = 1;

    @Column(name = "is_current")
    private Boolean isCurrent = true;

    @PrePersist
    protected void onCreate() {
        uploadDate = LocalDateTime.now();
    }
}
