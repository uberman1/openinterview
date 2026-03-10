// /server/auth.real.js
import crypto from 'crypto'

const users = new Map() // email -> { id, email, passwordHash, createdAt }
const tokens = new Map() // token -> userId

function hash(pw){
  return crypto.createHash('sha256').update(String(pw)).digest('hex')
}

export const realAuth = {
  async signup(email, password){
    const em = String(email || '').trim().toLowerCase()
    const pw = String(password || '')
    if (!em || !pw) throw Object.assign(new Error('Email and password are required'), { code: 'BAD_INPUT' })
    if (users.has(em)) throw Object.assign(new Error('User already exists'), { code: 'USER_EXISTS' })
    const id = 'usr_' + crypto.randomBytes(8).toString('hex')
    const user = { id, email: em, passwordHash: hash(pw), createdAt: new Date().toISOString() }
    users.set(em, user)
    return { id: user.id, email: user.email, createdAt: user.createdAt }
  },

  async login(email, password){
    const em = String(email || '').trim().toLowerCase()
    const pw = String(password || '')
    const u = users.get(em)
    if (!u || u.passwordHash !== hash(pw)) throw Object.assign(new Error('Invalid credentials'), { code: 'INVALID_CREDENTIALS' })
    const tok = 'tok_' + crypto.randomBytes(12).toString('hex')
    tokens.set(tok, u.id)
    return { token: tok, user: { id: u.id, email: u.email } }
  },

  async me(token){
    if (!token) return null
    const uid = tokens.get(token)
    if (!uid) return null
    for (const u of users.values()){
      if (u.id === uid) return { id: u.id, email: u.email }
    }
    return null
  },

  async logout(token){
    if (token) tokens.delete(token)
    return { ok: true }
  }
}
