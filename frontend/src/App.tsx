import { Navigate, Route, Routes } from 'react-router-dom'
import NavBar from './components/NavBar'
import CalculatorPage from './pages/CalculatorPage'
import DashboardPage from './pages/DashboardPage'
import InventoryPage from './pages/InventoryPage'

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <NavBar />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/calculator" element={<CalculatorPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
