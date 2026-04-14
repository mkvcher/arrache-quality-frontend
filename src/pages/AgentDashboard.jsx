import { useAuth } from "../context/AuthContext"
import { useNavigate } from "react-router-dom"

export default function AgentDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f8" }}>
      
      {/* Navbar */}
      <div style={{
        background: "#1a3a5c",
        padding: "0 2rem",
        height: "60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ color: "white", fontWeight: 500, fontSize: "16px" }}>
          Suivi des Arraches — LEONI
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "14px" }}>
            {user?.fullName}
          </span>
          <button
            onClick={handleLogout}
            style={{
              background: "rgba(255,255,255,0.15)",
              color: "white",
              border: "none",
              padding: "6px 14px",
              borderRadius: "6px",
              fontSize: "13px",
              cursor: "pointer"
            }}
          >
            Déconnexion
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 500, marginBottom: "0.5rem" }}>
          Tableau de bord — QM Opération
        </h1>
        <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "2rem" }}>
          Bienvenue, {user?.fullName}
        </p>

        {/* Stat cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1rem",
          marginBottom: "2rem"
        }}>
          {[
            { label: "Total valises", value: "—", color: "#1a3a5c" },
            { label: "Arraches OK", value: "—", color: "#16a34a" },
            { label: "Arraches NOK", value: "—", color: "#dc2626" },
            { label: "Alertes IA", value: "—", color: "#d97706" },
          ].map((card) => (
            <div key={card.label} style={{
              background: "white",
              borderRadius: "12px",
              padding: "1.25rem",
              border: "0.5px solid #e2e8f0"
            }}>
              <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "0.5rem" }}>
                {card.label}
              </div>
              <div style={{ fontSize: "28px", fontWeight: 500, color: card.color }}>
                {card.value}
              </div>
            </div>
          ))}
        </div>

        {/* Valise list placeholder */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          border: "0.5px solid #e2e8f0",
          padding: "1.5rem"
        }}>
          <h2 style={{ fontSize: "16px", fontWeight: 500, marginBottom: "1rem" }}>
            Valises
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>
            Chargement des valises...
          </p>
        </div>
      </div>
    </div>
  )
}