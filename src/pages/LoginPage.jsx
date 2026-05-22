import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import api from "../services/api"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await api.post("/auth/login", { username, password })
      login(res.data)
      const role = res.data.role
      if (role === "REPARATEUR") navigate("/reparateur")
      else if (role === "QM_AGENT") navigate("/agent")
      else if (role === "LABORATORY") navigate("/laboratory")
      else if (role === "ADMIN") navigate("/admin")

    } catch {
      setError("Matricule ou mot de passe incorrect")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f0f4f8",
      padding: "1rem"
    }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{
          background: "white",
          borderRadius: "16px",
          border: "0.5px solid #e2e8f0",
          overflow: "hidden",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)"
        }}>

          {/* Header */}
          <div style={{
            background: "#1a3a5c",
            padding: "2rem",
            textAlign: "center"
          }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "52px",
              height: "52px",
              background: "rgba(255,255,255,0.15)",
              borderRadius: "12px",
              marginBottom: "1rem"
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            </div>
            <div style={{ color: "white", fontSize: "20px", fontWeight: 500, marginBottom: "4px" }}>
              Suivi des Arraches
            </div>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px" }}>
              LEONI — Département Qualité
            </div>
          </div>

          {/* Form */}
          <div style={{ padding: "2rem" }}>
            {error && (
              <div style={{
                background: "#fef2f2",
                color: "#dc2626",
                border: "0.5px solid #fecaca",
                padding: "10px 14px",
                borderRadius: "8px",
                marginBottom: "1.25rem",
                fontSize: "14px"
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "#64748b",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em"
                }}>
                  Matricule
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Entrez votre matricule"
                  required
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "0.5px solid #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "14px",
                    background: "#f8fafc",
                    color: "#1e293b",
                    boxSizing: "border-box",
                    outline: "none"
                  }}
                />
              </div>

              <div style={{ marginBottom: "1.75rem" }}>
                <label style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "#64748b",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em"
                }}>
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "0.5px solid #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "14px",
                    background: "#f8fafc",
                    color: "#1e293b",
                    boxSizing: "border-box",
                    outline: "none"
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "11px",
                  background: loading ? "#94a3b8" : "#1a3a5c",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "15px",
                  fontWeight: 500,
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "background 0.15s"
                }}
              >
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}