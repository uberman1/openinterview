import { isDemo, disableDemo } from './demo'

const parse = (v?: string, fallback: string[] = []) =>
  (v ? v.split(',') : fallback).map(s => s.trim()).filter(Boolean)

const defaultAllow = ['localhost', '127.0.0.1', '.repl.co', '.replit.dev']
const defaultBlock = ['.openinterview.me', '.openinterview.com']

const ALLOW = parse(import.meta.env?.VITE_DEMO_ALLOWED_HOSTS, defaultAllow)
const BLOCK = parse(import.meta.env?.VITE_DEMO_BLOCKED_HOSTS, defaultBlock)

const host = typeof window !== 'undefined' ? window.location.hostname : ''

const matches = (list: string[]) => list.some(pattern =>
  pattern.startsWith('.') ? host.endsWith(pattern) : host.includes(pattern)
)

export const isDemoAllowedHere = (): boolean => {
  if (!isDemo()) return true
  if (matches(BLOCK)) return false
  if (ALLOW.length && matches(ALLOW)) return true
  return false
}

export const assertDemoAllowed = (): void => {
  if (!isDemo()) return
  if (!isDemoAllowedHere()) {
    disableDemo()
    try {
      const url = new URL(window.location.href)
      url.searchParams.delete('demo')
      window.history.replaceState({}, '', url.toString())
    } catch {}
    console.warn('[DemoMode] Demo disabled on this host by guardrails.')
  }
}

export const showDemoBanner = (): void => {
  if (typeof document === 'undefined' || !isDemo()) return
  if (document.getElementById('__demo_banner__')) return
  const chip = document.createElement('div')
  chip.id = '__demo_banner__'
  chip.textContent = 'DEMO MODE'
  Object.assign(chip.style, {
    position: 'fixed',
    left: '12px',
    bottom: '12px',
    padding: '6px 10px',
    background: '#f59e0b',
    color: '#111827',
    fontWeight: '700',
    borderRadius: '10px',
    zIndex: '9999',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
  } as CSSStyleDeclaration)
  document.body.appendChild(chip)
}
