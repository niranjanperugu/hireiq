# HireSmart REST API Documentation

**Version**: 1.0.0  
**Status**: Production Ready  
**Last Updated**: 2026-06-19

---

## Overview

RESTful API for HireSmart - Enterprise AI-Powered Recruitment and Interview Management Platform. The API follows REST principles with JSON request/response format and implements JWT-based authentication.

**Base URL**: `http://localhost:8080/api/v1`

---

## Authentication

### JWT Token-Based Authentication

All protected endpoints require a Bearer token in the Authorization header.

```
Authorization: Bearer <jwt-token>
```

**Token Structure**:
- Header: `Authorization: Bearer <token>`
- Claims: user ID, email, role, organization ID
- Expiration: Configurable (default: 24 hours)
- Refresh Token: Available for token renewal

### Public Endpoints
- `GET /health` - Health check
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/refresh` - Token refresh

---

## API Endpoints

### 1. Health & Status

#### Health Check
```
GET /health
```
**Description**: Check if application is running

**Response**:
```json
{
  "code": 200,
  "message": "Service is healthy",
  "data": {
    "status": "UP",
    "service": "HireSmart",
    "version": "1.0.0",
    "timestamp": 1687214400000
  },
  "success": true
}
```

#### Readiness Check
```
GET /health/ready
```
**Description**: Check if application is ready to serve requests

---

### 2. Candidate Management

#### Get All Candidates
```
GET /organizations/{organizationId}/candidates
```
**Query Parameters**:
- `page` (default: 0) - Page number
- `size` (default: 20) - Page size
- `sortBy` (default: createdAt) - Sort field
- `direction` (default: DESC) - Sort direction (ASC/DESC)

**Response**: `PageableResponseDTO<CandidateDTO>`

#### Search Candidates
```
GET /organizations/{organizationId}/candidates/search?query={keyword}
```

#### Find by Skill
```
GET /organizations/{organizationId}/candidates/by-skill?skill={skillName}
```

#### Find by Experience Range
```
GET /organizations/{organizationId}/candidates/by-experience?minYears={min}&maxYears={max}
```

#### Get Candidate by ID
```
GET /organizations/{organizationId}/candidates/{candidateId}
```

#### Create Candidate
```
POST /organizations/{organizationId}/candidates
```
**Request Body**:
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

#### Update Candidate
```
PUT /organizations/{organizationId}/candidates/{candidateId}
```

#### Delete Candidate
```
DELETE /organizations/{organizationId}/candidates/{candidateId}
```

#### Get Candidate Count
```
GET /organizations/{organizationId}/candidates/count
```

---

### 3. Job Management

#### Get All Jobs
```
GET /organizations/{organizationId}/jobs
```

#### Get Jobs by Status
```
GET /organizations/{organizationId}/jobs/by-status?status={STATUS}
```
**Status Values**: DRAFT, OPEN, ON_HOLD, CLOSED, FILLED

#### Get Open Jobs
```
GET /organizations/{organizationId}/jobs/open
```

#### Search Jobs
```
GET /organizations/{organizationId}/jobs/search?query={keyword}
```

#### Get Jobs by Department
```
GET /organizations/{organizationId}/jobs/by-department/{departmentId}
```

#### Get Job by ID
```
GET /organizations/{organizationId}/jobs/{jobId}
```

#### Create Job
```
POST /organizations/{organizationId}/jobs
```
**Request Body**:
```json
{
  "departmentId": "uuid-here",
  "title": "Senior Java Developer",
  "description": "Looking for an experienced Java developer...",
  "minExperienceYears": 5,
  "maxExperienceYears": 10,
  "employmentType": "FULL_TIME",
  "workMode": "HYBRID",
  "salaryMin": 100000,
  "salaryMax": 150000,
  "salaryCurrency": "USD",
  "location": "San Francisco, CA",
  "requirements": [
    {
      "requirementType": "SKILL",
      "requirementValue": "Java 21",
      "isMandatory": true
    }
  ]
}
```

#### Update Job
```
PUT /organizations/{organizationId}/jobs/{jobId}
```

#### Publish Job
```
PUT /organizations/{organizationId}/jobs/{jobId}/publish
```
**Description**: Change job status from DRAFT to OPEN

#### Close Job
```
PUT /organizations/{organizationId}/jobs/{jobId}/close
```
**Description**: Close job posting

#### Delete Job
```
DELETE /organizations/{organizationId}/jobs/{jobId}
```

---

### 4. Job Applications

#### Get All Applications
```
GET /organizations/{organizationId}/applications
```

#### Get Applications by Status
```
GET /organizations/{organizationId}/applications/by-status?status={STATUS}
```

#### Get Applications by Candidate
```
GET /organizations/{organizationId}/applications/candidate/{candidateId}
```

#### Get Applications by Job
```
GET /organizations/{organizationId}/applications/job/{jobId}
```

#### Get Application by ID
```
GET /organizations/{organizationId}/applications/{applicationId}
```

#### Create Application
```
POST /organizations/{organizationId}/applications
```

#### Update Application
```
PUT /organizations/{organizationId}/applications/{applicationId}
```

#### Shortlist Application
```
PUT /organizations/{organizationId}/applications/{applicationId}/shortlist
```

#### Reject Application
```
PUT /organizations/{organizationId}/applications/{applicationId}/reject?reason={reason}
```

#### Get High-Scoring Applications
```
GET /organizations/{organizationId}/applications/high-scoring/{jobId}?minScore=75
```

---

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "code": 200,
  "message": "Success",
  "data": { /* ... */ },
  "timestamp": "2026-06-19T10:30:00",
  "success": true
}
```

### Paginated Response
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "content": [ /* ... */ ],
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

### Error Response
```json
{
  "code": 400,
  "message": "Email format is invalid",
  "errorCode": "BAD_REQUEST",
  "timestamp": "2026-06-19T10:30:00",
  "success": false
}
```

---

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication failed |
| 403 | Forbidden - Access denied |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

---

## Error Codes

| Code | Description |
|------|-------------|
| BAD_REQUEST | Invalid input or validation error |
| UNAUTHORIZED | Authentication required |
| FORBIDDEN | Insufficient permissions |
| NOT_FOUND | Resource not found |
| INTERNAL_ERROR | Server error |
| BUSINESS_ERROR | Business logic violation |

---

## Data Types

### Enums

**EmploymentType**:
- FULL_TIME
- PART_TIME
- CONTRACT
- INTERNSHIP

**WorkMode**:
- REMOTE
- HYBRID
- ON_SITE

**JobStatus**:
- DRAFT
- OPEN
- ON_HOLD
- CLOSED
- FILLED

**CandidateStatus**:
- APPLIED
- SCREENED
- SHORTLISTED
- INTERVIEW_ROUND_1
- INTERVIEW_ROUND_2
- FINAL_INTERVIEW
- OFFER_RELEASED
- OFFER_ACCEPTED
- HIRED
- REJECTED
- WITHDRAWN

**SkillLevel**:
- BEGINNER
- INTERMEDIATE
- ADVANCED
- EXPERT

---

## Pagination

All list endpoints support pagination:

**Query Parameters**:
- `page` - Zero-indexed page number (default: 0)
- `size` - Number of records per page (default: 20)
- `sortBy` - Field to sort by (default: createdAt)
- `direction` - Sort direction: ASC or DESC (default: DESC)

**Example**:
```
GET /organizations/{orgId}/candidates?page=0&size=20&sortBy=email&direction=ASC
```

---

## Validation Rules

### Candidate
- Email: Must be valid email format
- First Name: 2-100 characters
- Last Name: 2-100 characters
- Phone: 10-15 digits
- Experience Years: 0-70 years
- Summary: Max 2000 characters

### Job
- Title: 3-255 characters
- Description: 20-5000 characters
- Experience Years: 0-70 years
- Salary: Min <= Max
- Location: Required

---

## Rate Limiting

Standard rate limiting applied:
- **Default**: 100 requests per minute per user
- **Headers**:
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset time (Unix timestamp)

---

## Swagger/OpenAPI

API documentation available at:
- **Swagger UI**: http://localhost:8080/api/v1/swagger-ui.html
- **OpenAPI Spec**: http://localhost:8080/api/v1/v3/api-docs

---

## Examples

### Example: Create Candidate and Apply for Job

```bash
# 1. Create candidate
curl -X POST http://localhost:8080/api/v1/organizations/{orgId}/candidates \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "currentCompany": "StartupXYZ",
    "totalExperienceYears": 3
  }'

# 2. Get candidate ID from response
# 3. Create application for job
curl -X POST http://localhost:8080/api/v1/organizations/{orgId}/applications \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "candidateId": "{candidateId}",
    "jobId": "{jobId}"
  }'
```

### Example: Search Candidates by Skill

```bash
curl -X GET "http://localhost:8080/api/v1/organizations/{orgId}/candidates/by-skill?skill=Java&page=0&size=20" \
  -H "Authorization: Bearer {token}"
```

---

## Future Enhancements

- [ ] GraphQL support
- [ ] Bulk operations
- [ ] Export to CSV/Excel
- [ ] Webhooks for events
- [ ] Batch job processing
- [ ] Advanced filtering (Elasticsearch)
- [ ] File upload/download for resumes
- [ ] Email notification APIs
- [ ] Calendar sync APIs
- [ ] Analytics APIs

---

## Support & Contact

For API issues or questions:
- Documentation: See this file
- Swagger UI: http://localhost:8080/api/v1/swagger-ui.html
- Code Repository: `/SmartHire`

**Last Updated**: 2026-06-19  
**Version**: 1.0.0
