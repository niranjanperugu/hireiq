# HireSmart Testing Guide

Complete testing strategy and procedures for HireSmart.

## Table of Contents
1. [Test Levels](#test-levels)
2. [Frontend Testing](#frontend-testing)
3. [Backend Testing](#backend-testing)
4. [API Testing](#api-testing)
5. [Integration Testing](#integration-testing)
6. [Performance Testing](#performance-testing)
7. [Security Testing](#security-testing)

---

## Test Levels

### Unit Tests
- Single function/component testing
- Dependencies mocked
- Fast execution (< 1 second each)

### Integration Tests
- Multiple components/modules together
- Real databases/services
- Moderate execution time (1-10 seconds)

### End-to-End (E2E) Tests
- Full user workflows
- Real application stack
- Slower execution (10+ seconds)

### Performance Tests
- Load testing
- Stress testing
- Response time measurement

### Security Tests
- Vulnerability scanning
- Dependency audits
- OWASP compliance

---

## Frontend Testing

### Setup

```bash
cd frontend

# Install dependencies
npm install

# Install testing packages
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
```

### Run Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run specific test file
npm run test -- src/__tests__/pages/LoginPage.test.tsx

# Generate coverage report
npm run test:coverage

# Run with UI
npm run test -- --ui
```

### Writing Tests

```typescript
// src/__tests__/components/Button.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Button from '@components/Button'

describe('Button Component', () => {
  it('should render button with text', () => {
    render(<Button>Click Me</Button>)
    expect(screen.getByText('Click Me')).toBeInTheDocument()
  })

  it('should handle click events', () => {
    const handleClick = vi.fn()
    const { getByText } = render(<Button onClick={handleClick}>Click</Button>)
    
    fireEvent.click(getByText('Click'))
    expect(handleClick).toHaveBeenCalledOnce()
  })
})
```

### Coverage Targets

- Lines: 80%+
- Functions: 80%+
- Branches: 75%+
- Statements: 80%+

### Key Components to Test

- [ ] LoginPage (authentication flow)
- [ ] RegisterPage (form validation)
- [ ] CandidatesPage (CRUD operations)
- [ ] JobsPage (listing and filtering)
- [ ] DataTable (reusable component)
- [ ] Forms (validation and submission)
- [ ] Redux slices (state management)
- [ ] API client (interceptors, errors)

---

## Backend Testing

### Setup

```bash
cd backend

# Maven plugins already configured in pom.xml
# - JUnit 5
# - Mockito
# - SpringBootTest
# - Testcontainers (for database)
```

### Run Tests

```bash
# Run unit tests
mvn test

# Run all tests including integration tests
mvn verify

# Run specific test class
mvn test -Dtest=CandidateControllerTest

# Run with coverage (Jacoco)
mvn clean test jacoco:report
# Report: target/site/jacoco/index.html

# Skip tests during build
mvn clean install -DskipTests
```

### Writing Tests

```java
@SpringBootTest
class CandidateControllerTest {
    
    @MockBean
    private CandidateService candidateService;
    
    @Autowired
    private MockMvc mockMvc;
    
    @Test
    void testGetAllCandidates() throws Exception {
        List<CandidateDTO> candidates = Arrays.asList(
            new CandidateDTO(1L, "John", "Doe", "john@example.com")
        );
        
        when(candidateService.getAllCandidates(any()))
            .thenReturn(new PageImpl<>(candidates));
        
        mockMvc.perform(get("/api/v1/candidates"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content", hasSize(1)))
            .andExpect(jsonPath("$.content[0].firstName", is("John")));
    }
}
```

### Test Containers (Database Tests)

```java
@SpringBootTest
@Testcontainers
class CandidateRepositoryTest {
    
    @Container
    static PostgreSQLContainer<?> postgres = 
        new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("hiresmart_test")
            .withUsername("test")
            .withPassword("test");
    
    @Autowired
    private CandidateRepository repository;
    
    @Test
    void testSaveCandidate() {
        Candidate candidate = new Candidate();
        candidate.setFirstName("Jane");
        candidate.setLastName("Doe");
        candidate.setEmail("jane@example.com");
        
        Candidate saved = repository.save(candidate);
        
        assertNotNull(saved.getId());
        assertEquals("Jane", saved.getFirstName());
    }
}
```

### Coverage Targets

- Lines: 75%+
- Methods: 75%+
- Branches: 70%+

### Key Classes to Test

- [ ] Controllers (request/response)
- [ ] Services (business logic)
- [ ] Repositories (database queries)
- [ ] DTOs (data transformation)
- [ ] Exception handlers (error handling)

---

## API Testing

### Using Postman

```bash
# Import collection
postman collection run API_TESTS.postman_collection.json

# Create environment
{
  "base_url": "http://localhost:8080/api/v1",
  "jwt_token": "",
  "candidate_id": "",
  "job_id": ""
}

# Run with environment
postman collection run API_TESTS.postman_collection.json \
  -e environment.json \
  --reporters cli,json \
  --reporter-json-export results.json
```

### Using cURL

```bash
# Health check
curl -X GET http://localhost:8080/api/v1/health/status

# Login and save token
TOKEN=$(curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | jq -r '.token')

# Get candidates
curl -X GET http://localhost:8080/api/v1/candidates \
  -H "Authorization: Bearer $TOKEN"

# Create candidate
curl -X POST http://localhost:8080/api/v1/candidates \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1-555-0123",
    "location": "San Francisco, CA",
    "currentCompany": "Tech Corp",
    "currentDesignation": "Developer",
    "totalExperienceYears": 5,
    "summary": "Experienced developer"
  }'
```

### Using Newman (CLI)

```bash
# Install Newman
npm install -g newman

# Run collection
newman run API_TESTS.postman_collection.json \
  --environment environment.json \
  --reporters cli,json \
  --reporter-json-export-file results.json

# Run with multiple iterations
newman run API_TESTS.postman_collection.json \
  --iterations 5 \
  --delay 1000
```

### Test Scenarios

- [ ] Authentication (register, login, refresh)
- [ ] Candidate CRUD (create, read, update, delete)
- [ ] Job CRUD (create, read, update, delete)
- [ ] Application workflow (apply, update status, reject)
- [ ] Search & filtering
- [ ] Pagination
- [ ] Error handling (400, 401, 404, 500)
- [ ] Rate limiting
- [ ] CORS headers

---

## Integration Testing

### Docker Compose Testing

```bash
# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Wait for services
docker-compose -f docker-compose.test.yml exec postgres \
  pg_isready -U test_user

# Run tests
npm run test:api
npm run test:e2e

# Cleanup
docker-compose -f docker-compose.test.yml down -v
```

### Test Scenarios

```bash
# 1. User Registration & Login
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "password": "TestPass123!"
  }'

# 2. Create Candidate
curl -X POST http://localhost:8080/api/v1/candidates \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...candidate data...}'

# 3. Create Job
curl -X POST http://localhost:8080/api/v1/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...job data...}'

# 4. Apply for Job
curl -X POST http://localhost:8080/api/v1/applications \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "candidateId": "1",
    "jobId": "1",
    "status": "APPLIED"
  }'

# 5. Update Application Status
curl -X PUT http://localhost:8080/api/v1/applications/1/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "SHORTLISTED"}'
```

---

## Performance Testing

### Load Testing with Artillery

```bash
# Install Artillery
npm install -g artillery

# Create load test config
cat > load-test.yml << EOF
config:
  target: "http://localhost:8080"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Ramp up"
    - duration: 60
      arrivalRate: 100
      name: "Sustained load"

scenarios:
  - name: "API Endpoints"
    flow:
      - get:
          url: "/api/v1/health/status"
      - get:
          url: "/api/v1/candidates?page=0&size=20"
      - post:
          url: "/api/v1/candidates"
          json:
            firstName: "John"
            lastName: "Doe"
            email: "john@example.com"
EOF

# Run load test
artillery run load-test.yml --output results.json

# View report
artillery report results.json
```

### Metrics to Monitor

- Response time (avg, p50, p95, p99)
- Throughput (requests/second)
- Error rate
- CPU usage
- Memory usage
- Database connection pool
- Cache hit rate

---

## Security Testing

### Vulnerability Scanning

```bash
# Scan dependencies
npm audit
mvn dependency-check:check

# OWASP ZAP scanning
docker run --rm -v $(pwd):/src owasp/zap2docker-stable \
  zap-baseline.py -t http://localhost:3000

# Trivy image scanning
trivy image ghcr.io/your-org/hiresmart-backend:latest
```

### Security Checks

- [ ] SQL injection protection (parameterized queries)
- [ ] XSS protection (output encoding)
- [ ] CSRF protection (token validation)
- [ ] Authentication (JWT, password hashing)
- [ ] Authorization (role-based access)
- [ ] Rate limiting
- [ ] Input validation
- [ ] SSL/TLS usage
- [ ] CORS configuration
- [ ] Secure headers (HSTS, CSP, X-Frame-Options)

### Test Security Headers

```bash
curl -I https://example.com | grep -E "Strict-Transport-Security|X-Content-Type-Options|X-Frame-Options"
```

---

## CI/CD Integration

### GitHub Actions

Tests automatically run on:
- Push to main/develop
- Pull requests
- Scheduled (daily at 2 AM)
- Manual trigger (workflow_dispatch)

### Coverage Reports

Coverage reports uploaded to:
- Codecov
- GitHub Actions artifacts
- CI/CD dashboard

### Badges

Add to README:

```markdown
[![Tests](https://github.com/your-org/hiresmart/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/your-org/hiresmart/actions)
[![Coverage](https://codecov.io/gh/your-org/hiresmart/branch/main/graph/badge.svg)](https://codecov.io/gh/your-org/hiresmart)
```

---

## Testing Best Practices

### General Rules

1. **Test behavior, not implementation** - Focus on what the code does, not how
2. **Use descriptive names** - Test names should clearly state what they test
3. **Keep tests isolated** - Each test should be independent
4. **Mock external dependencies** - Don't rely on external services
5. **Test edge cases** - Empty data, null values, large data sets
6. **Use fixtures** - Reusable test data setup

### Code Quality

- Use consistent naming conventions
- Keep test files colocated with source
- Maintain test:source code ratio (1:1 to 2:1)
- Review tests in code reviews
- Refactor tests as needed

### Troubleshooting

```bash
# Test hangs
# Increase timeout
jest.setTimeout(10000)

# Flaky tests
# Check for timing issues, use waitFor()
await waitFor(() => {
  expect(element).toBeInTheDocument()
})

# Setup issues
# Clear state between tests
afterEach(() => {
  cleanup()
  jest.clearAllMocks()
})
```

---

**Last Updated**: 2026-06-19
**Test Framework**: Vitest (Frontend), JUnit 5 (Backend)
**Minimum Coverage**: 80% (Frontend), 75% (Backend)
