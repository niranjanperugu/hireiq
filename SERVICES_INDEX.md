# HireSmart Service Layer Index

## Overview
Business logic layer implementing core application features with transaction management and comprehensive logging.

## Implemented Services

### CandidateService
- **getAllCandidates(UUID organizationId, Pageable)** - Paginated list
- **searchCandidates(UUID, String, Pageable)** - Full-text search
- **getCandidateById(UUID, UUID)** - Single candidate retrieval
- **createCandidate(UUID, CandidateDTO)** - Create with validation
- **updateCandidate(UUID, UUID, CandidateDTO)** - Update existing
- **deleteCandidate(UUID, UUID)** - Soft/hard delete
- **findBySkill(UUID, String, Pageable)** - Filter by skill
- **findByExperienceRange(UUID, Double, Double, Pageable)** - Experience filter
- **getCandidateCount(UUID)** - Count metric

### JobService
- **getAllJobs(UUID, Pageable)** - Paginated list
- **getJobsByStatus(UUID, JobStatus, Pageable)** - Status filter
- **searchJobs(UUID, String, Pageable)** - Full-text search
- **getJobById(UUID, UUID)** - Single job retrieval
- **createJob(UUID, JobDTO)** - Create posting
- **updateJob(UUID, UUID, JobDTO)** - Update fields
- **publishJob(UUID, UUID)** - Change status to OPEN
- **closeJob(UUID, UUID)** - Mark as CLOSED
- **deleteJob(UUID, UUID)** - Delete posting
- **getOpenJobs(UUID)** - Active postings
- **getJobsByDepartment(UUID, UUID, Pageable)** - Department filter
- **getJobCount(UUID)** - Count metric

## Services To Implement

### ApplicationService
- **applyForJob(UUID, UUID, UUID)** - Create application
- **getApplicationsByCandidate(UUID, UUID, Pageable)** - Candidate's apps
- **getApplicationsByJob(UUID, UUID, Pageable)** - Job's apps
- **getApplicationsByStatus(UUID, CandidateStatus, Pageable)** - Status filter
- **updateApplicationStatus(UUID, UUID, CandidateStatus)** - State transition
- **shortlistApplications(UUID, List<UUID>)** - Batch shortlist
- **rejectApplication(UUID, UUID, String)** - Rejection with reason
- **getHighScoringApplications(UUID, UUID, Double, Pageable)** - Top matches
- **calculateApplicationMetrics(UUID)** - KPI calculations
- **getApplicationsForUserPipeline(UUID, UUID, Pageable)** - User-specific view

### InterviewService
- **scheduleInterview(UUID, UUID, UUID, UUID, LocalDateTime)** - Schedule session
- **getRescheduleAvailability(UUID, UUID)** - Available time slots
- **rescheduleInterview(UUID, UUID, LocalDateTime)** - Change time
- **getInterviewsByApplication(UUID, UUID, Pageable)** - Interview history
- **getUpcomingInterviews(UUID, Pageable)** - Next 30 days
- **completeInterview(UUID, UUID)** - Mark as completed
- **cancelInterview(UUID, UUID, String)** - With reason
- **getInterviewsForUser(UUID, UUID, Pageable)** - User's interviews
- **getInterviewMetrics(UUID)** - Interview KPIs
- **assignPanelMembers(UUID, UUID, List<UUID>)** - Setup panel

### FeedbackService
- **submitFeedback(UUID, UUID, FeedbackFormDTO)** - Create feedback
- **getFeedbackByInterview(UUID, UUID)** - Interview feedback
- **getFeedbackByCandidate(UUID, UUID)** - All candidate feedback
- **getAverageFeedbackScores(UUID, UUID)** - Candidate metrics
- **getFeedbackDistribution(UUID, UUID)** - Rating breakdown
- **updateFeedback(UUID, UUID, FeedbackFormDTO)** - Edit submission
- **getFeedbackSummary(UUID, UUID)** - Consolidated feedback
- **calculateFinalRecommendation(UUID, UUID)** - Aggregate recommendation

### InterviewQuestionService
- **getQuestionsByType(UUID, InterviewType)** - Question library
- **getQuestionsBySkill(UUID, String)** - Skill-based questions
- **createQuestion(UUID, InterviewQuestionDTO)** - Add to library
- **updateQuestion(UUID, UUID, InterviewQuestionDTO)** - Edit question
- **deleteQuestion(UUID, UUID)** - Remove question
- **getQuestionsForInterview(UUID, UUID)** - Session questions
- **addQuestionToSession(UUID, UUID, UUID)** - Map to session
- **generateAIQuestions(UUID, String, InterviewType, int)** - AI generation

### ResumeService
- **uploadResume(UUID, UUID, MultipartFile)** - Store file
- **parseResume(UUID, UUID)** - Extract data
- **getResumeHistory(UUID, UUID)** - Version history
- **setCurrentResume(UUID, UUID, UUID)** - Make active
- **deleteResume(UUID, UUID)** - Remove file
- **getParsingStatus(UUID, UUID)** - Check progress
- **reParseResume(UUID, UUID)** - Retry parsing

### NotificationService
- **sendInterviewInvitation(UUID, UUID, UUID)** - Email + in-app
- **sendSchedulingReminder(UUID, UUID)** - Interview reminder
- **sendFeedbackReminder(UUID, UUID)** - Feedback completion reminder
- **sendOfferLetter(UUID, UUID)** - Offer notification
- **sendRejectionNotification(UUID, UUID)** - Rejection notice
- **sendStatusUpdate(UUID, UUID)** - Pipeline update
- **getUnreadNotifications(UUID, UUID)** - User's inbox
- **markAsRead(UUID, UUID)** - Mark notification read
- **sendBulkNotifications(UUID, List<UUID>, String)** - Batch send

### InterviewPanelService
- **createPanel(UUID, UUID, InterviewPanelDTO)** - Setup panel
- **addMemberToPanel(UUID, UUID, UUID)** - Add interviewer
- **removeMemberFromPanel(UUID, UUID, UUID)** - Remove interviewer
- **getPanelMembers(UUID, UUID)** - Panel composition
- **updatePanel(UUID, UUID, InterviewPanelDTO)** - Edit details
- **deletePanel(UUID, UUID)** - Remove panel
- **getPanelsForJob(UUID, UUID)** - Job's panels

### AnalyticsService
- **getRecruitmentMetrics(UUID)** - Overall KPIs
- **getCandidatePipeline(UUID)** - Status distribution
- **getTimeToHireMetrics(UUID)** - Hiring duration
- **getCostPerHireMetrics(UUID)** - Cost analysis
- **getOfferAcceptanceRate(UUID)** - Success metrics
- **getSourceAnalytics(UUID)** - Application sources
- **getInterviewMetrics(UUID)** - Interview stats
- **getDepartmentMetrics(UUID, UUID)** - Dept-specific KPIs
- **getRecruiterMetrics(UUID, UUID)** - Recruiter performance
- **getTrendAnalysis(UUID, String, DateRange)** - Historical trends

### HiringDecisionService
- **makeHiringDecision(UUID, UUID, String, String)** - Record decision
- **getHiringDecision(UUID, UUID)** - Retrieve decision
- **updateHiringDecision(UUID, UUID, String, String)** - Change decision
- **generateOfferLetter(UUID, UUID)** - Create offer
- **generateRejectionLetter(UUID, UUID)** - Create rejection
- **getDecisionMetrics(UUID)** - Decision statistics

### UserService
- **createUser(UUID, CreateUserDTO)** - Register user
- **getUserById(UUID, UUID)** - Retrieve user
- **updateUserProfile(UUID, UUID, UserDTO)** - Update info
- **deleteUser(UUID, UUID)** - Deactivate/delete
- **changePassword(UUID, UUID, String, String)** - Password change
- **resetPassword(UUID, String)** - Password reset
- **getUsersByRole(UUID, UserRole)** - Filter by role
- **getUsersByDepartment(UUID, UUID)** - Dept members
- **searchUsers(UUID, String, Pageable)** - User search

### CalendarService
- **integrateGoogleCalendar(UUID, UUID, String)** - Connect Google
- **integrateOutlookCalendar(UUID, UUID, String)** - Connect Outlook
- **getAvailableSlots(UUID, UUID, LocalDate, LocalDate)** - Fetch slots
- **createCalendarEvent(UUID, UUID, InterviewSessionDTO)** - Create event
- **updateCalendarEvent(UUID, UUID, LocalDateTime)** - Update event
- **cancelCalendarEvent(UUID, UUID)** - Delete event
- **syncCalendars(UUID, UUID)** - Refresh availability
- **disconnectCalendar(UUID, UUID)** - Revoke access

### AuditService
- **logAction(UUID, String, String, UUID, Object, Object)** - Record action
- **getAuditLogs(UUID, Pageable)** - Retrieve logs
- **getAuditsByEntity(UUID, String, UUID, Pageable)** - Entity history
- **getAuditsByUser(UUID, UUID, Pageable)** - User actions
- **generateComplianceReport(UUID, DateRange)** - Audit report

### EmailService
- **sendInterviewInvitation(String, String, LocalDateTime, String)** - Email send
- **sendSchedulingReminder(String, String, LocalDateTime)** - Reminder email
- **sendFeedbackReminder(String, String)** - Feedback email
- **sendOfferLetter(String, String, BigDecimal)** - Offer email
- **sendRejectionLetter(String, String, String)** - Rejection email
- **sendBulkEmail(List<String>, String, String)** - Batch send

## Service Layer Patterns

### Transaction Management
```java
@Service
@Transactional
public class MyService {
    @Transactional(readOnly = true)
    public void getMethod() { }
    
    @Transactional
    public void updateMethod() { }
}
```

### Exception Handling
```java
throw new ResourceNotFoundException("Entity", "field", value);
throw new IllegalArgumentException("Invalid state");
throw new AccessDeniedException("Unauthorized access");
```

### Logging
```java
@Slf4j
public class MyService {
    log.info("Action completed: {}", id);
    log.error("Error occurred", exception);
}
```

### DTO Conversion
```java
private DTO convertToDTO(Entity entity) {
    return DTO.builder()
        .field(entity.getField())
        .build();
}
```

## Best Practices Applied

1. **Single Responsibility** - Each service has one domain
2. **Transaction Boundaries** - Proper @Transactional usage
3. **Logging** - Comprehensive logging for debugging
4. **Exception Handling** - Custom exceptions with details
5. **DTO Conversion** - Separation of entity from API
6. **Repository Injection** - Dependency injection
7. **Read-only Queries** - @Transactional(readOnly=true)
8. **Validation** - Input validation before processing
9. **Metric Queries** - Separate count/metric methods
10. **Async Processing** - @Async for heavy operations

## Next Steps

1. Implement remaining services
2. Add @Async for long-running operations
3. Implement caching with @Cacheable
4. Add event publishing for domain events
5. Implement email templates
6. Create batch operations for performance
7. Add search optimization with Elasticsearch
