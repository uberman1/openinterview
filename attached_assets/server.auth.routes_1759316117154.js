// /server/auth.routes.js
import express from 'express'
import { mountAuthRoutes as mountMockAuth } from './auth.mock.js'
import { realAuth } from './auth.real.js'

export function mountAuth(app, base){
  const useMock = /^true$/i.test(String(process.env.USE_MOCK_AUTH || ''))
  if (useMock){
    return mountMockAuth(app, base)
  }

  const router = express.Router()

  // Attach user from Authorization header using real adapter
  app.use(async (req, _res, next)=>{
    try{
      const auth = req.headers['authorization'] || ''
      const m = auth.match(/^Bearer\s+(.+)$/i)
      if (m){
        const tok = m[1]
        const u = await realAuth.me(tok)
        if (u) req.user = { ...u, token: tok }
      }
    }catch(_e){} finally { next() }
  })

  router.post('/auth/signup', async (req, res)=>{
    try{
      const { email, password } = req.body || {}
      const u = await realAuth.signup(email, password)
      res.status(201).json({ user: u })
    }catch(e){
      const code = e.code === 'USER_EXISTS' ? 409 : 400
      res.status(code).json({ error: { code: e.code || 'BAD_INPUT', message: e.message || 'Invalid input' } })
    }
  })

  router.post('/auth/login', async (req, res)=>{
    try{
      const { email, password } = req.body || {}
      const j = await realAuth.login(email, password)
      res.json(j)
    }catch(e){
      res.status(401).json({ error: { code: e.code || 'INVALID_CREDENTIALS', message: e.message || 'Invalid credentials' } })
    }
  })

  router.get('/auth/me', async (req, res)=>{
    if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not logged in' } })
    res.json({ user: { id: req.user.id, email: req.user.email } })
  })

  router.post('/auth/logout', async (req, res)=>{
    const auth = req.headers['authorization'] || ''
    const m = auth.match(/^Bearer\s+(.+)$/i)
    if (m) await realAuth.logout(m[1])
    res.json({ ok: true })
  })

  app.use(base, router)
}
