import { Routes, Route, Navigate } from 'react-router-dom'
import { useAppSelector } from '@hooks/redux'
import ProtectedRoute from '@components/ProtectedRoute'
import Layout from '@components/Layout'

import LoginPage            from '@pages/auth/LoginPage'
import RegisterPage         from '@pages/auth/RegisterPage'
import DashboardPage        from '@pages/dashboard/DashboardPage'
import CandidatesPage       from '@pages/candidates/CandidatesPage'
import CandidateDetailPage  from '@pages/candidates/CandidateDetailPage'
import JobsPage             from '@pages/jobs/JobsPage'
import JobDetailPage        from '@pages/jobs/JobDetailPage'
import JobPipelinePage      from '@pages/pipeline/JobPipelinePage'
import ApplicationsPage     from '@pages/applications/ApplicationsPage'
import AnalyticsPage        from '@pages/analytics/AnalyticsPage'
import JobAnalysisPage      from '@pages/analysis/JobAnalysisPage'
import SchedulePage         from '@pages/schedule/SchedulePage'
import AssignPanelPage      from '@pages/panel/AssignPanelPage'
import EvaluationsListPage  from '@pages/evaluations/EvaluationsListPage'
import PanelCalendarPage    from '@pages/calendar/PanelCalendarPage'
import JobApplyPage         from '@pages/apply/JobApplyPage'
import SettingsPage         from '@pages/settings/SettingsPage'
import SourcingPage         from '@pages/sourcing/SourcingPage'

function App() {
  const { isAuthenticated } = useAppSelector(state => state.auth)

  return (
    <Routes>
      {/* Public routes — no auth required */}
      <Route path="/apply/:jobId" element={<JobApplyPage />} />

      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />

        {/* Candidate routes */}
        <Route path="candidates"     element={<CandidatesPage />} />
        <Route path="candidates/:id" element={<CandidateDetailPage />} />

        {/* Job routes */}
        <Route path="jobs"               element={<JobsPage />} />
        <Route path="jobs/:id"           element={<JobDetailPage />} />
        <Route path="jobs/:id/pipeline"  element={<JobPipelinePage />} />

        {/* HR workflow routes */}
        <Route path="analysis"      element={<JobAnalysisPage />} />
        <Route path="assign-panel" element={<AssignPanelPage />} />
        <Route path="schedule"     element={<SchedulePage />} />
        <Route path="evaluations" element={<EvaluationsListPage />} />
        <Route path="calendar"    element={<PanelCalendarPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="analytics"   element={<AnalyticsPage />} />
        <Route path="settings"    element={<SettingsPage />} />
        <Route path="sourcing"    element={<SourcingPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
