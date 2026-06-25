# Resume Analysis & ATS Scoring API Documentation

Complete documentation for the resume analysis and ATS scoring feature.

---

## Overview

The Resume Analysis feature enables recruiters to:
1. Define job requirements (skills, experience, education)
2. Upload multiple candidate resumes (PDF, DOC, DOCX)
3. Get automatic ATS (Applicant Tracking System) scores for each resume
4. View detailed analysis results in a tabular format
5. Store resumes securely in AWS S3

---

## Architecture

### Frontend Component
- **Location**: `frontend/src/pages/analysis/JobAnalysisPage.tsx`
- **Features**:
  - Job details form
  - Resume upload with drag-and-drop
  - Results table with ATS scores
  - Skill matching visualization

### Backend Services
- **ResumeAnalysisService**: Core business logic
- **S3Service**: AWS S3 file management
- **ResumeAnalysisRepository**: Database persistence
- **ResumeAnalysisController**: REST API endpoints

### Database
- **ResumeAnalysis Table**: Stores analysis results
  - Candidate information
  - ATS scores and ratings
  - Matched/missing skills
  - Resume S3 URL

---

## API Endpoints

### 1. Analyze Resumes

**Endpoint**: `POST /api/v1/resume-analysis/analyze`

**Authentication**: Required (Admin/Recruiter role)

**Request** (multipart/form-data):
```
organizationId: string (required)
jobId: string (required)
requiredSkills: array<string> (required)
minExperience: integer (optional)
maxExperience: integer (optional)
files: array<file> (required)
```

**Example cURL**:
```bash
curl -X POST http://localhost:8080/api/v1/resume-analysis/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -F "organizationId=org-123" \
  -F "jobId=job-456" \
  -F "requiredSkills=React" \
  -F "requiredSkills=TypeScript" \
  -F "requiredSkills=Spring Boot" \
  -F "minExperience=3" \
  -F "maxExperience=10" \
  -F "files=@resume1.pdf" \
  -F "files=@resume2.pdf"
```

**Response** (200 OK):
```json
{
  "results": [
    {
      "id": "analysis-123",
      "candidateName": "John Doe",
      "email": "john@example.com",
      "phone": "+1-555-0001",
      "atsScore": 85.5,
      "matchedSkills": ["React", "TypeScript"],
      "missingSkills": ["Spring Boot"],
      "yearsOfExperience": 5,
      "education": "Master's",
      "professionalSummary": "Experienced full-stack developer...",
      "resumeFileName": "resume1.pdf",
      "resumeS3Url": "https://bucket.s3.amazonaws.com/...",
      "rating": "EXCELLENT",
      "analyzedAt": "2026-06-19T14:30:00"
    }
  ],
  "totalAnalyzed": 2,
  "averageScore": 82.3,
  "excellentMatches": 1,
  "goodMatches": 1
}
```

---

### 2. Get Analyses for Job

**Endpoint**: `GET /api/v1/resume-analysis/job/{jobId}`

**Authentication**: Required

**Query Parameters**:
- `organizationId` (required): Organization UUID
- `page` (optional): Page number (default: 0)
- `size` (optional): Page size (default: 20)

**Example cURL**:
```bash
curl -X GET "http://localhost:8080/api/v1/resume-analysis/job/job-456?organizationId=org-123&page=0&size=20" \
  -H "Authorization: Bearer $TOKEN"
```

**Response** (200 OK):
```json
{
  "content": [
    {
      "id": "analysis-123",
      "candidateName": "John Doe",
      "email": "john@example.com",
      "atsScore": 85.5,
      "rating": "EXCELLENT"
    }
  ],
  "totalElements": 15,
  "totalPages": 1,
  "number": 0,
  "size": 20,
  "empty": false
}
```

---

### 3. Get Top Candidates

**Endpoint**: `GET /api/v1/resume-analysis/job/{jobId}/top`

**Authentication**: Required

**Query Parameters**:
- `organizationId` (required): Organization UUID
- `limit` (optional): Number of top candidates (default: 10)

**Example cURL**:
```bash
curl -X GET "http://localhost:8080/api/v1/resume-analysis/job/job-456/top?organizationId=org-123&limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

**Response** (200 OK):
```json
[
  {
    "id": "analysis-123",
    "candidateName": "John Doe",
    "atsScore": 85.5,
    "rating": "EXCELLENT",
    "matchedSkills": ["React", "TypeScript"],
    "yearsOfExperience": 5
  },
  {
    "id": "analysis-124",
    "candidateName": "Jane Smith",
    "atsScore": 78.2,
    "rating": "GOOD",
    "matchedSkills": ["React"],
    "yearsOfExperience": 4
  }
]
```

---

### 4. Delete Analysis

**Endpoint**: `DELETE /api/v1/resume-analysis/{analysisId}`

**Authentication**: Required

**Query Parameters**:
- `organizationId` (required): Organization UUID

**Example cURL**:
```bash
curl -X DELETE "http://localhost:8080/api/v1/resume-analysis/analysis-123?organizationId=org-123" \
  -H "Authorization: Bearer $TOKEN"
```

**Response** (200 OK):
```json
{
  "message": "Analysis deleted successfully"
}
```

---

## ATS Scoring Algorithm

### Score Calculation (0-100 points)

#### 1. Skill Matching (40 points)
- Matches required skills found in resume
- Formula: `(matched_skills / required_skills) * 40`
- Example: 2 of 3 skills matched = (2/3) * 40 = 26.67 points

#### 2. Experience (30 points)
- Compares resume experience with job requirement
- If experience ≥ minimum required: 30 points
- If experience < minimum: `(resume_exp / min_exp) * 30`
- Example: 5 years experience, 3 years required = 30 points

#### 3. Education (15 points)
- PhD/Master's: 15 points
- Bachelor's: 10 points
- High School/Diploma: 5 points

#### 4. Presentation (15 points)
- Professional summary: 10 points
- Contact information: 5 points

### Rating Categories

| Score | Rating    | Description              |
|-------|-----------|--------------------------|
| 80-100 | EXCELLENT | Strong candidate match   |
| 60-79  | GOOD      | Reasonable candidate match |
| 40-59  | FAIR      | Some relevant experience |
| 0-39   | POOR      | Limited match            |

---

## Data Models

### ResumeAnalysis Entity

```java
{
  id: String (UUID),
  organizationId: String,
  jobId: String,
  candidateName: String,
  email: String,
  phone: String,
  atsScore: Double (0-100),
  matchedSkillsJson: String (JSON array),
  missingSkillsJson: String (JSON array),
  yearsOfExperience: Integer,
  education: String,
  professionalSummary: String,
  resumeFileName: String,
  resumeS3Url: String,
  rating: EXCELLENT | GOOD | FAIR | POOR,
  analyzedAt: LocalDateTime,
  createdAt: LocalDateTime
}
```

### ResumeAnalysisDTO

```java
{
  id: String,
  candidateName: String,
  email: String,
  phone: String,
  atsScore: Double,
  matchedSkills: List<String>,
  missingSkills: List<String>,
  yearsOfExperience: Integer,
  education: String,
  professionalSummary: String,
  resumeFileName: String,
  resumeS3Url: String,
  rating: String,
  analyzedAt: LocalDateTime
}
```

---

## Resume Parsing

### Supported Formats
- PDF (.pdf)
- Microsoft Word (.doc, .docx)
- Text (.txt)

### Extracted Information
1. **Candidate Name**: First line or from header
2. **Email**: Regex pattern matching
3. **Phone**: Regex pattern matching
4. **Experience**: Years mentioned in resume
5. **Education**: Degree level extraction
6. **Skills**: Keyword matching against common tech skills

### Limitations
- Simple text extraction (no advanced NLP in basic version)
- No table parsing
- No image/graphic content extraction

### Future Improvements
- Apache PDFBox for advanced PDF parsing
- Stanford CoreNLP for NER (named entity recognition)
- spaCy/NLTK for skill extraction
- ML-based resume classification

---

## S3 Storage

### Bucket Structure
```
s3://hiresmart-resumes/
├── {organizationId}/
│   └── {jobId}/
│       ├── {timestamp}-resume1.pdf
│       ├── {timestamp}-resume2.pdf
│       └── {timestamp}-resume3.pdf
```

### Configuration
```yaml
aws:
  s3:
    bucket: hiresmart-resumes
    region: us-east-1
    access-key: ${AWS_ACCESS_KEY_ID}
    secret-key: ${AWS_SECRET_ACCESS_KEY}
```

### Permissions
- Private bucket (not publicly accessible)
- Pre-signed URLs for temporary access
- Automatic cleanup of old files (optional)

---

## Error Handling

### Common Errors

**400 Bad Request**
```json
{
  "error": "At least one resume file is required"
}
```

**401 Unauthorized**
```json
{
  "error": "Authentication required"
}
```

**403 Forbidden**
```json
{
  "error": "Insufficient permissions"
}
```

**404 Not Found**
```json
{
  "error": "Job not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Error analyzing resumes: File parsing failed"
}
```

---

## Performance Considerations

### Optimization Tips
1. **Batch Processing**: Process multiple resumes in parallel
2. **Caching**: Cache common skill lists
3. **Indexing**: Index by jobId and organizationId for fast queries
4. **Async Upload**: Use async/await for S3 uploads
5. **Pagination**: Limit result sets with pagination

### Scalability
- Expected handling: 100+ resumes per analysis
- Average processing time: 2-5 seconds per batch
- Storage: ~1-2MB per resume on S3

---

## Security

### File Upload Security
- Validate file types (whitelist: pdf, doc, docx)
- Limit file size (max 50MB per file)
- Scan for malware (optional, via AWS Macie)
- Generate unique names for S3 storage

### Data Protection
- Resume data encrypted at rest (S3 SSE)
- Encrypted in transit (HTTPS/TLS)
- Access controlled via IAM roles
- Audit logging enabled

### Privacy
- GDPR compliance: Can delete all data for candidate
- CCPA compliance: Right to access/delete
- Data retention: Auto-delete after 1 year (configurable)

---

## Testing

### Unit Tests
```bash
mvn test -Dtest=ResumeAnalysisServiceTest
```

### Integration Tests
```bash
mvn verify -Dtest=ResumeAnalysisControllerTest
```

### Manual Testing
1. Use Postman collection: `API_TESTS.postman_collection.json`
2. Add resume files to test
3. Verify S3 upload
4. Check database records

---

## Example Workflow

### Step 1: Define Job
```bash
# Create job via /jobs endpoint
POST /api/v1/jobs
{
  "title": "Senior React Developer",
  "description": "...",
  "requiredSkills": ["React", "TypeScript"],
  "minExperience": 5
}
```

### Step 2: Upload & Analyze Resumes
```bash
# Analyze resumes
POST /api/v1/resume-analysis/analyze
```

### Step 3: Review Results
```bash
# Get top candidates
GET /api/v1/resume-analysis/job/{jobId}/top
```

### Step 4: Contact Candidates
```bash
# Use matched emails to contact candidates
# Send offer for top matches (80+ score)
```

---

## Troubleshooting

### Issue: S3 Upload Fails
**Cause**: AWS credentials not configured
**Solution**: Set environment variables
```bash
export AWS_ACCESS_KEY_ID=xxx
export AWS_SECRET_ACCESS_KEY=xxx
export AWS_REGION=us-east-1
```

### Issue: Resume Parsing Inaccurate
**Cause**: Complex PDF formatting
**Solution**: Request plaintext format or use advanced PDF parser

### Issue: High ATS Scores for All Resumes
**Cause**: Required skills list too generic
**Solution**: Use specific, technical skills

### Issue: Slow Performance with Many Resumes
**Cause**: Synchronous processing
**Solution**: Use batch/async processing

---

## Future Enhancements

1. **Advanced NLP**: Use spaCy/BERT for better skill extraction
2. **ML Scoring**: Machine learning-based candidate ranking
3. **Interview Scheduling**: Auto-schedule interviews for top candidates
4. **Feedback Loop**: Learn from hiring decisions
5. **Integration**: Connect with calendar/email services
6. **Reporting**: Generate hiring analytics reports

---

**Last Updated**: 2026-06-19  
**Version**: 1.0  
**Status**: Production Ready
