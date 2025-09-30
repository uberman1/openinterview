// /server/routes.interviews.js
import { z } from 'zod'
import express from 'express'
import { db } from './db.js'
import { Errors } from './errors.js'

export const router = express.Router()

const CreateInterview = z.object({
  profileId: z.string().min(1),
  title: z.string().min(1).max(160)
})

router.post('/interviews', (req, res, next)=>{
  try {
    const input = CreateInterview.parse(req.body)
    const profile = db.getProfile(input.profileId)
    if (!profile) throw Errors.badRequest('Invalid profileId')
    const created = db.createInterview(input)
    res.status(201).json({ interview: created })
  } catch (e){ next(e) }
})

router.get('/interviews', (req, res, next)=>{
  try {
    const profileId = String(req.query.profileId || '')
    if (!profileId) throw Errors.badRequest('profileId is required')
    const items = db.listInterviewsByProfile(profileId)
    res.json({ items })
  } catch (e){ next(e) }
})
