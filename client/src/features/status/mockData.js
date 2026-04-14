// Isolated mock data for the OpenInterview status page feature.
// No external dependencies, no DB reads, no Supabase connections.
// Replace these exports in a later prompt to wire real monitoring results.

function seededRandom(seed) {
  let s = seed >>> 0
  return () => {
    s = Math.imul(s ^ (s >>> 15), s | 1)
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61)
    return ((s ^ (s >>> 14)) >>> 0) / 0xffffffff
  }
}

function generateDays(seed, degradedChance = 0.07, outageChance = 0.015) {
  const rng = seededRandom(seed)
  return Array.from({ length: 45 }, () => {
    const r = rng()
    if (r < outageChance) return { status: 'outage' }
    if (r < outageChance + degradedChance) return { status: 'degraded' }
    return { status: 'operational' }
  })
}

export const overallStatus = {
  label: 'All Systems Operational',
  indicator: 'operational', // 'operational' | 'degraded' | 'outage'
}

export const services = [
  {
    name: 'App',
    uptime: '99.97%',
    days: generateDays(0xA3F1),
  },
  {
    name: 'Website',
    uptime: '100.00%',
    days: generateDays(0x7C2B, 0.04, 0.00),
  },
  {
    name: 'API',
    uptime: '99.91%',
    days: generateDays(0xD94E, 0.09, 0.02),
  },
]

export const events = [
  {
    id: 1,
    title: 'API Response Validation',
    services: ['API'],
    stage: 'Resolved',
    timestamp: 'Apr 14, 2026 — 08:14 UTC',
    body: 'API health verification completed — response confirmed in 191ms. All endpoints responding within expected thresholds. No further action required.',
  },
  {
    id: 2,
    title: 'Application Availability Test',
    services: ['App'],
    stage: 'Resolved',
    timestamp: 'Apr 13, 2026 — 14:52 UTC',
    body: 'Availability test executed — application responded in 284ms. Session handling confirmed stable. Service operating within normal parameters.',
  },
  {
    id: 3,
    title: 'Elevated API Latency',
    services: ['API', 'App'],
    stage: 'Resolved',
    timestamp: 'Apr 11, 2026 — 09:30 UTC',
    body: 'Elevated response times observed on API endpoints. Root cause identified as increased query load on upstream service. Traffic normalized after 22 minutes. Monitoring confirmed recovery.',
  },
  {
    id: 4,
    title: 'Infrastructure Review',
    services: ['App', 'Website', 'API'],
    stage: 'Resolved',
    timestamp: 'Apr 08, 2026 — 03:00 UTC',
    body: 'Maintenance window completed. Application, website, and API services verified operational post-review. All health checks passed.',
  },
  {
    id: 5,
    title: 'Website Connectivity Check',
    services: ['Website'],
    stage: 'Resolved',
    timestamp: 'Apr 05, 2026 — 11:17 UTC',
    body: 'Website availability verification completed — response latency within normal range. Static asset delivery confirmed. No degradation detected.',
  },
  {
    id: 6,
    title: 'Application Services Confirmation',
    services: ['App', 'API'],
    stage: 'Resolved',
    timestamp: 'Mar 31, 2026 — 07:45 UTC',
    body: 'Application services operating within expected thresholds. Monitoring confirms API response stability. All upstream dependencies reachable.',
  },
]
