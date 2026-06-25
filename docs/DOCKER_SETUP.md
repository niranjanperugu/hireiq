# Docker Setup Guide - HireSmart

This guide provides instructions for containerizing and running the HireSmart application using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB+ RAM allocated to Docker
- Linux, macOS, or Windows with WSL2

## Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd hiresmart
```

### 2. Build and Start Services
```bash
# Build images and start all services
docker-compose up -d

# Verify all services are running
docker-compose ps
```

### 3. Access the Application
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8080
- **Database**: localhost:5432

### 4. View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

## Services

### PostgreSQL Database
- **Image**: postgres:16-alpine
- **Port**: 5432
- **Username**: hiresmart_user
- **Password**: hiresmart_secure_password
- **Database**: hiresmart_db
- **Volume**: `postgres_data` (persisted between restarts)

### Backend API
- **Image**: Built from `backend/Dockerfile`
- **Port**: 8080
- **Profile**: prod
- **Health Check**: http://localhost:8080/api/v1/health/status

### Frontend Application
- **Image**: Built from `frontend/Dockerfile`
- **Port**: 3000
- **Build Tool**: Vite
- **Server**: Node serve

### Nginx Reverse Proxy (Optional)
- **Image**: nginx:alpine
- **Port**: 80
- **Config**: `nginx.conf`
- **Purpose**: Load balancing and request routing

## Common Commands

### Start Services
```bash
# Start in background
docker-compose up -d

# Start with logs visible
docker-compose up

# Rebuild images before starting
docker-compose up --build
```

### Stop Services
```bash
# Stop all services (keep data)
docker-compose stop

# Stop and remove containers (keep volumes)
docker-compose down

# Remove everything including volumes
docker-compose down -v
```

### Database Operations
```bash
# Access PostgreSQL shell
docker-compose exec postgres psql -U hiresmart_user -d hiresmart_db

# Backup database
docker-compose exec postgres pg_dump -U hiresmart_user hiresmart_db > backup.sql

# Restore database
docker-compose exec -T postgres psql -U hiresmart_user hiresmart_db < backup.sql
```

### Rebuild Services
```bash
# Rebuild all images
docker-compose build

# Rebuild specific image
docker-compose build backend
docker-compose build frontend

# Rebuild and restart
docker-compose up -d --build backend
```

## Dockerfile Details

### Frontend Dockerfile
- **Base Image**: node:20-alpine (light weight)
- **Build Stage**: Installs dependencies and builds Vite app
- **Runtime Stage**: Uses `serve` to host static files
- **Port**: 3000
- **Health Check**: Checks port 3000 availability

### Backend Dockerfile
- **Base Image**: maven:3.9 + eclipse-temurin-21 (for build)
- **Runtime Base**: eclipse-temurin:21-jre-alpine (minimal)
- **Build Stage**: Maven builds JAR with dependencies
- **Runtime Stage**: Runs JAR with non-root user
- **Port**: 8080
- **Health Check**: Checks /health/status endpoint

## Configuration

### Environment Variables
Edit `.env.docker` or `docker-compose.yml` to modify:

**Database**
- `POSTGRES_USER` - Database user
- `POSTGRES_PASSWORD` - Database password
- `POSTGRES_DB` - Database name

**Backend**
- `SPRING_PROFILES_ACTIVE` - Profile (dev, prod)
- `JWT_SECRET` - JWT signing key
- `JWT_EXPIRATION` - Token expiration (ms)
- `CORS_ALLOWED_ORIGINS` - Allowed CORS origins

**Frontend**
- `VITE_API_URL` - Backend API URL

### Security Settings

For production deployment, update:

1. **JWT Secret** - Change `JWT_SECRET` to a strong random value
2. **Database Password** - Update `POSTGRES_PASSWORD`
3. **CORS Origins** - Restrict `CORS_ALLOWED_ORIGINS` to actual domain
4. **SSL/TLS** - Enable in nginx.conf (currently commented out)
5. **Database User** - Don't use default credentials

## Health Checks

Each service includes health checks:

```bash
# Check service health
docker-compose ps

# Check specific service
docker ps --filter name=hiresmart-backend --format "{{.Status}}"
```

Health check endpoints:
- Backend: `http://localhost:8080/api/v1/health/status`
- Frontend: `http://localhost:3000` (returns 200)
- Database: `pg_isready` command

## Performance Optimization

### Caching
- Frontend: 30-day cache for static assets
- Gzip compression enabled in Nginx
- Database connection pooling configured

### Resource Limits (Optional)
Add to `docker-compose.yml` services:

```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
    reservations:
      cpus: '1'
      memory: 1G
```

### Build Optimization
- Multi-stage Docker builds reduce image size
- .dockerignore excludes unnecessary files
- Alpine images used for minimal footprint

## Troubleshooting

### Container Won't Start
```bash
# View error logs
docker-compose logs backend

# Check disk space
docker system df

# Clean up unused images
docker system prune -a
```

### Database Connection Failed
```bash
# Check if database is ready
docker-compose logs postgres

# Verify database credentials
docker-compose exec postgres psql -U hiresmart_user -d hiresmart_db -c "\du"
```

### Frontend Can't Reach Backend
```bash
# Check network
docker network ls
docker network inspect hiresmart_hiresmart-network

# Test connectivity from frontend
docker-compose exec frontend curl http://backend:8080/api/v1/health/status
```

### Port Already in Use
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

## Production Deployment

### Security Checklist
- [ ] Change all default passwords
- [ ] Update JWT secret to strong random value
- [ ] Configure SSL/TLS certificates
- [ ] Set up proper CORS origins
- [ ] Configure database backups
- [ ] Set up log aggregation
- [ ] Configure resource limits
- [ ] Enable rate limiting
- [ ] Set up monitoring/alerts

### Example Production docker-compose.yml
```yaml
services:
  backend:
    image: registry.example.com/hiresmart-backend:1.0.0
    environment:
      SPRING_PROFILES_ACTIVE: prod
      JWT_SECRET: ${JWT_SECRET}  # Set via environment
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
  # Add similar for frontend
```

### Deployment Options
- Docker Swarm (simple orchestration)
- Kubernetes (production-grade)
- AWS ECS (managed container service)
- Azure Container Instances
- Google Cloud Run

## Monitoring

### View Resource Usage
```bash
docker stats
docker-compose stats
```

### Application Logs
```bash
# Tail logs
docker-compose logs -f --tail=100

# Filter by service
docker-compose logs backend -f

# Export logs
docker-compose logs > app.log
```

## Development Tips

### Rebuild Only Changed Services
```bash
# Only rebuild what changed
docker-compose up -d --build --no-deps frontend

# Without recreating containers
docker-compose up -d --no-build
```

### Mount Source Code (Dev Mode)
Edit docker-compose.yml to add volume mounts:

```yaml
backend:
  volumes:
    - ./backend/src:/app/src

frontend:
  volumes:
    - ./frontend/src:/app/src
```

### Access Container Shell
```bash
docker-compose exec backend bash
docker-compose exec frontend sh
docker-compose exec postgres bash
```

### View Networks
```bash
docker network inspect hiresmart_hiresmart-network
```

## References

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PostgreSQL Docker Guide](https://hub.docker.com/_/postgres)

## Support

For issues or questions:
1. Check Docker logs: `docker-compose logs`
2. Review this guide's troubleshooting section
3. Consult Docker documentation
4. Check service health: `docker-compose ps`

---

**Last Updated**: 2026-06-19
**Docker Compose Version**: 3.8
**Tested On**: Docker 20.10+, Compose 2.0+
