import { chromium } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { Logger } from '../utils/logger.js'

dotenv.config()

const MODULE = (process.env.MODULE || process.argv[2] || 'module0').toLowerCase()
const BASE_URL = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/$/, '')
const BASE_PATH = (process.env.BASE_PATH || '/').replace(/\/$/, '')
const APP = BASE_URL + (BASE_PATH === '' ? '' : BASE_PATH)

function readModuleConfig(modLabel) {
  const loc = path.join(process.cwd(), 'tests', `${modLabel}.json`)
  if (!fs.existsSync(loc)) throw new Error(`Missing config: ${loc}`)
  return JSON.parse(fs.readFileSync(loc, 'utf8'))
}

function urlFor(p, demo=false) {
  const u = new URL(APP + p)
  if (demo) u.searchParams.set('demo','1')
  return u.toString()
}

async function attachListeners(page, moduleLabel) {
  const logger = page.__logger
  page.on('console', (msg) => {
    const type = msg.type()
    if (type === 'error' || type === 'warning') {
      logger.line({ level: type === 'error' ? 'error' : 'warn', kind: 'console', module: moduleLabel, text: msg.text() })
    }
  })
  page.on('pageerror', (err) => {
    logger.error('pageerror', { module: moduleLabel, error: String(err) })
  })
  page.on('requestfailed', (req) => {
    logger.error('requestfailed', { module: moduleLabel, url: req.url(), method: req.method(), failure: req.failure()?.errorText })
  })
  page.on('response', async (res) => {
    try {
      if (res.status() >= 400) {
        logger.error('http_error', { module: moduleLabel, url: res.url(), status: res.status() })
      }
    } catch {}
  })
}

async function visitAndRecord(page, moduleLabel, pathStr, { demo=false, label }) {
  const target = urlFor(pathStr, demo)
  const journey = `${label}:${pathStr}${demo ? '?demo=1' : ''}`
  const logger = page.__logger
  logger.info('navigate', { module: moduleLabel, journey, target })
  const resp = await page.goto(target, { waitUntil: 'domcontentloaded' })
  const status = resp ? resp.status() : 'no_response'
  logger.info('navigated', { module: moduleLabel, journey, status })

  try {
    const bodyText = await page.textContent('body')
    if (!bodyText || bodyText.trim().length === 0) logger.warn('empty_body', { module: moduleLabel, journey })
  } catch (e) {
    logger.error('read_body_failed', { module: moduleLabel, journey, error: String(e) })
  }

  const safePath = (pathStr && pathStr.replace(/\//g, '_')) || '_root_'
  const dir = path.join('artifacts', 'screenshots', moduleLabel)
  fs.mkdirSync(dir, { recursive: true })
  await page.screenshot({ path: path.join(dir, `${label}${demo ? '_demo' : ''}${safePath}.png`), fullPage: true })
}

async function runSingleModule(moduleLabel) {
  const cfg = readModuleConfig(moduleLabel)
  const logger = new Logger(moduleLabel)

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  page.__logger = logger

  await attachListeners(page, moduleLabel)

  for (const p of (cfg.public || [])) {
    await visitAndRecord(page, moduleLabel, p, { label: 'public', demo: false })
  }
  for (const p of (cfg.protected || [])) {
    await visitAndRecord(page, moduleLabel, p, { label: 'protected', demo: false })
    await visitAndRecord(page, moduleLabel, p, { label: 'protected', demo: true })
  }
  for (const p of (cfg.admin || [])) {
    await visitAndRecord(page, moduleLabel, p, { label: 'admin', demo: false })
    await visitAndRecord(page, moduleLabel, p, { label: 'admin', demo: true })
  }

  await browser.close()
  logger.info('suite_complete', { module: moduleLabel, base: APP })
}

async function runAll() {
  const files = fs.readdirSync(path.join(process.cwd(), 'tests')).filter(f => f.startsWith('module') && f.endsWith('.json'))
  files.sort((a, b) => {
    const an = parseInt(a.replace(/\D/g,''), 10)
    const bn = parseInt(b.replace(/\D/g,''), 10)
    return an - bn
  })
  for (const f of files) {
    const moduleLabel = f.replace('.json','')
    console.log('Running', moduleLabel)
    await runSingleModule(moduleLabel)
  }
}

if (MODULE === 'all' || MODULE === 'ALL') {
  runAll().catch(err => { console.error(err); process.exitCode = 1 })
} else {
  runSingleModule(MODULE).catch(err => { console.error(err); process.exitCode = 1 })
}
