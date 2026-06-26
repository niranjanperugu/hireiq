package com.hiresmart.entity;

public class Enums {

    public enum EmploymentType {
        FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, FREELANCE, TEMPORARY
    }

    public enum WorkMode {
        REMOTE, HYBRID, ON_SITE
    }

    public enum JobStatus {
        DRAFT, OPEN, ON_HOLD, CLOSED, FILLED
    }

    public enum CandidateStatus {
        APPLIED, SCREENED, SHORTLISTED, INTERVIEW_ROUND_1, INTERVIEW_ROUND_2,
        FINAL_INTERVIEW, OFFER_RELEASED, OFFER_ACCEPTED, HIRED, REJECTED, WITHDRAWN
    }

    public enum InterviewType {
        TECHNICAL, HR, BEHAVIORAL, DESIGN, LEADERSHIP
    }

    public enum InterviewStatus {
        SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, RESCHEDULED
    }

    public enum FeedbackRating {
        STRONG_HIRE, HIRE, NEUTRAL, NO_HIRE, STRONG_NO_HIRE
    }

    public enum NotificationType {
        INTERVIEW_INVITATION, SCHEDULING_REMINDER, FEEDBACK_REMINDER,
        OFFER_LETTER, REJECTION_NOTIFICATION, STATUS_UPDATE, ASSIGNMENT_ALERT
    }

    public enum SkillLevel {
        BEGINNER, INTERMEDIATE, ADVANCED, EXPERT
    }

    public enum ParsingStatus {
        PENDING, SUCCESS, FAILED
    }

    public enum DeliveryStatus {
        SENT, FAILED, BOUNCED
    }

    public enum AIInterviewStatus {
        PENDING,
        IN_PROGRESS,
        COMPLETED,
        EXPIRED
    }

    public enum AssessmentStatus {
        PENDING,
        IN_PROGRESS,
        COMPLETED,
        EXPIRED
    }
}
