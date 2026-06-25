# HireSmart Database Schema Documentation

## Overview
The HireSmart database is designed to support a comprehensive enterprise recruitment and interview management platform. The schema follows a normalized relational model with PostgreSQL as the primary database.

## Key Features
- **Multi-tenancy**: Organizations with departments and role-based access
- **Scalability**: Indexed queries for fast retrieval of candidates, jobs, and interviews
- **Audit Trail**: Complete audit logging for compliance and security
- **Workflow Management**: Candidate journey tracking and state transitions
- **Real-time Notifications**: Event-driven architecture support

---

## Database Tables Overview

### 1. Organization & Access Control

#### `organizations`
Stores organization/company information.
- **Key Fields**: `id`, `name`, `email`, `industry`, `company_size`
- **Purpose**: Base entity for multi-tenancy

#### `departments`
Organizational departments within organizations.
- **Key Fields**: `org_id`, `name`, `head_user_id`
- **Relationships**: References `organizations` and `users`

#### `users`
System users with different roles (Admin, Recruiter, Hiring Manager, etc.).
- **Key Fields**: `id`, `email`, `password_hash`, `role`, `department_id`
- **Roles**: SUPER_ADMIN, HR_ADMINISTRATOR, RECRUITER, HIRING_MANAGER, INTERVIEW_PANEL_MEMBER, CANDIDATE
- **Purpose**: User management and RBAC

#### `refresh_tokens`
JWT refresh tokens for session management.
- **Purpose**: Secure token-based authentication
- **Relationships**: References `users`

---

### 2. Job Management

#### `jobs`
Job postings created by recruiters/hiring managers.
- **Key Fields**: `id`, `org_id`, `title`, `employment_type`, `work_mode`, `salary_range`, `status`
- **Status Types**: DRAFT, OPEN, ON_HOLD, CLOSED, FILLED
- **Relationships**: References `organizations`, `departments`, `users`

#### `job_requirements`
Specific requirements for jobs (skills, certifications, education).
- **Key Fields**: `job_id`, `requirement_type`, `requirement_value`, `is_mandatory`
- **Purpose**: Store technical and non-technical job requirements
- **Relationships**: References `jobs`

---

### 3. Candidate Management

#### `candidates`
Individual candidate profiles with personal and professional information.
- **Key Fields**: `id`, `org_id`, `email`, `phone`, `current_company`, `total_experience_years`
- **Purpose**: Core candidate entity
- **Relationships**: References `organizations`

#### `candidate_skills`
Technical and soft skills associated with candidates.
- **Key Fields**: `candidate_id`, `skill_name`, `skill_level`, `years_of_experience`
- **Skill Levels**: BEGINNER, INTERMEDIATE, ADVANCED, EXPERT
- **Purpose**: Searchable skill inventory
- **Index**: `skill_name` for fast filtering

#### `candidate_experience`
Work experience history of candidates.
- **Key Fields**: `candidate_id`, `company_name`, `job_title`, `start_date`, `end_date`
- **Purpose**: Chronological work history

#### `candidate_education`
Educational background of candidates.
- **Key Fields**: `candidate_id`, `institution_name`, `degree`, `graduation_date`, `gpa`
- **Purpose**: Educational qualifications tracking

#### `candidate_certifications`
Professional certifications and credentials.
- **Key Fields**: `candidate_id`, `certification_name`, `issuing_organization`, `expiry_date`
- **Purpose**: Track industry certifications

#### `resume_metadata`
Uploaded resume file information and parsing status.
- **Key Fields**: `candidate_id`, `file_name`, `file_url`, `parsing_status`
- **Purpose**: Resume document tracking and versioning
- **Status**: PENDING, SUCCESS, FAILED

---

### 4. Applications & Candidate-Job Matching

#### `applications`
Candidate applications for specific job openings.
- **Key Fields**: `candidate_id`, `job_id`, `status`, `similarity_score`, `is_shortlisted`
- **Status Values**: APPLIED, SCREENED, SHORTLISTED, INTERVIEW_ROUND_1, INTERVIEW_ROUND_2, FINAL_INTERVIEW, OFFER_RELEASED, OFFER_ACCEPTED, HIRED, REJECTED, WITHDRAWN
- **Purpose**: Track candidate journey through hiring pipeline
- **Relationships**: References `candidates`, `jobs`, `organizations`, `users`
- **Index**: Composite index on `(candidate_id, job_id)` for uniqueness checks

#### `similarity_scores`
AI-calculated similarity/match scores between candidate and job requirements.
- **Key Fields**: `application_id`, `skill_match_percentage`, `experience_match_percentage`, `education_match_percentage`, `industry_relevance_percentage`, `certification_match_percentage`, `overall_score`
- **Scoring Breakdown**:
  - Skill Match: 40%
  - Experience Match: 25%
  - Education Match: 15%
  - Industry Relevance: 10%
  - Certifications: 10%
- **Purpose**: AI-powered candidate ranking
- **Index**: Indexed on `overall_score` for sorting

---

### 5. Interview Management

#### `interview_rounds`
Predefined interview rounds for the hiring process.
- **Key Fields**: `org_id`, `name`, `sequence_number`, `interview_type`, `estimated_duration_minutes`
- **Interview Types**: TECHNICAL, HR, BEHAVIORAL, DESIGN, LEADERSHIP
- **Purpose**: Define interview workflow stages
- **Relationships**: References `organizations`

#### `interview_panels`
Interview panel configurations for jobs.
- **Key Fields**: `id`, `org_id`, `job_id`, `name`, `created_by_user_id`
- **Purpose**: Group interviewers for specific job panels
- **Relationships**: References `organizations`, `jobs`, `users`

#### `interview_panel_members`
Interviewers assigned to interview panels.
- **Key Fields**: `panel_id`, `user_id`, `role`
- **Purpose**: Track panel composition
- **Relationships**: References `interview_panels`, `users`
- **Unique Constraint**: Prevents duplicate panel members

#### `interview_sessions`
Scheduled interview sessions for candidates.
- **Key Fields**: `application_id`, `panel_id`, `round_id`, `scheduled_at`, `status`, `meeting_link`
- **Status**: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, RESCHEDULED
- **Purpose**: Manage interview scheduling and execution
- **Relationships**: References `applications`, `interview_panels`, `interview_rounds`
- **Index**: Indexed on `(scheduled_at, status)` for calendar views

#### `interview_questions`
AI-generated or manually created interview questions.
- **Key Fields**: `org_id`, `interview_type`, `skill_tag`, `difficulty_level`, `question_text`, `ai_generated`
- **Difficulty Levels**: EASY, MEDIUM, HARD
- **Purpose**: Question library for structured interviews
- **Relationships**: References `organizations`, `users`

#### `interview_session_questions`
Questions asked in specific interview sessions.
- **Key Fields**: `interview_session_id`, `question_id`, `sequence_number`, `candidate_answer`
- **Purpose**: Record questions asked and answers provided
- **Relationships**: References `interview_sessions`, `interview_questions`

---

### 6. Feedback & Evaluations

#### `feedback_forms`
Interviewer feedback and evaluations for interview sessions.
- **Key Fields**: `interview_session_id`, `evaluator_user_id`, `overall_rating`, `technical_rating`, `communication_rating`, `cultural_fit_rating`, `problem_solving_rating`, `feedback_notes`, `recommendation`
- **Rating Options**: STRONG_HIRE, HIRE, NEUTRAL, NO_HIRE, STRONG_NO_HIRE
- **Purpose**: Capture structured interview feedback
- **Relationships**: References `interview_sessions`, `users`

#### `evaluation_criteria`
Organization-wide evaluation criteria for interviews.
- **Key Fields**: `org_id`, `interview_type`, `criteria_name`, `max_score`, `weight_percentage`
- **Purpose**: Define scoring framework for interviews
- **Relationships**: References `organizations`

---

### 7. Scheduling & Calendar Integration

#### `calendar_integrations`
External calendar provider integrations (Google, Outlook).
- **Key Fields**: `user_id`, `provider`, `access_token`, `refresh_token`, `token_expires_at`, `is_active`
- **Providers**: GOOGLE, OUTLOOK
- **Purpose**: Sync interview scheduling with personal calendars
- **Relationships**: References `users`
- **Security**: Tokens stored for OAuth integration

#### `interview_availability`
Time slots when users are available for interviews.
- **Key Fields**: `user_id`, `date_from`, `date_to`, `start_time`, `end_time`, `is_available`, `recurring_pattern`
- **Recurring Patterns**: DAILY, WEEKLY, MONTHLY
- **Purpose**: Define interviewer availability
- **Relationships**: References `users`

---

### 8. Notifications

#### `notifications`
In-app notifications for users.
- **Key Fields**: `recipient_user_id`, `notification_type`, `title`, `message`, `related_entity_id`, `is_read`
- **Notification Types**: INTERVIEW_INVITATION, SCHEDULING_REMINDER, FEEDBACK_REMINDER, OFFER_LETTER, REJECTION_NOTIFICATION, STATUS_UPDATE, ASSIGNMENT_ALERT
- **Purpose**: Real-time user notifications
- **Relationships**: References `users`
- **Index**: Indexed on `(recipient_user_id, is_read)` for inbox queries

#### `email_logs`
Email delivery logs for audit trail.
- **Key Fields**: `recipient_email`, `notification_type`, `subject`, `body`, `sent_at`, `delivery_status`
- **Delivery Status**: SENT, FAILED, BOUNCED
- **Purpose**: Track all outgoing emails
- **Compliance**: Required for GDPR audit trail

---

### 9. Audit & Compliance

#### `audit_logs`
Complete audit trail of all data modifications.
- **Key Fields**: `org_id`, `user_id`, `action`, `entity_type`, `entity_id`, `old_values`, `new_values`, `ip_address`, `user_agent`, `created_at`
- **Purpose**: GDPR compliance and security monitoring
- **Relationships**: References `organizations`, `users`
- **JSONB Fields**: Store old and new values for change tracking
- **Index**: Composite index on `(org_id, entity_type, created_at)`

#### `event_logs`
Event stream for analytics and real-time processing.
- **Key Fields**: `org_id`, `event_type`, `entity_type`, `entity_id`, `event_data`, `created_at`
- **Purpose**: Event sourcing and analytics
- **JSONB Field**: Flexible event data storage
- **Relationships**: References `organizations`

---

### 10. Workflow Management

#### `workflow_states`
State transitions in the candidate hiring pipeline.
- **Key Fields**: `application_id`, `from_status`, `to_status`, `transitioned_by_user_id`, `reason`, `transitioned_at`
- **Purpose**: Track candidate journey progression
- **Relationships**: References `applications`, `users`
- **Audit**: Complete history of status changes

#### `hiring_decisions`
Final hiring decisions for candidates.
- **Key Fields**: `application_id`, `decision`, `decided_by_user_id`, `decision_notes`, `final_feedback_summary`, `decided_at`
- **Decision Values**: HIRE, NO_HIRE, PENDING
- **Purpose**: Record final hiring recommendations
- **Relationships**: References `applications`, `users`

---

## Entity Relationship Diagram (Conceptual)

```
organizations (org_id)
├── departments
├── users
├── jobs
├── candidates
├── applications
│   ├── similarity_scores
│   ├── workflow_states
│   ├── hiring_decisions
│   └── interview_sessions
│       ├── interview_session_questions
│       └── feedback_forms
├── interview_panels
│   └── interview_panel_members
├── interview_rounds
├── interview_questions
├── evaluation_criteria
├── notifications
├── email_logs
├── audit_logs
├── event_logs
└── calendar_integrations
```

---

## Indexing Strategy

### High-Priority Indexes (Performance Critical)
1. **`applications(status, org_id)`** - Candidate pipeline queries
2. **`applications(candidate_id, job_id)`** - Duplicate application checks
3. **`candidate_skills(skill_name)`** - Skill-based searches
4. **`interview_sessions(scheduled_at, status)`** - Calendar views
5. **`notifications(recipient_user_id, is_read)`** - User inbox

### Secondary Indexes
1. **`users(email, org_id)`** - Login and user lookups
2. **`jobs(status, org_id)`** - Job listing queries
3. **`audit_logs(org_id, entity_type, created_at)`** - Compliance reports
4. **`candidates(email, org_id)`** - Candidate lookups

---

## Data Integrity & Constraints

### Unique Constraints
- `users(org_id, email)` - Email uniqueness within organization
- `candidates(org_id, email)` - Candidate email uniqueness
- `departments(org_id, name)` - Department names unique per org
- `interview_panel_members(panel_id, user_id)` - No duplicate panel members
- `calendar_integrations(user_id, provider)` - One integration per provider

### Foreign Key Constraints
- All child entities cascade on parent deletion
- Interview and feedback entities use RESTRICT to prevent accidental data loss
- User deletion cascades notifications and refresh tokens

### Check Constraints
- Experience years: min <= max
- Salary range: min <= max
- Interview dates: end_time > start_time
- Evaluation scores: 0 <= score <= 100

---

## Data Types & Encoding

- **UUIDs**: Primary keys for distributed system support
- **TIMESTAMPS**: All created_at/updated_at use UTC
- **JSONB**: Flexible storage for audit logs and event data
- **DECIMAL(12,2)**: Salary and financial data
- **ENUM**: Strong typing for status fields

---

## Performance Optimization Tips

1. **Pagination**: Always use LIMIT/OFFSET for large result sets
2. **Query Optimization**: Use composite indexes for multi-column WHERE clauses
3. **Connection Pooling**: Configure HikariCP with appropriate pool size (10-20)
4. **Batch Operations**: Use batch inserts for resume parsing results
5. **Archive Strategy**: Archive old audit logs to separate table after 1 year

---

## Backup & Recovery

- Daily automated backups to S3
- Point-in-time recovery enabled (30-day retention)
- Monthly full backups for long-term retention
- Test recovery procedures quarterly

---

## Security & Compliance

- **GDPR**: Candidate data can be deleted via cascade; audit logs maintained for 30 days minimum
- **Encryption**: Passwords hashed with bcrypt; sensitive tokens encrypted at rest
- **Access Control**: RBAC enforced at application layer; SQL-level access control via database roles
- **Audit Trail**: All modifications logged with user ID, timestamp, and IP address

---

## Migration & Deployment

### Initial Setup
```sql
-- Execute database_schema.sql to create all tables
-- Run seed scripts for evaluation criteria and interview questions
```

### Version Control
- Use Flyway for database migrations
- Migration naming: V001__Initial_Schema.sql, V002__Add_Resume_Parsing.sql
- All migrations are reversible

---

## Future Enhancements

1. **Partitioning**: Partition audit_logs by org_id for scale
2. **Materialized Views**: For analytics dashboards
3. **Full-Text Search**: PostgreSQL FTS for resume/document search
4. **Vector Search**: For AI-powered candidate similarity using embeddings
5. **Time-Series Data**: Hiring metrics and KPI tracking
