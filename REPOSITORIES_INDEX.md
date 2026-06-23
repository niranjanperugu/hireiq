# HireSmart Repository Index

Spring Data JPA Repository Interfaces for data access layer.

## Core Repositories

### Organization & Access Control
- **OrganizationRepository** - Organization CRUD and lookups
  - `findByName(String name)`
  - `findByEmail(String email)`

- **DepartmentRepository** - Department management
  - `findByNameAndOrganizationId(String, UUID)`
  - `findByOrganizationId(UUID)`
  - `countByOrganizationId(UUID)`

- **UserRepository** - User account management
  - `findByEmailAndOrganizationId(String, UUID)`
  - `findByOrganizationIdAndRole(UUID, UserRole)`
  - `findByOrganizationIdAndDepartmentId(UUID, UUID)`
  - `searchUsers(UUID, String, Pageable)` - Full-text search
  - `countByOrganizationIdAndRole(UUID, UserRole)`

## Candidate Management

### CandidateRepository
- `findByEmailAndOrganizationId(String, UUID)`
- `findByOrganizationId(UUID)`
- `searchCandidates(UUID, String, Pageable)` - Search by name/company
- `findByOrganizationAndSkill(UUID, String, Pageable)` - Filter by skill
- `findByOrganizationAndExperienceRange(UUID, Double, Double, Pageable)` - Experience filter
- `countByOrganizationId(UUID)`
- `countByOrganizationAndExperienceGreaterThan(UUID, Double)`

## Job Management

### JobRepository
- `findByOrganizationIdAndStatus(UUID, JobStatus, Pageable)`
- `findByOrganizationIdAndDepartmentId(UUID, UUID, Pageable)`
- `findByOrganizationIdAndStatusIn(UUID, List<JobStatus>, Pageable)`
- `searchJobs(UUID, String, Pageable)` - Search by title/description
- `findOpenJobs(UUID)` - Only open positions
- `findOpenJobsByWorkMode(UUID, String, Pageable)` - Filter by work mode
- `countByOrganizationIdAndStatus(UUID, JobStatus)`

## Applications & Matching

### ApplicationRepository
- `findByCandidateIdAndJobId(UUID, UUID)` - Check duplicate applications
- `findByJobIdAndStatus(UUID, CandidateStatus, Pageable)` - Job pipeline
- `findByOrganizationIdAndIsShortlistedTrue(UUID, Pageable)` - Shortlisted candidates
- `findByOrganizationAndStatusOrderBySimilarityScore(UUID, CandidateStatus, Pageable)` - Ranked results
- `findHighScoringApplications(UUID, UUID, Double, Pageable)` - Top matches for job
- `countByOrganizationAndStatus(UUID, CandidateStatus)` - Pipeline metrics
- `countByJobAndStatuses(UUID, List<CandidateStatus>)` - Job-specific counts

## Interview Management

### InterviewSessionRepository
- `findByApplicationId(UUID, Pageable)` - All interviews for candidate
- `findByPanelId(UUID, Pageable)` - Panel's scheduled interviews
- `findInterviewsBetweenDates(UUID, LocalDateTime, LocalDateTime)` - Calendar view
- `findUpcomingInterviewsForUser(UUID, InterviewStatus)` - User's upcoming interviews
- `findUpcomingInterviews(UUID, InterviewStatus, Pageable)` - Org-wide upcoming
- `countUpcomingInterviews(UUID, InterviewStatus)` - KPI metric
- `countTodayInterviews(UUID)` - Today's interview count

### FeedbackFormRepository
- `findByInterviewSessionId(UUID)` - Interview feedback
- `findByApplicationIdOrderBySubmittedDateDesc(UUID)` - Candidate's feedback history
- `countByApplicationAndRating(UUID, FeedbackRating)` - Feedback distribution
- `getAverageTechnicalRating(UUID)` - Average technical score
- `getAverageCommunicationRating(UUID)` - Average communication score
- `getAverageCulturalFitRating(UUID)` - Average cultural fit score
- `countPositiveFeedbackForJob(UUID, List<FeedbackRating>)` - Success metrics

## Additional Repositories (To Be Created)

- **CandidateSkillRepository** - Skill management
- **CandidateExperienceRepository** - Experience tracking
- **CandidateEducationRepository** - Education records
- **CandidateCertificationRepository** - Certifications
- **ResumeMetadataRepository** - Resume versioning
- **JobRequirementRepository** - Job requirements
- **SimilarityScoreRepository** - AI matching scores
- **InterviewPanelRepository** - Panel management
- **InterviewPanelMemberRepository** - Panel composition
- **InterviewRoundRepository** - Round definitions
- **InterviewQuestionRepository** - Question library
- **InterviewSessionQuestionRepository** - Question usage
- **EvaluationCriteriaRepository** - Evaluation framework
- **WorkflowStateRepository** - State transitions
- **HiringDecisionRepository** - Final decisions
- **NotificationRepository** - Notification tracking
- **EmailLogRepository** - Email audit trail
- **AuditLogRepository** - Compliance audit
- **EventLogRepository** - Event streaming
- **CalendarIntegrationRepository** - Calendar sync
- **InterviewAvailabilityRepository** - Interviewer slots

## Repository Pattern Features Used

1. **Spring Data JPA** - Automatic CRUD operations
2. **Custom Query Methods** - Derived queries from method names
3. **@Query Annotations** - JPQL and native SQL queries
4. **Pagination & Sorting** - Pageable parameter support
5. **Lazy Loading** - FetchType.LAZY for performance
6. **Named Parameters** - @Param for query parameters
7. **Aggregate Functions** - COUNT, AVG for metrics

## Best Practices Applied

- Repository per entity (or aggregated root)
- Meaningful query method names
- Pagination for large result sets
- Custom queries for complex filtering
- Efficient index usage
- Audit trail queries
- KPI and metrics queries

## Notes for Implementation

1. All repositories extend `JpaRepository<Entity, UUID>`
2. Repositories should be autowired in Services
3. Services handle transaction management (@Transactional)
4. Repositories are stateless and thread-safe
5. Use proper fetch strategies in queries
6. Index databases based on query patterns
