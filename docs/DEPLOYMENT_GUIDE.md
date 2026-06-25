# HireSmart Deployment Guide

Comprehensive guide for deploying HireSmart to production environments.

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Local Testing](#local-testing)
4. [Staging Deployment](#staging-deployment)
5. [Production Deployment](#production-deployment)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Rollback Procedures](#rollback-procedures)
8. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing (unit, integration, e2e)
- [ ] No linting errors (`npm run lint`)
- [ ] Code review completed
- [ ] Security audit passed
- [ ] Dependencies up to date and scanned for vulnerabilities

### Documentation
- [ ] README updated
- [ ] API documentation current
- [ ] Environment variables documented
- [ ] Deployment instructions clear
- [ ] Known issues documented

### Configuration
- [ ] Environment variables configured for production
- [ ] Database migrations tested
- [ ] SSL/TLS certificates valid (not self-signed)
- [ ] CORS origins properly configured
- [ ] JWT secrets rotated
- [ ] Database backups scheduled

### Infrastructure
- [ ] Server resources allocated (CPU, RAM, Disk)
- [ ] Docker images built and tagged
- [ ] Docker registry credentials configured
- [ ] Load balancer configured (if applicable)
- [ ] CDN configured (if applicable)
- [ ] Monitoring tools set up

---

## Environment Setup

### 1. Production Environment Variables

Create `.env.production`:

```bash
# Application
APP_NAME=HireSmart
APP_VERSION=1.0.0
NODE_ENV=production
REACT_ENV=production

# Database
POSTGRES_HOST=prod-db.example.com
POSTGRES_PORT=5432
POSTGRES_USER=hiresmart_prod
POSTGRES_PASSWORD=<secure-random-password>
POSTGRES_DB=hiresmart_production
POSTGRES_SSL=true
POSTGRES_SSL_MODE=require

# Backend
SPRING_PROFILES_ACTIVE=prod
JWT_SECRET=<rotate-to-strong-random-key>
JWT_EXPIRATION=604800000
CORS_ALLOWED_ORIGINS=https://hiresmart.example.com
SERVER_PORT=8080

# Frontend
VITE_API_URL=https://api.hiresmart.example.com/api/v1
VITE_ANALYTICS_KEY=<your-analytics-key>

# AWS (if using)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
S3_BUCKET=hiresmart-prod

# Security
SECURE_COOKIES=true
HSTS_MAX_AGE=31536000
```

### 2. Docker Registry Login

```bash
# For Docker Hub
docker login

# For private registry
docker login registry.example.com
```

### 3. Database Setup

```bash
# Create production database
psql -h prod-db.example.com -U postgres -c "CREATE DATABASE hiresmart_production;"

# Run migrations
docker-compose exec backend java -jar app.jar --spring.jpa.hibernate.ddl-auto=validate

# Create backups
pg_dump -h prod-db.example.com -U hiresmart_prod hiresmart_production > backup-initial.sql
```

---

## Local Testing

### 1. Run Full Test Suite

```bash
# Backend tests
cd backend
mvn clean test
mvn clean verify  # includes integration tests

# Frontend tests
cd frontend
npm run test
npm run test:coverage

# End-to-end tests (if configured)
npm run test:e2e
```

### 2. Run Docker Compose Locally

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Verify all services are healthy
docker-compose ps
docker-compose logs -f

# Run API tests
npm run test:api

# Run Postman collection
postman collection run API_TESTS.postman_collection.json -e env.postman_environment.json
```

### 3. Security Testing

```bash
# Check for vulnerabilities
npm audit
mvn dependency-check:check

# OWASP scanning
docker run --rm -v $(pwd):/src owasp/zap2docker-stable zap-baseline.py -t http://localhost:3000

# SSL/TLS testing
nmap --script ssl-enum-ciphers -p 443 localhost
```

---

## Staging Deployment

### 1. Build and Push Docker Images

```bash
# Set version
export VERSION=1.0.0
export REGISTRY=your-registry.com

# Build images
docker build -t $REGISTRY/hiresmart-backend:$VERSION ./backend
docker build -t $REGISTRY/hiresmart-frontend:$VERSION ./frontend

# Tag as latest
docker tag $REGISTRY/hiresmart-backend:$VERSION $REGISTRY/hiresmart-backend:latest
docker tag $REGISTRY/hiresmart-frontend:$VERSION $REGISTRY/hiresmart-frontend:latest

# Push to registry
docker push $REGISTRY/hiresmart-backend:$VERSION
docker push $REGISTRY/hiresmart-frontend:$VERSION
docker push $REGISTRY/hiresmart-backend:latest
docker push $REGISTRY/hiresmart-frontend:latest
```

### 2. Deploy to Staging (Docker Compose)

```bash
# SSH to staging server
ssh user@staging.example.com

# Clone repository
git clone <repo-url>
cd hiresmart

# Checkout specific version
git checkout v1.0.0

# Update docker-compose.yml with correct image versions
sed -i "s|BACKEND_VERSION|v1.0.0|g" docker-compose.yml
sed -i "s|FRONTEND_VERSION|v1.0.0|g" docker-compose.yml

# Pull latest images
docker-compose pull

# Start services
docker-compose up -d

# Verify deployment
docker-compose ps
docker-compose logs -f
```

### 3. Run Staging Tests

```bash
# Health checks
curl -f https://staging-api.example.com/api/v1/health/status || exit 1
curl -f https://staging.example.com/health || exit 1

# Smoke tests
npm run test:smoke -- --baseUrl=https://staging.example.com

# Performance testing
npm run test:performance -- --baseUrl=https://staging.example.com

# Load testing
artillery run load-test.yml --target https://staging-api.example.com
```

### 4. User Acceptance Testing (UAT)

- [ ] Create test user accounts
- [ ] Verify all core workflows
- [ ] Test authentication flows
- [ ] Validate data migrations
- [ ] Check UI/UX consistency
- [ ] Verify email notifications
- [ ] Test error handling

---

## Production Deployment

### 1. Pre-Deployment Steps

```bash
# Notify team
slack: Deploying HireSmart v1.0.0 to production

# Backup current production database
pg_dump -h prod-db.example.com -U hiresmart_prod hiresmart_production \
  > backup-prod-$(date +%Y%m%d-%H%M%S).sql
gzip backup-prod-*.sql

# Tag release in git
git tag -a v1.0.0 -m "Production Release v1.0.0"
git push origin v1.0.0
```

### 2. Rolling Deployment (Recommended)

```bash
# Update 1/3 of instances
docker-compose up -d --scale backend=2 --no-deps backend
docker-compose logs -f backend

# Verify health
for i in {1..5}; do
  curl -f https://api.example.com/health/status && break || sleep 10
done

# Update next 1/3
docker-compose up -d --scale backend=2 --no-deps backend

# Update remaining 1/3
docker-compose up -d --scale backend=1 --no-deps backend

# Verify frontend
docker-compose up -d frontend
```

### 3. Kubernetes Deployment (Alternative)

```bash
# Update image in deployment
kubectl set image deployment/hiresmart-backend \
  hiresmart-backend=registry.example.com/hiresmart-backend:1.0.0 \
  -n production

# Monitor rollout
kubectl rollout status deployment/hiresmart-backend -n production
kubectl logs -f deployment/hiresmart-backend -n production
```

### 4. Blue-Green Deployment (Alternative)

```bash
# Deploy new version (green) alongside current (blue)
docker-compose -f docker-compose.blue.yml pull
docker-compose -f docker-compose.blue.yml up -d

# Test green environment
curl -f http://localhost:3001/health

# Switch load balancer to green
# (Update Nginx upstream configuration)

# Keep blue running for quick rollback
docker-compose -f docker-compose.blue.yml stop
```

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# API health
curl -f https://api.example.com/api/v1/health/status
curl -f https://api.example.com/api/v1/health/details

# Frontend health
curl -f https://example.com/
curl -f https://example.com/api/v1/health/status (proxied through)

# Database connectivity
pg_isready -h prod-db.example.com -U hiresmart_prod
```

### 2. Verify Core Features

```bash
# Authentication
curl -X POST https://api.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'

# Candidates
curl -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/api/v1/candidates

# Jobs
curl -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/api/v1/jobs
```

### 3. Monitor Logs

```bash
# Application logs
docker-compose logs -f backend frontend

# Access logs
tail -f /var/log/nginx/access.log

# Error logs
tail -f /var/log/nginx/error.log
```

### 4. Synthetic Monitoring

```bash
# Run continuous health checks
watch -n 30 'curl -s -o /dev/null -w "%{http_code}" https://api.example.com/health'

# Monitor key metrics
docker-compose stats

# Check resource utilization
free -h
df -h
top -b -n 1
```

---

## Rollback Procedures

### Automatic Rollback (on deployment failure)

```bash
# If health check fails during deployment
docker-compose up -d --force-recreate backend
docker-compose logs -f backend

# Or rollback to previous version
docker-compose pull --quiet
docker-compose pull
```

### Manual Rollback

```bash
# SSH to production
ssh user@prod.example.com

# Stop current services
docker-compose down

# Restore previous version tag in docker-compose.yml
git checkout HEAD~1 docker-compose.yml

# Start previous version
docker-compose pull
docker-compose up -d

# Verify
docker-compose ps
curl -f https://api.example.com/health/status
```

### Database Rollback

```bash
# If migrations failed
docker-compose exec postgres \
  psql -U hiresmart_prod hiresmart_production

# Drop recent tables
DROP TABLE IF EXISTS new_table_name CASCADE;

# Restore from backup
pg_restore -h prod-db.example.com \
  -U hiresmart_prod \
  -d hiresmart_production \
  backup-prod-20260619-140000.sql.gz
```

---

## Monitoring & Maintenance

### 1. Set Up Monitoring

```bash
# CPU, Memory, Disk
docker stats

# Application metrics
curl https://api.example.com/api/v1/health/details

# Database performance
psql -U hiresmart_prod hiresmart_production
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity WHERE query != '<IDLE>';
```

### 2. Regular Maintenance

```bash
# Daily: Check logs
docker-compose logs --since 24h | grep ERROR

# Weekly: Database maintenance
docker-compose exec postgres \
  psql -U hiresmart_prod hiresmart_production -c "VACUUM ANALYZE;"

# Monthly: Update dependencies
docker-compose pull

# Quarterly: Security patches
docker pull alpine:latest
docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | grep alpine
```

### 3. Backup Strategy

```bash
# Daily automated backup
0 2 * * * pg_dump -h prod-db.example.com \
  -U hiresmart_prod hiresmart_production | \
  gzip > /backups/hiresmart-$(date +\%Y\%m\%d).sql.gz

# Verify backups
ls -lh /backups/hiresmart-*.sql.gz

# Test restore monthly
pg_restore --list /backups/hiresmart-*.sql.gz | head -20
```

### 4. Performance Optimization

```bash
# Monitor slow queries
docker-compose exec postgres \
  psql -U hiresmart_prod hiresmart_production -c \
  "SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC;"

# Optimize indexes
ANALYZE;
REINDEX DATABASE hiresmart_production;

# Monitor connection pool
SELECT count(*) as active_connections FROM pg_stat_activity;
```

---

## Troubleshooting

### Services Won't Start

```bash
# Check Docker daemon
docker version

# Check disk space
df -h

# Check logs
docker-compose logs

# Rebuild images
docker-compose build --no-cache
```

### High Memory Usage

```bash
# Monitor process
docker stats

# Check Java heap
ps aux | grep java
# -Xmx2g sets max heap to 2GB

# Optimize in docker-compose.yml
environment:
  JAVA_OPTS: "-Xms512m -Xmx1g"
```

### Database Connection Issues

```bash
# Test connection
psql -h prod-db.example.com -U hiresmart_prod -d hiresmart_production -c "SELECT 1"

# Check connection pool
SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;

# Increase pool size in docker-compose.yml
SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE: 20
```

### SSL/TLS Certificate Issues

```bash
# Check certificate validity
openssl x509 -in /etc/ssl/certs/cert.pem -text -noout

# Renew with Let's Encrypt
certbot renew --dry-run
certbot renew

# Reload Nginx after renewal
docker-compose exec nginx nginx -s reload
```

---

## Support & Escalation

**On-call Support**: contact@example.com
**Emergency Escalation**: +1-555-0100
**Status Page**: https://status.example.com

---

**Last Updated**: 2026-06-19
**Current Version**: 1.0.0
**Next Review**: 2026-07-19
