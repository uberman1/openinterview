// /server/protected.routes.js
import express from 'express'
import { ensureAuth } from './auth.mock.js'

export const router = express.Router()

router.get('/protected/ping', ensureAuth, (req, res)=>{
  res.json({ ok: true, userId: req.user.id })
})
