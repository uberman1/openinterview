// Standalone OpenInterview status page — live data edition.
// Isolated feature: no dependency on core app state, auth, or DB.
// Data sourced from: /api/v1/status/snapshot, /api/v1/status/history, /api/v1/status/events
import React from 'react'
import { useStatusData } from '../features/status/useStatusData'

// ─── Constants ───────────────────────────────────────────────────────────────

const DAY_COLOR = {
  operational:    '#22c55e',
  degraded:       '#eab308',
  outage:         '#ef4444',
  partial_outage: '#ef4444', // visually same severity as outage
  no_data:        '#e2e8f0', // gray — day not yet tracked
}

const STAGE_STYLE = {
  Investigating: { bg: '#fff7ed', text: '#c2410c' },
  Identified:    { bg: '#fefce8', text: '#a16207' },
  Monitoring:    { bg: '#eff6ff', text: '#1d4ed8' },
  Resolved:      { bg: '#f0fdf4', text: '#15803d' },
}

const BANNER_STYLE = {
  operational:    { bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e', text: '#15803d' },
  degraded:       { bg: '#fefce8', border: '#fde68a', dot: '#eab308', text: '#a16207' },
  partial_outage: { bg: '#fef2f2', border: '#fecaca', dot: '#ef4444', text: '#b91c1c' },
  outage:         { bg: '#fef2f2', border: '#fecaca', dot: '#ef4444', text: '#b91c1c' },
}

function fmtTs(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    })
  } catch { return iso }
}

// ─── Relative time ────────────────────────────────────────────────────────────

function relativeTime(iso) {
  if (!iso) return null
  const diffMs = Date.now() - new Date(iso).getTime()
  if (diffMs < 0)            return 'just now'
  const secs  = Math.floor(diffMs / 1000)
  const mins  = Math.floor(secs  / 60)
  const hours = Math.floor(mins  / 60)
  const days  = Math.floor(hours / 24)
  if (secs  < 60)  return 'just now'
  if (mins  < 60)  return `${mins} minute${mins === 1 ? '' : 's'} ago`
  if (hours < 24)  return `${hours} hour${hours === 1 ? '' : 's'} ago`
  return `${days} day${days === 1 ? '' : 's'} ago`
}

/**
 * Display-only timer hook — ticks once per minute to keep relative label fresh.
 * Does NOT trigger data re-fetches.
 */
function useRelativeTime(iso) {
  const [label, setLabel] = React.useState(() => relativeTime(iso))

  React.useEffect(() => {
    setLabel(relativeTime(iso))
    if (!iso) return
    const id = setInterval(() => setLabel(relativeTime(iso)), 60_000)
    return () => clearInterval(id)
  }, [iso])

  return label
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skel({ h = 14, w = '100%', r = 4 }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: r,
      backgroundColor: '#f1f5f9', flexShrink: 0,
    }} />
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UptimeBar({ bars }) {
  if (!bars) {
    return <Skel h={28} r={2} />
  }
  return (
    <div style={{ display: 'flex', gap: 2, flex: 1 }}>
      {bars.map((bar, i) => (
        <div
          key={bar.date || i}
          title={bar.status.replace(/_/g, ' ')}
          style={{
            flex: 1,
            height: 28,
            borderRadius: 2,
            backgroundColor: DAY_COLOR[bar.status] ?? '#e2e8f0',
            cursor: 'default',
          }}
        />
      ))}
    </div>
  )
}

function ServiceRow({ name, uptime, bars }) {
  return (
    <div style={{ padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
      }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}>{name}</span>
        <span style={{ fontSize: 13, color: '#64748b' }}>
          {uptime != null ? `${uptime.toFixed(2)}% uptime` : <Skel h={13} w={80} />}
        </span>
      </div>
      <UptimeBar bars={bars} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>45 days ago</span>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>today</span>
      </div>
    </div>
  )
}

function EventPost({ event }) {
  const stageStyle = STAGE_STYLE[event.stage] ?? STAGE_STYLE.Resolved
  const services   = Array.isArray(event.services) ? event.services : []
  return (
    <div style={{ padding: '20px 0', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{event.title}</span>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
            backgroundColor: stageStyle.bg, color: stageStyle.text, letterSpacing: '0.02em',
          }}>
            {event.stage}
          </span>
        </div>
        <span style={{
          fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap', marginLeft: 16, flexShrink: 0,
        }}>
          {event.timestamp}
        </span>
      </div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
        Affects: {services.join(', ')}
      </div>
      <p style={{ margin: 0, fontSize: 14, color: '#475569', lineHeight: 1.65 }}>{event.body}</p>
    </div>
  )
}

function EventFeedSkeleton() {
  return (
    <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 28 }}>
      {[1, 2, 3].map((n) => (
        <div key={n} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Skel h={14} w="55%" />
            <Skel h={18} w={72} r={4} />
          </div>
          <Skel h={12} w="35%" />
          <Skel h={12} w="80%" />
          <Skel h={12} w="65%" />
        </div>
      ))}
    </div>
  )
}

function StatusUnavailable() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '60px 24px', textAlign: 'center',
    }}>
      <div style={{
        width: 10, height: 10, borderRadius: '50%',
        backgroundColor: '#94a3b8', marginBottom: 16,
      }} />
      <p style={{ fontSize: 15, fontWeight: 600, color: '#475569', margin: '0 0 8px' }}>
        Status data temporarily unavailable
      </p>
      <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, maxWidth: 320 }}>
        Unable to reach the status service. The application may still be operating normally.
        Refresh to try again.
      </p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const SERVICE_NAMES = ['App', 'Website', 'API']

export default function StatusPage() {
  const { snapshot, histories, events, loading, refreshing, error, lastRefreshedAt } = useStatusData()

  // Build name→service map from snapshot for O(1) lookups
  const svcMap = React.useMemo(() => {
    if (!snapshot?.services) return {}
    return Object.fromEntries(snapshot.services.map((s) => [s.name, s]))
  }, [snapshot])

  const indicator   = snapshot?.overallStatus?.indicator ?? 'operational'
  const bannerStyle = BANNER_STYLE[indicator] ?? BANNER_STYLE.operational
  const checkedAt   = lastRefreshedAt ? fmtTs(lastRefreshedAt) : null
  const relLabel    = useRelativeTime(lastRefreshedAt)

  return (
    <div style={{
      maxWidth: 780, margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    }}>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
          OpenInterview Status
        </h1>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
          System health and service history
        </p>
      </div>

      {/* ── Full-page error fallback ─────────────────────────────────────── */}
      {error ? (
        <StatusUnavailable />
      ) : (
        <>
          {/* ── Overall status banner ──────────────────────────────────── */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            backgroundColor: loading ? '#f8fafc' : bannerStyle.bg,
            border: `1px solid ${loading ? '#e2e8f0' : bannerStyle.border}`,
            borderRadius: 8, padding: '14px 20px', marginBottom: 28,
          }}>
            {loading ? (
              <Skel h={18} w={220} r={6} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  backgroundColor: bannerStyle.dot, flexShrink: 0,
                }} />
                <span style={{ fontSize: 15, fontWeight: 600, color: bannerStyle.text }}>
                  {snapshot.overallStatus.label}
                </span>
              </div>
            )}
            {!loading && checkedAt && (
              <span style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap', marginLeft: 16 }}>
                {refreshing
                  ? 'Refreshing...'
                  : `Last checked: ${checkedAt}${relLabel ? ` · Updated ${relLabel}` : ''}`}
              </span>
            )}
          </div>

          {/* ── Service performance ────────────────────────────────────── */}
          <div style={{
            backgroundColor: '#ffffff', border: '1px solid #e2e8f0',
            borderRadius: 8, padding: '0 24px', marginBottom: 28,
          }}>
            <div style={{ padding: '16px 0 12px', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{
                fontSize: 12, fontWeight: 600, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '0.07em',
              }}>
                Service Performance — Past 45 Days
              </span>
            </div>

            {SERVICE_NAMES.map((name) => (
              <ServiceRow
                key={name}
                name={name}
                uptime={svcMap[name]?.uptimePercent ?? null}
                bars={histories[name]}
              />
            ))}

            {/* Legend */}
            <div style={{ display: 'flex', gap: 18, padding: '12px 0', alignItems: 'center' }}>
              {[
                ['#22c55e', 'Operational'],
                ['#eab308', 'Degraded'],
                ['#ef4444', 'Outage'],
                ['#e2e8f0', 'No data'],
              ].map(([color, label]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Status history / event feed ────────────────────────────── */}
          <div style={{
            backgroundColor: '#ffffff', border: '1px solid #e2e8f0',
            borderRadius: 8, padding: '0 24px', marginBottom: 40,
          }}>
            <div style={{ padding: '16px 0 12px', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{
                fontSize: 12, fontWeight: 600, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '0.07em',
              }}>
                Status History
              </span>
            </div>

            {loading ? (
              <EventFeedSkeleton />
            ) : events?.length > 0 ? (
              events.map((evt) => <EventPost key={evt.id} event={evt} />)
            ) : (
              <p style={{ color: '#94a3b8', fontSize: 14, padding: '20px 0', margin: 0 }}>
                No status history recorded yet.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
