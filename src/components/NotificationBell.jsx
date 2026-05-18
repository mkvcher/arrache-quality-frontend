import { useState, useEffect, useRef } from "react"
import api from "../services/api"

const TYPE_META = {
  RUPTURE:                 { color: "#dc2626", bg: "#fef2f2", label: "Rupture" },
  QUARTERLY_NOK:           { color: "#d97706", bg: "#fef3c7", label: "Verdict NOK" },
  QUALITY_DECLINE:         { color: "#ca8a04", bg: "#fef9c3", label: "Tendance" },
  OVERDUE_WEEKLY:          { color: "#0369a1", bg: "#dbeafe", label: "En retard" },
  OVERDUE_WEEKLY_CRITICAL: { color: "#dc2626", bg: "#fef2f2", label: "Critique" }
}

const formatTime = (iso) => {
  if (!iso) return ""
  const d = new Date(iso)
  const now = new Date()
  const diffMin = Math.round((now - d) / 60000)
  if (diffMin < 1) return "à l'instant"
  if (diffMin < 60) return `il y a ${diffMin} min`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `il y a ${diffH} h`
  return d.toLocaleDateString()
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifications/me")
      setNotifications(res.data || [])
    } catch (err) {
      console.error("Notifications fetch failed:", err)
    }
  }

  const markRead = async (n) => {
    if (n.read) return  // already read, nothing to do
    // Optimistic update — dim it immediately
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
    try {
      await api.put(`/notifications/${n.id}/read`)
    } catch (err) {
      console.error(err)
      // Roll back on failure
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: false } : x))
    }
  }

  const markAllRead = async () => {
    setLoading(true)
    // Optimistic: dim all immediately
    setNotifications(prev => prev.map(x => ({ ...x, read: true })))
    try {
      await api.put("/notifications/mark-all-read")
    } catch (err) {
      console.error(err)
      fetchNotifications()  // resync from server on error
    } finally {
      setLoading(false)
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Notifications"
        style={{
          background: "rgba(255,255,255,0.15)",
          border: "none",
          width: "36px",
          height: "36px",
          borderRadius: "8px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          color: "white",
          fontSize: "16px"
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: "absolute",
            top: "-4px",
            right: "-4px",
            background: "#dc2626",
            color: "white",
            borderRadius: "999px",
            minWidth: "18px",
            height: "18px",
            padding: "0 5px",
            fontSize: "11px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid #1a3a5c"
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          right: 0,
          width: "380px",
          maxHeight: "500px",
          background: "white",
          borderRadius: "12px",
          border: "0.5px solid #e2e8f0",
          boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
          overflow: "hidden",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column"
        }}>

          {/* Header */}
          <div style={{
            padding: "12px 16px",
            borderBottom: "0.5px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#f8fafc"
          }}>
            <span style={{ fontSize: "14px", fontWeight: 500, color: "#1e293b" }}>
              Notifications
              {unreadCount > 0 && (
                <span style={{ color: "#64748b", fontWeight: 400 }}> · {unreadCount} non lu{unreadCount > 1 ? "s" : ""}</span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={loading}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#1a3a5c",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: loading ? "not-allowed" : "pointer",
                  padding: "2px 6px"
                }}
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflow: "auto", flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: "2rem 1rem",
                textAlign: "center",
                color: "#94a3b8",
                fontSize: "13px"
              }}>
                Aucune notification
              </div>
            ) : (
              notifications.map((n, idx) => {
                const meta = TYPE_META[n.type] || { color: "#64748b", bg: "#f1f5f9", label: n.type }
                const isRead = !!n.read
                return (
                  <div
                    key={n.id}
                    onClick={() => markRead(n)}
                    style={{
                      padding: "12px 16px",
                      borderBottom: idx < notifications.length - 1 ? "0.5px solid #f1f5f9" : "none",
                      cursor: isRead ? "default" : "pointer",
                      transition: "background 0.1s, opacity 0.15s",
                      opacity: isRead ? 0.55 : 1,
                      background: !isRead ? "#fefefe" : "transparent",
                      position: "relative"
                    }}
                    onMouseEnter={e => { if (!isRead) e.currentTarget.style.background = "#f8fafc" }}
                    onMouseLeave={e => { if (!isRead) e.currentTarget.style.background = "#fefefe" }}
                  >
                    {/* Unread dot */}
                    {!isRead && (
                      <span style={{
                        position: "absolute",
                        left: "6px",
                        top: "22px",
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "#dc2626"
                      }} />
                    )}

                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "4px",
                      paddingLeft: !isRead ? "12px" : "0"
                    }}>
                      <span style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "10px",
                        fontWeight: 600,
                        background: meta.bg,
                        color: meta.color,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em"
                      }}>
                        {meta.label}
                      </span>
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                        {formatTime(n.createdAt)}
                      </span>
                    </div>
                    <div style={{
                      fontSize: "13px",
                      color: "#1e293b",
                      lineHeight: "1.4",
                      paddingLeft: !isRead ? "12px" : "0",
                      fontWeight: isRead ? 400 : 500
                    }}>
                      {n.message}
                    </div>
                  </div>
                )
              })
            )}
          </div>

        </div>
      )}
    </div>
  )
}