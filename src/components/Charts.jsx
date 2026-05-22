import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  ResponsiveContainer
} from "recharts"

// ─── Brand palette ───
const COLORS = {
  primary:   "#1a3a5c",
  ok:        "#16a34a",
  med:       "#ca8a04",
  high:      "#d97706",
  critical:  "#dc2626",
  bavure:    "#0369a1",
  deform:    "#d97706",
  rupture:   "#dc2626",
  grid:      "#e2e8f0",
  axis:      "#64748b"
}

// ─── Reusable card wrapper ───
function ChartCard({ title, subtitle, children, height = 260 }) {
  return (
    <div style={{
      background: "white",
      borderRadius: "12px",
      border: "0.5px solid #e2e8f0",
      padding: "1.25rem 1.5rem"
    }}>
      <div style={{ marginBottom: "0.75rem" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 500, color: "#1e293b", margin: 0 }}>
          {title}
        </h3>
        {subtitle && (
          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
            {subtitle}
          </div>
        )}
      </div>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  1) ADMIN — Distribution des scores de risque
// ═══════════════════════════════════════════════════════════════
export function RiskDistributionChart({ arraches }) {
  const buckets = [
    { name: "Faible",   min: 0,  max: 40,  color: COLORS.ok },
    { name: "Moyen",    min: 40, max: 60,  color: COLORS.med },
    { name: "Élevé",    min: 60, max: 80,  color: COLORS.high },
    { name: "Critique", min: 80, max: 101, color: COLORS.critical }
  ]
  const data = buckets.map(b => ({
    name: b.name,
    count: arraches.filter(a => {
      if (a.status === "NON_CONFORME") return b.name === "Critique"
      const s = a.riskScore || 0
      return s >= b.min && s < b.max
    }).length,
    fill: b.color
  }))

  return (
    <ChartCard
      title="Distribution des scores de risque"
      subtitle="Répartition de la flotte par niveau de risque"
    >
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: COLORS.axis, fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fill: COLORS.axis, fontSize: 12 }} />
        <Tooltip cursor={{ fill: "#f8fafc" }} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Bar>
      </BarChart>
    </ChartCard>
  )
}

// ═══════════════════════════════════════════════════════════════
//  2) ADMIN — Top 5 arraches à risque élevé
// ═══════════════════════════════════════════════════════════════
export function TopRiskArrachesChart({ arraches }) {
  const data = [...arraches]
    .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
    .slice(0, 5)
    .map(a => ({
      name: a.arracheNumber,
      score: Math.round(a.riskScore || 0),
      fill: (a.riskScore || 0) > 80 || a.status === "NON_CONFORME"
        ? COLORS.critical
        : (a.riskScore || 0) > 60 ? COLORS.high
        : (a.riskScore || 0) > 40 ? COLORS.med
        : COLORS.ok
    }))
    .reverse()

  return (
    <ChartCard
      title="Top 5 des arraches à risque élevé"
      subtitle="Priorités d'attention — triées par score de risque"
    >
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fill: COLORS.axis, fontSize: 12 }} />
        <YAxis type="category" dataKey="name" width={80} tick={{ fill: COLORS.axis, fontSize: 12 }} />
        <Tooltip cursor={{ fill: "#f8fafc" }} />
        <Bar dataKey="score" radius={[0, 6, 6, 0]} label={{ position: "right", fill: COLORS.axis, fontSize: 11 }}>
          {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Bar>
      </BarChart>
    </ChartCard>
  )
}

// ═══════════════════════════════════════════════════════════════
//  3) ADMIN — Nombre de NOK par valise
// ═══════════════════════════════════════════════════════════════
export function NokByValiseChart({ sheets, valises }) {
  const map = new Map()
  sheets.forEach(s => {
    let count = 0
    s.weeklyChecks?.forEach(wc => count += (wc.results || []).filter(r => r.result === "NOK").length)
    s.monthlyChecks?.forEach(mc => count += (mc.results || []).filter(r => r.result === "NOK").length)
    if (s.quarterlyVerdict?.results) {
      count += s.quarterlyVerdict.results.filter(r => r.result === "NOK").length
    }
    map.set(s.valiseId, (map.get(s.valiseId) || 0) + count)
  })

  const data = valises
    .map(v => ({ name: v.valiseNumber, count: map.get(v.id) || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return (
    <ChartCard
      title="Nombre de NOK par valise"
      subtitle="Tous types de contrôles confondus, trimestre courant — top 10"
    >
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: COLORS.axis, fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fill: COLORS.axis, fontSize: 12 }} />
        <Tooltip cursor={{ fill: "#f8fafc" }} />
        <Bar dataKey="count" fill={COLORS.primary} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartCard>
  )
}

// ═══════════════════════════════════════════════════════════════
//  4) LAB — Tendance NOK sur le trimestre
// ═══════════════════════════════════════════════════════════════
export function NokTrendChart({ sheets }) {
  const byWeek = new Map()
  sheets.forEach(s => {
    s.weeklyChecks?.forEach(wc => {
      const entry = byWeek.get(wc.weekNumber) || { nok: 0, ok: 0 }
      wc.results?.forEach(r => {
        if (r.result === "NOK") entry.nok++
        else if (r.result === "OK") entry.ok++
      })
      byWeek.set(wc.weekNumber, entry)
    })
  })

  const data = Array.from(byWeek.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([week, v]) => ({ week: `S${week}`, NOK: v.nok, OK: v.ok }))

  if (data.length === 0) {
    return (
      <ChartCard title="Tendance NOK — trimestre courant" subtitle="Nombre hebdomadaire de défauts à l'échelle du site">
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: "100%", color: "#94a3b8", fontSize: "13px"
        }}>
          Aucun contrôle hebdomadaire enregistré ce trimestre.
        </div>
      </ChartCard>
    )
  }

  return (
    <ChartCard
      title="Tendance NOK — trimestre courant"
      subtitle="Nombre hebdomadaire de résultats OK vs NOK à l'échelle du site"
      height={280}
    >
      <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
        <XAxis dataKey="week" tick={{ fill: COLORS.axis, fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fill: COLORS.axis, fontSize: 12 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="NOK" stroke={COLORS.critical} strokeWidth={2} dot={{ r: 4 }} />
        <Line type="monotone" dataKey="OK"  stroke={COLORS.ok}       strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ChartCard>
  )
}

// ═══════════════════════════════════════════════════════════════
//  5) QM AGENT — Répartition des critères NOK
// ═══════════════════════════════════════════════════════════════
export function NokCriteriaPieChart({ sheets }) {
  let bavure = 0, deformation = 0, rupture = 0

  const sweep = (results) => {
    results?.forEach(r => {
      if (r.result !== "NOK" || !r.nokReasons) return
      if (r.nokReasons.bavure)      bavure++
      if (r.nokReasons.deformation) deformation++
      if (r.nokReasons.rupture)     rupture++
    })
  }

  sheets.forEach(s => {
    s.weeklyChecks?.forEach(wc => sweep(wc.results))
    s.monthlyChecks?.forEach(mc => sweep(mc.results))
    if (s.quarterlyVerdict) sweep(s.quarterlyVerdict.results)
  })

  const total = bavure + deformation + rupture
  const data = [
    { name: "Bavure",      value: bavure,      fill: COLORS.bavure },
    { name: "Déformation", value: deformation, fill: COLORS.deform },
    { name: "Rupture",     value: rupture,     fill: COLORS.rupture }
  ].filter(d => d.value > 0)

  if (total === 0) {
    return (
      <ChartCard title="Répartition des critères NOK" subtitle="Distribution des types de défauts — trimestre courant">
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: "100%", color: "#94a3b8", fontSize: "13px"
        }}>
          Aucun résultat NOK enregistré ce trimestre.
        </div>
      </ChartCard>
    )
  }

  return (
    <ChartCard
      title="Répartition des critères NOK"
      subtitle={`Distribution des types de défauts — ${total} occurrences NOK ce trimestre`}
    >
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%" cy="50%"
          outerRadius={90}
          innerRadius={50}
          label={(entry) => `${entry.name}: ${entry.value}`}
          labelLine={false}
        >
          {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ChartCard>
  )
}

// ═══════════════════════════════════════════════════════════════
//  6) RÉPARATEUR — Historique récent des contrôles
// ═══════════════════════════════════════════════════════════════
export function MyValiseSparkline({ sheet }) {
  const data = (sheet?.weeklyChecks || [])
    .slice(-8)
    .map(wc => ({
      week: `S${wc.weekNumber}`,
      NOK: (wc.results || []).filter(r => r.result === "NOK").length
    }))

  if (data.length === 0) {
    return (
      <ChartCard
        title="Vos contrôles récents"
        subtitle="Nombre de NOK hebdomadaires — 8 dernières semaines"
        height={140}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: "100%", color: "#94a3b8", fontSize: "13px"
        }}>
          Aucun contrôle hebdomadaire soumis — votre historique apparaîtra ici.
        </div>
      </ChartCard>
    )
  }

  return (
    <ChartCard
      title="Vos contrôles récents"
      subtitle="Nombre de NOK hebdomadaires — 8 dernières semaines"
      height={140}
    >
      <LineChart data={data} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
        <XAxis dataKey="week" tick={{ fill: COLORS.axis, fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fill: COLORS.axis, fontSize: 11 }} hide />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="NOK"
          stroke={COLORS.critical}
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ChartCard>
  )
}