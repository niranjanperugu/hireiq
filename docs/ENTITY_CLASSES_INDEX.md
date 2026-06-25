# HireSmart JPA Entity Classes Index

## Overview
All Spring Boot JPA entity classes for the HireSmart platform. Entities are fully mapped with relationships, constraints, and validation rules.

## Core Entities

### Organization & Access Control
- **Organization.java** - Organization/company entity
  - OneToMany: departments, users, jobs, candidates, applications, interviewPanels
  
- **Department.java** - Department within organization
  - ManyToOne: organization
  - OneToMany: jobs, users
  - Unique Constraint: (org_id, name)

- **User.java** - System users with role-based access
  - ManyToOne: organization, department
  - Roles: SUPER_ADMIN, HR_ADMINISTRATOR, RECRUITER, HIRING_MANAGER, INTERVIEW_PANEL_MEMBER, CANDIDATE
  - Unique Constraint: (org_id, email)

- **UserRole.java** - Enum for user roles

## Candidate Management

### Candidate Core
- **Candidate.java** - Individual candidate profile
  - ManyToOne: organization
  - OneToMany: skills, experiences, educations, certifications, resumes, applications
  - Unique Constraint: (org_id, email)

### Candidate Details
- **CandidateSkill.java** - Technical/soft skills
  - SkillLevel: BEGINNER, INTERMEDIATE, ADVANCED, EXPERT
  - Indexed on: skill_name
  
- **CandidateExperience.java** - Work history
  - Fields: companyName, jobTitle, startDate, endDate, isCurrent

- **CandidateEducation.java** - Educational background
  - Fields: institutionName, degree, fieldOfStudy, graduationDate, gpa

- **CandidateCertification.java** - Professional certifications
  - Fields: certificationName, issuingOrganization, issueDate, expiryDate

- **ResumeMetadata.java** - Resume file tracking
  - ParsingStatus: PENDING, SUCCESS, FAILED
  - Version control with is_current flag

## Job Management

- **Job.java** - Job postings
  - ManyToOne: organization, department, createdByUser
  - OneToMany: requirements, applications, panels
  - Status: DRAFT, OPEN, ON_HOLD, CLOSED, FILLED
  - EmploymentType: FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP
  - WorkMode: REMOTE, HYBRID, ON_SITE

- **JobRequirement.java** - Job-specific requirements
  - RequirementType: SKILL, CERTIFICATION, EDUCATION
  - Fields: requirementValue, isMandatory, priorityLevel

## Application & Matching

- **Application.java** - Candidate applications for jobs
  - ManyToOne: organization, candidate, job, shortlistedByUser
  - OneToOne: similarityScoreDetails, hiringDecision
  - OneToMany: interviewSessions, workflowStates
  - Status: APPLIED, SCREENED, SHORTLISTED, INTERVIEW_ROUND_1, INTERVIEW_ROUND_2, FINAL_INTERVIEW, OFFER_RELEASED, OFFER_ACCEPTED, HIRED, REJECTED, WITHDRAWN
  - Composite Index: (candidate_id, job_id)

- **SimilarityScore.java** - AI-calculated match scores
  - Fields:
    - skillMatchPercentage (40%)
    - experienceMatchPercentage (25%)
    - educationMatchPercentage (15%)
    - industryRelevancePercentage (10%)
    - certificationMatchPercentage (10%)
    - overallScore
  - Indexed on: overall_score

## Interview Management

### Interview Setup
- **InterviewRound.java** - Predefined interview rounds
  - ManyToOne: organization
  - InterviewType: TECHNICAL, HR, BEHAVIORAL, DESIGN, LEADERSHIP
  - Fields: name, sequenceNumber, estimatedDurationMinutes

- **InterviewPanel.java** - Interview panel configurations
  - ManyToOne: organization, job, createdByUser
  - OneToMany: members, interviewSessions

- **InterviewPanelMember.java** - Interviewers in panels
  - ManyToOne: panel, user
  - Unique Constraint: (panel_id, user_id)
  - Roles: TECHNICAL_LEAD, HR_REPRESENTATIVE, HIRING_MANAGER

### Interview Execution
- **InterviewSession.java** - Scheduled interview sessions
  - ManyToOne: organization, application, panel, round
  - OneToMany: sessionQuestions
  - OneToOne: feedbackForm
  - Status: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, RESCHEDULED
  - Indexed on: (scheduled_at, status)

- **InterviewQuestion.java** - Interview question library
  - ManyToOne: organization, createdByUser
  - InterviewType: TECHNICAL, HR, BEHAVIORAL, DESIGN, LEADERSHIP
  - Fields: skillTag, difficultyLevel, questionText, expectedAnswer, aiGenerated

- **InterviewSessionQuestion.java** - Questions asked in sessions
  - ManyToOne: interviewSession, question
  - Fields: sequenceNumber, askedAt, candidateAnswer

### Feedback & Evaluation
- **FeedbackForm.java** - Interviewer feedback/evaluations
  - OneToOne: interviewSession
  - ManyToOne: evaluatorUser
  - Rating: STRONG_HIRE, HIRE, NEUTRAL, NO_HIRE, STRONG_NO_HIRE
  - Fields: technicalRating, communicationRating, culturalFitRating, problemSolvingRating

- **EvaluationCriteria.java** - Organization-wide evaluation criteria
  - ManyToOne: organization
  - InterviewType: TECHNICAL, HR, BEHAVIORAL, DESIGN, LEADERSHIP
  - Fields: criteriaName, maxScore, weightPercentage

## Scheduling & Calendar

- **CalendarIntegration.java** - External calendar provider integrations
  - ManyToOne: user
  - Providers: GOOGLE, OUTLOOK
  - Unique Constraint: (user_id, provider)
  - OAuth token management

- **InterviewAvailability.java** - Time slots for interviewers
  - ManyToOne: user
  - Fields: dateFrom, dateTo, startTime, endTime, recurringPattern
  - RecurringPattern: DAILY, WEEKLY, MONTHLY

## Workflow & Decisions

- **WorkflowState.java** - Candidate status transitions
  - ManyToOne: organization, application, transitionedByUser
  - FromStatus, ToStatus: CandidateStatus enums
  - Complete audit trail of changes

- **HiringDecision.java** - Final hiring decisions
  - OneToOne: application
  - ManyToOne: decidedByUser
  - Decision: HIRE, NO_HIRE, PENDING
  - Fields: decisionNotes, finalFeedbackSummary

## Notifications & Communication

- **Notification.java** - In-app notifications
  - ManyToOne: recipientUser
  - NotificationType: INTERVIEW_INVITATION, SCHEDULING_REMINDER, FEEDBACK_REMINDER, OFFER_LETTER, REJECTION_NOTIFICATION, STATUS_UPDATE, ASSIGNMENT_ALERT
  - Indexed on: (recipient_user_id, is_read)

- **EmailLog.java** - Email delivery logs
  - NotificationType: (all types)
  - DeliveryStatus: SENT, FAILED, BOUNCED
  - GDPR audit trail

## Audit & Compliance

- **AuditLog.java** - Complete audit trail
  - ManyToOne: organization, user
  - JSONB Fields: oldValues, newValues for change tracking
  - Indexed on: (org_id, entity_type, created_at)
  - Required for GDPR compliance

- **EventLog.java** - Event stream for analytics
  - ManyToOne: organization
  - JSONB Field: eventData for flexible storage
  - Event sourcing support

## Enum Classes

- **Enums.java** - Centralized enum definitions
  - EmploymentType: FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP
  - WorkMode: REMOTE, HYBRID, ON_SITE
  - JobStatus: DRAFT, OPEN, ON_HOLD, CLOSED, FILLED
  - CandidateStatus: (11 statuses covering full hiring pipeline)
  - InterviewType: TECHNICAL, HR, BEHAVIORAL, DESIGN, LEADERSHIP
  - InterviewStatus: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, RESCHEDULED
  - FeedbackRating: STRONG_HIRE, HIRE, NEUTRAL, NO_HIRE, STRONG_NO_HIRE
  - NotificationType: (7 types)
  - SkillLevel: BEGINNER, INTERMEDIATE, ADVANCED, EXPERT
  - ParsingStatus: PENDING, SUCCESS, FAILED
  - DeliveryStatus: SENT, FAILED, BOUNCED

## Relationships Summary

### Entity Hierarchy
```
Organization (Root)
├── Departments
├── Users
├── Jobs
│   ├── JobRequirements
│   └── InterviewPanels
│       └── InterviewPanelMembers
├── Candidates
│   ├── CandidateSkills
│   ├── CandidateExperiences
│   ├── CandidateEducations
│   ├── CandidateCertifications
│   ├── ResumesMetadata
│   └── Applications
│       ├── SimilarityScores
│       ├── InterviewSessions
│       │   ├── InterviewSessionQuestions
│       │   └── FeedbackForms
│       ├── WorkflowStates
│       └── HiringDecisions
├── InterviewRounds
├── InterviewQuestions
├── EvaluationCriterias
├── Notifications
├── EmailLogs
├── AuditLogs
└── EventLogs
```

## Best Practices Applied

1. **UUID Primary Keys** - Distributed system support
2. **Fetch Strategies** - FetchType.LAZY for performance
3. **Cascading** - CascadeType.ALL with orphanRemoval=true where appropriate
4. **Timestamp Automation** - @PrePersist and @PreUpdate for automatic management
5. **Constraints** - Unique and composite constraints enforced at database level
6. **Indexing** - Strategic indexes on frequently queried fields
7. **Auditing** - Complete audit trail with AuditLog and EventLog
8. **Soft Deletes** - Not implemented (hard deletes with cascading)
9. **Enums** - Type-safe status/category fields

## Annotations Used

- `@Entity`, `@Table` - JPA entity definition
- `@Id`, `@GeneratedValue` - Primary key
- `@ManyToOne`, `@OneToMany`, `@OneToOne` - Relationships
- `@JoinColumn` - Foreign key specification
- `@Enumerated(EnumType.STRING)` - Enum mapping
- `@Column` - Column customization
- `@PrePersist`, `@PreUpdate` - Lifecycle callbacks
- `@JdbcTypeCode(SqlTypes.JSON)` - JSONB field support
- `@UniqueConstraint` - Unique constraint definition
- `@Builder`, `@Data`, `@NoArgsConstructor`, `@AllArgsConstructor` - Lombok annotations

## Next Steps

1. Create Spring Data JPA Repositories for each entity
2. Implement DTOs for API request/response mapping
3. Create Service layer for business logic
4. Implement REST Controllers
5. Add validation annotations (@NotNull, @NotBlank, @Email, etc.)
6. Configure JPA auditing for automatic user/timestamp tracking
