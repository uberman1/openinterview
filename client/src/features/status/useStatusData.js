// client/src/features/status/useStatusData.js
// Feature-local data hook for the status page.
// Uses plain fetch — no shared api.js coupling, no auth headers required.
// All state is isolated to this feature.
//
// Polling: after first successful load, data refreshes every POLL_INTERVAL_MS.
// Background refreshes keep the previously loaded data visible — no skeleton flash.

import { useState, useEffect, useRef } from 'react'

const STATUS_BASE      = '/api/v1/status'
const POLL_INTERVAL_MS = 180_000  // 3 minutes

// ─── Fetch helper ─────────────────────────────────────────────────────────────

async function statusFetch(path) {
  const res = await fetch(STATUS_BASE + path)
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${path}`)
  return res.json()
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a full 45-entry bars array ordered oldest→today.
 * Days not present in the DB result are filled with { status: 'no_data' }.
 */
function fillBars(bars = [], days = 45) {
  const byDate = {}
  for (const bar of bars) byDate[bar.date] = bar

  const result = []
  for (let offset = days - 1; offset >= 0; offset--) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - offset)
    const dateStr = d.toISOString().slice(0, 10)
    result.push(byDate[dateStr] ?? { date: dateStr, status: 'no_data' })
  }
  return result
}

/**
 * Normalize an event from either source into a consistent display shape.
 *
 * DB events:       { id, stage, title, body, services, event_timestamp (ISO) }
 * Snapshot events: { id, stage, title, body, services, timestamp (formatted string) }
 */
function normalizeEvent(evt) {
  const raw = evt.event_timestamp ?? evt.timestamp ?? ''
  let displayTs = raw

  if (raw && /^\d{4}-\d{2}-\d{2}T/.test(raw)) {
    try {
      displayTs = new Date(raw).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
      })
    } catch {
      displayTs = raw
    }
  }

  return { ...evt, timestamp: displayTs }
}

// ─── Core fetch logic (shared by initial load and background refresh) ─────────

/**
 * Fetch snapshot + histories + events.
 *
 * @param {object|null} prev - previously loaded data, used as fallback for partial failures
 * @returns {{ snapshot, histories, events }} on success
 * @throws if snapshot fetch fails
 */
async function fetchAll(prev) {
  // Snapshot is required — throw on failure so callers can decide what to do
  const snapshot = await statusFetch('/snapshot')

  const [appRes, websiteRes, apiRes, eventsRes] = await Promise.allSettled([
    statusFetch('/history?service=App&days=45'),
    statusFetch('/history?service=Website&days=45'),
    statusFetch('/history?service=API&days=45'),
    statusFetch('/events?limit=20'),
  ])

  // Per-service history: use fresh data, fall back to previously loaded bars on failure
  const histories = {
    App:     appRes.status     === 'fulfilled' ? fillBars(appRes.value.bars)     : (prev?.histories?.App     ?? null),
    Website: websiteRes.status === 'fulfilled' ? fillBars(websiteRes.value.bars) : (prev?.histories?.Website ?? null),
    API:     apiRes.status     === 'fulfilled' ? fillBars(apiRes.value.bars)     : (prev?.histories?.API     ?? null),
  }

  // Events: prefer DB events → snapshot.events fallback → previous events fallback
  const rawEvents =
    eventsRes.status === 'fulfilled'
      ? eventsRes.value.events
      : (snapshot.events ?? prev?.events ?? [])
  const events = rawEvents.map(normalizeEvent)

  return { snapshot, histories, events }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Load and poll all data needed by the status page.
 *
 * Returns:
 * {
 *   snapshot:       object | null,
 *   histories:      { App: bar[], Website: bar[], API: bar[] },
 *   events:         event[] | null,
 *   loading:        boolean,   — true only during the initial fetch (no prior data)
 *   refreshing:     boolean,   — true during background polls (prior data still shown)
 *   error:          string | null,  — set only if initial load fails with no prior data
 *   lastRefreshedAt: string | null, — generatedAt from last successful snapshot
 * }
 *
 * Failure modes:
 *   Initial load:
 *     snapshot fails → error set, skeleton/unavailable shown
 *   Background refresh:
 *     snapshot fails → keep previous data, set no error (silent fail)
 *     individual history fails → keep previous bars for that service
 *     events fails → fall back to snapshot.events or previous events
 */
export function useStatusData() {
  const [state, setState] = useState({
    snapshot:        null,
    histories:       { App: null, Website: null, API: null },
    events:          null,
    loading:         true,   // skeleton shown only on first load
    refreshing:      false,  // silent background state
    error:           null,
    lastRefreshedAt: null,
  })

  // Ref holds latest state so the interval callback always sees current data
  // without needing to be recreated on every render
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])

  useEffect(() => {
    let cancelled = false
    let intervalId = null

    // ── Initial load ──────────────────────────────────────────────────────────
    async function initialLoad() {
      try {
        const { snapshot, histories, events } = await fetchAll(null)
        if (cancelled) return
        setState({
          snapshot, histories, events,
          loading: false, refreshing: false, error: null,
          lastRefreshedAt: snapshot.generatedAt ?? null,
        })
      } catch (err) {
        if (cancelled) return
        setState((s) => ({ ...s, loading: false, error: err.message }))
        return  // do not start polling if initial load failed completely
      }

      // Start polling only after a successful initial load
      intervalId = setInterval(backgroundRefresh, POLL_INTERVAL_MS)
    }

    // ── Background refresh — never blanks the page ────────────────────────────
    async function backgroundRefresh() {
      if (cancelled) return

      setState((s) => ({ ...s, refreshing: true }))

      try {
        const prev = stateRef.current
        const { snapshot, histories, events } = await fetchAll(prev)
        if (cancelled) return
        setState({
          snapshot, histories, events,
          loading: false, refreshing: false, error: null,
          lastRefreshedAt: snapshot.generatedAt ?? null,
        })
      } catch {
        // Snapshot failed during background refresh — keep all prior data, clear refreshing flag
        if (cancelled) return
        setState((s) => ({ ...s, refreshing: false }))
      }
    }

    initialLoad()

    return () => {
      cancelled = true
      if (intervalId !== null) clearInterval(intervalId)
    }
  }, [])  // runs once on mount; cleanup on unmount

  return state
}
