import fs from 'fs'
import path from 'path'

export class Logger {
  constructor(moduleLabel) {
    const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15)
    this.dir = path.join(process.cwd(), 'logs')
    this.file = path.join(this.dir, `journey-log-${moduleLabel}-${ts}.ndjson`)
    fs.mkdirSync(this.dir, { recursive: true })
    fs.writeFileSync(this.file, '', 'utf8')
  }
  line(obj) { this._append({ ts: new Date().toISOString(), ...obj }) }
  info(msg, extra={}) { this._append({ level:'info', msg, ...extra }) }
  warn(msg, extra={}) { this._append({ level:'warn', msg, ...extra }) }
  error(msg, extra={}) { this._append({ level:'error', msg, ...extra }) }
  _append(obj) { fs.appendFileSync(this.file, JSON.stringify(obj) + '\n', 'utf8') }
}
