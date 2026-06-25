# HireSmart Frontend Development Guide

**Status**: Phase 4 - In Progress  
**Technology Stack**: React 18 + TypeScript + Material UI + Redux Toolkit  
**Last Updated**: 2026-06-19

---

## Project Setup Complete

### Installed & Configured
```
✅ Vite (build tool)
✅ React 18 + TypeScript
✅ Material UI 5 (UI components)
✅ Redux Toolkit (state management)
✅ React Router v6 (routing)
✅ Axios (HTTP client)
✅ Recharts (data visualization)
✅ Vitest (testing framework)
```

### Directory Structure
```
frontend/
├── public/
├── src/
│   ├── assets/                 # Images, icons, fonts
│   ├── components/
│   │   ├── ProtectedRoute.tsx
│   │   ├── Layout.tsx
│   │   ├── Navigation/
│   │   ├── Forms/
│   │   ├── Tables/
│   │   └── Cards/
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegisterPage.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx
│   │   ├── candidates/
│   │   │   ├── CandidatesPage.tsx
│   │   │   └── CandidateDetailPage.tsx
│   │   ├── jobs/
│   │   │   ├── JobsPage.tsx
│   │   │   └── JobDetailPage.tsx
│   │   ├── applications/
│   │   │   └── ApplicationsPage.tsx
│   │   └── analytics/
│   │       └── AnalyticsPage.tsx
│   ├── services/
│   │   ├── apiClient.ts         # Axios instance with interceptors
│   │   ├── candidateService.ts
│   │   ├── jobService.ts
│   │   └── authService.ts
│   ├── store/
│   │   ├── index.ts
│   │   ├── authSlice.ts
│   │   ├── candidatesSlice.ts
│   │   └── jobsSlice.ts
│   ├── hooks/
│   │   ├── redux.ts             # TypedUseSelector & useDispatch
│   │   └── useAuth.ts           # Custom auth hook
│   ├── types/
│   │   ├── index.ts             # Shared types
│   │   ├── auth.ts
│   │   ├── candidate.ts
│   │   └── job.ts
│   ├── utils/
│   │   ├── formatters.ts        # Date, currency formatting
│   │   ├── validators.ts        # Form validation
│   │   └── constants.ts         # App constants
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── vite.config.ts
├── tsconfig.json
├── package.json
└── .env.example
```

---

## Components to Build

### 1. Authentication Components (Task #19)

#### LoginPage.tsx
- Email & password form fields
- "Remember me" checkbox
- Login button with loading state
- Error message display
- Link to registration page
- Redux integration with `login` thunk

**File**: `src/pages/auth/LoginPage.tsx`

#### RegisterPage.tsx
- First name, last name, email, password fields
- Form validation
- Password strength indicator
- Terms & conditions checkbox
- Register button
- Redux integration with `register` thunk

**File**: `src/pages/auth/RegisterPage.tsx`

#### ProtectedRoute.tsx
- Check authentication status
- Redirect to login if not authenticated
- Render protected component if authenticated

**File**: `src/components/ProtectedRoute.tsx`

---

### 2. Layout Components (Task #20)

#### Layout.tsx
- Header with logo and user menu
- Sidebar with navigation
- Main content area with Outlet
- Footer with copyright

**File**: `src/components/Layout.tsx`

#### Navigation.tsx
- Dashboard link
- Candidates menu item
- Jobs menu item
- Applications menu item
- Analytics menu item
- Active link highlighting

**File**: `src/components/Navigation/Sidebar.tsx`

#### Header.tsx
- Logo/branding
- User dropdown menu
- Logout button
- Organization selector

**File**: `src/components/Layout/Header.tsx`

---

### 3. Candidate Management (Task #21)

#### CandidatesPage.tsx
- Data grid with candidate list
- Columns: Name, Email, Phone, Experience, Status
- Search bar
- Filter by skill/experience
- Pagination
- Action buttons: View, Edit, Delete
- Create new candidate button

**File**: `src/pages/candidates/CandidatesPage.tsx`

#### CandidateDetailPage.tsx
- Full candidate profile
- Personal information section
- Skills section with edit/add capability
- Work experience section
- Education section
- Certifications section
- Resume upload/view
- Action buttons: Edit, Delete, Apply Jobs

**File**: `src/pages/candidates/CandidateDetailPage.tsx`

#### CandidateForm.tsx
- Form fields for candidate data
- Validation
- Submit handler
- Cancel button
- Used in create/edit flows

**File**: `src/components/Forms/CandidateForm.tsx`

---

### 4. Job Management (Task #22)

#### JobsPage.tsx
- Data grid with job listings
- Columns: Title, Department, Status, Posted Date, Actions
- Filter by status (Draft, Open, Closed, Filled)
- Search jobs
- Pagination
- Create job button
- Publish/Close actions
- View applications count

**File**: `src/pages/jobs/JobsPage.tsx`

#### JobDetailPage.tsx
- Job title and description
- Job requirements section
- Salary range display
- Employment type & work mode
- Applications count/list
- Edit & Delete buttons
- Publish/Close job action

**File**: `src/pages/jobs/JobDetailPage.tsx`

#### JobForm.tsx
- Title, description, department fields
- Employment type & work mode selectors
- Salary range inputs
- Requirements list with add/remove
- Location input
- Submit/Cancel buttons

**File**: `src/components/Forms/JobForm.tsx`

---

### 5. Application Management (Task #23)

#### ApplicationsPage.tsx
- Pipeline view or list view
- Columns: Candidate, Job, Status, Applied Date
- Group by status (Kanban view option)
- Search applications
- Filter by job/candidate
- Bulk actions: Shortlist, Reject
- View application details

**File**: `src/pages/applications/ApplicationsPage.tsx`

#### ApplicationDetailModal.tsx
- Candidate information
- Job information
- Application status
- Similarity score with breakdown
- AI recommendation
- Action buttons: Shortlist, Reject, Schedule Interview

**File**: `src/components/Modals/ApplicationDetailModal.tsx`

---

### 6. Analytics Dashboard (Task #24)

#### AnalyticsPage.tsx
- KPI cards displaying:
  - Total candidates
  - Active jobs
  - Open applications
  - Today's interviews
  - Scheduled interviews
  - Offer acceptance rate
  
#### Dashboard Charts:
- Candidate Pipeline (stacked bar chart)
- Job Status Distribution (pie chart)
- Applications by Job (horizontal bar chart)
- Time-to-Hire Trend (line chart)
- Recruiter Performance (scatter chart)

#### Metrics:
- Cost per hire
- Time to hire
- Offer acceptance rate
- Interview completion rate

**File**: `src/pages/analytics/AnalyticsPage.tsx`

---

## Shared Components

### DataTable.tsx
Generic table component with:
- Column definitions
- Pagination
- Sorting
- Selection (checkbox)
- Loading state
- Empty state

**File**: `src/components/Tables/DataTable.tsx`

### FormField.tsx
- Reusable form field wrapper
- Label, input, error message
- Material UI TextField integration

**File**: `src/components/Forms/FormField.tsx`

### ConfirmDialog.tsx
- Reusable confirmation dialog
- Title, message, action buttons
- Used for delete confirmations

**File**: `src/components/Dialogs/ConfirmDialog.tsx`

### LoadingSpinner.tsx
- Full-page or inline spinner
- Skeleton loading

**File**: `src/components/Loading/LoadingSpinner.tsx`

### ErrorBoundary.tsx
- Catches React errors
- Displays error UI
- Logging

**File**: `src/components/ErrorBoundary.tsx`

---

## Services to Implement

### candidateService.ts
```typescript
export const candidateService = {
  getAllCandidates(orgId, page, size),
  searchCandidates(orgId, query),
  getCandidateById(orgId, candidateId),
  createCandidate(orgId, data),
  updateCandidate(orgId, candidateId, data),
  deleteCandidate(orgId, candidateId),
  findBySkill(orgId, skill),
  findByExperience(orgId, minYears, maxYears)
}
```

### jobService.ts
```typescript
export const jobService = {
  getAllJobs(orgId, page, size),
  getJobById(orgId, jobId),
  createJob(orgId, data),
  updateJob(orgId, jobId, data),
  deleteJob(orgId, jobId),
  publishJob(orgId, jobId),
  closeJob(orgId, jobId),
  searchJobs(orgId, query)
}
```

### authService.ts
```typescript
export const authService = {
  login(email, password),
  register(userData),
  logout(),
  refreshToken(),
  getCurrentUser()
}
```

---

## Redux Store Structure

### Auth Slice
```typescript
state: {
  isAuthenticated: boolean
  user: User | null
  token: string | null
  refreshToken: string | null
  organizationId: string | null
  loading: boolean
  error: string | null
}

actions: login, register, logout
```

### Candidates Slice
```typescript
state: {
  candidates: Candidate[]
  selectedCandidate: Candidate | null
  pagination: { page, size, totalElements, totalPages }
  loading: boolean
  error: string | null
}

actions: fetchCandidates, getCandidateById, createCandidate, updateCandidate
```

### Jobs Slice
```typescript
state: {
  jobs: Job[]
  selectedJob: Job | null
  pagination: { ... }
  loading: boolean
  error: string | null
}

actions: fetchJobs, getJobById, createJob, updateJob
```

---

## Environment Variables

Create `.env` file in frontend root:

```env
VITE_API_URL=http://localhost:8080/api/v1
VITE_APP_NAME=HireSmart
VITE_APP_VERSION=1.0.0
```

---

## Development Workflow

### Start Development Server
```bash
cd frontend
npm install
npm run dev
```

Access at: http://localhost:5173

### Build for Production
```bash
npm run build
```

### Run Tests
```bash
npm run test
npm run test:coverage
```

### Linting
```bash
npm run lint
npm run lint:fix
```

---

## Material UI Theme Customization

Theme colors:
- Primary: #1976d2
- Secondary: #dc004e
- Success: #4caf50
- Error: #f44336
- Warning: #ff9800
- Info: #2196f3

Component overrides:
- Button: text-transform none, fontWeight 500
- Card: custom shadow
- Typography: custom font sizes

---

## API Integration Checklist

- [ ] Login endpoint integration
- [ ] Candidate list endpoint
- [ ] Candidate CRUD operations
- [ ] Job list endpoint
- [ ] Job CRUD operations
- [ ] Search functionality
- [ ] Filter functionality
- [ ] Pagination
- [ ] Error handling
- [ ] Loading states
- [ ] Success notifications
- [ ] Token refresh logic

---

## Testing Strategy

### Unit Tests
- Service functions
- Utility functions
- Custom hooks
- Redux slices

### Integration Tests
- Page components with Redux
- API integration
- Form submissions
- Authentication flows

### E2E Tests
- Complete user workflows
- Login → Create Job → View Applications
- Candidate search and filtering

---

## Performance Optimizations

- [ ] Code splitting with React.lazy()
- [ ] Memoization (useMemo, useCallback)
- [ ] Image optimization
- [ ] Bundle size analysis
- [ ] Lazy load routes
- [ ] Virtual scrolling for large lists
- [ ] Caching strategies

---

## Next Steps (Task Order)

1. **Task #19**: Create authentication pages (Login, Register, Protected Routes)
2. **Task #20**: Build layout components (Header, Sidebar, Main Layout)
3. **Task #21**: Implement candidate management (List, Detail, Create, Edit)
4. **Task #22**: Implement job management (List, Detail, Create, Edit, Publish/Close)
5. **Task #23**: Implement application management (List, Detail, Actions)
6. **Task #24**: Build analytics dashboard (KPIs, Charts, Metrics)
7. **Integration**: Connect all components
8. **Testing**: Unit, integration, and E2E tests
9. **Deployment**: Docker containerization

---

## File Size Estimates

- Main bundle: ~200KB (gzipped)
- Vendor bundle: ~150KB (gzipped)
- CSS: ~50KB (gzipped)
- Total: ~400KB (gzipped)

---

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- IE: Not supported

---

## Accessibility

- WCAG 2.1 Level AA compliance
- Keyboard navigation support
- Screen reader friendly
- Color contrast ratios met
- ARIA labels where needed

---

## Security Considerations

- [ ] XSS protection (React built-in)
- [ ] CSRF tokens with API requests
- [ ] Secure token storage (localStorage vs sessionStorage)
- [ ] Input validation
- [ ] Output encoding
- [ ] Content Security Policy headers
- [ ] HTTPS enforcement

---

**Status**: React setup complete, ready for component development  
**Next**: Task #19 - Authentication Pages  
**Version**: 1.0.0
