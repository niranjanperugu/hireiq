# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HireSmart is an AI-powered enterprise recruitment platform. It is a full-stack monorepo with a Spring Boot backend (Java 21), a React/TypeScript frontend, a PostgreSQL database, and Docker-based deployment. All API routes are prefixed `/api/v1`.

## Commands

### Backend (run from `backend/`)
```bash
mvn spring-boot:run                      # start dev server (port 8080)
mvn clean test                           # unit tests
mvn verify                               # unit + integration tests (requires Postgres)
mvn test -Dtest=ClassName                # run a single test class
mvn test -Dtest=ClassName#methodName     # run a single test method
mvn clean package -DskipTests            # build JAR
mvn jacoco:report                        # generate coverage report
```

### Frontend (run from `frontend/`)
```bash
npm run dev          # start Vite dev server (port 5173)
npm run build        # production build to dist/
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
npm test             # Vitest (watch mode)
npm run test:coverage # coverage report
```

### Docker (run from repo root)
```bash
docker-compose up -d              # start all services (Postgres, backend, frontend, nginx)
docker-compose down               # stop all
docker-compose logs -f backend    # tail backend logs
```

## Architecture

### Backend (`backend/src/main/java/com/hiresmart/`)

Standard Spring Boot layered architecture:

- **`controller/`** — REST endpoints (`ApplicationController`, `CandidateController`, `JobController`, `HealthController`)
- **`service/`** — Business logic (`CandidateService`, `JobService`)
- **`repository/`** — Spring Data JPA repositories
- **`entity/`** — JPA entities; `Enums.java` centralizes all domain enums
- **`dto/`** — Request/response DTOs; `PageableResponseDTO<T>` wraps all paginated responses
- **`security/`** — JWT auth: `JwtTokenProvider`, `JwtAuthenticationFilter`, `UserPrincipal`, `CustomUserDetailsService`
- **`config/`** — `SecurityConfig` (Spring Security), plus AWS/cache/WebSocket configs
- **`exception/`** — `ResourceNotFoundException` and global exception handling

All data is multi-tenant, scoped by `Organization` UUID. Every service method accepts `organizationId` as a first parameter and verifies its existence before querying.

Database migrations use **Liquibase** (`resources/db/changelog/db.changelog-master.yaml`). Schema DDL is managed by Liquibase — `ddl-auto=validate` means Hibernate will fail on startup if schema doesn't match entities.

JWT config is driven by `app.jwt.secret`, `app.jwt.expiration`, `app.jwt.refresh-expiration` properties (see `application.properties`). AWS credentials for S3, SES, and CloudWatch are injected via environment variables.

Local dev defaults: `postgres://localhost:5432/hiresmart`, user `postgres`, password `postgres`.

### Frontend (`frontend/src/`)

- **`App.tsx`** — Route definitions; all routes except `/login` and `/register` are protected by `ProtectedRoute`
- **`store/`** — Redux Toolkit store with three slices: `authSlice`, `candidatesSlice`, `jobsSlice`
- **`services/apiClient.ts`** — Axios instance; attaches `Authorization: Bearer <token>` from `localStorage` on every request; on 401, clears tokens and redirects to `/login`
- **`pages/`** — Page components organized by domain: `auth/`, `dashboard/`, `candidates/`, `jobs/`, `applications/`, `analytics/`
- **`components/`** — Shared components including `Layout`, `ProtectedRoute`, and form components in `components/Forms/`
- **`hooks/`** — Custom hooks (e.g., `useAppSelector`)

Vite path aliases: `@`, `@components`, `@pages`, `@services`, `@store`, `@types`, `@utils`, `@hooks`, `@assets` — all resolve to `src/<name>/`.

In development, Vite proxies `/api/*` → `http://localhost:8080/api/v1/*` (the rewrite strips the leading `/api` and prepends `/api/v1`). The `VITE_API_URL` env var overrides the base URL for production builds.

### Domain Model

The candidate pipeline progresses through statuses defined in `Enums.CandidateStatus`:
`APPLIED → SCREENED → SHORTLISTED → INTERVIEW_ROUND_1 → INTERVIEW_ROUND_2 → FINAL_INTERVIEW → OFFER_RELEASED → OFFER_ACCEPTED → HIRED` (or `REJECTED`/`WITHDRAWN`).

Key entity relationships: `Organization` → `Job` → `Candidate` → `InterviewRound` → `InterviewSession` → `FeedbackForm`. `InterviewPanel` aggregates `InterviewPanelMember` records for each session.

Resume processing pipeline: upload to AWS S3, parse with PDFBox/Apache POI + Stanford CoreNLP, store metadata in `ResumeMetadata`, compute `SimilarityScore` against job requirements.

Calendar integrations (Google Calendar, Microsoft Outlook/Graph) are used for scheduling `InterviewSession` records.

### CI/CD

GitHub Actions (`.github/workflows/ci-cd.yml`) runs on push to `main`/`develop`:
1. Backend tests + integration tests (against Postgres service container)
2. Frontend lint + tests + build
3. Trivy security scan
4. On `main` only: push Docker images to GHCR → deploy staging → deploy production (requires manual approval via GitHub environment)

Health endpoint for smoke tests: `GET /api/v1/health/status`

Swagger UI (dev): `http://localhost:8080/api/v1/swagger-ui.html`
