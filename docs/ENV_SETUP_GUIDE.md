# Environment Configuration Setup Guide

Complete guide for configuring environment variables for HireSmart with S3 integration.

---

## Quick Start

### 1. Copy Environment Template
```bash
cp .env.example .env
```

### 2. Fill in Required Values
```bash
# Edit .env with your values
nano .env
# or
vi .env
```

### 3. Set Up AWS S3

Follow the [AWS S3 Setup](#aws-s3-setup) section below.

### 4. Start Services
```bash
docker-compose up -d
```

---

## Environment Files

### `.env.docker`
**Use for**: Local Docker development
- Default database credentials
- JWT secret (dev)
- S3 with placeholder values
- Local API URLs

### `.env.example`
**Use for**: Template reference
- All available configuration options
- Commented explanations
- Example values

### `.env.production`
**Use for**: Production deployment
- Secure configurations
- Production database settings
- S3 production bucket
- HTTPS/SSL settings
- Monitoring and logging

---

## AWS S3 Setup

### Step 1: Create AWS Account
1. Go to https://aws.amazon.com
2. Sign up for AWS account
3. Verify email and set up payment method

### Step 2: Create IAM User
1. Go to IAM console: https://console.aws.amazon.com/iam/
2. Click "Users" → "Create user"
3. Enter username: `hiresmart-user`
4. Click "Next"
5. Attach policy: "AmazonS3FullAccess"
6. Create user
7. Go to user → "Security credentials"
8. Create "Access key"
9. Copy and save:
   - Access key ID
   - Secret access key

### Step 3: Create S3 Bucket
1. Go to S3 console: https://s3.console.aws.amazon.com/
2. Click "Create bucket"
3. Bucket name: `hiresmart-resumes` (or with org/env prefix)
4. Region: Choose your region (e.g., us-east-1)
5. Block public access: ✅ All settings
6. Click "Create bucket"

### Step 4: Configure Bucket Policy
1. Go to created bucket
2. Click "Permissions" tab
3. Click "Bucket policy"
4. Paste this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3Access",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::YOUR_ACCOUNT_ID:user/hiresmart-user"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::hiresmart-resumes",
        "arn:aws:s3:::hiresmart-resumes/*"
      ]
    }
  ]
}
```

5. Replace `YOUR_ACCOUNT_ID` with your AWS Account ID
6. Click "Save"

### Step 5: Enable Versioning (Optional)
1. Click "Versioning" in bucket settings
2. Click "Enable"
3. Click "Save"

### Step 6: Enable Server-Side Encryption
1. Click "Encryption" in bucket settings
2. Select "Enable"
3. Choose "AES-256"
4. Click "Save"

---

## Configure Environment Variables

### For Docker Development

Create `.env.docker`:
```bash
# Copy example
cp .env.example .env.docker

# Edit with your S3 credentials
cat .env.docker
```

Edit and fill in:
```env
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
AWS_S3_BUCKET=hiresmart-resumes
AWS_S3_BUCKET_REGION=us-east-1
```

### For Docker Compose

Update `docker-compose.yml`:
```yaml
environment:
  AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
  AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
  AWS_REGION: ${AWS_REGION:-us-east-1}
  AWS_S3_BUCKET: ${AWS_S3_BUCKET}
  AWS_S3_BUCKET_REGION: ${AWS_S3_BUCKET_REGION}
```

### For Spring Boot Properties

Create `application-prod.properties`:
```properties
# AWS S3 Configuration
aws.s3.bucket=hiresmart-resumes
aws.s3.region=us-east-1
aws.s3.access-key=${AWS_ACCESS_KEY_ID}
aws.s3.secret-key=${AWS_SECRET_ACCESS_KEY}
```

---

## Environment Variables Reference

### Database
| Variable | Example | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | hiresmart_user | PostgreSQL username |
| `POSTGRES_PASSWORD` | secure_pwd | PostgreSQL password |
| `POSTGRES_DB` | hiresmart_db | Database name |

### Backend
| Variable | Example | Description |
|----------|---------|-------------|
| `SPRING_PROFILES_ACTIVE` | prod | Spring profile |
| `SPRING_DATASOURCE_URL` | jdbc:postgresql://... | Database connection |
| `JWT_SECRET` | your-secret-key | JWT signing key |
| `JWT_EXPIRATION` | 86400000 | Token expiration (ms) |
| `CORS_ALLOWED_ORIGINS` | http://localhost:3000 | CORS origins |

### AWS S3
| Variable | Example | Description |
|----------|---------|-------------|
| `AWS_ACCESS_KEY_ID` | AKIA... | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | wJalr... | AWS secret key |
| `AWS_REGION` | us-east-1 | AWS region |
| `AWS_S3_BUCKET` | hiresmart-resumes | S3 bucket name |
| `AWS_S3_BUCKET_REGION` | us-east-1 | S3 bucket region |

### Frontend
| Variable | Example | Description |
|----------|---------|-------------|
| `VITE_API_URL` | http://localhost:8080/api/v1 | Backend API URL |

---

## Verify Setup

### Test Local Setup
```bash
# 1. Start services
docker-compose up -d

# 2. Check backend health
curl http://localhost:8080/api/v1/health/status

# 3. Check frontend
curl http://localhost:3000

# 4. Test S3 connection
# Go to /analysis page and try uploading a resume
```

### Test S3 Connection
```bash
# Using AWS CLI
aws s3 ls s3://hiresmart-resumes

# Or use AWS console
# https://console.aws.amazon.com/s3/
```

### Check Logs
```bash
# Backend logs
docker-compose logs -f backend

# Frontend logs
docker-compose logs -f frontend

# Database logs
docker-compose logs -f postgres
```

---

## Security Best Practices

### ✅ DO
- ✅ Use strong, unique passwords
- ✅ Rotate access keys regularly
- ✅ Use IAM roles instead of keys when possible
- ✅ Enable bucket versioning
- ✅ Enable encryption
- ✅ Set bucket policies to minimum required
- ✅ Use `.env` files (never commit to git)
- ✅ Keep secrets in secrets manager (Vault, AWS Secrets Manager)

### ❌ DON'T
- ❌ Commit `.env` files to git
- ❌ Use root AWS credentials
- ❌ Share access keys via email
- ❌ Use same keys for dev and prod
- ❌ Leave S3 bucket publicly accessible
- ❌ Store secrets in code
- ❌ Use expired credentials

---

## Production Setup

### 1. Use Secrets Manager
```bash
# AWS Secrets Manager
aws secretsmanager create-secret \
  --name hiresmart/prod/s3 \
  --secret-string '{"access_key":"...","secret_key":"..."}'
```

### 2. Use IAM Roles (for EC2/ECS)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::hiresmart-resumes/*"
    }
  ]
}
```

### 3. Set Production Variables
```bash
# Using environment variables
export AWS_ACCESS_KEY_ID=prod-key
export AWS_SECRET_ACCESS_KEY=prod-secret
export AWS_REGION=us-east-1
export AWS_S3_BUCKET=hiresmart-resumes-prod

# Or use .env.production
source .env.production
```

### 4. Enable HTTPS
```bash
# Update docker-compose.yml
# Add SSL certificate configuration
NGINX_SSL_CERTIFICATE=/etc/nginx/ssl/cert.pem
NGINX_SSL_KEY=/etc/nginx/ssl/key.pem
```

---

## Troubleshooting

### Issue: "Access Denied" S3 Error

**Cause**: IAM policy missing or incorrect

**Solution**:
1. Check AWS IAM user permissions
2. Verify bucket policy includes user ARN
3. Test with AWS CLI:
   ```bash
   aws s3 ls s3://hiresmart-resumes --region us-east-1
   ```

### Issue: "InvalidBucketName" Error

**Cause**: S3 bucket name invalid or doesn't exist

**Solution**:
1. Verify bucket name in `AWS_S3_BUCKET`
2. Check bucket exists in S3 console
3. Bucket names are globally unique

### Issue: "File not found" when accessing resume

**Cause**: S3 URL incorrect or file not uploaded

**Solution**:
1. Check S3 bucket in console
2. Verify file uploaded with correct key
3. Check S3 permissions

### Issue: Backend can't connect to S3

**Cause**: Credentials not set or network issue

**Solution**:
1. Verify environment variables are set:
   ```bash
   echo $AWS_ACCESS_KEY_ID
   echo $AWS_SECRET_ACCESS_KEY
   ```
2. Check docker-compose logs:
   ```bash
   docker-compose logs backend | grep -i s3
   ```
3. Verify network connectivity to AWS

---

## Migration Between Environments

### Dev to Staging
```bash
# Update bucket name
AWS_S3_BUCKET=hiresmart-resumes-staging

# Update API URL
VITE_API_URL=https://staging-api.example.com/api/v1

# Keep same access keys (or rotate)
```

### Staging to Production
```bash
# Create new S3 bucket
# AWS_S3_BUCKET=hiresmart-resumes-production

# Update all credentials
# Create new IAM user for production

# Update all URLs
# VITE_API_URL=https://api.example.com/api/v1
```

---

## Environment Variable Tools

### Using Docker Secrets (Swarm)
```bash
docker secret create aws_key /path/to/key.txt
docker secret create aws_secret /path/to/secret.txt
```

### Using Kubernetes Secrets
```bash
kubectl create secret generic aws-s3 \
  --from-literal=access-key=$AWS_ACCESS_KEY_ID \
  --from-literal=secret-key=$AWS_SECRET_ACCESS_KEY
```

### Using HashiCorp Vault
```bash
vault kv put secret/hiresmart/s3 \
  access_key=$AWS_ACCESS_KEY_ID \
  secret_key=$AWS_SECRET_ACCESS_KEY
```

---

## Testing Environment Configuration

### Test Script
```bash
#!/bin/bash
set -e

echo "Testing environment configuration..."

# Check required variables
required_vars=(
  "POSTGRES_USER"
  "POSTGRES_PASSWORD"
  "AWS_ACCESS_KEY_ID"
  "AWS_SECRET_ACCESS_KEY"
  "AWS_S3_BUCKET"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing: $var"
    exit 1
  else
    echo "✅ Set: $var"
  fi
done

# Test database connection
echo "Testing database connection..."
docker-compose exec postgres pg_isready -U $POSTGRES_USER

# Test S3 connection
echo "Testing S3 connection..."
aws s3 ls s3://$AWS_S3_BUCKET --region $AWS_REGION

echo "✅ All environment variables configured correctly!"
```

---

**Last Updated**: 2026-06-19  
**Version**: 1.0  
**Status**: Production Ready
