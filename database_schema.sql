-- HireSmart Database Schema
-- PostgreSQL DDL Script
-- Created: 2026-06-19

-- ============================================================================
-- 1. ENUMS AND CUSTOM TYPES
-- ============================================================================

CREATE TYPE user_role AS ENUM (
    'SUPER_ADMIN',
    'HR_ADMINISTRATOR',
    'RECRUITER',
    'HIRING_MANAGER',
    'INTERVIEW_PANEL_MEMBER',
    'CANDIDATE'
);

CREATE TYPE employment_type AS ENUM (
    'FULL_TIME',
    'PART_TIME',
    'CONTRACT',
    'INTERNSHIP'
);

CREATE TYPE work_mode AS ENUM (
    'REMOTE',
    'HYBRID',
    'ON_SITE'
);

CREATE TYPE job_status AS ENUM (
    'DRAFT',
    'OPEN',
    'ON_HOLD',
    'CLOSED',
    'FILLED'
);

CREATE TYPE candidate_status AS ENUM (
    'APPLIED',
    'SCREENED',
    'SHORTLISTED',
    'INTERVIEW_ROUND_1',
    'INTERVIEW_ROUND_2',
    'FINAL_INTERVIEW',
    'OFFER_RELEASED',
    'OFFER_ACCEPTED',
    'HIRED',
    'REJECTED',
    'WITHDRAWN'
);

CREATE TYPE interview_type AS ENUM (
    'TECHNICAL',
    'HR',
    'BEHAVIORAL',
    'DESIGN',
    'LEADERSHIP'
);

CREATE TYPE interview_status AS ENUM (
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'RESCHEDULED'
);

CREATE TYPE feedback_rating AS ENUM (
    'STRONG_HIRE',
    'HIRE',
    'NEUTRAL',
    'NO_HIRE',
    'STRONG_NO_HIRE'
);

CREATE TYPE notification_type AS ENUM (
    'INTERVIEW_INVITATION',
    'SCHEDULING_REMINDER',
    'FEEDBACK_REMINDER',
    'OFFER_LETTER',
    'REJECTION_NOTIFICATION',
    'STATUS_UPDATE',
    'ASSIGNMENT_ALERT'
);

CREATE TYPE skill_level AS ENUM (
    'BEGINNER',
    'INTERMEDIATE',
    'ADVANCED',
    'EXPERT'
);

-- ============================================================================
-- 2. CORE TABLES
-- ============================================================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    website VARCHAR(255),
    industry VARCHAR(100),
    company_size VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    head_user_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(org_id, name)
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role user_role NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(org_id, email)
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_revoked BOOLEAN DEFAULT false
);

-- ============================================================================
-- 3. JOB MANAGEMENT TABLES
-- ============================================================================

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    min_experience_years INT,
    max_experience_years INT,
    employment_type employment_type NOT NULL,
    work_mode work_mode NOT NULL,
    salary_min DECIMAL(12, 2),
    salary_max DECIMAL(12, 2),
    salary_currency VARCHAR(3) DEFAULT 'USD',
    location VARCHAR(255) NOT NULL,
    status job_status DEFAULT 'DRAFT',
    posted_date TIMESTAMP,
    closed_date TIMESTAMP,
    filled_by_candidate_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE job_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    requirement_type VARCHAR(50) NOT NULL, -- 'SKILL', 'CERTIFICATION', 'EDUCATION'
    requirement_value VARCHAR(255) NOT NULL,
    is_mandatory BOOLEAN DEFAULT true,
    priority_level INT DEFAULT 1
);

-- ============================================================================
-- 4. CANDIDATE MANAGEMENT TABLES
-- ============================================================================

CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    location VARCHAR(255),
    current_company VARCHAR(255),
    current_designation VARCHAR(255),
    total_experience_years DECIMAL(4, 1),
    summary TEXT,
    profile_picture_url VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(org_id, email)
);

CREATE TABLE candidate_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    skill_level skill_level NOT NULL,
    years_of_experience DECIMAL(4, 1),
    is_primary BOOLEAN DEFAULT false,
    added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE candidate_experience (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    is_current BOOLEAN DEFAULT false,
    added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE candidate_education (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    institution_name VARCHAR(255) NOT NULL,
    degree VARCHAR(100) NOT NULL,
    field_of_study VARCHAR(100),
    graduation_date DATE,
    gpa DECIMAL(3, 2),
    added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE candidate_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    certification_name VARCHAR(255) NOT NULL,
    issuing_organization VARCHAR(255),
    issue_date DATE,
    expiry_date DATE,
    credential_url VARCHAR(500),
    added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE resume_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size_bytes INT,
    upload_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    parsed_at TIMESTAMP,
    parsing_status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'SUCCESS', 'FAILED'
    parsing_error_message TEXT,
    version INT DEFAULT 1,
    is_current BOOLEAN DEFAULT true
);

-- ============================================================================
-- 5. CANDIDATE-JOB APPLICATION TABLES
-- ============================================================================

CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    status candidate_status DEFAULT 'APPLIED',
    similarity_score DECIMAL(5, 2), -- 0-100
    ai_recommendation VARCHAR(50), -- 'STRONG_MATCH', 'MATCH', 'WEAK_MATCH'
    recruiter_notes TEXT,
    is_shortlisted BOOLEAN DEFAULT false,
    shortlisted_date TIMESTAMP,
    shortlisted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    rejection_date TIMESTAMP,
    applied_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE similarity_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    skill_match_percentage DECIMAL(5, 2),
    experience_match_percentage DECIMAL(5, 2),
    education_match_percentage DECIMAL(5, 2),
    industry_relevance_percentage DECIMAL(5, 2),
    certification_match_percentage DECIMAL(5, 2),
    overall_score DECIMAL(5, 2),
    calculated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    algorithm_version VARCHAR(50)
);

-- ============================================================================
-- 6. INTERVIEW MANAGEMENT TABLES
-- ============================================================================

CREATE TABLE interview_panels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE interview_panel_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panel_id UUID NOT NULL REFERENCES interview_panels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(100), -- 'TECHNICAL_LEAD', 'HR_REPRESENTATIVE', 'HIRING_MANAGER'
    added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(panel_id, user_id)
);

CREATE TABLE interview_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sequence_number INT NOT NULL,
    interview_type interview_type NOT NULL,
    description TEXT,
    estimated_duration_minutes INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE interview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    panel_id UUID NOT NULL REFERENCES interview_panels(id) ON DELETE RESTRICT,
    round_id UUID NOT NULL REFERENCES interview_rounds(id) ON DELETE RESTRICT,
    scheduled_at TIMESTAMP NOT NULL,
    estimated_end_time TIMESTAMP,
    actual_start_time TIMESTAMP,
    actual_end_time TIMESTAMP,
    status interview_status DEFAULT 'SCHEDULED',
    meeting_link VARCHAR(500),
    meeting_notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE interview_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    interview_type interview_type NOT NULL,
    skill_tag VARCHAR(100), -- For technical interviews
    difficulty_level VARCHAR(50), -- 'EASY', 'MEDIUM', 'HARD'
    question_text TEXT NOT NULL,
    expected_answer TEXT,
    follow_up_questions TEXT,
    ai_generated BOOLEAN DEFAULT true,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE interview_session_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES interview_questions(id) ON DELETE RESTRICT,
    sequence_number INT,
    asked_at TIMESTAMP,
    candidate_answer TEXT,
    notes TEXT
);

-- ============================================================================
-- 7. FEEDBACK & EVALUATION TABLES
-- ============================================================================

CREATE TABLE feedback_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    evaluator_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    overall_rating feedback_rating NOT NULL,
    technical_rating DECIMAL(3, 1), -- 1-5 scale
    communication_rating DECIMAL(3, 1),
    cultural_fit_rating DECIMAL(3, 1),
    problem_solving_rating DECIMAL(3, 1),
    feedback_notes TEXT,
    recommendation VARCHAR(50),
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE evaluation_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    interview_type interview_type NOT NULL,
    criteria_name VARCHAR(255) NOT NULL,
    description TEXT,
    max_score DECIMAL(5, 2) DEFAULT 100,
    weight_percentage DECIMAL(5, 2) DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 8. SCHEDULING & CALENDAR TABLES
-- ============================================================================

CREATE TABLE calendar_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'GOOGLE', 'OUTLOOK'
    access_token VARCHAR(500),
    refresh_token VARCHAR(500),
    token_expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider)
);

CREATE TABLE interview_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    recurring_pattern VARCHAR(50), -- 'DAILY', 'WEEKLY', 'MONTHLY'
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 9. NOTIFICATION TABLES
-- ============================================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_entity_type VARCHAR(50), -- 'APPLICATION', 'INTERVIEW_SESSION', 'FEEDBACK'
    related_entity_id UUID,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_email VARCHAR(255) NOT NULL,
    notification_type notification_type NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    delivery_status VARCHAR(50) DEFAULT 'SENT', -- 'SENT', 'FAILED', 'BOUNCED'
    delivery_error_message TEXT,
    related_entity_id UUID
);

-- ============================================================================
-- 10. AUDIT & LOGGING TABLES
-- ============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE event_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    event_data JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 11. WORKFLOW & STATE TABLES
-- ============================================================================

CREATE TABLE workflow_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    from_status candidate_status NOT NULL,
    to_status candidate_status NOT NULL,
    transitioned_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT,
    transitioned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hiring_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    decision VARCHAR(50) NOT NULL, -- 'HIRE', 'NO_HIRE', 'PENDING'
    decided_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    decision_notes TEXT,
    final_feedback_summary TEXT,
    decided_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 12. INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================

-- User and Organization Indexes
CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_departments_org_id ON departments(org_id);

-- Job Indexes
CREATE INDEX idx_jobs_org_id ON jobs(org_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_department_id ON jobs(department_id);

-- Candidate Indexes
CREATE INDEX idx_candidates_org_id ON candidates(org_id);
CREATE INDEX idx_candidates_email ON candidates(email);
CREATE INDEX idx_candidate_skills_name ON candidate_skills(skill_name);

-- Application Indexes
CREATE INDEX idx_applications_candidate_id ON applications(candidate_id);
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_org_id ON applications(org_id);
CREATE INDEX idx_applications_similarity_score ON applications(similarity_score);
CREATE COMPOSITE INDEX idx_applications_candidate_job ON applications(candidate_id, job_id);

-- Interview Indexes
CREATE INDEX idx_interview_sessions_application_id ON interview_sessions(application_id);
CREATE INDEX idx_interview_sessions_status ON interview_sessions(status);
CREATE INDEX idx_interview_sessions_scheduled_at ON interview_sessions(scheduled_at);
CREATE INDEX idx_feedback_forms_interview_session_id ON feedback_forms(interview_session_id);

-- Notification Indexes
CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Audit Indexes
CREATE INDEX idx_audit_logs_org_id ON audit_logs(org_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================
-- 13. CONSTRAINTS & TRIGGERS
-- ============================================================================

-- Update timestamps automatically
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_jobs_timestamp BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_candidates_timestamp BEFORE UPDATE ON candidates
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_applications_timestamp BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_interview_sessions_timestamp BEFORE UPDATE ON interview_sessions
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_feedback_forms_timestamp BEFORE UPDATE ON feedback_forms
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- 14. SAMPLE DATA (Optional - for development)
-- ============================================================================

-- INSERT INTO organizations VALUES (
--     '12345678-1234-1234-1234-123456789012',
--     'TechCorp Inc',
--     'hr@techcorp.com',
--     '+1-555-0123',
--     '123 Tech Avenue',
--     'San Francisco',
--     'USA',
--     '94105',
--     'www.techcorp.com',
--     'Technology',
--     'LARGE'
-- );
