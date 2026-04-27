import { Routes, Route, Navigate } from "react-router-dom"
import { useAuth } from "./context/AuthContext"
import LoginPage from "./pages/LoginPage"
import AgentDashboard from "./pages/AgentDashboard"
import ReparateurDashboard from "./pages/ReparateurDashboard"
import LaboratoryDashboard from "./pages/LaboratoryDashboard"

function ProtectedRoute({ children, allowedRole }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" />
  if (allowedRole && user.role !== allowedRole) return <Navigate to="/login" />
  return children
}

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reparateur" element={
        <ProtectedRoute allowedRole="REPARATEUR">
          <ReparateurDashboard />
        </ProtectedRoute>
      } />
      <Route path="/agent" element={
        <ProtectedRoute allowedRole="QM_AGENT">
          <AgentDashboard />
        </ProtectedRoute>
      } />
      <Route path="/laboratory" element={
        <ProtectedRoute allowedRole="LABORATORY">
          <LaboratoryDashboard />
        </ProtectedRoute>
      } />    
      <Route path="*" element={<Navigate to={user ? "/agent" : "/login"} />} />
    </Routes>
  )
}