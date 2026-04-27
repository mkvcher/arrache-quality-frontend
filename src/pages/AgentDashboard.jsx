import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { useNavigate } from "react-router-dom"
import api from "../services/api"

export default function AgentDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [valises, setValises] = useState([])
  const [arraches, setArraches] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [valiseRes, arracheRes, notifRes] = await Promise.all([
        api.get("/valises"),
        api.get("/arraches"),
        api.get("/notifications/role/QM_AGENT")
      ])
      setValises(valiseRes.data)
      setArraches(arracheRes.data)
      setNotifications(notifRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const getArrachesForValise = (valiseId) =>
    arraches.filter(a => a.valiseId === valiseId)

  const totalOk = arraches.filter(a => a.status === "OPERATIONAL").length
  const totalNok = arraches.filter(a => a.status === "DEFECTIVE" || a.status === "NON_CONFORME").length

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
          {notifications.length > 0 && (
            <div style={{
              background: "#dc2626",
              color: "white",
              borderRadius: "20px",
              padding: "2px 10px",
              fontSize: "12px",
              fontWeight: 500
            }}>
              {notifications.length} notification{notifications.length > 1 ? "s" : ""}
            </div>
          )}
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "14px" }}>
            {user?.fullName}
          </span>
          <button onClick={handleLogout} style={{
            background: "rgba(255,255,255,0.15)",
            color: "white",
            border: "none",
            padding: "6px 14px",
            borderRadius: "6px",
            fontSize: "13px",
            cursor: "pointer"
          }}>
            Déconnexion
          </button>
        </div>
      </div>

      <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 500, marginBottom: "0.25rem" }}>
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
            { label: "Total valises", value: valises.length, color: "#1a3a5c" },
            { label: "Total arraches", value: arraches.length, color: "#0369a1" },
            { label: "Opérationnels", value: totalOk, color: "#16a34a" },
            { label: "NOK / Défectueux", value: totalNok, color: "#dc2626" },
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
                {loading ? "—" : card.value}
              </div>
            </div>
          ))}
        </div>

        {/* Valise list */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          border: "0.5px solid #e2e8f0",
          overflow: "hidden"
        }}>
          <div style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "0.5px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <h2 style={{ fontSize: "16px", fontWeight: 500 }}>Valises</h2>
          </div>

          {loading ? (
            <div style={{ padding: "2rem", color: "#94a3b8", textAlign: "center" }}>
              Chargement...
            </div>
          ) : valises.length === 0 ? (
            <div style={{ padding: "2rem", color: "#94a3b8", textAlign: "center" }}>
              Aucune valise trouvée
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["N° Valise", "PF", "Segment", "Localisation", "Arraches", "Statut"].map(h => (
                    <th key={h} style={{
                      padding: "10px 16px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      borderBottom: "0.5px solid #e2e8f0"
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {valises.map((valise, i) => (
                  <tr key={valise.id} style={{
                    borderBottom: i < valises.length - 1 ? "0.5px solid #f1f5f9" : "none"
                  }}>
                    <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: 500 }}>
                      {valise.valiseNumber}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "14px", color: "#475569" }}>
                      {valise.pf}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "14px", color: "#475569" }}>
                      {valise.segment}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "14px", color: "#475569" }}>
                      {valise.location}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "14px", color: "#475569" }}>
                      {getArrachesForValise(valise.id).length}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 500,
                        background: valise.status === "OK" ? "#dcfce7" : "#fef2f2",
                        color: valise.status === "OK" ? "#16a34a" : "#dc2626"
                      }}>
                        {valise.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}