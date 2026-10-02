import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import AppLayout from './components/AppLayout'
import { PageLoader } from './components/ui'
import DashboardPage from './pages/DashboardPage'
import LeadDetailPage from './pages/LeadDetailPage'
import LeadsPage from './pages/LeadsPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import PublicSurveyPage from './pages/public/PublicSurveyPage'
import SettingsPage from './pages/SettingsPage'
import SurveysPage from './pages/SurveysPage'
import SurveyAnalyticsPage from './pages/survey/SurveyAnalyticsPage'
import SurveyBuilderPage from './pages/survey/SurveyBuilderPage'
import SurveyLayout from './pages/survey/SurveyLayout'

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, initializing } = useAuth()
  const location = useLocation()
  if (initializing) return <PageLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

export default function App() {
  const location = useLocation()
  return (
    <Routes location={location}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/i/:token" element={<PublicSurveyPage mode="invitation" />} />
        <Route path="/s/:slug" element={<PublicSurveyPage mode="public" />} />

        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="surveys" element={<SurveysPage />} />
          <Route path="surveys/:id" element={<SurveyLayout />}>
            <Route index element={<Navigate to="edit" replace />} />
            <Route path="edit" element={<SurveyBuilderPage />} />
            <Route path="share" element={<Navigate to="../edit" replace />} />
            <Route path="analytics" element={<SurveyAnalyticsPage />} />
          </Route>
          <Route path="leads" element={<LeadsPage />} />
          <Route path="leads/:id" element={<LeadDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
