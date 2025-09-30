// Profile routes for Module 1
import { z } from 'zod';
import express, { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { Errors } from './errors';

export const router = express.Router();

const CreateProfile = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
});

const UpdateProfile = z
  .object({
    name: z.string().min(1).max(120).optional(),
    email: z.string().email().max(200).optional(),
  })
  .refine(obj => Object.keys(obj).length > 0, { message: 'No fields to update' });

router.post('/profiles', (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = CreateProfile.parse(req.body);
    // Check if email already exists - scan all profiles directly
    const allProfiles = db.getAllProfiles();
    const exists = allProfiles.find(p => p.email === input.email.toLowerCase());
    if (exists) throw Errors.conflict('Email already exists');
    const created = db.createProfile(input);
    res.status(201).json({ profile: created });
  } catch (e) {
    next(e);
  }
});

router.get('/profiles/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    const p = db.getProfile(id);
    if (!p) throw Errors.notFound('Profile not found');
    res.json({ profile: p });
  } catch (e) {
    next(e);
  }
});

router.get('/profiles', (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const limit = Math.max(1, Math.min(50, Number(req.query.limit || 20)));
    const cursor = req.query.cursor ? String(req.query.cursor) : null;
    const out = db.listProfiles({ q, limit, cursor });
    res.json(out);
  } catch (e) {
    next(e);
  }
});

router.patch('/profiles/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    const patch = UpdateProfile.parse(req.body);
    const updated = db.updateProfile(id, patch);
    if (!updated) throw Errors.notFound('Profile not found');
    res.json({ profile: updated });
  } catch (e) {
    next(e);
  }
});
