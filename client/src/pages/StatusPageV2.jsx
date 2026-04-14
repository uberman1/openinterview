// StatusPageV2 — Cal.com-style public status page.
// Standalone: no sidebar, no auth dependency.
// Data from useStatusData hook (same endpoints as StatusPage).
import React from 'react'
import { useStatusData } from '../features/status/useStatusData'

// ─── Color constants ──────────────────────────────────────────────────────────

const BAR_COLOR = {
  operational:    '#4ade80',
  degraded:       '#fb923c',
  outage:         '#f87171',
  partial_outage: '#f87171',
  no_data:        '#e5e7eb',
}

const BANNER = {
  operational:    { bg: '#f0fdf4', border: '#bbf7d0', iconColor: '#16a34a', text: '#15803d', label: 'All Systems Operational' },
  degraded:       { bg: '#fffbeb', border: '#fde68a', iconColor: '#d97706', text: '#92400e', label: 'Degraded Performance' },
  partial_outage: { bg: '#fef2f2', border: '#fecaca', iconColor: '#dc2626', text: '#991b1b', label: 'Partial Outage' },
  outage:         { bg: '#fef2f2', border: '#fecaca', iconColor: '#dc2626', text: '#991b1b', label: 'Major Outage' },
}

const STAGE_DOT = {
  Resolved:      '#4ade80',
  Monitoring:    '#60a5fa',
  Identified:    '#fb923c',
  Investigating: '#f87171',
}

const STAGE_COLOR = {
  Resolved:      '#16a34a',
  Monitoring:    '#2563eb',
  Identified:    '#d97706',
  Investigating: '#dc2626',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBannerTs(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    })
  } catch { return iso }
}

function fmtEventTs(raw) {
  if (!raw) return ''
  // If it's already a formatted string (not ISO), return as-is
  if (!/^\d{4}-\d{2}-\d{2}T/.test(raw)) return raw
  try {
    const d = new Date(raw)
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    })
  } catch { return raw }
}

function fmtGroupDate(isoOrStr) {
  if (!isoOrStr) return ''
  const d = /^\d{4}-\d{2}-\d{2}T/.test(isoOrStr) ? new Date(isoOrStr) : new Date(isoOrStr)
  if (isNaN(d)) return isoOrStr
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function relativeDay(isoOrStr) {
  if (!isoOrStr) return ''
  const d = /^\d{4}-\d{2}-\d{2}T/.test(isoOrStr) ? new Date(isoOrStr) : new Date(isoOrStr)
  if (isNaN(d)) return ''
  const days = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return `${months} month${months === 1 ? '' : 's'} ago`
}

/**
 * Group flat event array into incident groups.
 * Groups by normalized title + calendar date (UTC day).
 * Returns groups sorted newest-first; within each group entries are newest-first.
 */
function groupEvents(events) {
  if (!events || events.length === 0) return []

  const map = new Map()

  for (const evt of events) {
    const rawTs = evt.event_timestamp ?? evt.timestamp ?? ''
    // Derive a date key (YYYY-MM-DD or first 10 chars if ISO)
    let dateKey = ''
    if (/^\d{4}-\d{2}-\d{2}T/.test(rawTs)) {
      dateKey = rawTs.slice(0, 10)
    } else if (rawTs) {
      // Try parsing formatted strings like "Apr 6, 2024, 08:22 AM EST"
      const parsed = new Date(rawTs)
      dateKey = isNaN(parsed) ? rawTs.slice(0, 10) : parsed.toISOString().slice(0, 10)
    } else {
      dateKey = 'unknown'
    }

    const titleKey = (evt.title ?? '').toLowerCase().trim()
    const groupKey = `${titleKey}||${dateKey}`

    if (!map.has(groupKey)) {
      map.set(groupKey, {
        key: groupKey,
        title: evt.title ?? 'Untitled Incident',
        dateKey,
        dateLabel: rawTs,
        services: evt.services ?? [],
        entries: [],
      })
    }

    const group = map.get(groupKey)
    group.entries.push({ ...evt, _rawTs: rawTs })

    // Expand services list
    const svcArr = Array.isArray(evt.services) ? evt.services : []
    for (const svc of svcArr) {
      if (!group.services.includes(svc)) group.services.push(svc)
    }
  }

  // Sort entries within each group newest-first
  for (const g of map.values()) {
    g.entries.sort((a, b) => {
      const ta = a.event_timestamp ?? a.timestamp ?? ''
      const tb = b.event_timestamp ?? b.timestamp ?? ''
      return tb.localeCompare(ta)
    })
  }

  // Sort groups newest-first
  return [...map.values()].sort((a, b) => b.dateKey.localeCompare(a.dateKey))
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skel({ h = 14, w = '100%', r = 6 }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: r,
      background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
      flexShrink: 0,
    }} />
  )
}

// ─── Uptime bars ──────────────────────────────────────────────────────────────

function UptimeMeter({ bars }) {
  if (!bars) {
    return (
      <div style={{ display: 'flex', gap: 2, height: 32, alignItems: 'flex-end' }}>
        {Array.from({ length: 45 }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 32, borderRadius: 3,
            backgroundColor: '#e5e7eb',
          }} />
        ))}
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', gap: 2, height: 32, alignItems: 'flex-end' }}>
      {bars.map((bar, i) => (
        <div
          key={bar.date || i}
          title={`${bar.date ?? ''}: ${(bar.status ?? 'no_data').replace(/_/g, ' ')}`}
          style={{
            flex: 1,
            height: 32,
            borderRadius: 3,
            backgroundColor: BAR_COLOR[bar.status] ?? '#e5e7eb',
            cursor: 'default',
            transition: 'transform 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scaleY(1.18)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scaleY(1)' }}
        />
      ))}
    </div>
  )
}

function UptimeRow({ name, uptime, bars }) {
  const pct = uptime != null ? `${Number(uptime).toFixed(2)}%` : null
  const allOk = pct === '100.00%'

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Label row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{name}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {pct ? (
            <span style={{ fontSize: 14, fontWeight: 700, color: '#16a34a' }}>{pct}</span>
          ) : (
            <Skel h={14} w={50} />
          )}
          {allOk && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="8" fill="#4ade80" opacity="0.25"/>
              <path d="M5 8.5l2 2 4-4" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      </div>

      {/* Bars */}
      <UptimeMeter bars={bars} />

      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        <span style={{ fontSize: 11, color: '#9ca3af', letterSpacing: '0.04em' }}>45 days ago</span>
        <span style={{ fontSize: 11, color: '#9ca3af', letterSpacing: '0.04em' }}>today</span>
      </div>
    </div>
  )
}

// ─── Incident group ───────────────────────────────────────────────────────────

function IncidentGroup({ group }) {
  const services = Array.isArray(group.services) ? group.services : []
  const dateLabel = fmtGroupDate(group.dateLabel)
  const rel = relativeDay(group.dateLabel)

  return (
    <div style={{ display: 'flex', gap: 32, marginBottom: 40 }}>
      {/* Left: date column */}
      <div style={{ width: 110, flexShrink: 0, paddingTop: 2 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{dateLabel}</div>
        {rel && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{rel}</div>}
      </div>

      {/* Right: incident block */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title */}
        <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 8, lineHeight: 1.4 }}>
          {group.title}
        </div>

        {/* Service badges */}
        {services.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {services.map(svc => (
              <span key={svc} style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0',
                letterSpacing: '0.02em',
              }}>
                {svc}
              </span>
            ))}
          </div>
        )}

        {/* Timeline entries */}
        <div style={{ position: 'relative', paddingLeft: 20 }}>
          {/* Vertical ledger line */}
          {group.entries.length > 1 && (
            <div style={{
              position: 'absolute', left: 5, top: 10, bottom: 10,
              width: 1, backgroundColor: '#e5e7eb',
            }} />
          )}

          {group.entries.map((entry, idx) => {
            const stage = entry.stage ?? 'Resolved'
            const dotColor = STAGE_DOT[stage] ?? '#9ca3af'
            const stageColor = STAGE_COLOR[stage] ?? '#374151'
            const ts = fmtEventTs(entry.event_timestamp ?? entry.timestamp ?? '')

            return (
              <div key={entry.id ?? idx} style={{ position: 'relative', marginBottom: idx < group.entries.length - 1 ? 20 : 0 }}>
                {/* Timeline dot */}
                <div style={{
                  position: 'absolute', left: -15, top: 5,
                  width: 10, height: 10, borderRadius: '50%',
                  backgroundColor: dotColor,
                  border: '2px solid #fff',
                  boxShadow: '0 0 0 1px ' + dotColor,
                }} />

                {/* Stage + timestamp */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: stageColor }}>{stage}</span>
                  {ts && (
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>· {ts}</span>
                  )}
                </div>

                {/* Body */}
                {entry.body && (
                  <p style={{ margin: 0, fontSize: 13, color: '#4b5563', lineHeight: 1.65, paddingLeft: 0 }}>
                    {entry.body}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div>
      <Skel h={72} r={10} />
      <div style={{ marginTop: 32 }}>
        {['App', 'Website', 'API'].map(name => (
          <div key={name} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Skel h={15} w={60} />
              <Skel h={15} w={44} />
            </div>
            <Skel h={32} r={3} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
              <Skel h={10} w={60} />
              <Skel h={10} w={30} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StatusPageV2() {
  const { snapshot, histories, events, loading, error, lastRefreshedAt, refreshing } = useStatusData()

  const svcMap = React.useMemo(() => {
    if (!snapshot?.services) return {}
    return Object.fromEntries(snapshot.services.map(s => [s.name, s]))
  }, [snapshot])

  const indicator = snapshot?.overallStatus?.indicator ?? 'operational'
  const banner    = BANNER[indicator] ?? BANNER.operational
  const bannerLabel = snapshot?.overallStatus?.label ?? banner.label
  const checkedAt = lastRefreshedAt ? fmtBannerTs(lastRefreshedAt) : null

  const groups = React.useMemo(() => groupEvents(events), [events])

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Page content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            OpenInterview.me
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
            See the uptime of OpenInterview.me
          </p>
        </div>

        {/* ── Error state ── */}
        {error ? (
          <div style={{
            padding: '20px 24px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 10,
            fontSize: 14, color: '#991b1b',
            marginBottom: 32,
          }}>
            Unable to load status data. The service may be temporarily unreachable.
          </div>
        ) : loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* ── Banner ── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: banner.bg,
              border: `1px solid ${banner.border}`,
              borderRadius: 10,
              padding: '16px 20px',
              marginBottom: 40,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Animated green dot or colored check */}
                <div style={{ position: 'relative', width: 20, height: 20, flexShrink: 0 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    backgroundColor: banner.iconColor,
                    opacity: 0.2,
                    position: 'absolute',
                  }} />
                  <svg
                    width="20" height="20" viewBox="0 0 20 20" fill="none"
                    style={{ position: 'absolute', top: 0, left: 0 }}
                  >
                    <path
                      d="M6 10.5l3 3 5-5"
                      stroke={banner.iconColor}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span style={{ fontSize: 16, fontWeight: 700, color: banner.text }}>
                  {bannerLabel}
                </span>
              </div>

              {checkedAt && (
                <span style={{ fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap', marginLeft: 16, flexShrink: 0 }}>
                  {refreshing ? 'Refreshing…' : checkedAt}
                </span>
              )}
            </div>

            {/* ── Uptime meters ── */}
            <div style={{ marginBottom: 56 }}>
              {['App', 'Website', 'API'].map(name => (
                <UptimeRow
                  key={name}
                  name={name}
                  uptime={svcMap[name]?.uptimePercent ?? null}
                  bars={histories[name]}
                />
              ))}
            </div>

            {/* ── Divider ── */}
            <div style={{ borderTop: '1px solid #f3f4f6', marginBottom: 40 }} />

            {/* ── Incident history ── */}
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: '0 0 28px', letterSpacing: '-0.01em' }}>
                Past Incidents
              </h2>

              {groups.length > 0 ? (
                groups.map(g => <IncidentGroup key={g.key} group={g} />)
              ) : (
                <div style={{
                  padding: '32px 0',
                  fontSize: 14, color: '#9ca3af',
                }}>
                  No incidents reported.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
