import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { useNavigate } from "react-router-dom"
import api from "../services/api"

// ─── Helpers ────────────────────────────────────────────
const getCurrentQuarter = () => Math.floor(new Date().getMonth() / 3) + 1
const getCurrentYear = () => new Date().getFullYear()
const monthLabels = [
  "", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
]

export default function LaboratoryDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // Overview state
  const [valises, setValises] = useState([])
  const [arraches, setArraches] = useState([])
  const [allSheets, setAllSheets] = useState([])
  const [loading, setLoading] = useState(true)

  // Verdict tab state
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedValiseId, setSelectedValiseId] = useState(null)
  const [currentSheet, setCurrentSheet] = useState(null)
  const [sheetLoading, setSheetLoading] = useState(false)
  const [verdictResults, setVerdictResults] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [valiseRes, arracheRes] = await Promise.all([
        api.get("/valises"),
        api.get("/arraches")
      ])
      setValises(valiseRes.data)
      setArraches(arracheRes.data)

      // Pull every sheet for current quarter so overview can show verdict status
      const sheetReqs = valiseRes.data.map(v =>
        api.get("/sheets", { params: { valiseId: v.id, quarter: getCurrentQuarter(), year: getCurrentYear() } })
          .then(r => r.data)
          .catch(() => null)
      )
      const sheets = (await Promise.all(sheetReqs)).filter(Boolean)
      setAllSheets(sheets)
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
      .sort((a, b) => (a.positionInValise || 0) - (b.positionInValise || 0))

  // ─── Overview stats ─────────────────────────────────────────
  const sheetByValiseId = (valiseId) =>
    allSheets.find(s => s.valiseId === valiseId)

  const verdictsDone = allSheets.filter(s => s.quarterlyVerdict).length
  const verdictsPending = valises.length - verdictsDone
  const totalNonConforme = arraches.filter(a => a.status === "NON_CONFORME").length

  // ─── Verdict tab logic ──────────────────────────────────────
  const selectedValise = valises.find(v => v.id === selectedValiseId)
  const selectedArraches = selectedValiseId ? getArrachesForValise(selectedValiseId) : []
  const verdictAlreadySubmitted = !!currentSheet?.quarterlyVerdict

  // Load (or create) the tracking sheet for this quarter
  const loadSheetForValise = async (valise) => {
    setSheetLoading(true)
    setSubmitMessage(null)
    setVerdictResults({})
    const quarter = getCurrentQuarter()
    const year = getCurrentYear()

    try {
      const res = await api.get("/sheets", { params: { valiseId: valise.id, quarter, year } })
      let sheet = res.data
      if (Array.isArray(sheet)) sheet = sheet[0] || null

      if (!sheet) {
        const created = await api.post("/sheets", {
          valiseId: valise.id,
          valiseNumber: valise.valiseNumber,
          pf: valise.pf,
          segment: valise.segment,
          quarter,
          year
        })
        sheet = created.data
      }
      setCurrentSheet(sheet)

      // Pre-fill verdict form to all OK if no verdict yet
      if (!sheet.quarterlyVerdict) {
        const arrs = arraches.filter(a => a.valiseId === valise.id)
        const initial = {}
        arrs.forEach(a => {
          initial[a.id] = {
            result: "OK",
            nokReasons: { bavure: false, deformation: false, rupture: false }
          }
        })
        setVerdictResults(initial)
      }
    } catch (err) {
      console.error(err)
      setCurrentSheet(null)
      setSubmitMessage({ type: "error", text: "Erreur de chargement du suivi." })
    } finally {
      setSheetLoading(false)
    }
  }

  const selectValiseForVerdict = (valiseId) => {
    setSelectedValiseId(valiseId)
    const v = valises.find(x => x.id === valiseId)
    if (v) loadSheetForValise(v)
    else setCurrentSheet(null)
  }

  const setArracheResult = (arracheId, result) => {
    setVerdictResults(prev => ({
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
    setVerdictResults(prev => ({
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

  const submitVerdict = async () => {
    if (!currentSheet || !selectedArraches.length) return
    setSubmitMessage(null)

    // Validate
    for (const a of selectedArraches) {
      const r = verdictResults[a.id]
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
      const verdict = {
        date: new Date().toISOString(),
        labMatricule: user?.matricule || "",
        signedBy: user?.fullName || "",
        results: selectedArraches.map(a => ({
          arracheId: a.id,
          positionInValise: a.positionInValise,
          result: verdictResults[a.id].result,
          nokReasons: verdictResults[a.id].nokReasons
        }))
      }

      const res = await api.post(`/sheets/${currentSheet.id}/quarterly`, verdict)
      setCurrentSheet(res.data)

      // Mark NOK arraches as NON_CONFORME
      const nokIds = selectedArraches
        .filter(a => verdictResults[a.id].result === "NOK")
        .map(a => a.id)
      await Promise.all(
        nokIds.map(id => api.put(`/arraches/${id}/status?status=NON_CONFORME`))
      )

      // Refresh arraches so overview reflects the new statuses
      const arracheRes = await api.get("/arraches")
      setArraches(arracheRes.data)
      setAllSheets(prev => {
        const idx = prev.findIndex(s => s.id === res.data.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = res.data
          return next
        }
        return [...prev, res.data]
      })

      setSubmitMessage({ type: "success", text: "Verdict trimestriel soumis avec succès." })
    } catch (err) {
      console.error(err)
      const detail = err?.response?.data?.message || err?.response?.statusText || "Erreur lors de la soumission."
      setSubmitMessage({ type: "error", text: detail })
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Shared styles ──────────────────────────────────────────
  const card = {
    background: "white",
    borderRadius: "12px",
    border: "0.5px solid #e2e8f0"
  }
  const thStyle = {
    padding: "10px 16px",
    textAlign: "left",
    fontSize: "12px",
    fontWeight: 500,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    borderBottom: "0.5px solid #e2e8f0",
    background: "#f8fafc"
  }
  const tdStyle = { padding: "12px 16px", fontSize: "14px", color: "#475569" }

  const tabs = [
    { key: "overview", label: "Vue d'ensemble" },
    { key: "verdict", label: "Verdict trimestriel" }
  ]

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
          Tableau de bord — Laboratoire
        </h1>
        <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "1.5rem" }}>
          Contrôle trimestriel (QM Labo) — {user?.fullName}
        </p>

        {/* Tabs */}
        <div style={{
          display: "flex",
          gap: "4px",
          marginBottom: "1.5rem",
          background: "white",
          padding: "4px",
          borderRadius: "10px",
          border: "0.5px solid #e2e8f0",
          width: "fit-content"
        }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: "7px 18px",
                borderRadius: "7px",
                border: "none",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 500,
                background: activeTab === t.key ? "#1a3a5c" : "transparent",
                color: activeTab === t.key ? "white" : "#475569"
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══════ OVERVIEW TAB ═══════ */}
        {activeTab === "overview" && (
          <>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "1rem",
              marginBottom: "2rem"
            }}>
              {[
                { label: "Total valises", value: valises.length, color: "#1a3a5c" },
                { label: `Verdicts T${getCurrentQuarter()} ${getCurrentYear()}`, value: verdictsDone, color: "#16a34a" },
                { label: "Verdicts en attente", value: verdictsPending, color: "#f59e0b" },
                { label: "Non conformes", value: totalNonConforme, color: "#dc2626" },
              ].map((c) => (
                <div key={c.label} style={{ ...card, padding: "1.25rem" }}>
                  <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "0.5rem" }}>
                    {c.label}
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: 500, color: c.color }}>
                    {loading ? "—" : c.value}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ ...card, overflow: "hidden" }}>
              <div style={{ padding: "1.25rem 1.5rem", borderBottom: "0.5px solid #e2e8f0" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 500 }}>
                  Valises — statut du verdict trimestriel
                </h2>
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
                    <tr>
                      {["N° Valise", "PF", "Segment", "Arraches", "Verdict T" + getCurrentQuarter()].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                      <th style={thStyle}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {valises.map((v, i) => {
                      const sheet = sheetByValiseId(v.id)
                      const done = !!sheet?.quarterlyVerdict
                      return (
                        <tr key={v.id} style={{
                          borderBottom: i < valises.length - 1 ? "0.5px solid #f1f5f9" : "none"
                        }}>
                          <td style={{ ...tdStyle, fontWeight: 500, color: "#1e293b" }}>{v.valiseNumber}</td>
                          <td style={tdStyle}>{v.pf}</td>
                          <td style={tdStyle}>{v.segment}</td>
                          <td style={tdStyle}>{getArrachesForValise(v.id).length}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{
                              display: "inline-block",
                              padding: "3px 10px",
                              borderRadius: "20px",
                              fontSize: "12px",
                              fontWeight: 500,
                              background: done ? "#dcfce7" : "#fef3c7",
                              color: done ? "#16a34a" : "#b45309"
                            }}>
                              {done ? "Soumis" : "En attente"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right" }}>
                            <button
                              onClick={() => {
                                setSelectedValiseId(v.id)
                                setActiveTab("verdict")
                                loadSheetForValise(v)
                              }}
                              style={{
                                padding: "5px 12px",
                                borderRadius: "6px",
                                border: "0.5px solid #cbd5e1",
                                background: "white",
                                color: "#1a3a5c",
                                fontSize: "12px",
                                fontWeight: 500,
                                cursor: "pointer"
                              }}
                            >
                              {done ? "Voir" : "Inspecter"} →
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ═══════ VERDICT TAB ═══════ */}
        {activeTab === "verdict" && (
          <>
            <div style={{ ...card, padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
              <label style={{
                display: "block",
                fontSize: "13px",
                color: "#64748b",
                marginBottom: "0.5rem"
              }}>
                Sélectionner une valise — T{getCurrentQuarter()} {getCurrentYear()}
              </label>
              <select
                value={selectedValiseId || ""}
                onChange={(e) => selectValiseForVerdict(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "0.5px solid #cbd5e1",
                  fontSize: "14px",
                  background: "white"
                }}
              >
                <option value="">— Choisir une valise —</option>
                {valises.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.valiseNumber} — {v.pf} / {v.segment}
                  </option>
                ))}
              </select>
            </div>

            {!selectedValiseId && (
              <div style={{ ...card, padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                Choisissez une valise pour voir l'historique des contrôles et soumettre le verdict trimestriel.
              </div>
            )}

            {selectedValiseId && sheetLoading && (
              <div style={{ ...card, padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                Chargement du suivi...
              </div>
            )}

            {selectedValiseId && !sheetLoading && currentSheet && (
              <>
                {/* ─── Weekly checks history (réparateur) ─── */}
                <div style={{ ...card, overflow: "hidden", marginBottom: "1.5rem" }}>
                  <div style={{
                    padding: "1.25rem 1.5rem",
                    borderBottom: "0.5px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <h2 style={{ fontSize: "16px", fontWeight: 500 }}>
                      Contrôles hebdomadaires — Réparateur
                    </h2>
                    <span style={{ fontSize: "13px", color: "#64748b" }}>
                      {currentSheet.weeklyChecks?.length || 0} semaine{(currentSheet.weeklyChecks?.length || 0) > 1 ? "s" : ""}
                    </span>
                  </div>

                  {!currentSheet.weeklyChecks?.length ? (
                    <div style={{ padding: "1.5rem", color: "#94a3b8", textAlign: "center", fontSize: "14px" }}>
                      Aucun contrôle hebdomadaire soumis ce trimestre.
                    </div>
                  ) : (
                    <div style={{ padding: "1rem 1.5rem" }}>
                      {currentSheet.weeklyChecks.map((wc, idx) => {
                        const nokCount = wc.results?.filter(r => r.result === "NOK").length || 0
                        const okCount = wc.results?.filter(r => r.result === "OK").length || 0
                        return (
                          <details
                            key={idx}
                            style={{
                              marginBottom: "0.5rem",
                              border: "0.5px solid #e2e8f0",
                              borderRadius: "8px",
                              padding: "0.75rem 1rem"
                            }}
                          >
                            <summary style={{
                              cursor: "pointer",
                              fontSize: "14px",
                              fontWeight: 500,
                              color: "#1e293b",
                              display: "flex",
                              justifyContent: "space-between"
                            }}>
                              <span>
                                Semaine {wc.weekNumber} — {wc.signedBy || wc.inspectorMatricule || "—"}
                                {wc.date && ` · ${new Date(wc.date).toLocaleDateString()}`}
                              </span>
                              <span style={{ fontSize: "12px", fontWeight: 400 }}>
                                <span style={{ color: "#16a34a" }}>{okCount} OK</span>
                                {" · "}
                                <span style={{ color: "#dc2626" }}>{nokCount} NOK</span>
                              </span>
                            </summary>
                            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "0.75rem" }}>
                              <thead>
                                <tr>
                                  {["Pos.", "Résultat", "Bavure", "Déformation", "Rupture"].map(h => (
                                    <th key={h} style={{ ...thStyle, fontSize: "11px" }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {wc.results?.map((r, i) => (
                                  <tr key={i}>
                                    <td style={{ ...tdStyle, fontSize: "13px" }}>{r.positionInValise}</td>
                                    <td style={{ padding: "8px 16px" }}>
                                      <span style={{
                                        display: "inline-block",
                                        padding: "2px 8px",
                                        borderRadius: "4px",
                                        fontSize: "11px",
                                        fontWeight: 500,
                                        background: r.result === "OK" ? "#dcfce7" : "#fef2f2",
                                        color: r.result === "OK" ? "#16a34a" : "#dc2626"
                                      }}>
                                        {r.result}
                                      </span>
                                    </td>
                                    <td style={{ ...tdStyle, fontSize: "13px" }}>{r.nokReasons?.bavure ? "✓" : "—"}</td>
                                    <td style={{ ...tdStyle, fontSize: "13px" }}>{r.nokReasons?.deformation ? "✓" : "—"}</td>
                                    <td style={{ ...tdStyle, fontSize: "13px" }}>{r.nokReasons?.rupture ? "✓" : "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </details>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* ─── Monthly checks history (QM agent) ─── */}
                <div style={{ ...card, overflow: "hidden", marginBottom: "1.5rem" }}>
                  <div style={{
                    padding: "1.25rem 1.5rem",
                    borderBottom: "0.5px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <h2 style={{ fontSize: "16px", fontWeight: 500 }}>
                      Contrôles mensuels — QM Opération
                    </h2>
                    <span style={{ fontSize: "13px", color: "#64748b" }}>
                      {currentSheet.monthlyChecks?.length || 0} mois
                    </span>
                  </div>

                  {!currentSheet.monthlyChecks?.length ? (
                    <div style={{ padding: "1.5rem", color: "#94a3b8", textAlign: "center", fontSize: "14px" }}>
                      Aucun contrôle mensuel soumis ce trimestre.
                    </div>
                  ) : (
                    <div style={{ padding: "1rem 1.5rem" }}>
                      {currentSheet.monthlyChecks.map((mc, idx) => {
                        const nokCount = mc.results?.filter(r => r.result === "NOK").length || 0
                        const okCount = mc.results?.filter(r => r.result === "OK").length || 0
                        return (
                          <details
                            key={idx}
                            style={{
                              marginBottom: "0.5rem",
                              border: "0.5px solid #e2e8f0",
                              borderRadius: "8px",
                              padding: "0.75rem 1rem"
                            }}
                          >
                            <summary style={{
                              cursor: "pointer",
                              fontSize: "14px",
                              fontWeight: 500,
                              color: "#1e293b",
                              display: "flex",
                              justifyContent: "space-between"
                            }}>
                              <span>
                                {monthLabels[mc.month] || `Mois ${mc.month}`} {mc.year} — {mc.signedBy || mc.inspectorMatricule || "—"}
                                {mc.date && ` · ${new Date(mc.date).toLocaleDateString()}`}
                              </span>
                              <span style={{ fontSize: "12px", fontWeight: 400 }}>
                                <span style={{ color: "#16a34a" }}>{okCount} OK</span>
                                {" · "}
                                <span style={{ color: "#dc2626" }}>{nokCount} NOK</span>
                              </span>
                            </summary>
                            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "0.75rem" }}>
                              <thead>
                                <tr>
                                  {["Pos.", "Résultat", "Bavure", "Déformation", "Rupture"].map(h => (
                                    <th key={h} style={{ ...thStyle, fontSize: "11px" }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {mc.results?.map((r, i) => (
                                  <tr key={i}>
                                    <td style={{ ...tdStyle, fontSize: "13px" }}>{r.positionInValise}</td>
                                    <td style={{ padding: "8px 16px" }}>
                                      <span style={{
                                        display: "inline-block",
                                        padding: "2px 8px",
                                        borderRadius: "4px",
                                        fontSize: "11px",
                                        fontWeight: 500,
                                        background: r.result === "OK" ? "#dcfce7" : "#fef2f2",
                                        color: r.result === "OK" ? "#16a34a" : "#dc2626"
                                      }}>
                                        {r.result}
                                      </span>
                                    </td>
                                    <td style={{ ...tdStyle, fontSize: "13px" }}>{r.nokReasons?.bavure ? "✓" : "—"}</td>
                                    <td style={{ ...tdStyle, fontSize: "13px" }}>{r.nokReasons?.deformation ? "✓" : "—"}</td>
                                    <td style={{ ...tdStyle, fontSize: "13px" }}>{r.nokReasons?.rupture ? "✓" : "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </details>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* ─── Quarterly verdict form ─── */}
                <div style={{ ...card, overflow: "hidden" }}>
                  <div style={{
                    padding: "1.25rem 1.5rem",
                    borderBottom: "0.5px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <h2 style={{ fontSize: "16px", fontWeight: 500 }}>
                      Verdict trimestriel (QM Labo) — T{getCurrentQuarter()} {getCurrentYear()}
                    </h2>
                    {verdictAlreadySubmitted && (
                      <span style={{
                        fontSize: "12px",
                        fontWeight: 500,
                        padding: "3px 10px",
                        borderRadius: "20px",
                        background: "#dcfce7",
                        color: "#16a34a"
                      }}>
                        Déjà soumis
                      </span>
                    )}
                  </div>

                  {verdictAlreadySubmitted ? (
                    <div style={{ padding: "1rem 1.5rem" }}>
                      <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "0.75rem" }}>
                        Soumis par <strong>{currentSheet.quarterlyVerdict.signedBy}</strong> ({currentSheet.quarterlyVerdict.labMatricule})
                        {currentSheet.quarterlyVerdict.date && ` · ${new Date(currentSheet.quarterlyVerdict.date).toLocaleDateString()}`}
                      </div>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            {["Pos.", "Résultat", "Bavure", "Déformation", "Rupture"].map(h => (
                              <th key={h} style={thStyle}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {currentSheet.quarterlyVerdict.results?.map((r, i) => (
                            <tr key={i} style={{ borderBottom: "0.5px solid #f1f5f9" }}>
                              <td style={{ ...tdStyle, fontWeight: 500, color: "#1e293b" }}>{r.positionInValise}</td>
                              <td style={{ padding: "10px 16px" }}>
                                <span style={{
                                  display: "inline-block",
                                  padding: "3px 10px",
                                  borderRadius: "20px",
                                  fontSize: "12px",
                                  fontWeight: 500,
                                  background: r.result === "OK" ? "#dcfce7" : "#fef2f2",
                                  color: r.result === "OK" ? "#16a34a" : "#dc2626"
                                }}>
                                  {r.result}
                                </span>
                              </td>
                              <td style={tdStyle}>{r.nokReasons?.bavure ? "✓" : "—"}</td>
                              <td style={tdStyle}>{r.nokReasons?.deformation ? "✓" : "—"}</td>
                              <td style={tdStyle}>{r.nokReasons?.rupture ? "✓" : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : selectedArraches.length === 0 ? (
                    <div style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>
                      Cette valise ne contient aucun arrache.
                    </div>
                  ) : (
                    <>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            {["Pos.", "Outil", "Verdict", "Raison NOK"].map(h => (
                              <th key={h} style={thStyle}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {selectedArraches.map((a) => {
                            const r = verdictResults[a.id]
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
                                        fontSize: "13px",
                                        fontWeight: 500,
                                        cursor: "pointer"
                                      }}
                                    >
                                      OK
                                    </button>
                                    <button
                                      onClick={() => setArracheResult(a.id, "NOK")}
                                      style={{
                                        padding: "6px 14px",
                                        borderRadius: "6px",
                                        border: "0.5px solid",
                                        borderColor: r?.result === "NOK" ? "#dc2626" : "#cbd5e1",
                                        background: r?.result === "NOK" ? "#fef2f2" : "white",
                                        color: r?.result === "NOK" ? "#dc2626" : "#64748b",
                                        fontSize: "13px",
                                        fontWeight: 500,
                                        cursor: "pointer"
                                      }}
                                    >
                                      NOK
                                    </button>
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
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "4px",
                                          fontSize: "13px",
                                          color: "#475569",
                                          cursor: "pointer"
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
                          onClick={submitVerdict}
                          disabled={submitting}
                          style={{
                            background: submitting ? "#94a3b8" : "#1a3a5c",
                            color: "white",
                            border: "none",
                            padding: "10px 24px",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: 500,
                            cursor: submitting ? "not-allowed" : "pointer"
                          }}
                        >
                          {submitting ? "Envoi..." : "Soumettre le verdict trimestriel"}
                        </button>
                      </div>
                    </>
                  )}

                  {submitMessage && (
                    <div style={{
                      padding: "0.75rem 1.5rem",
                      background: submitMessage.type === "error" ? "#fef2f2" : "#dcfce7",
                      color: submitMessage.type === "error" ? "#dc2626" : "#16a34a",
                      fontSize: "13px",
                      fontWeight: 500,
                      borderTop: "0.5px solid #e2e8f0"
                    }}>
                      {submitMessage.text}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

      </div>
    </div>
  )
}