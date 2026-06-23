# HireSmart Chrome Manual Testing Guide

Complete manual testing procedures for Chrome browser.

---

## Quick Start

**Prerequisites:**
- Docker running with all services started
- Test data populated
- Chrome browser open

**Test Account:**
- Email: `admin@hiresmart.com`
- Password: `AdminPass123!`

---

## Part 1: Navigation & Basic UI

### 1.1 Homepage & Login

```
📋 Step 1: Visit http://localhost:3000
   ✓ Page loads immediately
   ✓ No console errors (F12 → Console)
   ✓ Login form visible with email and password fields
   ✓ "Remember me" checkbox visible
   ✓ "Register" link visible

📋 Step 2: Verify form validation
   ✓ Leave email blank, click submit → error appears
   ✓ Enter invalid email (test@invalid) → error appears
   ✓ Leave password blank → error appears
   ✓ Errors clear when valid data entered
```

### 1.2 Login Flow

```
📋 Step 3: Login with correct credentials
   ✓ Email: admin@hiresmart.com
   ✓ Password: AdminPass123!
   ✓ Click "Login" button
   ✓ Page redirects to dashboard (URL: /dashboard)
   ✓ No errors in console

📋 Step 4: Verify logged-in state
   ✓ Header shows username/profile icon
   ✓ Sidebar shows navigation menu
   ✓ All main pages are accessible
```

---

## Part 2: Dashboard

### 2.1 Dashboard Page

```
📋 Step 5: Dashboard overview
   ✓ Page title: "Dashboard" or "HireSmart Dashboard"
   ✓ Page shows 4 KPI cards:
     - Total Candidates (number, trend %)
     - Active Jobs (number, trend %)
     - Open Applications (number, trend %)
     - Scheduled Interviews (number, trend %)

📋 Step 6: Recent sections
   ✓ "Recent Candidates" section with candidate list
   ✓ "Recent Jobs" section with job list
   ✓ Click on candidate → navigates to /candidates/:id
   ✓ Click on job → navigates to /jobs/:id
   ✓ All data displays correctly
```

### 2.2 Responsive Dashboard

```
📋 Step 7: Mobile view (F12 → Toggle device toolbar)
   ✓ Switch to iPhone 12 view
   ✓ KPI cards stack vertically
   ✓ Sidebar collapses/hides
   ✓ Menu button (☰) appears and works
   ✓ Click menu → shows navigation items
   ✓ Click menu again → closes menu
   ✓ All content remains readable
```

---

## Part 3: Candidates Management

### 3.1 Candidates List

```
📋 Step 8: Navigate to candidates page
   ✓ Click "Candidates" in sidebar
   ✓ URL changes to /candidates
   ✓ Page title shows "Candidates"

📋 Step 9: Verify candidates table
   ✓ Table displays with columns:
     - Name (First Name + Last Name)
     - Email
     - Company
     - Experience (years)
     - Location
     - Actions

📋 Step 10: Pagination
   ✓ "1-5 of 5" shown (or actual count)
   ✓ Previous/Next buttons visible
   ✓ Rows per page dropdown (5, 10, 25, 100)
   ✓ Change rows per page → table updates
```

### 3.2 Search & Filter

```
📋 Step 11: Search candidates
   ✓ Search input visible at top of table
   ✓ Type "Alice" in search
   ✓ Table updates to show only matching candidates
   ✓ Clear search → all candidates shown again

📋 Step 12: Sorting
   ✓ Click "Name" column header
   ✓ Table sorts A→Z
   ✓ Click again → sorts Z→A
   ✓ Click other columns → verify sorting works
```

### 3.3 Candidate Details

```
📋 Step 13: View candidate profile
   ✓ Click any candidate name/row
   ✓ URL changes to /candidates/:id
   ✓ Page shows full candidate profile:
     - Full name as heading
     - Email and phone
     - Current company
     - Current designation
     - Location
     - Years of experience
     - Professional summary
   ✓ Tabs visible: Skills, Experience, Education, Applications

📋 Step 14: Detail page navigation
   ✓ "Back to Candidates" button works
   ✓ Click it → returns to /candidates
   ✓ Edit button present (future feature)
   ✓ Delete button present (future feature)
```

### 3.4 Create Candidate

```
📋 Step 15: Add new candidate
   ✓ Click "Create Candidate" button
   ✓ Modal dialog opens with form
   ✓ Form has fields:
     - First Name *
     - Last Name *
     - Email *
     - Phone
     - Location *
     - Current Company
     - Current Designation
     - Total Experience Years
     - Summary/Bio

📋 Step 16: Form validation
   ✓ Leave required fields blank, click Save
   ✓ Error messages appear under fields
   ✓ Fill all required fields
   ✓ Click Save → candidate added
   ✓ Modal closes
   ✓ New candidate appears in list
```

---

## Part 4: Jobs Management

### 4.1 Jobs List

```
📋 Step 17: Navigate to jobs page
   ✓ Click "Jobs" in sidebar
   ✓ URL changes to /jobs
   ✓ Page title shows "Jobs"

📋 Step 18: Verify jobs table
   ✓ Table displays with columns:
     - Job Title
     - Work Mode (Remote/Hybrid/On-site)
     - Location
     - Status (Open, Closed, On Hold, Filled)
   ✓ Table shows all job postings
   ✓ Status displayed as colored chips
```

### 4.2 Job Filtering

```
📋 Step 19: Status filter
   ✓ Status filter dropdown visible
   ✓ Options: All, Draft, Open, On Hold, Closed, Filled
   ✓ Select "Open"
   ✓ Table shows only open jobs
   ✓ Select "Draft"
   ✓ Table shows only draft jobs
   ✓ Select "All" → shows all jobs again

📋 Step 20: Search jobs
   ✓ Search input visible
   ✓ Type "React"
   ✓ Table updates to show matching jobs
   ✓ Clear search → all jobs shown
```

### 4.3 Job Details

```
📋 Step 21: View job posting
   ✓ Click any job title/row
   ✓ URL changes to /jobs/:id
   ✓ Page shows job overview:
     - Job title as heading
     - Status chip
     - Work mode and location
     - Employment type (Full-time, Part-time, etc.)
     - Salary range ($X - $Y)
     - Experience range (X - Y years)
     - Full job description

📋 Step 22: Job detail tabs
   ✓ Tabs visible: Requirements, Applications
   ✓ Requirements tab shows job requirements
   ✓ Applications tab shows applying candidates (future)
```

### 4.4 Create/Edit Job

```
📋 Step 23: Create job
   ✓ Click "Create Job" button
   ✓ Modal opens with job form
   ✓ Form fields:
     - Title *
     - Description *
     - Employment Type (dropdown)
     - Work Mode (dropdown)
     - Location *
     - Min Experience (years)
     - Max Experience (years)
     - Min Salary
     - Max Salary
     - Requirements section with add/delete

📋 Step 24: Add requirements
   ✓ In requirements section:
     - Type dropdown (Skill, Certification, Education)
     - Text input for requirement
     - "Add" button
   ✓ Fill fields and click Add
   ✓ Requirement appears in list below
   ✓ Click delete icon → removes requirement
   ✓ Submit form → job created
```

---

## Part 5: Applications Pipeline

### 5.1 Pipeline View

```
📋 Step 25: Navigate to applications
   ✓ Click "Applications" in sidebar
   ✓ URL changes to /applications
   ✓ Default view shows pipeline

📋 Step 26: Pipeline columns
   ✓ 4 columns visible:
     - Applied (count: X candidates)
     - Interviewing (count: X candidates)
     - Offered (count: X candidates)
     - Hired (count: X candidates)

📋 Step 27: Application cards
   ✓ Each column shows candidate cards with:
     - Candidate name
     - Job title
     - Status chip
     - Match score (progress bar 0-100%)
     - Applied date
     - Interview count (stars)
   ✓ Click "View Details" → opens modal
```

### 5.2 Application Details Modal

```
📋 Step 28: View application details
   ✓ Modal shows:
     - Candidate name
     - Job title
     - Match score with progress bar
     - Current status
     - Interviews completed count
     - Action buttons (Schedule Interview, Update Status)

📋 Step 29: List view
   ✓ Click "All Applications" tab
   ✓ Table shows all applications
   ✓ Can filter by status
   ✓ Can sort by columns
```

---

## Part 6: Analytics Dashboard

### 6.1 Analytics Page

```
📋 Step 30: Navigate to analytics
   ✓ Click "Analytics" in sidebar
   ✓ URL changes to /analytics
   ✓ Page title shows "Analytics Dashboard"

📋 Step 31: KPI Cards
   ✓ 4 KPI cards at top:
     - Total Candidates (156)
     - Active Jobs (18)
     - Applications (112)
     - Avg Time-to-Hire (21 days)
   ✓ Each card shows trend indicator (↑↓)
   ✓ Color coding for values
```

### 6.2 Charts & Visualizations

```
📋 Step 32: Candidate pipeline chart
   ✓ Bar chart visible with stages:
     - Applied, Screened, Shortlisted, Interview, Offered
   ✓ X-axis shows stages
   ✓ Y-axis shows candidate count
   ✓ Bars have correct values

📋 Step 33: Time-to-hire trend
   ✓ Line chart showing trend over 6 months
   ✓ X-axis: months (Jan-Jun)
   ✓ Y-axis: days to hire
   ✓ Line shows trend

📋 Step 34: Job status distribution
   ✓ Pie chart showing job statuses:
     - Open (green)
     - Closed (red)
     - On Hold (orange)
     - Filled (blue)
   ✓ Legend shows counts and percentages

📋 Step 35: Department metrics
   ✓ Grouped bar chart:
     - X-axis: departments (Engineering, Product, Design, HR, Sales)
     - Two bars per department: Hired, Pending
     - Colors distinguish hired from pending
```

### 6.3 Filters & Export

```
📋 Step 36: Date range filter
   ✓ Dropdown at top: "Last 6 Months"
   ✓ Options: 1M, 3M, 6M, 1Y
   ✓ Change selection → charts update

📋 Step 37: Export
   ✓ "Export" button visible
   ✓ Click → downloads report (CSV or PDF)
```

---

## Part 7: User Profile & Settings

### 7.1 User Menu

```
📋 Step 38: User profile menu
   ✓ Click user icon/dropdown in header
   ✓ Menu appears with options:
     - Profile
     - Settings
     - Help
     - Logout
   ✓ Menu closes when clicking outside

📋 Step 39: Profile view
   ✓ Click Profile
   ✓ Shows user information:
     - Full name
     - Email
     - Organization
   ✓ Edit profile option (future)
```

### 7.2 Logout

```
📋 Step 40: Logout flow
   ✓ Click user menu
   ✓ Click "Logout"
   ✓ Redirected to login page
   ✓ URL is /login
   ✓ Login form displayed
   ✓ Previous state cleared
```

---

## Part 8: Error Handling & Edge Cases

### 8.1 Network Errors

```
📋 Step 41: Simulate API error
   ✓ Open DevTools (F12)
   ✓ Network tab → Throttle to "Offline"
   ✓ Try to load a page
   ✓ Error message displayed: "Failed to load data"
   ✓ Can retry
   ✓ Restore connection → page loads
```

### 8.2 Session Timeout

```
📋 Step 42: Token expiration
   ✓ Login and wait (or manually expire token)
   ✓ Try to access protected page
   ✓ Redirected to login
   ✓ Login form displayed
   ✓ Login again → works normally
```

### 8.3 Empty States

```
📋 Step 43: Empty lists
   ✓ Delete all candidates
   ✓ Navigate to /candidates
   ✓ Empty state message: "No candidates found"
   ✓ Same for jobs, applications
```

---

## Part 9: Performance Testing

### 9.1 Page Load Times

```
📋 Step 44: Measure load times
   ✓ Open DevTools → Network tab
   ✓ Load /dashboard
   ✓ Check metrics:
     - DOMContentLoaded < 2 seconds ✓
     - Load < 3 seconds ✓
   ✓ Repeat for other pages

📋 Step 45: Performance tab
   ✓ Open DevTools → Performance tab
   ✓ Record page load
   ✓ Check:
     - First Paint < 1.5s
     - Largest Contentful Paint < 2.5s
     - Cumulative Layout Shift < 0.1
```

### 9.2 Memory Leaks

```
📋 Step 46: Memory usage
   ✓ Open DevTools → Memory tab
   ✓ Take heap snapshot
   ✓ Navigate between pages (10+ times)
   ✓ Take another snapshot
   ✓ Compare: memory should not grow significantly
   ✓ No memory leak warnings
```

---

## Part 10: Accessibility Testing

### 10.1 Keyboard Navigation

```
📋 Step 47: Tab through form
   ✓ Go to login page
   ✓ Press Tab repeatedly
   ✓ Focus moves through:
     - Email input
     - Password input
     - Remember me checkbox
     - Login button
   ✓ Press Enter on Login button → submits form
```

### 10.2 Color Contrast

```
📋 Step 48: Contrast checker
   ✓ Open Chrome DevTools → Lighthouse
   ✓ Run Accessibility audit
   ✓ Check results:
     - No color contrast issues ✓
     - All interactive elements accessible ✓
     - Form labels present ✓
```

---

## Part 11: Browser Compatibility

### 11.1 Different Browsers

```
Test in:
□ Chrome (latest)
□ Firefox
□ Safari
□ Edge

For each browser:
✓ Login works
✓ Dashboard displays
✓ Navigation works
✓ Tables render correctly
✓ Charts display properly
```

---

## Test Results Summary

Create a test report:

```
Date: _______________
Tester: _______________
Browser: Chrome _____ Version: _______
OS: _____________

Total Tests: 48
Passed: ____ (____%)
Failed: ____ (____%)

Issues Found:
1. _______________________
2. _______________________

Notes:
_________________________
_________________________
```

---

## Checklist for Complete Testing

- [ ] All 48 manual tests completed
- [ ] No console errors
- [ ] No network errors
- [ ] Responsive design verified (mobile, tablet, desktop)
- [ ] All forms validate correctly
- [ ] All navigation works
- [ ] All data displays correctly
- [ ] Performance acceptable
- [ ] No accessibility issues
- [ ] Cross-browser tested
- [ ] Edge cases handled
- [ ] Error handling works
- [ ] Session management works

---

**Status**: ✅ Ready for Production Testing  
**Last Updated**: 2026-06-19  
**Estimated Time**: 2-3 hours for complete testing
