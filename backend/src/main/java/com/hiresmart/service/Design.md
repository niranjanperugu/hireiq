HireIQ
AI-Powered Hiring Platform
Technical Design & Functional Specification
A comprehensive reference covering system architecture, module-level functional behaviour, data models, API contracts, AI/NLP integration, and end-to-end hiring workflows for the HireIQ platform.

Version
1.0 — Initial Release
Date
June 23, 2026
Status
Draft · Internal Review
Author
Meena Shah, HR Technology
Classification
Confidential
Table of Contents
1	Executive Overview
2	User Roles & Permissions
3	Functional Specification — Dashboard · Jobs · Candidates · Interviews · Resume Parser · Offers · Settings
4	End-to-End Hiring Workflows
5	AI / NLP Design — ATS Scoring · Resume Parsing · Skill Gap Analysis
6	Technical Architecture
7	Data Models
8	API Contract
9	Notification System
10	Security & Compliance
11	Non-Functional Requirements
1. Executive Overview
Functional
HireIQ is an AI-powered end-to-end hiring platform that automates and accelerates talent acquisition. It combines intelligent resume parsing, NLP-based ATS scoring, structured multi-round interview orchestration, and automated offer management — all within a single, HR-manager-centric interface.

9
Core Modules
3
User Roles
AI
NLP-Driven ATS
AI-First Philosophy — Every candidate evaluation in HireIQ is augmented by AI. The NLP engine scores resumes against job descriptions, surfaces skill gaps, suggests shortlists, and writes offer summaries — reducing manual screening time by an estimated 70%.

Core Value Propositions
Automated ATS scoring with configurable per-job thresholds replaces manual resume screening.
Structured interview rounds with panel feedback, per-round ratings, and automated promotion logic ensure consistent evaluation.
Public Jobs API allows any candidate to apply directly; HR managers view and shortlist from a single dashboard.
Integrated notification engine sends personalised emails at every stage — shortlisting, rejection, scheduling, and offers.
Resume parsing extracts structured profiles from PDF/DOCX automatically, matching against job descriptions in real time.
2. User Roles & Permissions
Functional
Role	Key Capabilities	Restrictions
HR Manager	Full access — post/edit/publish/close jobs; manage ATS thresholds; shortlist/reject candidates; schedule interviews; rollout offers; send email notifications; configure interview rounds; view all feedback.	None — full system authority.
Panel Member (Interviewer)	View all interview rounds for assigned candidates; enter feedback, rating (1–5★), and technical comments for their own round; view feedback from other rounds (read-only); add notes.	Cannot post jobs, change ATS thresholds, shortlist, reject, or send offers. Cannot edit another panel member's feedback.
Candidate (External)	Apply to any active published job via the Public Jobs API; receive email notifications (shortlist, rejection, interview invite, offer).	No access to the HireIQ application UI. Communication via email only.
3. Functional Specification
Functional
3.1 Dashboard
The Dashboard is the HR Manager's primary command centre, surfacing real-time KPIs, a hiring funnel visualisation, active job summaries, and a recent candidates table.

KPI Tiles
Metric	Definition
Open Vacancies	Count of jobs with status = active.
Total Profiles	All candidates across all jobs in any stage, excluding archived.
In Rounds	Candidates currently in an active interview round (stage ≠ Applied, Shortlisted, Hired, Rejected, On Hold).
Completed	Candidates who have completed all configured rounds for their job.
Hired	Candidates with status = hired (offer accepted).
Pending Evaluation	Completed interview rounds with no feedback submitted yet.
Hiring Funnel
A horizontal bar chart showing candidate counts at each pipeline stage: Applied → Shortlisted → Screening → Round 1 → Round 2 → Final → Offered. Bars are proportional to the total applied count. The funnel spans all active jobs.

3.2 Job Management
HR Managers can create, edit, publish, and close job postings. Each job generates a unique public apply URL that candidates can use to submit applications via the REST API.

Job Record Fields
Field	Type	Notes
title	String	Displayed on apply page and candidate pipeline.
department	Enum	Engineering · Product · Data & AI · Infrastructure · etc.
location	String	Free text, e.g. "Bangalore / Remote".
employment_type	Enum	Full-time · Part-time · Contract.
description	Rich Text	Full JD. Used by NLP engine for ATS matching.
required_skills	String[]	Extracted as tags. Weighted in ATS scoring.
ats_threshold	Integer 0–100	Per-job override; falls back to global setting if not set.
status	Enum	draft · active (published) · paused · closed.
posted_at	Timestamp	Set on first publish.
Public API — Published jobs are accessible at GET /api/v1/jobs without authentication. The apply endpoint POST /api/v1/jobs/:id/apply accepts a resume file and metadata. Closing a job sets status = closed and removes it from the public listing immediately.

3.3 Candidate Pipeline
Candidates progress through a configurable set of stages. Stage transitions are triggered either manually by the HR Manager or automatically by the system when ATS or interview rating thresholds are met.

Pipeline Stages
Stage	Entry Trigger	Exit Action
Applied	Candidate submits via API or HR uploads resume.	HR shortlists or rejects; auto-reject if ATS < threshold.
Shortlisted	HR manually shortlists, or AI auto-shortlist (if enabled).	Email sent to candidate; HR schedules Screening interview.
Screening	Screening interview scheduled.	Panel submits feedback → HR promotes or rejects.
Round N	HR promotes from previous round (or auto-promote if avg rating ≥ threshold).	Panel feedback submitted; HR reviews and promotes to Round N+1 or final decision.
Offer	All rounds completed; HR prepares offer.	Offer email sent; candidate accepts → Hired, or declines → On Hold / Rejected.
Hired	Candidate accepts offer.	Candidate moved to Hired pool; pipeline closed.
On Hold	HR places candidate on hold at any stage.	HR can re-activate at any time.
Rejected	HR rejects, auto-reject by ATS, or candidate declines offer.	Rejection email sent; candidate record archived.
Candidate Profile
Every candidate record surfaces a 5-tab detail view accessible via modal from any list. The tabs are:

Overview — AI-generated summary, key skills, skill gap analysis vs. job requirements, ATS score ring, and quick actions (Schedule · Promote · Email · Reject).
Resume — Parsed resume content with structured work history and education. Downloadable as PDF.
Interview Rounds — Timeline of all rounds with date, interviewer, star rating, and comments. Panel members can enter feedback for their own round directly here.
Notes — Shared notes visible to all HR team members. Timestamped and attributed.
Offer — Offer configuration form (CTC, joining date, notice period, deadline) and real-time letter preview.
3.4 Interview Scheduling
The scheduling module provides a weekly calendar view and a scheduling form. The HR Manager books interview slots, assigns panel members, and sends availability emails to candidates.

Scheduling Flow
1
HR selects candidate and round
Candidate searchable dropdown filters by name or role; round dropdown shows next unscheduled round.
2
HR adds panel members
Multi-select searchable dropdown shows all panel members with role and department. Tags display selected members.
3
HR selects date, time, duration, and mode
Mode: Google Meet · Zoom · In-Person. Calendar shows existing bookings to avoid conflicts.
4
Send Availability Email (optional)
Sends 3 proposed time slots to candidate and panel members. Candidate selects preferred slot; system auto-books.
5
Confirm & book
Interview event created; calendar entry blocks the slot; confirmation emails dispatched to all parties.
3.5 Resume Parser
The Resume Parser accepts PDF or DOCX uploads (up to 20 files, 10 MB each) and returns a structured candidate profile plus an ATS match score against a chosen job description.

Parsed Fields
Full name · email · phone · location
Current title · total years of experience
Work history (company, title, dates, responsibilities)
Education (institution, degree, year)
Extracted skills (NLP entity recognition)
AI-generated profile summary (3–4 sentences)
External Source Pull
In addition to uploads, the parser can pull candidate profiles directly from LinkedIn Jobs, Naukri.com, and Indeed via configured API integrations — searching by job title and keywords from the job description.

3.6 Offers & Notifications
When a candidate completes all interview rounds, the HR Manager prepares an offer letter. The system generates a personalised email with offer details and tracks acceptance status.

Offer Fields
Role · Department · CTC (₹) · Joining Date · Notice Period · Response Deadline
Letter is pre-filled from candidate and job data; HR can edit all fields before sending.
A PDF version is auto-generated for download and email attachment.
3.7 Settings
The Settings module provides HR Managers with full configuration control over the hiring engine.

Setting	Description
Global ATS Threshold	0–100 slider. Candidates below this score are auto-rejected system-wide unless overridden per-job or by HR manual action.
Per-Job ATS Override	Individual threshold per active job, overriding the global value.
Auto-reject Toggle	When on, auto-sends rejection email to candidates below threshold. When off, candidates remain in "Pending" state for manual review.
AI Shortlist Suggestions	Shows AI recommendation banner when candidates with ATS ≥ 85 are detected.
Interview Rounds Config	Add, edit, delete, and reorder rounds. Each round stores: name, responsible role (HR / Panel), duration, and mode.
Promotion Threshold	Minimum average panel rating (e.g. ≥ 3.5★) to auto-promote a candidate to the next round.
Skills Catalog	Global skill tag library used for ATS matching and skill gap visualisations. HR can add/remove tags.
4. End-to-End Hiring Workflows
Functional
4.1 Standard Hire Workflow
1
HR posts job
Job created in draft → published to public API. Apply link shared on job portals.
2
Candidate applies / resume uploaded
Profile created; NLP engine parses resume; ATS score computed. If score < threshold → auto-rejected with email notification.
3
HR reviews shortlist
AI banner surfaces top candidates. HR can shortlist (email sent to candidate) or reject (rejection email sent).
4
Interview rounds
HR schedules each round. Panel members receive email with calendar invite. Post-interview: panel submits rating + comments. If avg ≥ threshold → auto-promote; else HR decides manually.
5
Offer rollout
HR prepares offer letter. System sends PDF via email. Candidate confirms acceptance. Status set to Hired.
6
Candidate moved to Hired
Record archived in Hired pool. HR closes or continues job posting.
4.2 Rejection & On-Hold Flows
ATS auto-reject: Score below threshold → status = rejected → rejection email dispatched immediately (if auto-reject toggle is on).
Manual reject (any stage): HR clicks Reject → confirmation prompt → status = rejected → rejection email queued for review before send.
On Hold: HR can place candidate on hold at any stage. No email sent. Candidate re-activatable at any time. Appears in On Hold column of Kanban.
Offer declined: System flags record; HR can move to On Hold or Rejected and can begin the next candidate in pipeline.
5. AI / NLP Design
AI / NLP
5.1 ATS Scoring Engine
The ATS (Applicant Tracking Score) is computed by the NLP engine as a weighted similarity score between the parsed candidate profile and the job description.

Scoring Components
Component	Weight	Method
Skill Match	40%	Entity extraction of skills from resume vs. required_skills list. Each skill scored 0–100% based on recency and depth of usage signals.
Experience Match	25%	Years of relevant experience vs. job requirement; seniority level alignment.
Semantic Similarity	20%	Sentence-transformer embeddings of resume summary vs. job description. Cosine similarity score.
Education Match	10%	Degree level and field relevance vs. job requirements.
Keyword Density	5%	Frequency of JD-specific keywords in resume text (normalised TF-IDF).
Score Interpretation — 85–100 = Excellent (recommend shortlist) · 70–84 = Good (manual review) · 55–69 = Borderline (below most thresholds) · <55 = Poor (auto-reject likely).

5.2 Resume Parsing Pipeline
PDF / DOCX
   ↓
OCR / Text Extraction  (pdfplumber / docx2txt)
   ↓
Section Segmentation   (NER: Experience, Education, Skills, Summary)
   ↓
Entity Extraction      (spaCy NER + custom rules)
   → Name, Email, Phone, Location
   → Job Titles, Companies, Dates
   → Skills, Technologies, Tools
   → Degrees, Institutions
   ↓
Profile Struct          (JSON: CandidateProfile)
   ↓
ATS Scoring Engine
   ↓
AI Summary Generation  (LLM: 3–5 sentence profile summary)
   ↓
Store in DB + Return to UI
5.3 Skill Gap Analysis
For each job–candidate pair, the system computes a skill gap matrix that maps each required skill to a confidence percentage (0–100%). Gaps are classified as:

Matched (≥70%) — Skill clearly evidenced in resume text. Shown in green.
Partial (30–69%) — Skill mentioned but with limited evidence or dated. Shown in amber.
Gap (<30%) — Skill absent or not found. Shown in red. HR can use this to probe in interviews.
5.4 AI Candidate Summary
On parse completion, an LLM generates a 3–5 sentence plain-language summary of the candidate covering: current seniority level, key technical expertise, notable achievements, and a fit signal for the role. The summary is editable by HR.

6. Technical Architecture
Technical
Frontend
Single-page React application
HireIQ Design Component (DC) framework
Responsive, data-dense enterprise UI
Role-based view rendering
API Layer
REST API — Node.js / Express
Public endpoints (unauthenticated): Job listing, Apply
Private endpoints (JWT): All HR & Panel actions
File upload: Multipart (resume PDFs)
AI / NLP Service
Python microservice (FastAPI)
spaCy NER for extraction
sentence-transformers for embeddings
LLM API for summary generation
Data Storage
PostgreSQL — core relational data
Redis — session cache, notification queue
S3-compatible — resume file storage
Vector DB — embedding store for semantic search
Integrations
SendGrid / SES — email notifications
Google Calendar API — calendar sync
LinkedIn Jobs API — profile pull
Naukri / Indeed scraper — profile aggregation
Infrastructure
Docker containers, Kubernetes orchestration
AWS ECS / GCP Cloud Run
CI/CD via GitHub Actions
CloudFront CDN for static assets
NLP Service Isolation — The AI/NLP microservice is deployed independently with its own scaling policy. Resume parsing is async — the frontend polls for results. ATS scoring responses are cached per (resume, job) pair for 24 hours to reduce API cost.

7. Data Models
Technical
7.1 Job
{
  id:               UUID,
  title:            String,
  department:       Enum,
  location:         String,
  employment_type:  Enum,
  description:      Text,
  required_skills:  String[],
  ats_threshold:    Integer,       // 0–100; null = use global
  status:           Enum,          // draft | active | paused | closed
  created_by:       UserID,
  posted_at:        Timestamp | null,
  closed_at:        Timestamp | null,
  created_at:       Timestamp,
  updated_at:       Timestamp
}
7.2 Candidate
{
  id:               UUID,
  job_id:           UUID,
  name:             String,
  email:            String,
  phone:            String,
  location:         String,
  current_title:    String,
  experience_years: Float,
  education:        { degree, institution, year }[],
  skills:           String[],
  resume_url:       String,        // S3 path
  ats_score:        Integer,       // 0–100
  ai_summary:       Text,
  source:           Enum,          // api_apply | upload | linkedin | naukri | indeed
  stage:            Enum,          // applied | shortlisted | screening | round_n | offer | hired | on_hold | rejected
  status:           Enum,          // pending | shortlisted | in_review | rejected | hired
  applied_at:       Timestamp,
  updated_at:       Timestamp
}
7.3 InterviewRound
{
  id:               UUID,
  candidate_id:     UUID,
  job_id:           UUID,
  round_config_id:  UUID,          // reference to RoundConfig
  round_number:     Integer,
  round_name:       String,
  scheduled_at:     Timestamp,
  duration_mins:    Integer,
  mode:             Enum,          // google_meet | zoom | in_person
  panel_members:    UserID[],
  status:           Enum,          // scheduled | completed | cancelled
  created_at:       Timestamp
}
7.4 InterviewFeedback
{
  id:               UUID,
  round_id:         UUID,
  interviewer_id:   UUID,
  rating:           Integer,       // 1–5
  recommendation:   Enum,          // proceed | on_hold | reject
  technical_comments: Text,
  skill_ratings:    { skill: String, score: Integer }[],
  submitted_at:     Timestamp
}
7.5 Offer
{
  id:               UUID,
  candidate_id:     UUID,
  job_id:           UUID,
  role:             String,
  ctc_inr:          Integer,
  joining_date:     Date,
  notice_period_days: Integer,
  response_deadline:  Date,
  status:           Enum,          // draft | sent | accepted | declined
  sent_at:          Timestamp | null,
  responded_at:     Timestamp | null,
  created_by:       UserID,
  created_at:       Timestamp
}
8. API Contract
Technical
Public Endpoints (no auth)
Method	Path	Description
GET	/api/v1/jobs	List all active published jobs.
GET	/api/v1/jobs/:id	Get single job details and JD.
POST	/api/v1/jobs/:id/apply	Submit application. Body: multipart/form-data with resume (file), name, email, phone.
Private Endpoints (Bearer JWT required)
Method	Path	Description
POST	/api/v1/jobs	Create job (HR Manager).
PATCH	/api/v1/jobs/:id	Update job fields (HR Manager).
POST	/api/v1/jobs/:id/publish	Publish job (HR Manager).
POST	/api/v1/jobs/:id/close	Close job (HR Manager).
GET	/api/v1/candidates	List candidates (filterable by job, stage, status, ATS range).
GET	/api/v1/candidates/:id	Full candidate profile with rounds and feedback.
PATCH	/api/v1/candidates/:id/stage	Promote or change stage (HR Manager).
PATCH	/api/v1/candidates/:id/status	Shortlist / reject / hold (HR Manager).
POST	/api/v1/resumes/parse	Upload and parse resume. Returns CandidateProfile + ATS score.
POST	/api/v1/interviews	Schedule interview (HR Manager).
POST	/api/v1/interviews/:id/feedback	Submit feedback (Panel Member or HR Manager).
POST	/api/v1/offers	Create offer letter (HR Manager).
POST	/api/v1/offers/:id/send	Send offer email (HR Manager).
GET	/api/v1/settings	Get global settings (HR Manager).
PATCH	/api/v1/settings	Update ATS thresholds, round config (HR Manager).
9. Notification System
Functional
Trigger Event	Recipient	Template
Candidate shortlisted	Candidate	Congratulations email; invitation to prepare for screening.
Candidate auto-rejected (ATS)	Candidate	Polite rejection email citing current requirements.
Candidate manually rejected	Candidate	Personalised rejection; queued for HR review before dispatch.
Interview scheduled	Candidate + Panel	Calendar invite, join link, round details, duration.
Interview slots sent	Candidate	3 proposed slots with selection link.
Candidate promoted to next round	Candidate	Round N+1 invitation with brief context.
Offer sent	Candidate	Formal offer letter as email body + PDF attachment.
Offer accepted	HR Manager	Internal notification confirming acceptance and joining date.
Feedback pending reminder	Panel Member	Reminder after 24 hrs if feedback not submitted post-interview.
All email templates are stored in the system and editable by HR Managers. Dynamic tokens (, , etc.) are resolved server-side before dispatch. Email delivery is via SendGrid with webhook-based bounce and open tracking.

10. Security & Compliance
Technical
10.1 Authentication & Authorisation
JWT-based authentication with 8-hour access tokens and 30-day refresh tokens stored in HttpOnly cookies.
RBAC (Role-Based Access Control) enforced at the API layer on every private endpoint.
SSO support via SAML 2.0 / OAuth 2.0 (Google Workspace, Microsoft Entra ID).
10.2 Data Protection
All PII (name, email, phone, resume) encrypted at rest using AES-256 in S3 and PostgreSQL.
TLS 1.3 enforced for all API communications.
Resume files served via signed S3 URLs with 15-minute expiry — never publicly accessible.
GDPR-compliant candidate data deletion: HR can purge all PII on request; audit log retained.
10.3 Audit Trail
Every stage change, feedback submission, offer action, and settings change is logged to an immutable audit table with user ID, timestamp, and change delta. Exportable for compliance reviews.

11. Non-Functional Requirements
Technical
Requirement	Target
API Response Time	≤ 200ms for 95th percentile on all private endpoints (excluding NLP parse).
Resume Parse Latency	≤ 8 seconds per resume (single); batch of 20 ≤ 60 seconds.
ATS Score Cache	24-hour TTL per (resume, job) pair. Cache hit ratio target ≥ 80%.
Availability	99.9% monthly uptime SLA. NLP service: 99.5%.
Scalability	Horizontal scaling to support 10,000 concurrent HR users and 1M candidates in DB.
Email Delivery	≤ 30 seconds from trigger to dispatch. Bounce handling with retry up to 3 times.
Data Retention	Active candidates: indefinite. Rejected candidates: 2 years. Offers: 7 years (legal).
Accessibility	WCAG 2.1 AA for all HR Manager-facing UI screens.
Browser Support	Chrome 120+, Safari 16+, Firefox 120+, Edge 120+.
HireIQ Technical & Functional Design v1.0 · June 2026 · Confidential · AI-Powered Hiring Platform

