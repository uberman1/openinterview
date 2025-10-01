// Profile routes for Module 7 - File-backed persistence with search and pagination
import { z } from 'zod';
import express, { Request, Response, NextFunction } from 'express';
import { load, save, paginate } from './data/fsStore';
import { Errors } from './errors';

export const router = express.Router();

const CreateProfile = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  headline: z.string().optional(),
});

const UpdateProfile = z
  .object({
    name: z.string().min(1).max(120).optional(),
    email: z.string().email().max(200).optional(),
  })
  .refine(obj => Object.keys(obj).length > 0, { message: 'No fields to update' });

router.post('/profiles', express.json(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, headline } = req.body || {};
    if (!name || !email) {
      return res.status(400).json({ error: 'name and email are required' });
    }
    
    const items = await load('profiles.json', []);
    
    // Check for duplicate email (case-insensitive)
    if (items.some((p: any) => String(p.email).toLowerCase() === String(email).toLowerCase())) {
      return res.status(409).json({ error: 'email exists' });
    }
    
    const profile = { 
      id: crypto.randomUUID(), 
      name, 
      email, 
      headline, 
      createdAt: new Date().toISOString() 
    };
    
    items.push(profile);
    await save('profiles.json', items);
    
    res.status(201).json({ profile });
  } catch (e) {
    next(e);
  }
});

router.get('/profiles/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    const items = await load('profiles.json', []);
    const p = items.find((item: any) => item.id === id);
    if (!p) throw Errors.notFound('Profile not found');
    res.json({ profile: p });
  } catch (e) {
    next(e);
  }
});

router.get('/profiles', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = String(req.query.q || '').toLowerCase();
    const limit = Number(req.query.limit || 20);
    const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
    
    const items = await load('profiles.json', []);
    let filtered = items;
    
    if (q) {
      filtered = items.filter((p: any) => 
        (p.name || '').toLowerCase().includes(q) || 
        (p.email || '').toLowerCase().includes(q) || 
        (p.headline || '').toLowerCase().includes(q)
      );
    }
    
    // Sort by createdAt desc, then by id
    filtered.sort((a: any, b: any) => 
      b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)
    );
    
    const result = paginate(filtered, limit, cursor);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.patch('/profiles/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    const patch = UpdateProfile.parse(req.body);
    
    const items = await load('profiles.json', []);
    const idx = items.findIndex((p: any) => p.id === id);
    
    if (idx === -1) throw Errors.notFound('Profile not found');
    
    const updated = { ...items[idx], ...patch };
    items[idx] = updated;
    await save('profiles.json', items);
    
    res.json({ profile: updated });
  } catch (e) {
    next(e);
  }
});
