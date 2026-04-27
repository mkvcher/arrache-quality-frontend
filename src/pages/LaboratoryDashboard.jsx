import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { useNavigate } from "react-router-dom"
import api from "../services/api"

export default function LaboratoryDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [valises, setValises] = useState([])
  const [selectedValise, setSelectedValise] = useState(null)
  const [arraches, setArraches] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [results, setResults] = useState({})

  useEffect(() => {
    fetchValises()
  }, [])

  const fetchValises = async () => {
    try {
      const res = await api.get("/valises")
      setValises(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const selectValise = async (valise) => {
    setSelectedValise(valise)
    setSuccess(false)
    setResults({})
    try {
      const res = await api.get(`/arraches/valise/${valise.id}`)
      setArraches(res.data)
      const initial = {}
      res.data.forEach(a => {
        initial[a.id] = {
          result: "OK",
          nokReasons: { bavure: false, deformation: false, rupture: false }
        }
      })
      setResults(initial)
    } catch (err) {
      console.error(err)
    }
  }

  const toggleResult = (arracheId) => {
    setResults(prev => ({
      ...prev,
      [arracheId]: {
        ...prev[arracheId],
        result: prev[arracheId].result === "OK" ? "NOK" : "OK",
        nokReasons: { bavure: false, deformation: false, rupture: false }
      }
    }))
  }

  const toggleReason = (arracheId, reason) => {
    setResults(prev => ({
      ...prev,
      [arracheId]: {
        ...prev[arracheId],
        nokReasons: {
          ...prev[arracheId].nokReasons,
          [reason]: !prev[arracheId].nokReasons[reason]
        }
      }
    }))
  }

  const handleSubmit = async () => {
    for (const arrache of arraches) {
      const r = results[arrache.id]
      if (r.result === "NOK") {
        const { bavure, deformation, rupture } = r.nokReasons
        if (!bavure && !deformation && !rupture) {
          alert(`Veuillez sélectionner au moins un critère NOK pour l'arrache ${arrache.arracheNumber}`)
          return
        }
      }
    }

    setSubmitting(true)
    try {
      const now = new Date()
      const quarter = Math.ceil((now.getMonth() + 1) / 3)
      const year = now.getFullYear()

      let sheet
      try {
        const res = await api.get(`/sheets?valiseId=${selectedValise.id}&quarter=${quarter}&year=${year}`)
        sheet = res.data
      } catch {
        const res = await api.post("/sheets", {
          valiseId: selectedValise.id,
          valiseNumber: selectedValise.valiseNumber,
          pf: selectedValise.pf,
          segment: selectedValise.segment,
          quarter,
          year
        })
        sheet = res.data
      }

      const verdict = {
        date: now.toISOString(),
        labMatricule: user.matricule || user.username,
        signedBy: user.fullName,
        results: arraches.map(a => ({
          arracheId: a.id,
          positionInValise: a.positionInValise,
          result: results[a.id].result,
          nokReasons: results[a.id].nokReasons
        }))
      }

      await api.post(`/sheets/${sheet.id}/quarterly`, verdict)

      // Update NON_CONFORME status for NOK arraches
      for (const arrache of arraches) {
        if (results[arrache.id].result === "NOK") {
          await api.put(`/arraches/${arrache.id}/status?status=NON_CONFORME`)
        }
      }

      setSuccess(true)
      setSelectedValise(null)
      setArraches([])
    } catch (err) {
      console.error(err)
      alert("Erreur lors de la soumission")
    } finally {
      setSubmitting(false)
    }
  }

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

      <div style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 500, marginBottom: "0.25rem" }}>
          Tableau de bord — Laboratoire
        </h1>
        <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "2rem" }}>
          Contrôle trimestriel (QM Labo) — {user?.fullName}
        </p>

        {success && (
          <div style={{
            background: "#dcfce7",
            color: "#16a34a",
            border: "0.5px solid #bbf7d0",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "1.5rem",
            fontSize: "14px"
          }}>
            ✓ Verdict trimestriel soumis avec succès
          </div>
        )}

        {!selectedValise ? (
          <div style={{
            background: "white",
            borderRadius: "12px",
            border: "0.5px solid #e2e8f0",
            overflow: "hidden"
          }}>
            <div style={{
              padding: "1.25rem 1.5rem",
              borderBottom: "0.5px solid #e2e8f0"
            }}>
              <h2 style={{ fontSize: "16px", fontWeight: 500 }}>
                Sélectionnez une valise à inspecter
              </h2>
            </div>
            {loading ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                Chargement...
              </div>
            ) : (
              valises.map((valise, i) => (
                <div
                  key={valise.id}
                  onClick={() => selectValise(valise)}
                  style={{
                    padding: "1rem 1.5rem",
                    borderBottom: i < valises.length - 1 ? "0.5px solid #f1f5f9" : "none",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                  onMouseLeave={e => e.currentTarget.style.background = "white"}
                >
                  <div>
                    <div style={{ fontWeight: 500, fontSize: "15px" }}>
                      {valise.valiseNumber}
                    </div>
                    <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
                      {valise.pf} — {valise.segment} — {valise.location}
                    </div>
                  </div>
                  <div style={{ fontSize: "13px", color: "#94a3b8" }}>
                    Inspecter →
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div>
            <button
              onClick={() => setSelectedValise(null)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#1a3a5c",
                border: "0.5px solid #e2e8f0",
                color: "#ffffff",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 500,
                marginBottom: "1.25rem",
                padding: "7px 16px",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
              }}
            >
              ← Retour aux valises
            </button>

            <div style={{
              background: "white",
              borderRadius: "12px",
              border: "0.5px solid #e2e8f0",
              overflow: "hidden"
            }}>
              <div style={{
                padding: "1.25rem 1.5rem",
                borderBottom: "0.5px solid #e2e8f0",
                background: "#f8fafc"
              }}>
                <div style={{ fontWeight: 500, fontSize: "16px" }}>
                  Verdict trimestriel — {selectedValise.valiseNumber}
                </div>
                <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                  {selectedValise.pf} · {selectedValise.segment} · {selectedValise.location}
                </div>
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "40px 1fr 120px 1fr",
                padding: "8px 16px",
                background: "#f8fafc",
                borderBottom: "0.5px solid #e2e8f0",
                fontSize: "11px",
                fontWeight: 500,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.04em"
              }}>
                <div>N°</div>
                <div>Outil</div>
                <div style={{ textAlign: "center" }}>Verdict</div>
                <div>Critères NOK</div>
              </div>

              {arraches.map((arrache, i) => (
                <div key={arrache.id} style={{
                  display: "grid",
                  gridTemplateColumns: "40px 1fr 120px 1fr",
                  padding: "12px 16px",
                  borderBottom: i < arraches.length - 1 ? "0.5px solid #f1f5f9" : "none",
                  alignItems: "center"
                }}>
                  <div style={{ fontSize: "14px", color: "#94a3b8" }}>
                    {arrache.positionInValise}
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 500 }}>
                      {arrache.arracheNumber}
                    </div>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                      {arrache.toolDescription}
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <button
                      onClick={() => toggleResult(arrache.id)}
                      style={{
                        padding: "5px 16px",
                        borderRadius: "20px",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 500,
                        fontSize: "13px",
                        background: results[arrache.id]?.result === "OK" ? "#dcfce7" : "#fef2f2",
                        color: results[arrache.id]?.result === "OK" ? "#16a34a" : "#dc2626"
                      }}
                    >
                      {results[arrache.id]?.result || "OK"}
                    </button>
                  </div>
                  <div>
                    {results[arrache.id]?.result === "NOK" && (
                      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                        {[
                          { key: "bavure", label: "① Bavure" },
                          { key: "deformation", label: "② Déformation" },
                          { key: "rupture", label: "③ Rupture" }
                        ].map(({ key, label }) => (
                          <label key={key} style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "13px",
                            cursor: "pointer",
                            color: results[arrache.id]?.nokReasons[key] ? "#dc2626" : "#64748b"
                          }}>
                            <input
                              type="checkbox"
                              checked={results[arrache.id]?.nokReasons[key] || false}
                              onChange={() => toggleReason(arrache.id, key)}
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div style={{
                padding: "1.25rem 1.5rem",
                borderTop: "0.5px solid #e2e8f0",
                display: "flex",
                justifyContent: "flex-end"
              }}>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    background: submitting ? "#94a3b8" : "#1a3a5c",
                    color: "white",
                    border: "none",
                    padding: "10px 28px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: submitting ? "not-allowed" : "pointer"
                  }}
                >
                  {submitting ? "Envoi..." : "Soumettre le verdict"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}