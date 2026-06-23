#!/bin/bash

# HireSmart Test Data Population Script
# This script populates the database with sample data for testing

set -e

API_URL="${API_URL:-http://localhost:8080/api/v1}"
ADMIN_EMAIL="admin@hiresmart.com"
ADMIN_PASSWORD="AdminPass123!"

echo "🚀 Starting HireSmart Test Data Population"
echo "API URL: $API_URL"
echo "========================================"

# Wait for API to be ready
echo "⏳ Waiting for API to be ready..."
max_attempts=30
attempt=0
while ! curl -s "$API_URL/health/status" > /dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ $attempt -ge $max_attempts ]; then
    echo "❌ API failed to start after $max_attempts attempts"
    exit 1
  fi
  echo "  Attempt $attempt/$max_attempts..."
  sleep 2
done
echo "✅ API is ready!"

# 1. Register Admin User
echo ""
echo "1️⃣  Registering admin user..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"firstName\": \"Admin\",
    \"lastName\": \"User\",
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\"
  }")

echo "   Response: $REGISTER_RESPONSE"

# 2. Login to get JWT token
echo ""
echo "2️⃣  Logging in to get JWT token..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\"
  }")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get authentication token"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi
echo "✅ Got token: ${TOKEN:0:20}..."

# 3. Create Candidates
echo ""
echo "3️⃣  Creating candidate records..."

CANDIDATES=(
  '{"firstName":"Alice","lastName":"Johnson","email":"alice.johnson@example.com","phone":"+1-555-0001","location":"San Francisco, CA","currentCompany":"Google","currentDesignation":"Senior Developer","totalExperienceYears":7,"summary":"Expert in React and Node.js with 7 years experience"}'
  '{"firstName":"Bob","lastName":"Smith","email":"bob.smith@example.com","phone":"+1-555-0002","location":"New York, NY","currentCompany":"Microsoft","currentDesignation":"Full Stack Developer","totalExperienceYears":5,"summary":"Full stack developer with expertise in Java and React"}'
  '{"firstName":"Carol","lastName":"Davis","email":"carol.davis@example.com","phone":"+1-555-0003","location":"Austin, TX","currentCompany":"Apple","currentDesignation":"Product Manager","totalExperienceYears":6,"summary":"Product manager with background in software engineering"}'
  '{"firstName":"David","lastName":"Wilson","email":"david.wilson@example.com","phone":"+1-555-0004","location":"Seattle, WA","currentCompany":"Amazon","currentDesignation":"DevOps Engineer","totalExperienceYears":8,"summary":"Cloud infrastructure specialist with Kubernetes expertise"}'
  '{"firstName":"Emma","lastName":"Brown","email":"emma.brown@example.com","phone":"+1-555-0005","location":"Boston, MA","currentCompany":"IBM","currentDesignation":"Data Scientist","totalExperienceYears":4,"summary":"Data scientist specializing in machine learning and analytics"}'
)

CANDIDATE_IDS=()
for i in "${!CANDIDATES[@]}"; do
  echo "   Creating candidate $((i+1))/${#CANDIDATES[@]}..."
  RESPONSE=$(curl -s -X POST "$API_URL/candidates" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "${CANDIDATES[$i]}")

  CANDIDATE_ID=$(echo $RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  if [ ! -z "$CANDIDATE_ID" ]; then
    CANDIDATE_IDS+=($CANDIDATE_ID)
    echo "   ✅ Created candidate: $CANDIDATE_ID"
  else
    echo "   Response: $RESPONSE"
  fi
done

# 4. Create Jobs
echo ""
echo "4️⃣  Creating job postings..."

JOBS=(
  '{"title":"Senior React Developer","description":"We are looking for an experienced React developer to join our frontend team. Must have 5+ years of experience with React, Redux, and modern JavaScript. Knowledge of TypeScript, testing, and performance optimization is a plus.","employmentType":"FULL_TIME","workMode":"HYBRID","location":"San Francisco, CA","minExperienceYears":5,"maxExperienceYears":10,"salaryMin":140000,"salaryMax":190000,"status":"OPEN"}'
  '{"title":"Backend Java Engineer","description":"Seeking a skilled Java developer with Spring Boot experience. You will work on microservices architecture, REST APIs, and database optimization. Experience with Docker and Kubernetes is preferred.","employmentType":"FULL_TIME","workMode":"REMOTE","location":"New York, NY","minExperienceYears":4,"maxExperienceYears":9,"salaryMin":130000,"salaryMax":180000,"status":"OPEN"}'
  '{"title":"Product Manager","description":"Join our product team as a PM responsible for feature roadmap and user experience. Ideal candidate has technical background and 5+ years of product management experience. Strong communication and analytics skills required.","employmentType":"FULL_TIME","workMode":"HYBRID","location":"Austin, TX","minExperienceYears":5,"maxExperienceYears":10,"salaryMin":120000,"salaryMax":170000,"status":"OPEN"}'
  '{"title":"DevOps Engineer","description":"We need a DevOps engineer to manage our cloud infrastructure on AWS. You will work with Kubernetes, Docker, CI/CD pipelines, and infrastructure as code. Experience with monitoring and logging tools is essential.","employmentType":"FULL_TIME","workMode":"REMOTE","location":"Seattle, WA","minExperienceYears":4,"maxExperienceYears":8,"salaryMin":135000,"salaryMax":185000,"status":"OPEN"}'
  '{"title":"Data Scientist","description":"Seeking a data scientist to build machine learning models and analyze large datasets. You should have experience with Python, SQL, and ML frameworks. Knowledge of data visualization and business intelligence tools is a plus.","employmentType":"FULL_TIME","workMode":"HYBRID","location":"Boston, MA","minExperienceYears":3,"maxExperienceYears":7,"salaryMin":125000,"salaryMax":175000,"status":"DRAFT"}'
)

JOB_IDS=()
for i in "${!JOBS[@]}"; do
  echo "   Creating job $((i+1))/${#JOBS[@]}..."
  RESPONSE=$(curl -s -X POST "$API_URL/jobs" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "${JOBS[$i]}")

  JOB_ID=$(echo $RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  if [ ! -z "$JOB_ID" ]; then
    JOB_IDS+=($JOB_ID)
    echo "   ✅ Created job: $JOB_ID"
  else
    echo "   Response: $RESPONSE"
  fi
done

# 5. Create Applications
echo ""
echo "5️⃣  Creating job applications..."

if [ ${#CANDIDATE_IDS[@]} -gt 0 ] && [ ${#JOB_IDS[@]} -gt 0 ]; then
  # Create applications - pair candidates with jobs
  APPLICATION_COUNT=0
  for CANDIDATE_ID in "${CANDIDATE_IDS[@]}"; do
    for JOB_ID in "${JOB_IDS[@]:0:2}"; do
      SIMILARITY=$((70 + RANDOM % 30))

      RESPONSE=$(curl -s -X POST "$API_URL/applications" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
          \"candidateId\": \"$CANDIDATE_ID\",
          \"jobId\": \"$JOB_ID\",
          \"status\": \"APPLIED\",
          \"appliedDate\": \"2026-06-19\",
          \"similarityScore\": $SIMILARITY
        }")

      APP_ID=$(echo $RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
      if [ ! -z "$APP_ID" ]; then
        APPLICATION_COUNT=$((APPLICATION_COUNT + 1))
        echo "   ✅ Created application: $APP_ID (Similarity: $SIMILARITY%)"
      fi
    done
  done
  echo "   Total applications created: $APPLICATION_COUNT"
else
  echo "   ⚠️  No candidates or jobs created, skipping applications"
fi

# 6. Summary
echo ""
echo "========================================"
echo "✅ Test Data Population Complete!"
echo "========================================"
echo ""
echo "📊 Summary:"
echo "   Candidates created: ${#CANDIDATE_IDS[@]}"
echo "   Jobs created: ${#JOB_IDS[@]}"
echo "   Applications created: $APPLICATION_COUNT"
echo ""
echo "🔐 Test Credentials:"
echo "   Email: $ADMIN_EMAIL"
echo "   Password: $ADMIN_PASSWORD"
echo ""
echo "🌐 Application URLs:"
echo "   Frontend: http://localhost:3000"
echo "   API: http://localhost:8080/api/v1"
echo "   Database: localhost:5432"
echo ""
echo "📝 Next Steps:"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Login with the credentials above"
echo "   3. Explore the candidates, jobs, and applications"
echo ""
