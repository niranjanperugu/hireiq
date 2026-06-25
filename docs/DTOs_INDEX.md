# HireSmart Data Transfer Objects (DTOs) Index

## Overview
DTOs (Data Transfer Objects) for API request/response mapping with comprehensive validation annotations.

## Core DTOs

### Candidate Management
- **CandidateDTO** - Complete candidate profile
  - Fields: firstName, lastName, email, phone, location, currentCompany, totalExperienceYears
  - Validation: Email format, experience years range
  - Nested: skills, experiences, educations, certifications

- **CandidateSkillDTO** - Technical/soft skills
  - Fields: skillName, skillLevel, yearsOfExperience, isPrimary
  - SkillLevel: BEGINNER, INTERMEDIATE, ADVANCED, EXPERT
  - Validation: Skill name length, years range

- **CandidateExperienceDTO** - Work history
  - Fields: companyName, jobTitle, description, startDate, endDate, isCurrent
  - Validation: Date order, current flag logic

- **CandidateEducationDTO** - Educational background
  - Fields: institutionName, degree, fieldOfStudy, graduationDate, gpa
  - Validation: GPA range (0.0-4.0), past/present dates

- **CandidateCertificationDTO** - Professional certifications
  - Fields: certificationName, issuingOrganization, issueDate, expiryDate, credentialUrl
  - Validation: URL format, date order

### Job Management
- **JobDTO** - Job posting
  - Fields: title, description, employmentType, workMode, salaryMin, salaryMax, location, status
  - EmploymentType: FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP
  - WorkMode: REMOTE, HYBRID, ON_SITE
  - JobStatus: DRAFT, OPEN, ON_HOLD, CLOSED, FILLED
  - Validation: Title/description lengths, salary range, experience range

- **JobRequirementDTO** - Job-specific requirements
  - Fields: requirementType, requirementValue, isMandatory, priorityLevel
  - RequirementType: SKILL, CERTIFICATION, EDUCATION
  - Validation: Requirement value length, priority level

### Application & Matching
- **ApplicationDTO** - Candidate applications
  - Fields: candidateId, jobId, status, similarityScore, isShortlisted
  - CandidateStatus: APPLIED, SCREENED, SHORTLISTED, INTERVIEW_ROUND_1, INTERVIEW_ROUND_2, FINAL_INTERVIEW, OFFER_RELEASED, OFFER_ACCEPTED, HIRED, REJECTED, WITHDRAWN
  - Validation: Similarity score 0-100 range
  - Nested: similarityScoreDetails
  - Read-only: candidateName, candidateEmail, jobTitle

- **SimilarityScoreDTO** - AI-calculated match scores
  - Fields: skillMatchPercentage, experienceMatchPercentage, educationMatchPercentage, industryRelevancePercentage, certificationMatchPercentage, overallScore
  - Read-only: calculatedAt, algorithmVersion

### Interview Management
- **InterviewSessionDTO** - Interview sessions
  - Fields: applicationId, panelId, roundId, scheduledAt, status, meetingLink
  - InterviewStatus: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, RESCHEDULED
  - Validation: Scheduled date must be future
  - Nested: sessionQuestions, feedbackForm
  - Read-only: candidateName, candidateEmail, roundName, interviewType

- **InterviewSessionQuestionDTO** - Questions asked in sessions
  - Fields: questionId, sequenceNumber, askedAt, candidateAnswer, notes
  - Validation: Answer/notes length limits
  - Read-only: questionText

- **FeedbackFormDTO** - Interview feedback
  - Fields: interviewSessionId, overallRating, technicalRating, communicationRating, culturalFitRating, problemSolvingRating, feedbackNotes, recommendation
  - FeedbackRating: STRONG_HIRE, HIRE, NEUTRAL, NO_HIRE, STRONG_NO_HIRE
  - Validation: Ratings 1.0-5.0 scale, notes required (10-2000 chars)
  - Read-only: evaluatorName, candidateName, jobTitle

### API Response DTOs
- **ApiResponse<T>** - Unified API response wrapper
  - Fields: code, message, data, timestamp, success, errorCode
  - Methods: success(), error(), badRequest(), unauthorized(), forbidden(), notFound(), internalError()
  - Generic type support for any response data

- **PageableResponseDTO<T>** - Pagination response
  - Fields: content, pageNumber, pageSize, totalElements, totalPages, hasNext, hasPrevious, isFirst, isLast
  - Factory method: from(Page<T> page)

## Additional DTOs (To Be Created)

### User & Auth
- **UserDTO** - User account information
- **CreateUserDTO** - User registration
- **LoginRequestDTO** - Login credentials
- **JwtTokenDTO** - JWT token response
- **RefreshTokenDTO** - Token refresh request

### Interview Setup
- **InterviewPanelDTO** - Panel management
- **InterviewRoundDTO** - Round definitions
- **InterviewQuestionDTO** - Question library

### Decisions & Workflow
- **HiringDecisionDTO** - Final hiring decision
- **WorkflowStateDTO** - Status transition history

### Notifications
- **NotificationDTO** - In-app notifications
- **EmailLogDTO** - Email audit trail

### Analytics
- **KPIMetricsDTO** - KPI dashboard data
- **CandidatePipelineDTO** - Pipeline statistics
- **RecruitmentAnalyticsDTO** - Analytics report

## Validation Annotations Used

- `@NotNull` - Null validation
- `@NotBlank` - String non-empty validation
- `@Size` - String/collection size range
- `@Min/@Max` - Numeric range
- `@DecimalMin/@DecimalMax` - Decimal numeric range
- `@Email` - Email format validation
- `@URL` - URL format validation
- `@Pattern` - Regex pattern matching
- `@FutureOrPresent/@PastOrPresent` - Date validation
- `@AssertTrue` - Custom validation logic

## Best Practices Applied

1. **Separation of Concerns** - DTOs separate entity from API contract
2. **Validation** - Comprehensive validation at DTO level
3. **Immutability** - Final fields (via Lombok @Data)
4. **Generic Response** - ApiResponse<T> for consistency
5. **Read-only Fields** - Computed/dependent fields marked as read-only
6. **Nested DTOs** - Complex objects properly nested
7. **Documentation** - Each DTO field documented

## DTO Mapping Strategy

Implement MapStruct or ModelMapper for:
- Entity ↔ DTO conversions
- Auto-mapping with custom rules
- Nested object mapping
- Collection mapping

Example service layer:
```java
@Service
public class CandidateService {
    @Autowired
    private CandidateMapper mapper;
    
    public CandidateDTO getCandidateById(UUID id) {
        Candidate candidate = repository.findById(id);
        return mapper.toDTO(candidate);
    }
}
```

## API Contract Examples

### Request: Create Candidate
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1-555-0123",
  "location": "San Francisco, CA",
  "currentCompany": "Tech Corp",
  "totalExperienceYears": 5,
  "summary": "Senior developer with expertise in Java and React"
}
```

### Response: Success
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "id": "uuid-here",
    "firstName": "John",
    "lastName": "Doe",
    "createdAt": "2026-06-19T10:30:00"
  },
  "timestamp": "2026-06-19T10:30:00",
  "success": true
}
```

### Response: Paginated Results
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "content": [
      { "id": "uuid1", "firstName": "John", ... },
      { "id": "uuid2", "firstName": "Jane", ... }
    ],
    "pageNumber": 0,
    "pageSize": 20,
    "totalElements": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrevious": false,
    "isFirst": true,
    "isLast": false
  },
  "timestamp": "2026-06-19T10:30:00",
  "success": true
}
```

### Response: Error
```json
{
  "code": 400,
  "message": "Email format is invalid",
  "errorCode": "BAD_REQUEST",
  "timestamp": "2026-06-19T10:30:00",
  "success": false
}
```

## Next Implementation Steps

1. Create Mapper classes using MapStruct
2. Implement Service layer with DTO conversion
3. Create REST Controllers using these DTOs
4. Add request/response validation
5. Implement global exception handling
6. Add API documentation with Swagger/OpenAPI
