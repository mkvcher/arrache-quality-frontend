import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { useNavigate } from "react-router-dom"
import api from "../services/api"
import NotificationBell from "../components/NotificationBell"
import { MyValiseSparkline } from "../components/Charts"

const getCurrentQuarter = () => Math.floor(new Date().getMonth() / 3) + 1
const getCurrentYear = () => new Date().getFullYear()

const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

export default function ReparateurDashboard() {
  const { user, login, logout } = useAuth()
  const navigate = useNavigate()

  const [assignedValise, setAssignedValise] = useState(null)
  const [arraches, setArraches] = useState([])
  const [currentSheet, setCurrentSheet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState(null)
  const [results, setResults] = useState({})
  const [noValise, setNoValise] = useState(false)

  useEffect(() => {
    bootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch fresh user info (in case admin reassigned valise since last login),
  // then load the valise + arraches + current quarter's tracking sheet.
  const bootstrap = async () => {
    setLoading(true)
    setSubmitMessage(null)
    try {
      // Refresh /me so a recent admin reassignment is picked up
      let valiseId = user?.valiseId
      try {
        const meRes = await api.get("/auth/me")
        const fresh = meRes.data
        valiseId = fresh.valiseId
        // Update local auth context without losing the token
        if (user?.token) {
          login({ ...fresh, token: user.token })
        }
      } catch (err) {
        console.warn("Could not refresh /me, falling back to cached user", err)
      }

      if (!valiseId) {
        setNoValise(true)
        setLoading(false)
        return
      }

      const [valisesRes, arrachesRes] = await Promise.all([
        api.get("/valises"),
        api.get(`/arraches/valise/${valiseId}`)
      ])
      const valise = valisesRes.data.find(v => v.id === valiseId) || null
      setAssignedValise(valise)
      setArraches(arrachesRes.data)

      // Pre-fill all-OK
      const initial = {}
      arrachesRes.data.forEach(a => {
        initial[a.id] = {
          result: "OK",
          nokReasons: { bavure: false, deformation: false, rupture: false }
        }
      })
      setResults(initial)

      // Load (or create) the tracking sheet for current quarter so the user sees existing weekly checks
      if (valise) {
        const quarter = getCurrentQuarter()
        const year = getCurrentYear()
        const sheetRes = await api.get("/sheets", { params: { valiseId: valise.id, quarter, year } })
        let sheet = sheetRes.data
        if (Array.isArray(sheet)) sheet = sheet[0] || null
        if (!sheet) {
          const created = await api.post("/sheets", {
            valiseId: valise.id,
            valiseNumber: valise.valiseNumber,
            pf: valise.pf,
            segment: valise.segment,
            quarter, year
          })
          sheet = created.data
        }
        setCurrentSheet(sheet)
      }
    } catch (err) {
      console.error(err)
      setSubmitMessage({ type: "error", text: "Erreur de chargement." })
    } finally {
      setLoading(false)
    }
  }

  const setArracheResult = (arracheId, result) => {
    setResults(prev => ({
      ...prev,
      [arracheId]: {
        result,
        nokReasons: result === "OK"
          ? { bavure: false, deformation: false, rupture: false }
          : (prev[arracheId]?.nokReasons || { bavure: false, deformation: false, rupture: false })
      }
    }))
  }

  const setNokReason = (arracheId, reason) => {
    setResults(prev => ({
      ...prev,
      [arracheId]: {
        ...prev[arracheId],
        nokReasons: {
          bavure: reason === "bavure",
          deformation: reason === "deformation",
          rupture: reason === "rupture"
        }
      }
    }))
  }

  const handleSubmit = async () => {
    if (!assignedValise || !arraches.length || !currentSheet) return
    setSubmitMessage(null)

    for (const a of arraches) {
      const r = results[a.id]
      if (!r || !r.result) {
        setSubmitMessage({ type: "error", text: `Arrache ${a.positionInValise} : OK ou NOK requis.` })
        return
      }
      if (r.result === "NOK") {
        const { bavure, deformation, rupture } = r.nokReasons
        if (!bavure && !deformation && !rupture) {
          setSubmitMessage({ type: "error", text: `Arrache ${a.positionInValise} : sélectionner une raison NOK.` })
          return
        }
      }
    }

    setSubmitting(true)
    try {
      const now = new Date()
      const weeklyCheck = {
        weekNumber: getWeekNumber(now),
        date: now.toISOString(),
        inspectorMatricule: user?.matricule || "",
        signedBy: user?.fullName || "",
        results: arraches.map(a => ({
          arracheId: a.id,
          positionInValise: a.positionInValise,
          result: results[a.id].result,
          nokReasons: results[a.id].nokReasons
        }))
      }

      const res = await api.post(`/sheets/${currentSheet.id}/weekly`, weeklyCheck)
      setCurrentSheet(res.data)

      // Reset form to all-OK
      const reset = {}
      arraches.forEach(a => {
        reset[a.id] = {
          result: "OK",
          nokReasons: { bavure: false, deformation: false, rupture: false }
        }
      })
      setResults(reset)
      setSubmitMessage({ type: "success", text: "Contrôle hebdomadaire soumis avec succès." })
    } catch (err) {
      console.error(err)
      const detail = err?.response?.data?.message || err?.response?.statusText || "Erreur lors de la soumission."
      setSubmitMessage({ type: "error", text: detail })
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  // ─── Styles ───
  const card = {
    background: "white",
    borderRadius: "12px",
    border: "0.5px solid #e2e8f0"
  }
  const thStyle = {
    padding: "10px 16px", textAlign: "left", fontSize: "12px", fontWeight: 500,
    color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em",
    borderBottom: "0.5px solid #e2e8f0", background: "#f8fafc"
  }
  const tdStyle = { padding: "12px 16px", fontSize: "14px", color: "#475569" }

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f8" }}>

      {/* Navbar */}
      <div style={{
        background: "#1a3a5c", padding: "0 2rem", height: "60px",
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ color: "white", fontWeight: 500, fontSize: "16px" }}>
          Suivi des Arraches — LEONI
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "14px" }}>
            {user?.fullName}
          </span>
          <NotificationBell />
          <button onClick={handleLogout} style={{
            background: "rgba(255,255,255,0.15)", color: "white", border: "none",
            padding: "6px 14px", borderRadius: "6px", fontSize: "13px", cursor: "pointer"
          }}>
            Déconnexion
          </button>
        </div>
      </div>

      <div style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 500, marginBottom: "0.25rem" }}>
          Tableau de bord — Réparateur
        </h1>
        <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "1.5rem" }}>
          Bienvenue, {user?.fullName}
        </p>

        {/* ─── Loading state ─── */}
        {loading && (
          <div style={{ ...card, padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
            Chargement...
          </div>
        )}

        {/* ─── No valise assigned ─── */}
        {!loading && noValise && (
          <div style={{ ...card, padding: "2rem", textAlign: "center" }}>
            <div style={{ fontSize: "16px", fontWeight: 500, color: "#1e293b", marginBottom: "0.5rem" }}>
              Aucune valise assignée
            </div>
            <div style={{ fontSize: "14px", color: "#64748b" }}>
              Contactez l'administrateur pour vous assigner une valise.
            </div>
          </div>
        )}

        {/* ─── Main inspection view ─── */}
        {!loading && assignedValise && (
          <>
            <div style={{ marginBottom: "1.5rem" }}>
              <MyValiseSparkline sheet={currentSheet} />
            </div>
            {/* Valise header card */}
            <div style={{ ...card, padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px" }}>
                Valise assignée
              </div>
              <div style={{ fontSize: "20px", fontWeight: 500, color: "#1e293b" }}>
                {assignedValise.valiseNumber}
              </div>
              <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                {assignedValise.pf} · {assignedValise.segment} · {assignedValise.location}
              </div>
            </div>

            {/* Past weekly checks this quarter */}
            {currentSheet?.weeklyChecks?.length > 0 && (
              <div style={{ ...card, overflow: "hidden", marginBottom: "1.5rem" }}>
                <div style={{ padding: "1rem 1.5rem", borderBottom: "0.5px solid #e2e8f0" }}>
                  <h2 style={{ fontSize: "15px", fontWeight: 500 }}>
                    Contrôles déjà soumis ce trimestre — {currentSheet.weeklyChecks.length} semaine{currentSheet.weeklyChecks.length > 1 ? "s" : ""}
                  </h2>
                </div>
                <div style={{ padding: "0.75rem 1.5rem" }}>
                  {currentSheet.weeklyChecks.map((wc, idx) => {
                    const nok = wc.results?.filter(r => r.result === "NOK").length || 0
                    const ok = wc.results?.filter(r => r.result === "OK").length || 0
                    return (
                      <div key={idx} style={{
                        padding: "0.5rem 0",
                        fontSize: "13px",
                        color: "#475569",
                        display: "flex",
                        justifyContent: "space-between",
                        borderBottom: idx < currentSheet.weeklyChecks.length - 1 ? "0.5px solid #f1f5f9" : "none"
                      }}>
                        <span>
                          Semaine {wc.weekNumber}
                          {wc.date && ` · ${new Date(wc.date).toLocaleDateString()}`}
                        </span>
                        <span>
                          <span style={{ color: "#16a34a" }}>{ok} OK</span>
                          {" · "}
                          <span style={{ color: "#dc2626" }}>{nok} NOK</span>
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* New weekly check form */}
            <div style={{ ...card, overflow: "hidden" }}>
              <div style={{ padding: "1.25rem 1.5rem", borderBottom: "0.5px solid #e2e8f0" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 500 }}>
                  Nouveau contrôle hebdomadaire — Semaine {getWeekNumber(new Date())}
                </h2>
              </div>

              {arraches.length === 0 ? (
                <div style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>
                  Cette valise ne contient aucun arrache.
                </div>
              ) : (
                <>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Pos.", "Outil", "Résultat", "Raison NOK"].map(h => (
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {arraches.map((a) => {
                        const r = results[a.id]
                        return (
                          <tr key={a.id} style={{ borderBottom: "0.5px solid #f1f5f9" }}>
                            <td style={{ ...tdStyle, fontWeight: 500, color: "#1e293b" }}>
                              {a.positionInValise}
                            </td>
                            <td style={tdStyle}>
                              <div style={{ fontWeight: 500, color: "#1e293b" }}>{a.arracheNumber}</div>
                              <div style={{ fontSize: "12px", color: "#94a3b8" }}>{a.toolDescription}</div>
                            </td>
                            <td style={{ padding: "10px 16px" }}>
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button
                                  onClick={() => setArracheResult(a.id, "OK")}
                                  style={{
                                    padding: "6px 14px",
                                    borderRadius: "6px",
                                    border: "0.5px solid",
                                    borderColor: r?.result === "OK" ? "#16a34a" : "#cbd5e1",
                                    background: r?.result === "OK" ? "#dcfce7" : "white",
                                    color: r?.result === "OK" ? "#16a34a" : "#64748b",
                                    fontSize: "13px", fontWeight: 500, cursor: "pointer"
                                  }}
                                >OK</button>
                                <button
                                  onClick={() => setArracheResult(a.id, "NOK")}
                                  style={{
                                    padding: "6px 14px",
                                    borderRadius: "6px",
                                    border: "0.5px solid",
                                    borderColor: r?.result === "NOK" ? "#dc2626" : "#cbd5e1",
                                    background: r?.result === "NOK" ? "#fef2f2" : "white",
                                    color: r?.result === "NOK" ? "#dc2626" : "#64748b",
                                    fontSize: "13px", fontWeight: 500, cursor: "pointer"
                                  }}
                                >NOK</button>
                              </div>
                            </td>
                            <td style={{ padding: "10px 16px" }}>
                              {r?.result === "NOK" ? (
                                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                                  {[
                                    { key: "bavure", label: "Bavure" },
                                    { key: "deformation", label: "Déformation" },
                                    { key: "rupture", label: "Rupture" }
                                  ].map(opt => (
                                    <label key={opt.key} style={{
                                      display: "flex", alignItems: "center", gap: "4px",
                                      fontSize: "13px", color: "#475569", cursor: "pointer"
                                    }}>
                                      <input
                                        type="radio"
                                        name={`nok-${a.id}`}
                                        checked={r.nokReasons[opt.key]}
                                        onChange={() => setNokReason(a.id, opt.key)}
                                      />
                                      {opt.label}
                                    </label>
                                  ))}
                                </div>
                              ) : (
                                <span style={{ color: "#cbd5e1", fontSize: "13px" }}>—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>

                  <div style={{
                    padding: "1rem 1.5rem",
                    borderTop: "0.5px solid #e2e8f0",
                    background: "#f8fafc",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div style={{ fontSize: "13px", color: "#64748b" }}>
                      Inspecteur : <strong>{user?.fullName}</strong> ({user?.matricule || "—"})
                      {" · "}Date : {new Date().toLocaleDateString()}
                    </div>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      style={{
                        background: submitting ? "#94a3b8" : "#1a3a5c",
                        color: "white", border: "none",
                        padding: "10px 24px", borderRadius: "8px",
                        fontSize: "14px", fontWeight: 500,
                        cursor: submitting ? "not-allowed" : "pointer"
                      }}
                    >
                      {submitting ? "Envoi..." : "Soumettre le contrôle"}
                    </button>
                  </div>
                </>
              )}

              {submitMessage && (
                <div style={{
                  padding: "0.75rem 1.5rem",
                  background: submitMessage.type === "error" ? "#fef2f2" : "#dcfce7",
                  color: submitMessage.type === "error" ? "#dc2626" : "#16a34a",
                  fontSize: "13px", fontWeight: 500,
                  borderTop: "0.5px solid #e2e8f0"
                }}>
                  {submitMessage.text}
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  )
}