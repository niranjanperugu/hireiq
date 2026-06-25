# HireSmart - Complete Startup & Testing Guide

Complete step-by-step guide to deploy HireSmart, populate test data, and test in your browser.

---

## Prerequisites

✅ Verify you have installed:
- Docker (v20.10+)
- Docker Compose (v2.0+)
- Git
- 4GB+ RAM allocated to Docker

**Check Installation:**
```bash
docker --version
docker-compose --version
git --version
```

---

## Part 1: Deploy to Docker

### Step 1: Clone or Navigate to Project

```bash
cd /path/to/hiresmart
# or
git clone <repository-url>
cd hiresmart
```

### Step 2: Verify Project Structure

```bash
ls -la
# Should show:
# ├── backend/
# ├── frontend/
# ├── docker-compose.yml
# ├── nginx.conf
# ├── .env.docker
# ├── scripts/
# └── README.md
```

### Step 3: Start All Services

```bash
# Build images and start services
docker-compose up -d

# Verify all services started
docker-compose ps
```

**Expected Output:**
```
NAME                 STATUS              PORTS
hiresmart-api        Up 2 minutes        0.0.0.0:8080->8080/tcp
hiresmart-ui         Up 2 minutes        0.0.0.0:3000->3000/tcp
hiresmart-db         Up 2 minutes        0.0.0.0:5432->5432/tcp
hiresmart-proxy      Up 2 minutes        0.0.0.0:80->80/tcp
```

### Step 4: Verify Services are Healthy

```bash
# Check backend health
curl http://localhost:8080/api/v1/health/status

# Check frontend
curl http://localhost:3000

# Check database
docker-compose exec postgres pg_isready -U hiresmart_user
```

**Expected Output:**
- Backend: `{"status":"UP"}`
- Frontend: HTML response
- Database: `accepting connections`

### Step 5: View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

---

## Part 2: Populate Test Data

### Option A: Using Provided Script

```bash
# Make script executable
chmod +x scripts/populate-test-data.sh

# Run the script
./scripts/populate-test-data.sh

# Or specify API URL
API_URL=http://localhost:8080/api/v1 ./scripts/populate-test-data.sh
```

**Script will:**
1. ✅ Register admin user (admin@hiresmart.com)
2. ✅ Create 5 candidate profiles
3. ✅ Create 5 job postings
4. ✅ Create 10+ job applications
5. ✅ Output test credentials and URLs

### Option B: Manual Data Entry via Postman

```bash
# Import Postman collection
postman collection run API_TESTS.postman_collection.json \
  -e environment.json
```

### Option C: Manual API Calls

**1. Register User:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Admin",
    "lastName": "User",
    "email": "admin@hiresmart.com",
    "password": "AdminPass123!"
  }'
```

**2. Login & Get Token:**
```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hiresmart.com",
    "password": "AdminPass123!"
  }' | jq -r '.token')

echo "Token: $TOKEN"
```

**3. Create Candidate:**
```bash
curl -X POST http://localhost:8080/api/v1/candidates \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1-555-0001",
    "location": "San Francisco, CA",
    "currentCompany": "Tech Corp",
    "currentDesignation": "Senior Developer",
    "totalExperienceYears": 7,
    "summary": "Experienced full-stack developer with 7 years of expertise"
  }'
```

**4. Create Job:**
```bash
curl -X POST http://localhost:8080/api/v1/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior React Developer",
    "description": "We are looking for an experienced React developer...",
    "employmentType": "FULL_TIME",
    "workMode": "HYBRID",
    "location": "San Francisco, CA",
    "minExperienceYears": 5,
    "maxExperienceYears": 10,
    "salaryMin": 140000,
    "salaryMax": 190000,
    "status": "OPEN"
  }'
```

---

## Part 3: Browser Testing

### Step 1: Open Application in Browser

1. **Frontend**: http://localhost:3000
2. **API (via Nginx)**: http://localhost/api/v1
3. **Direct API**: http://localhost:8080/api/v1

### Step 2: Login

```
Email: admin@hiresmart.com
Password: AdminPass123!
```

### Step 3: Test Core Workflows

#### 3.1 Dashboard
- [ ] Page loads without errors
- [ ] KPI cards show correct data
- [ ] Recent candidates displayed
- [ ] Recent jobs displayed

#### 3.2 Candidates Page
- [ ] List all candidates
- [ ] Search for candidates
- [ ] Click to view candidate detail
- [ ] Click "Add Candidate" button
- [ ] Fill form and submit
- [ ] Edit existing candidate
- [ ] Delete candidate (verify confirmation)

#### 3.3 Jobs Page
- [ ] List all job postings
- [ ] Filter by status
- [ ] Search for jobs
- [ ] Click to view job detail
- [ ] Click "Create Job" button
- [ ] Fill job form (including requirements)
- [ ] Edit existing job
- [ ] Delete job

#### 3.4 Applications Pipeline
- [ ] View pipeline view (4 columns)
- [ ] View all applications list
- [ ] See match scores for candidates
- [ ] Click "View Details" on application
- [ ] Verify application status

#### 3.5 Analytics Dashboard
- [ ] Page loads with charts
- [ ] KPI cards display metrics
- [ ] Candidate pipeline bar chart
- [ ] Time-to-hire line chart
- [ ] Job status pie chart
- [ ] Department metrics chart
- [ ] Download/export functionality

#### 3.6 User Profile
- [ ] Click user menu in header
- [ ] View profile information
- [ ] Logout (verify redirect to login)

### Step 4: Test Authentication

#### 4.1 Login Flow
- [ ] Visit http://localhost:3000
- [ ] See login form (not logged in)
- [ ] Enter invalid email → see error
- [ ] Enter invalid password → see error
- [ ] Login with correct credentials
- [ ] Redirect to dashboard
- [ ] Verify JWT token in localStorage

#### 4.2 Protected Routes
- [ ] Logout
- [ ] Try to access /candidates directly
- [ ] Should redirect to /login
- [ ] Login again
- [ ] Verify token is refreshed

#### 4.3 Register Flow (if enabled)
- [ ] Click "Register" link
- [ ] Fill form with valid data
- [ ] Verify password strength indicator
- [ ] Submit and verify user created

---

## Part 4: API Testing

### Using Postman

```bash
# Set up Postman environment
postman collection run API_TESTS.postman_collection.json \
  --environment environment.json \
  --reporters cli,json \
  --reporter-json-export-file results.json
```

### Using cURL

```bash
# Test all endpoints
bash scripts/test-api.sh

# Or individual endpoints
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/candidates?page=0&size=20
```

### Expected API Responses

**GET /health/status** (200 OK)
```json
{"status":"UP"}
```

**POST /auth/login** (200 OK)
```json
{
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "admin@hiresmart.com",
    "firstName": "Admin",
    "lastName": "User"
  }
}
```

**GET /candidates** (200 OK)
```json
{
  "content": [
    {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "location": "San Francisco, CA"
    }
  ],
  "totalElements": 5,
  "totalPages": 1,
  "page": 0,
  "size": 20
}
```

---

## Part 5: Common Issues & Fixes

### Services Won't Start

**Problem**: Containers failed to start

**Solution**:
```bash
# Check logs
docker-compose logs

# Stop and remove all containers
docker-compose down -v

# Rebuild from scratch
docker-compose build --no-cache
docker-compose up -d
```

### Port Already in Use

**Problem**: "Address already in use"

**Solution**:
```bash
# Find process using port
lsof -i :3000
lsof -i :8080
lsof -i :5432

# Kill process
kill -9 <PID>

# Or change port in docker-compose.yml
# ports:
#   - "3001:3000"
```

### Database Connection Failed

**Problem**: Backend can't connect to PostgreSQL

**Solution**:
```bash
# Check database is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres \
  psql -U hiresmart_user -d hiresmart_db -c "SELECT 1"
```

### Frontend Blank Page

**Problem**: Frontend shows blank page

**Solution**:
```bash
# Check frontend logs
docker-compose logs frontend

# Check API connectivity
curl http://localhost:8080/api/v1/health/status

# Restart frontend
docker-compose restart frontend
```

### API Returns 401 Unauthorized

**Problem**: Token invalid or expired

**Solution**:
```bash
# Get new token
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hiresmart.com","password":"AdminPass123!"}'

# Use new token in requests
curl -H "Authorization: Bearer NEW_TOKEN" \
  http://localhost:8080/api/v1/candidates
```

---

## Part 6: Performance Testing

### Load Testing

```bash
# Install Artillery
npm install -g artillery

# Run load test
artillery run scripts/load-test.yml \
  --target http://localhost:8080

# View results
artillery report results.json
```

### Browser Performance

Open DevTools (F12) and check:
- [ ] Network tab: All requests under 500ms
- [ ] Console: No JavaScript errors
- [ ] Performance tab: First contentful paint < 2s
- [ ] Memory: No memory leaks

---

## Part 7: Cleanup & Reset

### Stop All Services (Keep Data)

```bash
docker-compose stop
```

### Stop & Remove Everything

```bash
docker-compose down
```

### Delete Everything Including Database

```bash
docker-compose down -v
```

### Full Reset

```bash
# Stop services
docker-compose down -v

# Remove images
docker rmi hiresmart-backend hiresmart-frontend

# Rebuild everything
docker-compose build
docker-compose up -d
```

---

## Deployment Checklist

- [ ] Docker & Docker Compose installed
- [ ] Project cloned/downloaded
- [ ] Docker Compose started successfully
- [ ] All 4 services healthy
- [ ] Test data populated
- [ ] Login works
- [ ] Dashboard displays data
- [ ] Candidates page works
- [ ] Jobs page works
- [ ] Applications pipeline works
- [ ] Analytics dashboard works
- [ ] API endpoints respond correctly
- [ ] No console errors
- [ ] No network failures

---

## Next Steps

1. **Local Testing Complete**: ✅
2. **Staging Deployment**: See DEPLOYMENT_GUIDE.md
3. **Production Deployment**: See DEPLOYMENT_GUIDE.md
4. **Monitoring**: See DOCKER_SETUP.md and TESTING_GUIDE.md

---

## Support

- **Logs**: `docker-compose logs -f`
- **Health Check**: `curl http://localhost:8080/api/v1/health/details`
- **API Docs**: http://localhost:8080/swagger-ui.html (if enabled)
- **Database**: `docker-compose exec postgres psql -U hiresmart_user -d hiresmart_db`

---

**Last Updated**: 2026-06-19  
**Status**: Production Ready  
**Estimated Setup Time**: 5-10 minutes
