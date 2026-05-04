import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { useNavigate } from "react-router-dom"
import api from "../services/api"

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  border: "0.5px solid #cbd5e1",
  borderRadius: "8px",
  fontSize: "13px",
  boxSizing: "border-box",
  background: "white",
  outline: "none"
}

const labelStyle = {
  display: "block",
  fontSize: "11px",
  fontWeight: 500,
  color: "#64748b",
  marginBottom: "5px",
  textTransform: "uppercase",
  letterSpacing: "0.04em"
}

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [arraches, setArraches] = useState([])
  const [logs, setLogs] = useState([])
  const [activeTab, setActiveTab] = useState("overview")
  const [loading, setLoading] = useState(true)

  // Create user form state
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")
  const [createSuccess, setCreateSuccess] = useState(false)
  const [newUser, setNewUser] = useState({
    fullName: "",
    username: "",
    password: "",
    matricule: "",
    role: "REPARATEUR"
  })

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [s, u, a, l] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/users"),
        api.get("/admin/arraches/ratings"),
        api.get("/admin/logs")
      ])
      setStats(s.data)
      setUsers(u.data)
      setArraches(a.data)
      setLogs(l.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => { logout(); navigate("/login") }

  const handleDeactivate = async (userId) => {
    if (!window.confirm("Deactivate this user?")) return
    try {
      await api.put(`/admin/users/${userId}/deactivate`)
      fetchAll()
    } catch (err) { console.error(err) }
  }

  const handleCreateUser = async () => {
    setCreateError("")
    setCreateSuccess(false)
    const { fullName, username, password, matricule, role } = newUser
    if (!fullName || !username || !password || !matricule || !role) {
      setCreateError("All fields are required.")
      return
    }
    setCreating(true)
    try {
      await api.post("/auth/register", { fullName, username, password, matricule, role })
      setCreateSuccess(true)
      setNewUser({ fullName: "", username: "", password: "", matricule: "", role: "REPARATEUR" })
      setShowForm(false)
      fetchAll()
    } catch {
      setCreateError("Username already exists or server error.")
    } finally {
      setCreating(false)
    }
  }

  const getRiskColor = (s) => s > 80 ? "#dc2626" : s > 60 ? "#d97706" : s > 40 ? "#ca8a04" : "#16a34a"
  const getRiskLabel = (s) => s > 80 ? "Critical" : s > 60 ? "High" : s > 40 ? "Medium" : "Low"

  const roleBadge = (role) => {
    const map = {
      ADMIN:      { bg: "#fef9c3", color: "#854d0e" },
      QM_AGENT:   { bg: "#dbeafe", color: "#1e40af" },
      LABORATORY: { bg: "#f3e8ff", color: "#6b21a8" },
      REPARATEUR: { bg: "#dcfce7", color: "#166534" }
    }
    const s = map[role] || { bg: "#f1f5f9", color: "#475569" }
    return (
      <span style={{
        display: "inline-block", padding: "3px 10px", borderRadius: "20px",
        fontSize: "11px", fontWeight: 500, background: s.bg, color: s.color
      }}>{role}</span>
    )
  }

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "users",    label: `Users (${users.length})` },
    { key: "ratings",  label: "Risk Ratings" },
    { key: "logs",     label: "Activity Log" }
  ]

  const thStyle = {
    padding: "10px 16px", textAlign: "left", fontSize: "11px", fontWeight: 500,
    color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em",
    borderBottom: "0.5px solid #e2e8f0", background: "#f8fafc"
  }
  const tdStyle = { padding: "12px 16px", fontSize: "13px", color: "#475569", borderBottom: "0.5px solid #f1f5f9" }

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f8" }}>

      {/* Navbar */}
      <div style={{
        background: "#1a3a5c", padding: "0 2rem", height: "60px",
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <span style={{ color: "white", fontWeight: 500, fontSize: "16px" }}>
          Suivi des Arraches — LEONI
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{
            background: "#d97706", color: "white", fontSize: "11px",
            fontWeight: 500, padding: "2px 10px", borderRadius: "20px"
          }}>ADMIN</span>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "14px" }}>{user?.fullName}</span>
          <button onClick={handleLogout} style={{
            background: "rgba(255,255,255,0.15)", color: "white", border: "none",
            padding: "6px 14px", borderRadius: "6px", fontSize: "13px", cursor: "pointer"
          }}>Logout</button>
        </div>
      </div>

      <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 500, marginBottom: "0.25rem" }}>Admin Dashboard</h1>
        <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "2rem" }}>
          Full system overview — {user?.fullName}
        </p>

        {/* Tabs */}
        <div style={{
          display: "flex", gap: "4px", marginBottom: "1.5rem",
          background: "white", padding: "4px", borderRadius: "10px",
          border: "0.5px solid #e2e8f0", width: "fit-content"
        }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding: "7px 18px", borderRadius: "7px", border: "none", cursor: "pointer",
              fontSize: "13px", fontWeight: 500, transition: "all 0.15s",
              background: activeTab === t.key ? "#1a3a5c" : "transparent",
              color: activeTab === t.key ? "white" : "#64748b"
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
              {[
                { label: "Total Users",     value: stats?.totalUsers,    color: "#1a3a5c" },
                { label: "Total Arraches",  value: stats?.totalArraches, color: "#0369a1" },
                { label: "Non-Conformes",   value: stats?.nonConforme,   color: "#dc2626" },
                { label: "High Risk (>60)", value: stats?.highRisk,      color: "#d97706" }
              ].map(c => (
                <div key={c.label} style={{
                  background: "white", borderRadius: "12px",
                  padding: "1.25rem", border: "0.5px solid #e2e8f0"
                }}>
                  <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "0.5rem" }}>{c.label}</div>
                  <div style={{ fontSize: "28px", fontWeight: 500, color: c.color }}>
                    {loading ? "—" : c.value}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: "white", borderRadius: "12px", border: "0.5px solid #e2e8f0", padding: "1.5rem" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 500, marginBottom: "1rem" }}>Arrache Status Breakdown</h2>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                {[
                  { label: "Operational",  value: stats?.operational, color: "#16a34a", bg: "#dcfce7" },
                  { label: "Defective",    value: stats?.defective,   color: "#d97706", bg: "#fef9c3" },
                  { label: "Non-Conforme", value: stats?.nonConforme, color: "#dc2626", bg: "#fef2f2" }
                ].map(item => (
                  <div key={item.label} style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    background: item.bg, padding: "10px 20px", borderRadius: "8px"
                  }}>
                    <span style={{ fontSize: "24px", fontWeight: 500, color: item.color }}>
                      {loading ? "—" : item.value}
                    </span>
                    <span style={{ fontSize: "13px", color: item.color, fontWeight: 500 }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {activeTab === "users" && (
          <div style={{ background: "white", borderRadius: "12px", border: "0.5px solid #e2e8f0", overflow: "hidden" }}>

            {/* Header */}
            <div style={{
              padding: "1.25rem 1.5rem", borderBottom: "0.5px solid #e2e8f0",
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <h2 style={{ fontSize: "16px", fontWeight: 500 }}>All Users</h2>
              <button onClick={() => { setShowForm(!showForm); setCreateError(""); setCreateSuccess(false) }} style={{
                background: showForm ? "#f1f5f9" : "#1a3a5c",
                color: showForm ? "#475569" : "white",
                border: "0.5px solid #e2e8f0", padding: "7px 16px",
                borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer"
              }}>
                {showForm ? "✕ Cancel" : "+ New User"}
              </button>
            </div>

            {/* Create user form */}
            {showForm && (
              <div style={{ padding: "1.5rem", borderBottom: "0.5px solid #e2e8f0", background: "#f8fafc" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 500, marginBottom: "1rem", color: "#1a3a5c" }}>
                  Create New User
                </h3>

                {createError && (
                  <div style={{
                    background: "#fef2f2", color: "#dc2626", border: "0.5px solid #fecaca",
                    padding: "10px 14px", borderRadius: "8px", marginBottom: "1rem", fontSize: "13px"
                  }}>{createError}</div>
                )}

                {createSuccess && (
                  <div style={{
                    background: "#dcfce7", color: "#16a34a", border: "0.5px solid #bbf7d0",
                    padding: "10px 14px", borderRadius: "8px", marginBottom: "1rem", fontSize: "13px"
                  }}>✓ User created successfully</div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={labelStyle}>Full Name</label>
                    <input style={inputStyle} type="text" placeholder="e.g. Mohamed Ben Ali"
                      value={newUser.fullName}
                      onChange={e => setNewUser(p => ({ ...p, fullName: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelStyle}>Username</label>
                    <input style={inputStyle} type="text" placeholder="e.g. mbali"
                      value={newUser.username}
                      onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelStyle}>Password</label>
                    <input style={inputStyle} type="password" placeholder="Min. 6 characters"
                      value={newUser.password}
                      onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelStyle}>Matricule</label>
                    <input style={inputStyle} type="text" placeholder="e.g. R-042"
                      value={newUser.matricule}
                      onChange={e => setNewUser(p => ({ ...p, matricule: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelStyle}>Role</label>
                    <select style={inputStyle} value={newUser.role}
                      onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}>
                      <option value="REPARATEUR">REPARATEUR</option>
                      <option value="QM_AGENT">QM_AGENT</option>
                      <option value="LABORATORY">LABORATORY</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                </div>

                <button onClick={handleCreateUser} disabled={creating} style={{
                  background: creating ? "#94a3b8" : "#16a34a", color: "white",
                  border: "none", padding: "9px 24px", borderRadius: "8px",
                  fontSize: "14px", fontWeight: 500, cursor: creating ? "not-allowed" : "pointer"
                }}>
                  {creating ? "Creating..." : "Create User"}
                </button>
              </div>
            )}

            {/* Users table */}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Full Name", "Username", "Role", "Matricule", "Status", "Action"].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ ...tdStyle, fontWeight: 500, color: "#1e293b" }}>{u.fullName}</td>
                    <td style={tdStyle}>{u.username}</td>
                    <td style={tdStyle}>{roleBadge(u.role)}</td>
                    <td style={tdStyle}>{u.matricule}</td>
                    <td style={tdStyle}>
                      <span style={{
                        display: "inline-block", padding: "3px 10px", borderRadius: "20px",
                        fontSize: "11px", fontWeight: 500,
                        background: u.active ? "#dcfce7" : "#fef2f2",
                        color: u.active ? "#16a34a" : "#dc2626"
                      }}>{u.active ? "Active" : "Inactive"}</span>
                    </td>
                    <td style={tdStyle}>
                      {u.role !== "ADMIN" && u.active && (
                        <button onClick={() => handleDeactivate(u.id)} style={{
                          background: "#fef2f2", color: "#dc2626", border: "0.5px solid #fecaca",
                          padding: "4px 12px", borderRadius: "6px", fontSize: "12px", cursor: "pointer"
                        }}>Deactivate</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── RISK RATINGS ── */}
        {activeTab === "ratings" && (
          <div style={{ background: "white", borderRadius: "12px", border: "0.5px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "0.5px solid #e2e8f0" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 500 }}>Arrache Risk Ratings — sorted by score</h2>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Arrache", "Description", "Status", "NOK Count", "Rupture", "Risk Score", "Level"].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {arraches.map(a => (
                  <tr key={a.id}>
                    <td style={{ ...tdStyle, fontWeight: 500, color: "#1e293b" }}>{a.arracheNumber}</td>
                    <td style={tdStyle}>{a.toolDescription}</td>
                    <td style={tdStyle}>
                      <span style={{
                        display: "inline-block", padding: "3px 10px", borderRadius: "20px",
                        fontSize: "11px", fontWeight: 500,
                        background: a.status === "OPERATIONAL" ? "#dcfce7" : a.status === "NON_CONFORME" ? "#fef2f2" : "#fef9c3",
                        color: a.status === "OPERATIONAL" ? "#16a34a" : a.status === "NON_CONFORME" ? "#dc2626" : "#854d0e"
                      }}>{a.status}</span>
                    </td>
                    <td style={tdStyle}>{a.totalNokCount}</td>
                    <td style={tdStyle}>
                      {a.ruptureEverSeen
                        ? <span style={{ color: "#dc2626", fontWeight: 500 }}>Yes</span>
                        : <span style={{ color: "#94a3b8" }}>No</span>}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "80px", height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{ width: `${a.riskScore}%`, height: "100%", background: getRiskColor(a.riskScore), borderRadius: "3px" }} />
                        </div>
                        <span style={{ fontSize: "13px", fontWeight: 500, color: getRiskColor(a.riskScore) }}>
                          {Math.round(a.riskScore)}
                        </span>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        display: "inline-block", padding: "3px 10px", borderRadius: "20px",
                        fontSize: "11px", fontWeight: 500,
                        background: getRiskColor(a.riskScore) + "22",
                        color: getRiskColor(a.riskScore)
                      }}>{getRiskLabel(a.riskScore)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── ACTIVITY LOG ── */}
        {activeTab === "logs" && (
          <div style={{ background: "white", borderRadius: "12px", border: "0.5px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "0.5px solid #e2e8f0" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 500 }}>Activity Log — All Tracking Sheets ({logs.length})</h2>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Valise", "PF", "Quarter", "Weekly Checks", "Monthly Checks", "Lab Verdict", "Created"].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td style={{ ...tdStyle, fontWeight: 500, color: "#1e293b" }}>{log.valiseNumber}</td>
                    <td style={tdStyle}>{log.pf}</td>
                    <td style={tdStyle}>Q{log.quarter} {log.year}</td>
                    <td style={tdStyle}>{log.weeklyChecks?.length || 0}</td>
                    <td style={tdStyle}>{log.monthlyChecks?.length || 0}</td>
                    <td style={tdStyle}>
                      <span style={{
                        display: "inline-block", padding: "3px 10px", borderRadius: "20px",
                        fontSize: "11px", fontWeight: 500,
                        background: log.quarterlyVerdict ? "#dcfce7" : "#f1f5f9",
                        color: log.quarterlyVerdict ? "#16a34a" : "#94a3b8"
                      }}>{log.quarterlyVerdict ? "Submitted" : "Pending"}</span>
                    </td>
                    <td style={tdStyle}>{new Date(log.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  )
}
