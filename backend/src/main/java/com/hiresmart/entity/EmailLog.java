package com.hiresmart.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "email_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "recipient_email", nullable = false)
    private String recipientEmail;

    @Enumerated(EnumType.STRING)
    @Column(name = "notification_type", nullable = false)
    private Enums.NotificationType notificationType;

    @Column(nullable = false)
    private String subject;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(name = "sent_at", nullable = false, updatable = false)
    private LocalDateTime sentAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_status")
    private Enums.DeliveryStatus deliveryStatus = Enums.DeliveryStatus.SENT;

    @Column(name = "delivery_error_message", columnDefinition = "TEXT")
    private String deliveryErrorMessage;

    @Column(name = "related_entity_id")
    private UUID relatedEntityId;

    @PrePersist
    protected void onCreate() {
        sentAt = LocalDateTime.now();
    }
}
