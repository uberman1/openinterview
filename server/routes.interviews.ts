// Interview routes for Module 7 - File-backed persistence with search and pagination
import { z } from 'zod';
import express, { Request, Response, NextFunction } from 'express';
import { load, save, paginate } from './data/fsStore';
import { Errors } from './errors';

export const router = express.Router();

const CreateInterview = z.object({
  profileId: z.string().min(1),
  title: z.string().min(1).max(160),
});

router.post('/interviews', express.json(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { profileId, title, scheduledAt, status } = req.body || {};
    
    if (!profileId || !title) {
      return res.status(400).json({ error: 'profileId and title are required' });
    }
    
    // Check if profile exists
    const profiles = await load('profiles.json', []);
    if (!profiles.some((p: any) => p.id === profileId)) {
      return res.status(404).json({ error: 'profile not found' });
    }
    
    const items = await load('interviews.json', []);
    const interview = { 
      id: crypto.randomUUID(), 
      profileId, 
      title, 
      scheduledAt, 
      status,
      createdAt: new Date().toISOString() 
    };
    
    items.push(interview);
    await save('interviews.json', items);
    
    res.status(201).json({ interview });
  } catch (e) {
    next(e);
  }
});

router.get('/interviews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profileId = String(req.query.profileId || '');
    const q = String(req.query.q || '').toLowerCase();
    const limit = Number(req.query.limit || 20);
    const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
    
    const items = await load('interviews.json', []);
    let filtered = items;
    
    if (profileId) {
      filtered = filtered.filter((i: any) => i.profileId === profileId);
    }
    
    if (q) {
      filtered = filtered.filter((i: any) => (i.title || '').toLowerCase().includes(q));
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
