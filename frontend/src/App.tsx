import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import NavBar from './components/NavBar'
import { useAuth } from './context/useAuth'
import AdminPage from './pages/AdminPage'
import CalculatorPage from './pages/CalculatorPage'
import DashboardPage from './pages/DashboardPage'
import InventoryPage from './pages/InventoryPage'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import OrganizationInfoPage from './pages/OrganizationInfoPage'
import OrganizationPage from './pages/OrganizationPage'
import ProfilePage from './pages/ProfilePage'
import SignupPage from './pages/SignupPage'

function RequireAuth() {
  const { user, isLoading } = useAuth()

  // The dev-only page dock must be able to open every page directly.
  if (import.meta.env.DEV) {
    return <Outlet />
  }

  if (isLoading) {
    return <p className="px-6 py-10 text-slate-600">Loading…</p>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

function AuthLayout() {
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <Outlet />
      </main>
    </>
  )
}

function RequireOrganization() {
  const { organization } = useAuth()

  if (import.meta.env.DEV) {
    return <Outlet />
  }

  if (!organization) {
    return <Navigate to="/organization" replace />
  }

  return <Outlet />
}

function AdminOnly() {
  const { role } = useAuth()

  if (import.meta.env.DEV) {
    return <Outlet />
  }

  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<AuthLayout />}>
            <Route path="organization" element={<OrganizationPage />} />

            <Route element={<RequireOrganization />}>
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="calculator" element={<CalculatorPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route
                path="organization-info"
                element={<OrganizationInfoPage />}
              />

              <Route element={<AdminOnly />}>
                <Route path="admin" element={<AdminPage />} />
              </Route>
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
