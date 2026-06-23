package com.hiresmart.service;

import com.hiresmart.entity.EmailLog;
import com.hiresmart.entity.Enums;
import com.hiresmart.repository.EmailLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.ses.SesClient;
import software.amazon.awssdk.services.ses.model.*;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final SesClient sesClient;
    private final EmailLogRepository emailLogRepository;

    @Value("${aws.ses.sender-email:noreply@hireiq.ai}")
    private String senderEmail;

    // ─── Public notification methods ──────────────────────────────────────────

    public void sendApplicationConfirmation(String email, String candidateName, String jobTitle) {
        String subject = "Application Received – " + jobTitle;
        String body = buildHtml(
            "Application Received!",
            "Hi " + candidateName + ",",
            "Thank you for applying for <strong>" + jobTitle + "</strong>. "
            + "We have received your application and our team will review your profile shortly.",
            "Our HR team will be in touch with you about the next steps in the hiring process.",
            "#4CAF50", "Application Submitted"
        );
        sendEmail(email, subject, body, Enums.NotificationType.STATUS_UPDATE, null);
    }

    public void sendShortlistNotification(String email, String candidateName, String jobTitle) {
        String subject = "Congratulations! You've been shortlisted – " + jobTitle;
        String body = buildHtml(
            "You've been Shortlisted!",
            "Hi " + candidateName + ",",
            "We are pleased to inform you that your profile has been shortlisted for the "
            + "<strong>" + jobTitle + "</strong> position.",
            "Our team will reach out to schedule the next steps in the interview process. "
            + "Please keep an eye on your inbox.",
            "#6366F1", "Profile Shortlisted"
        );
        sendEmail(email, subject, body, Enums.NotificationType.STATUS_UPDATE, null);
    }

    public void sendRejectionNotification(String email, String candidateName, String jobTitle) {
        String subject = "Update on your application – " + jobTitle;
        String body = buildHtml(
            "Application Status Update",
            "Hi " + candidateName + ",",
            "Thank you for your interest in the <strong>" + jobTitle + "</strong> position "
            + "and for taking the time to apply.",
            "After careful consideration, we have decided to move forward with other candidates "
            + "whose qualifications more closely match our current requirements. "
            + "We encourage you to apply for future openings.",
            "#64748B", "Application Update"
        );
        sendEmail(email, subject, body, Enums.NotificationType.REJECTION_NOTIFICATION, null);
    }

    public void sendInterviewInvitation(String email, String candidateName, String jobTitle,
                                         String dateTime, String mode, String meetingLink) {
        String subject = "Interview Invitation – " + jobTitle;
        String modeLabel = switch (mode != null ? mode : "") {
            case "VIDEO"     -> "Video Call";
            case "IN_PERSON" -> "In-Person";
            case "PHONE"     -> "Phone Call";
            default          -> mode != null ? mode : "Online";
        };
        String linkSection = (meetingLink != null && !meetingLink.isBlank())
            ? "<p style='margin:16px 0;'>Join link: <a href='" + meetingLink
              + "' style='color:#6366F1;'>" + meetingLink + "</a></p>"
            : "";
        String body = buildHtmlWithExtra(
            "Interview Invitation",
            "Hi " + candidateName + ",",
            "We are pleased to invite you for an interview for the <strong>" + jobTitle + "</strong> position.",
            "<table style='border-collapse:collapse;width:100%;margin:16px 0;'>"
            + "<tr><td style='padding:8px;background:#F8FAFC;border:1px solid #E2E8F0;font-weight:600;width:40%'>Date &amp; Time</td>"
            + "<td style='padding:8px;border:1px solid #E2E8F0;'>" + (dateTime != null ? dateTime : "TBD") + "</td></tr>"
            + "<tr><td style='padding:8px;background:#F8FAFC;border:1px solid #E2E8F0;font-weight:600;'>Mode</td>"
            + "<td style='padding:8px;border:1px solid #E2E8F0;'>" + modeLabel + "</td></tr>"
            + "</table>" + linkSection,
            "Please confirm your availability by replying to this email. "
            + "If you need to reschedule, contact us at least 24 hours in advance.",
            "#6366F1", "Confirm Interview"
        );
        sendEmail(email, subject, body, Enums.NotificationType.INTERVIEW_INVITATION, null);
    }

    public void sendOfferLetter(String email, String candidateName, String jobTitle) {
        String subject = "Job Offer – " + jobTitle + " at HireIQ";
        String body = buildHtml(
            "Congratulations – You've Got an Offer!",
            "Hi " + candidateName + ",",
            "We are thrilled to extend an offer of employment for the <strong>" + jobTitle + "</strong> position.",
            "Our HR team will send you the formal offer letter with all the details "
            + "including compensation, start date, and benefits. "
            + "Please review and revert at your earliest convenience.",
            "#16A34A", "View Offer"
        );
        sendEmail(email, subject, body, Enums.NotificationType.OFFER_LETTER, null);
    }

    // ─── Core send method ─────────────────────────────────────────────────────

    public void sendEmail(String to, String subject, String htmlBody,
                          Enums.NotificationType type, UUID relatedId) {
        Enums.DeliveryStatus status = Enums.DeliveryStatus.SENT;
        String errorMsg = null;

        try {
            SendEmailRequest request = SendEmailRequest.builder()
                .source(senderEmail)
                .destination(Destination.builder().toAddresses(to).build())
                .message(Message.builder()
                    .subject(Content.builder().data(subject).charset("UTF-8").build())
                    .body(Body.builder()
                        .html(Content.builder().data(htmlBody).charset("UTF-8").build())
                        .build())
                    .build())
                .build();

            sesClient.sendEmail(request);
            log.info("Email sent to {} — type={}", to, type);

        } catch (SesException e) {
            status = Enums.DeliveryStatus.FAILED;
            errorMsg = e.awsErrorDetails().errorMessage();
            log.warn("SES failed for {} type={}: {}", to, type, errorMsg);
        } catch (Exception e) {
            status = Enums.DeliveryStatus.FAILED;
            errorMsg = e.getMessage();
            log.warn("Email error for {} type={}: {}", to, type, errorMsg);
        }

        try {
            emailLogRepository.save(EmailLog.builder()
                .recipientEmail(to)
                .notificationType(type)
                .subject(subject)
                .body(htmlBody)
                .deliveryStatus(status)
                .deliveryErrorMessage(errorMsg)
                .relatedEntityId(relatedId)
                .build());
        } catch (Exception e) {
            log.error("Failed to persist EmailLog for {}: {}", to, e.getMessage());
        }
    }

    // ─── HTML template helpers ─────────────────────────────────────────────────

    private String buildHtml(String headline, String greeting, String para1, String para2,
                              String accentColor, String ctaLabel) {
        return buildHtmlWithExtra(headline, greeting, para1, "", para2, accentColor, ctaLabel);
    }

    private String buildHtmlWithExtra(String headline, String greeting, String para1,
                                       String extraHtml, String para2,
                                       String accentColor, String ctaLabel) {
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'>"
            + "<style>body{font-family:Poppins,Arial,sans-serif;margin:0;padding:0;background:#EEF0FF;}"
            + "a{color:" + accentColor + ";}"
            + "</style></head><body>"
            + "<table width='100%' cellpadding='0' cellspacing='0'><tr><td align='center' style='padding:32px 16px;'>"
            + "<table width='600' cellpadding='0' cellspacing='0' style='background:#ffffff;border-radius:8px;overflow:hidden;'>"
            // Header
            + "<tr><td style='background:#0B0F1A;padding:24px 32px;'>"
            + "<span style='color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;'>Hire</span>"
            + "<span style='color:#6366F1;font-size:22px;font-weight:700;'>IQ</span>"
            + "</td></tr>"
            // Headline band
            + "<tr><td style='background:" + accentColor + ";padding:16px 32px;'>"
            + "<p style='color:#ffffff;font-size:18px;font-weight:600;margin:0;'>" + headline + "</p>"
            + "</td></tr>"
            // Body
            + "<tr><td style='padding:32px;color:#1E293B;font-size:15px;line-height:1.6;'>"
            + "<p style='margin:0 0 16px;font-weight:600;'>" + greeting + "</p>"
            + "<p style='margin:0 0 16px;'>" + para1 + "</p>"
            + extraHtml
            + "<p style='margin:0;'>" + para2 + "</p>"
            + "</td></tr>"
            // Footer
            + "<tr><td style='background:#F8FAFC;padding:20px 32px;border-top:1px solid #E2E8F0;'>"
            + "<p style='margin:0;color:#64748B;font-size:13px;'>"
            + "This is an automated message from HireIQ. Please do not reply directly to this email.</p>"
            + "</td></tr>"
            + "</table></td></tr></table></body></html>";
    }
}
