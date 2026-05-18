import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { useNavigate } from "react-router-dom"
import api from "../services/api"
import NotificationBell from "../components/NotificationBell"
 
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
  const [valises, setValises] = useState([])
  const [arraches, setArraches] = useState([])
  const [logs, setLogs] = useState([])
  const [activeTab, setActiveTab] = useState("overview")
  const [loading, setLoading] = useState(true)
 
  // ─── User form state ───
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")
  const [createSuccess, setCreateSuccess] = useState(false)
  const [newUser, setNewUser] = useState({
    fullName: "", username: "", password: "",
    matricule: "", role: "REPARATEUR", valiseId: ""
  })
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState(null)
  const [editError, setEditError] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)
 
  // ─── Valise / Arrache state ───
  const [managingArrachesForId, setManagingArrachesForId] = useState(null)
 
  const [showValiseForm, setShowValiseForm] = useState(false)
  const [creatingValise, setCreatingValise] = useState(false)
  const [valiseError, setValiseError] = useState("")
  const [newValise, setNewValise] = useState({
    valiseNumber: "", pf: "", segment: "", location: ""
  })
  const [editingValiseId, setEditingValiseId] = useState(null)
  const [editValiseDraft, setEditValiseDraft] = useState(null)
  const [editValiseError, setEditValiseError] = useState("")
  const [savingValise, setSavingValise] = useState(false)
 
  const [showArracheForm, setShowArracheForm] = useState(false)
  const [creatingArrache, setCreatingArrache] = useState(false)
  const [arracheError, setArracheError] = useState("")
  const [newArrache, setNewArrache] = useState({
    arracheNumber: "", positionInValise: "", toolDescription: ""
  })
  const [editingArracheId, setEditingArracheId] = useState(null)
  const [editArracheDraft, setEditArracheDraft] = useState(null)
  const [editArracheError, setEditArracheError] = useState("")
  const [savingArrache, setSavingArrache] = useState(false)
 
  useEffect(() => { fetchAll() }, [])
 
  const fetchAll = async () => {
    setLoading(true)
    try {
      const [s, u, v, a, l] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/users"),
        api.get("/valises"),
        api.get("/admin/arraches/ratings"),
        api.get("/admin/logs")
      ])
      setStats(s.data)
      setUsers(u.data)
      setValises(v.data)
      setArraches(a.data)
      setLogs(l.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }
 
  const handleLogout = () => { logout(); navigate("/login") }
 
  // ═══════════════════ User actions ═══════════════════
 
  const handleDeactivate = async (userId) => {
    if (!window.confirm("Deactivate this user?")) return
    try { await api.put(`/admin/users/${userId}/deactivate`); fetchAll() }
    catch (err) { console.error(err) }
  }
 
  const handleActivate = async (userId) => {
    try { await api.put(`/admin/users/${userId}/activate`); fetchAll() }
    catch (err) { console.error(err) }
  }
 
  const handleCreateUser = async () => {
    setCreateError(""); setCreateSuccess(false)
    const { fullName, username, password, matricule, role, valiseId } = newUser
    if (!fullName || !username || !password || !matricule || !role) {
      setCreateError("All fields are required.")
      return
    }
    setCreating(true)
    try {
      const payload = { fullName, username, password, matricule, role }
      if (role === "REPARATEUR" && valiseId) payload.valiseId = valiseId
      await api.post("/admin/users", payload)
      setCreateSuccess(true)
      setNewUser({ fullName: "", username: "", password: "", matricule: "", role: "REPARATEUR", valiseId: "" })
      setShowForm(false)
      fetchAll()
    } catch (err) {
      setCreateError(err?.response?.data || "Username already exists or server error.")
    } finally {
      setCreating(false)
    }
  }
 
  const startEdit = (u) => {
    setEditError("")
    setEditingId(u.id)
    setEditDraft({
      fullName: u.fullName || "", matricule: u.matricule || "",
      role: u.role || "REPARATEUR", valiseId: u.valiseId || ""
    })
  }
  const cancelEdit = () => { setEditingId(null); setEditDraft(null); setEditError("") }
  const saveEdit = async () => {
    if (!editingId || !editDraft) return
    setEditError(""); setSavingEdit(true)
    try {
      const body = {
        fullName: editDraft.fullName,
        matricule: editDraft.matricule,
        role: editDraft.role,
        valiseId: editDraft.role === "REPARATEUR" ? (editDraft.valiseId || null) : null
      }
      await api.put(`/admin/users/${editingId}`, body)
      cancelEdit(); fetchAll()
    } catch (err) {
      setEditError(err?.response?.data || "Update failed.")
    } finally { setSavingEdit(false) }
  }
 
  // ═══════════════════ Valise actions ═══════════════════
 
  const handleCreateValise = async () => {
    setValiseError("")
    const { valiseNumber, pf, segment, location } = newValise
    if (!valiseNumber || !pf || !segment || !location) {
      setValiseError("Tous les champs sont requis.")
      return
    }
    setCreatingValise(true)
    try {
      await api.post("/valises", { valiseNumber, pf, segment, location })
      setNewValise({ valiseNumber: "", pf: "", segment: "", location: "" })
      setShowValiseForm(false)
      fetchAll()
    } catch (err) {
      setValiseError(err?.response?.data || "Erreur lors de la création.")
    } finally { setCreatingValise(false) }
  }
 
  const startEditValise = (v) => {
    setEditValiseError("")
    setEditingValiseId(v.id)
    setEditValiseDraft({
      valiseNumber: v.valiseNumber || "",
      pf: v.pf || "",
      segment: v.segment || "",
      location: v.location || "",
      status: v.status || "OK"
    })
  }
  const cancelEditValise = () => {
    setEditingValiseId(null); setEditValiseDraft(null); setEditValiseError("")
  }
  const saveEditValise = async () => {
    if (!editingValiseId || !editValiseDraft) return
    setEditValiseError(""); setSavingValise(true)
    try {
      await api.put(`/valises/${editingValiseId}`, editValiseDraft)
      cancelEditValise(); fetchAll()
    } catch (err) {
      setEditValiseError(err?.response?.data || "Erreur de mise à jour.")
    } finally { setSavingValise(false) }
  }
 
  const handleDeleteValise = async (v) => {
    const arracheCount = arraches.filter(a => a.valiseId === v.id).length
    const assignedUser = users.find(u => u.valiseId === v.id)
    const lines = [
      `Supprimer la valise ${v.valiseNumber} ?`,
      "",
      `Cette action supprimera également :`,
      `  · ${arracheCount} arrache${arracheCount > 1 ? "s" : ""}`,
      assignedUser ? `  · l'assignation de ${assignedUser.fullName}` : null,
      "",
      "Les suivis trimestriels existants resteront comme historique."
    ].filter(Boolean).join("\n")
    if (!window.confirm(lines)) return
    try {
      await api.delete(`/valises/${v.id}`)
      fetchAll()
    } catch (err) {
      alert(err?.response?.data || "Erreur lors de la suppression.")
    }
  }
 
  // ═══════════════════ Arrache actions ═══════════════════
 
  const arrachesForValise = (valiseId) =>
    arraches.filter(a => a.valiseId === valiseId)
      .sort((a, b) => (a.positionInValise || 0) - (b.positionInValise || 0))
 
  const nextPositionFor = (valiseId) => {
    const used = arrachesForValise(valiseId).map(a => a.positionInValise || 0)
    return used.length === 0 ? 1 : Math.max(...used) + 1
  }
 
  const openArracheManagement = (valiseId) => {
    setManagingArrachesForId(valiseId)
    setShowArracheForm(false)
    setNewArrache({
      arracheNumber: "",
      positionInValise: nextPositionFor(valiseId),
      toolDescription: ""
    })
  }
 
  const handleCreateArrache = async () => {
    setArracheError("")
    const { arracheNumber, positionInValise, toolDescription } = newArrache
    if (!arracheNumber || !positionInValise || !toolDescription) {
      setArracheError("Tous les champs sont requis.")
      return
    }
    setCreatingArrache(true)
    try {
      await api.post("/arraches", {
        arracheNumber,
        positionInValise: parseInt(positionInValise, 10),
        toolDescription,
        valiseId: managingArrachesForId,
        status: "OPERATIONAL"
      })
      setShowArracheForm(false)
      setNewArrache({
        arracheNumber: "",
        positionInValise: nextPositionFor(managingArrachesForId) + 1,
        toolDescription: ""
      })
      fetchAll()
    } catch (err) {
      setArracheError(err?.response?.data || "Erreur lors de la création.")
    } finally { setCreatingArrache(false) }
  }
 
  const startEditArrache = (a) => {
    setEditArracheError("")
    setEditingArracheId(a.id)
    setEditArracheDraft({
      arracheNumber: a.arracheNumber || "",
      positionInValise: a.positionInValise || 1,
      toolDescription: a.toolDescription || ""
    })
  }
  const cancelEditArrache = () => {
    setEditingArracheId(null); setEditArracheDraft(null); setEditArracheError("")
  }
  const saveEditArrache = async () => {
    if (!editingArracheId || !editArracheDraft) return
    setEditArracheError(""); setSavingArrache(true)
    try {
      await api.put(`/arraches/${editingArracheId}`, {
        arracheNumber: editArracheDraft.arracheNumber,
        positionInValise: parseInt(editArracheDraft.positionInValise, 10),
        toolDescription: editArracheDraft.toolDescription
      })
      cancelEditArrache(); fetchAll()
    } catch (err) {
      setEditArracheError(err?.response?.data || "Erreur de mise à jour.")
    } finally { setSavingArrache(false) }
  }
 
  const handleDeleteArrache = async (a) => {
    if (!window.confirm(`Supprimer l'arrache ${a.arracheNumber} (position ${a.positionInValise}) ?`)) return
    try {
      await api.delete(`/arraches/${a.id}`)
      fetchAll()
    } catch (err) {
      alert(err?.response?.data || "Erreur lors de la suppression.")
    }
  }
 
  // ═══════════════════ Helpers / styles ═══════════════════
 
  const availableValisesForCreate = valises.filter(v =>
    !users.some(u => u.valiseId === v.id && u.active)
  )
  const availableValisesForEdit = (currentValiseId) => valises.filter(v =>
    v.id === currentValiseId ||
    !users.some(u => u.valiseId === v.id && u.id !== editingId && u.active)
  )
  const valiseLabel = (id) => {
    if (!id) return "—"
    const v = valises.find(x => x.id === id)
    return v ? v.valiseNumber : "?"
  }
  const valiseAssignedTo = (valiseId) => {
    const u = users.find(x => x.valiseId === valiseId && x.active)
    return u ? u.fullName : null
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
 
  const arracheStatusBadge = (status) => {
    const map = {
      OPERATIONAL:  { bg: "#dcfce7", color: "#16a34a" },
      DEFECTIVE:    { bg: "#fef9c3", color: "#854d0e" },
      NON_CONFORME: { bg: "#fef2f2", color: "#dc2626" }
    }
    const s = map[status] || { bg: "#f1f5f9", color: "#475569" }
    return (
      <span style={{
        display: "inline-block", padding: "3px 10px", borderRadius: "20px",
        fontSize: "11px", fontWeight: 500, background: s.bg, color: s.color
      }}>{status}</span>
    )
  }
 
  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "users",    label: `Users (${users.length})` },
    { key: "valises",  label: `Valises (${valises.length})` },
    { key: "ratings",  label: "Risk Ratings" },
    { key: "logs",     label: "Activity Log" }
  ]
 
  const thStyle = {
    padding: "10px 16px", textAlign: "left", fontSize: "11px", fontWeight: 500,
    color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em",
    borderBottom: "0.5px solid #e2e8f0", background: "#f8fafc"
  }
  const tdStyle = { padding: "12px 16px", fontSize: "13px", color: "#475569", borderBottom: "0.5px solid #f1f5f9" }
 
  // ═══════════════════ Render helpers ═══════════════════
 
  const focusedValise = managingArrachesForId
    ? valises.find(v => v.id === managingArrachesForId)
    : null
 
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
          <NotificationBell />
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
            <button key={t.key} onClick={() => { setActiveTab(t.key); setManagingArrachesForId(null) }} style={{
              padding: "7px 18px", borderRadius: "7px", border: "none", cursor: "pointer",
              fontSize: "13px", fontWeight: 500, transition: "all 0.15s",
              background: activeTab === t.key ? "#1a3a5c" : "transparent",
              color: activeTab === t.key ? "white" : "#64748b"
            }}>{t.label}</button>
          ))}
        </div>
 
        {/* ═══════════ OVERVIEW ═══════════ */}
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
 
        {/* ═══════════ USERS ═══════════ */}
        {activeTab === "users" && (
          <div style={{ background: "white", borderRadius: "12px", border: "0.5px solid #e2e8f0", overflow: "hidden" }}>
 
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
 
            {showForm && (
              <div style={{ padding: "1.5rem", borderBottom: "0.5px solid #e2e8f0", background: "#f8fafc" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 500, marginBottom: "1rem", color: "#1a3a5c" }}>
                  Create New User
                </h3>
 
                {createError && (
                  <div style={{
                    background: "#fef2f2", color: "#dc2626", border: "0.5px solid #fecaca",
                    padding: "10px 14px", borderRadius: "8px", marginBottom: "1rem", fontSize: "13px"
                  }}>{String(createError)}</div>
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
                      onChange={e => setNewUser(p => ({ ...p, role: e.target.value, valiseId: "" }))}>
                      <option value="REPARATEUR">REPARATEUR</option>
                      <option value="QM_AGENT">QM_AGENT</option>
                      <option value="LABORATORY">LABORATORY</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                  {newUser.role === "REPARATEUR" && (
                    <div>
                      <label style={labelStyle}>Valise assignée</label>
                      <select style={inputStyle} value={newUser.valiseId}
                        onChange={e => setNewUser(p => ({ ...p, valiseId: e.target.value }))}>
                        <option value="">— None (assign later) —</option>
                        {availableValisesForCreate.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.valiseNumber} — {v.pf} / {v.segment}
                          </option>
                        ))}
                      </select>
                      {availableValisesForCreate.length === 0 && (
                        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                          Aucune valise disponible — toutes sont déjà assignées.
                        </div>
                      )}
                    </div>
                  )}
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
 
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Full Name", "Username", "Role", "Matricule", "Valise", "Status", "Action"].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isEditing = editingId === u.id
                  if (isEditing) {
                    return (
                      <tr key={u.id} style={{ background: "#f8fafc" }}>
                        <td style={tdStyle}>
                          <input style={{ ...inputStyle, padding: "5px 8px" }}
                            value={editDraft.fullName}
                            onChange={e => setEditDraft(d => ({ ...d, fullName: e.target.value }))} />
                        </td>
                        <td style={tdStyle}><span style={{ color: "#94a3b8" }}>{u.username}</span></td>
                        <td style={tdStyle}>
                          <select style={{ ...inputStyle, padding: "5px 8px" }}
                            value={editDraft.role}
                            onChange={e => setEditDraft(d => ({
                              ...d, role: e.target.value,
                              valiseId: e.target.value === "REPARATEUR" ? d.valiseId : ""
                            }))}>
                            <option value="REPARATEUR">REPARATEUR</option>
                            <option value="QM_AGENT">QM_AGENT</option>
                            <option value="LABORATORY">LABORATORY</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </td>
                        <td style={tdStyle}>
                          <input style={{ ...inputStyle, padding: "5px 8px" }}
                            value={editDraft.matricule}
                            onChange={e => setEditDraft(d => ({ ...d, matricule: e.target.value }))} />
                        </td>
                        <td style={tdStyle}>
                          {editDraft.role === "REPARATEUR" ? (
                            <select style={{ ...inputStyle, padding: "5px 8px" }}
                              value={editDraft.valiseId}
                              onChange={e => setEditDraft(d => ({ ...d, valiseId: e.target.value }))}>
                              <option value="">— None —</option>
                              {availableValisesForEdit(editDraft.valiseId).map(v => {
                                const taken = valiseAssignedTo(v.id)
                                const takenByOther = taken && v.id !== u.valiseId
                                return (
                                  <option key={v.id} value={v.id}>
                                    {v.valiseNumber}{takenByOther ? ` (assignée à ${taken} — sera réassignée)` : ""}
                                  </option>
                                )
                              })}
                            </select>
                          ) : <span style={{ color: "#94a3b8" }}>—</span>}
                        </td>
                        <td style={tdStyle}>
                          <span style={{
                            display: "inline-block", padding: "3px 10px", borderRadius: "20px",
                            fontSize: "11px", fontWeight: 500,
                            background: u.active ? "#dcfce7" : "#fef2f2",
                            color: u.active ? "#16a34a" : "#dc2626"
                          }}>{u.active ? "Active" : "Inactive"}</span>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button onClick={saveEdit} disabled={savingEdit} style={{
                              background: "#16a34a", color: "white", border: "none",
                              padding: "4px 10px", borderRadius: "6px", fontSize: "12px",
                              cursor: savingEdit ? "not-allowed" : "pointer", fontWeight: 500
                            }}>{savingEdit ? "..." : "Save"}</button>
                            <button onClick={cancelEdit} style={{
                              background: "#f1f5f9", color: "#475569", border: "0.5px solid #e2e8f0",
                              padding: "4px 10px", borderRadius: "6px", fontSize: "12px", cursor: "pointer"
                            }}>Cancel</button>
                          </div>
                          {editError && (
                            <div style={{ color: "#dc2626", fontSize: "11px", marginTop: "4px" }}>
                              {String(editError)}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  }
                  return (
                    <tr key={u.id}>
                      <td style={{ ...tdStyle, fontWeight: 500, color: "#1e293b" }}>{u.fullName}</td>
                      <td style={tdStyle}>{u.username}</td>
                      <td style={tdStyle}>{roleBadge(u.role)}</td>
                      <td style={tdStyle}>{u.matricule}</td>
                      <td style={tdStyle}>
                        {u.role === "REPARATEUR" ? (
                          <span style={{ color: u.valiseId ? "#1e293b" : "#94a3b8", fontWeight: u.valiseId ? 500 : 400 }}>
                            {valiseLabel(u.valiseId)}
                          </span>
                        ) : <span style={{ color: "#cbd5e1" }}>—</span>}
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          display: "inline-block", padding: "3px 10px", borderRadius: "20px",
                          fontSize: "11px", fontWeight: 500,
                          background: u.active ? "#dcfce7" : "#fef2f2",
                          color: u.active ? "#16a34a" : "#dc2626"
                        }}>{u.active ? "Active" : "Inactive"}</span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: "6px" }}>
                          {u.role !== "ADMIN" && (
                            <button onClick={() => startEdit(u)} style={{
                              background: "#dbeafe", color: "#1e40af", border: "0.5px solid #bfdbfe",
                              padding: "4px 10px", borderRadius: "6px", fontSize: "12px", cursor: "pointer"
                            }}>Edit</button>
                          )}
                          {u.role !== "ADMIN" && u.active && (
                            <button onClick={() => handleDeactivate(u.id)} style={{
                              background: "#fef2f2", color: "#dc2626", border: "0.5px solid #fecaca",
                              padding: "4px 10px", borderRadius: "6px", fontSize: "12px", cursor: "pointer"
                            }}>Deactivate</button>
                          )}
                          {u.role !== "ADMIN" && !u.active && (
                            <button onClick={() => handleActivate(u.id)} style={{
                              background: "#dcfce7", color: "#16a34a", border: "0.5px solid #bbf7d0",
                              padding: "4px 10px", borderRadius: "6px", fontSize: "12px", cursor: "pointer"
                            }}>Reactivate</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
 
        {/* ═══════════ VALISES ═══════════ */}
        {activeTab === "valises" && !managingArrachesForId && (
          <div style={{ background: "white", borderRadius: "12px", border: "0.5px solid #e2e8f0", overflow: "hidden" }}>
 
            <div style={{
              padding: "1.25rem 1.5rem", borderBottom: "0.5px solid #e2e8f0",
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <h2 style={{ fontSize: "16px", fontWeight: 500 }}>Valises</h2>
              <button onClick={() => { setShowValiseForm(!showValiseForm); setValiseError("") }} style={{
                background: showValiseForm ? "#f1f5f9" : "#1a3a5c",
                color: showValiseForm ? "#475569" : "white",
                border: "0.5px solid #e2e8f0", padding: "7px 16px",
                borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer"
              }}>
                {showValiseForm ? "✕ Annuler" : "+ Nouvelle valise"}
              </button>
            </div>
 
            {showValiseForm && (
              <div style={{ padding: "1.5rem", borderBottom: "0.5px solid #e2e8f0", background: "#f8fafc" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 500, marginBottom: "1rem", color: "#1a3a5c" }}>
                  Créer une nouvelle valise
                </h3>
 
                {valiseError && (
                  <div style={{
                    background: "#fef2f2", color: "#dc2626", border: "0.5px solid #fecaca",
                    padding: "10px 14px", borderRadius: "8px", marginBottom: "1rem", fontSize: "13px"
                  }}>{String(valiseError)}</div>
                )}
 
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={labelStyle}>N° Valise</label>
                    <input style={inputStyle} type="text" placeholder="V-001"
                      value={newValise.valiseNumber}
                      onChange={e => setNewValise(p => ({ ...p, valiseNumber: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelStyle}>PF</label>
                    <input style={inputStyle} type="text" placeholder="PF-12"
                      value={newValise.pf}
                      onChange={e => setNewValise(p => ({ ...p, pf: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelStyle}>Segment</label>
                    <input style={inputStyle} type="text" placeholder="A3"
                      value={newValise.segment}
                      onChange={e => setNewValise(p => ({ ...p, segment: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelStyle}>Localisation</label>
                    <input style={inputStyle} type="text" placeholder="Atelier 2"
                      value={newValise.location}
                      onChange={e => setNewValise(p => ({ ...p, location: e.target.value }))} />
                  </div>
                </div>
 
                <button onClick={handleCreateValise} disabled={creatingValise} style={{
                  background: creatingValise ? "#94a3b8" : "#16a34a", color: "white",
                  border: "none", padding: "9px 24px", borderRadius: "8px",
                  fontSize: "14px", fontWeight: 500, cursor: creatingValise ? "not-allowed" : "pointer"
                }}>
                  {creatingValise ? "Création..." : "Créer la valise"}
                </button>
              </div>
            )}
 
            {valises.length === 0 ? (
              <div style={{ padding: "2rem", color: "#94a3b8", textAlign: "center" }}>
                Aucune valise. Créez-en une pour commencer.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["N°", "PF", "Segment", "Localisation", "Réparateur", "Arraches", "Statut", "Actions"].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {valises.map(v => {
                    const isEditing = editingValiseId === v.id
                    const arracheCount = arrachesForValise(v.id).length
                    const assignee = valiseAssignedTo(v.id)
                    if (isEditing) {
                      return (
                        <tr key={v.id} style={{ background: "#f8fafc" }}>
                          <td style={tdStyle}>
                            <input style={{ ...inputStyle, padding: "5px 8px" }}
                              value={editValiseDraft.valiseNumber}
                              onChange={e => setEditValiseDraft(d => ({ ...d, valiseNumber: e.target.value }))} />
                          </td>
                          <td style={tdStyle}>
                            <input style={{ ...inputStyle, padding: "5px 8px" }}
                              value={editValiseDraft.pf}
                              onChange={e => setEditValiseDraft(d => ({ ...d, pf: e.target.value }))} />
                          </td>
                          <td style={tdStyle}>
                            <input style={{ ...inputStyle, padding: "5px 8px" }}
                              value={editValiseDraft.segment}
                              onChange={e => setEditValiseDraft(d => ({ ...d, segment: e.target.value }))} />
                          </td>
                          <td style={tdStyle}>
                            <input style={{ ...inputStyle, padding: "5px 8px" }}
                              value={editValiseDraft.location}
                              onChange={e => setEditValiseDraft(d => ({ ...d, location: e.target.value }))} />
                          </td>
                          <td style={tdStyle}><span style={{ color: "#94a3b8" }}>{assignee || "—"}</span></td>
                          <td style={tdStyle}><span style={{ color: "#94a3b8" }}>{arracheCount}</span></td>
                          <td style={tdStyle}>
                            <select style={{ ...inputStyle, padding: "5px 8px" }}
                              value={editValiseDraft.status}
                              onChange={e => setEditValiseDraft(d => ({ ...d, status: e.target.value }))}>
                              <option value="OK">OK</option>
                              <option value="NOK">NOK</option>
                            </select>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button onClick={saveEditValise} disabled={savingValise} style={{
                                background: "#16a34a", color: "white", border: "none",
                                padding: "4px 10px", borderRadius: "6px", fontSize: "12px",
                                cursor: savingValise ? "not-allowed" : "pointer", fontWeight: 500
                              }}>{savingValise ? "..." : "Save"}</button>
                              <button onClick={cancelEditValise} style={{
                                background: "#f1f5f9", color: "#475569", border: "0.5px solid #e2e8f0",
                                padding: "4px 10px", borderRadius: "6px", fontSize: "12px", cursor: "pointer"
                              }}>Cancel</button>
                            </div>
                            {editValiseError && (
                              <div style={{ color: "#dc2626", fontSize: "11px", marginTop: "4px" }}>
                                {String(editValiseError)}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    }
                    return (
                      <tr key={v.id}>
                        <td style={{ ...tdStyle, fontWeight: 500, color: "#1e293b" }}>{v.valiseNumber}</td>
                        <td style={tdStyle}>{v.pf}</td>
                        <td style={tdStyle}>{v.segment}</td>
                        <td style={tdStyle}>{v.location}</td>
                        <td style={tdStyle}>{assignee || <span style={{ color: "#94a3b8" }}>—</span>}</td>
                        <td style={tdStyle}>{arracheCount}</td>
                        <td style={tdStyle}>
                          <span style={{
                            display: "inline-block", padding: "3px 10px", borderRadius: "20px",
                            fontSize: "11px", fontWeight: 500,
                            background: v.status === "OK" ? "#dcfce7" : "#fef2f2",
                            color: v.status === "OK" ? "#16a34a" : "#dc2626"
                          }}>{v.status}</span>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button onClick={() => openArracheManagement(v.id)} style={{
                              background: "#1a3a5c", color: "white", border: "none",
                              padding: "4px 10px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontWeight: 500
                            }}>Arraches ({arracheCount})</button>
                            <button onClick={() => startEditValise(v)} style={{
                              background: "#dbeafe", color: "#1e40af", border: "0.5px solid #bfdbfe",
                              padding: "4px 10px", borderRadius: "6px", fontSize: "12px", cursor: "pointer"
                            }}>Edit</button>
                            <button onClick={() => handleDeleteValise(v)} style={{
                              background: "#fef2f2", color: "#dc2626", border: "0.5px solid #fecaca",
                              padding: "4px 10px", borderRadius: "6px", fontSize: "12px", cursor: "pointer"
                            }}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
 
        {/* ═══════════ VALISE → ARRACHES management ═══════════ */}
        {activeTab === "valises" && managingArrachesForId && focusedValise && (
          <div>
            <button
              onClick={() => setManagingArrachesForId(null)}
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                background: "#1a3a5c", color: "white", border: "none",
                padding: "7px 16px", borderRadius: "8px",
                fontSize: "13px", fontWeight: 500, cursor: "pointer", marginBottom: "1.25rem"
              }}
            >
              ← Retour aux valises
            </button>
 
            <div style={{ background: "white", borderRadius: "12px", border: "0.5px solid #e2e8f0", overflow: "hidden" }}>
              <div style={{
                padding: "1.25rem 1.5rem", borderBottom: "0.5px solid #e2e8f0",
                display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <div>
                  <h2 style={{ fontSize: "16px", fontWeight: 500 }}>
                    Arraches — {focusedValise.valiseNumber}
                  </h2>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                    {focusedValise.pf} · {focusedValise.segment} · {focusedValise.location}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (!showArracheForm) setNewArrache(p => ({ ...p, positionInValise: nextPositionFor(managingArrachesForId) }))
                    setShowArracheForm(!showArracheForm)
                    setArracheError("")
                  }}
                  style={{
                    background: showArracheForm ? "#f1f5f9" : "#1a3a5c",
                    color: showArracheForm ? "#475569" : "white",
                    border: "0.5px solid #e2e8f0", padding: "7px 16px",
                    borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer"
                  }}>
                  {showArracheForm ? "✕ Annuler" : "+ Nouvel arrache"}
                </button>
              </div>
 
              {showArracheForm && (
                <div style={{ padding: "1.5rem", borderBottom: "0.5px solid #e2e8f0", background: "#f8fafc" }}>
                  {arracheError && (
                    <div style={{
                      background: "#fef2f2", color: "#dc2626", border: "0.5px solid #fecaca",
                      padding: "10px 14px", borderRadius: "8px", marginBottom: "1rem", fontSize: "13px"
                    }}>{String(arracheError)}</div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 2fr", gap: "1rem", marginBottom: "1rem" }}>
                    <div>
                      <label style={labelStyle}>N° Arrache</label>
                      <input style={inputStyle} type="text" placeholder="ARR-001"
                        value={newArrache.arracheNumber}
                        onChange={e => setNewArrache(p => ({ ...p, arracheNumber: e.target.value }))} />
                    </div>
                    <div>
                      <label style={labelStyle}>Position</label>
                      <input style={inputStyle} type="number" min="1"
                        value={newArrache.positionInValise}
                        onChange={e => setNewArrache(p => ({ ...p, positionInValise: e.target.value }))} />
                    </div>
                    <div>
                      <label style={labelStyle}>Description de l'outil</label>
                      <input style={inputStyle} type="text" placeholder="ex. Arrache pour terminal Y2L"
                        value={newArrache.toolDescription}
                        onChange={e => setNewArrache(p => ({ ...p, toolDescription: e.target.value }))} />
                    </div>
                  </div>
 
                  <button onClick={handleCreateArrache} disabled={creatingArrache} style={{
                    background: creatingArrache ? "#94a3b8" : "#16a34a", color: "white",
                    border: "none", padding: "9px 24px", borderRadius: "8px",
                    fontSize: "14px", fontWeight: 500, cursor: creatingArrache ? "not-allowed" : "pointer"
                  }}>
                    {creatingArrache ? "Création..." : "Créer l'arrache"}
                  </button>
                </div>
              )}
 
              {arrachesForValise(managingArrachesForId).length === 0 ? (
                <div style={{ padding: "2rem", color: "#94a3b8", textAlign: "center" }}>
                  Aucun arrache dans cette valise. Ajoutez-en un pour commencer.
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Pos.", "N° Arrache", "Description", "Statut", "NOK total", "Risk", "Actions"].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {arrachesForValise(managingArrachesForId).map(a => {
                      const isEditing = editingArracheId === a.id
                      if (isEditing) {
                        return (
                          <tr key={a.id} style={{ background: "#f8fafc" }}>
                            <td style={tdStyle}>
                              <input type="number" min="1"
                                style={{ ...inputStyle, padding: "5px 8px", width: "70px" }}
                                value={editArracheDraft.positionInValise}
                                onChange={e => setEditArracheDraft(d => ({ ...d, positionInValise: e.target.value }))} />
                            </td>
                            <td style={tdStyle}>
                              <input style={{ ...inputStyle, padding: "5px 8px" }}
                                value={editArracheDraft.arracheNumber}
                                onChange={e => setEditArracheDraft(d => ({ ...d, arracheNumber: e.target.value }))} />
                            </td>
                            <td style={tdStyle}>
                              <input style={{ ...inputStyle, padding: "5px 8px" }}
                                value={editArracheDraft.toolDescription}
                                onChange={e => setEditArracheDraft(d => ({ ...d, toolDescription: e.target.value }))} />
                            </td>
                            <td style={tdStyle}>{arracheStatusBadge(a.status)}</td>
                            <td style={tdStyle}>{a.totalNokCount || 0}</td>
                            <td style={tdStyle}>{Math.round(a.riskScore || 0)}</td>
                            <td style={tdStyle}>
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button onClick={saveEditArrache} disabled={savingArrache} style={{
                                  background: "#16a34a", color: "white", border: "none",
                                  padding: "4px 10px", borderRadius: "6px", fontSize: "12px",
                                  cursor: savingArrache ? "not-allowed" : "pointer", fontWeight: 500
                                }}>{savingArrache ? "..." : "Save"}</button>
                                <button onClick={cancelEditArrache} style={{
                                  background: "#f1f5f9", color: "#475569", border: "0.5px solid #e2e8f0",
                                  padding: "4px 10px", borderRadius: "6px", fontSize: "12px", cursor: "pointer"
                                }}>Cancel</button>
                              </div>
                              {editArracheError && (
                                <div style={{ color: "#dc2626", fontSize: "11px", marginTop: "4px" }}>
                                  {String(editArracheError)}
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      }
                      return (
                        <tr key={a.id}>
                          <td style={{ ...tdStyle, fontWeight: 500, color: "#1e293b" }}>{a.positionInValise}</td>
                          <td style={tdStyle}>{a.arracheNumber}</td>
                          <td style={tdStyle}>{a.toolDescription}</td>
                          <td style={tdStyle}>{arracheStatusBadge(a.status)}</td>
                          <td style={tdStyle}>{a.totalNokCount || 0}</td>
                          <td style={tdStyle}>
                            <span style={{ color: getRiskColor(a.riskScore || 0), fontWeight: 500 }}>
                              {Math.round(a.riskScore || 0)}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button onClick={() => startEditArrache(a)} style={{
                                background: "#dbeafe", color: "#1e40af", border: "0.5px solid #bfdbfe",
                                padding: "4px 10px", borderRadius: "6px", fontSize: "12px", cursor: "pointer"
                              }}>Edit</button>
                              <button onClick={() => handleDeleteArrache(a)} style={{
                                background: "#fef2f2", color: "#dc2626", border: "0.5px solid #fecaca",
                                padding: "4px 10px", borderRadius: "6px", fontSize: "12px", cursor: "pointer"
                              }}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
 
        {/* ═══════════ RISK RATINGS ═══════════ */}
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
                    <td style={tdStyle}>{arracheStatusBadge(a.status)}</td>
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
 
        {/* ═══════════ ACTIVITY LOG ═══════════ */}
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