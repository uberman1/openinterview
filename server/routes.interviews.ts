// Interview routes for Module 9 - Scheduling and status workflow
import { z } from 'zod';
import express, { Request, Response, NextFunction } from 'express';
import { load, save, paginate } from './data/fsStore';
import { Errors } from './errors';
import fs from 'fs/promises';

export const router = express.Router();

type Interview = {
  id: string;
  profileId: string;
  title: string;
  scheduledAt?: string;
  status?: 'draft' | 'scheduled' | 'completed' | 'canceled';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
};

type Profile = { id: string; name: string; email: string };

const FILE = 'interviews.json';
const PFILE = 'profiles.json';

async function allInterviews(): Promise<Interview[]> {
  return load<Interview[]>(FILE, []);
}

async function saveInterviews(items: Interview[]) {
  return save(FILE, items);
}

async function allProfiles(): Promise<Profile[]> {
  return load<Profile[]>(PFILE, []);
}

function parseISO(s?: string) {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(+d) ? undefined : d;
}

function allowedTransition(from: Interview['status'], to: Interview['status']) {
  const f = from || 'draft';
  if (f === to) return true;
  if (f === 'draft' && to === 'scheduled') return true;
  if (f === 'scheduled' && (to === 'completed' || to === 'canceled')) return true;
  return false;
}

router.post('/interviews', express.json(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { profileId, title, scheduledAt, status, notes } = req.body || {};
    
    if (!profileId || !title) {
      return res.status(400).json({ error: 'profileId and title are required' });
    }
    
    // Check if profile exists
    const profiles = await allProfiles();
    if (!profiles.some((p: any) => p.id === profileId)) {
      return res.status(404).json({ error: 'profile not found' });
    }
    
    const items = await allInterviews();
    const iv: Interview = {
      id: crypto.randomUUID(),
      profileId,
      title,
      notes,
      scheduledAt: parseISO(scheduledAt)?.toISOString(),
      status: (status as Interview['status']) || 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    if (!allowedTransition('draft', iv.status)) {
      return res.status(400).json({ error: 'invalid initial status' });
    }
    
    items.push(iv);
    await saveInterviews(items);
    
    res.status(201).json({ interview: iv });
  } catch (e) {
    next(e);
  }
});

router.patch('/interviews/:id', express.json(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, scheduledAt, status, notes } = req.body || {};
    
    const items = await allInterviews();
    const idx = items.findIndex((i: any) => i.id === id);
    
    if (idx < 0) {
      return res.status(404).json({ error: 'not found' });
    }
    
    const prev = items[idx];
    const nextStatus = (status as Interview['status']) || prev.status || 'draft';
    
    if (!allowedTransition(prev.status, nextStatus)) {
      return res.status(400).json({ error: 'invalid transition' });
    }
    
    const next: Interview = {
      ...prev,
      title: title ?? prev.title,
      notes: notes ?? prev.notes,
      scheduledAt: scheduledAt !== undefined ? parseISO(scheduledAt)?.toISOString() : prev.scheduledAt,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };
    
    items[idx] = next;
    await saveInterviews(items);
    
    res.json({ interview: next });
  } catch (e) {
    next(e);
  }
});

router.post('/interviews/:id/remind', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const items = await allInterviews();
    const iv = items.find((i: any) => i.id === id);
    
    if (!iv) {
      return res.status(404).end();
    }
    
    // Append reminder log
    try {
      await fs.mkdir('logs', { recursive: true });
      await fs.appendFile('logs/mod-09.log', `[remind] interview=${id} at ${new Date().toISOString()}\n`, 'utf8');
    } catch (err) {
      // Silent fail for logging
    }
    
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

router.get('/interviews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profileId = String(req.query.profileId || '');
    const q = String(req.query.q || '').toLowerCase();
    const status = String(req.query.status || '');
    const from = parseISO(String(req.query.from || ''));
    const to = parseISO(String(req.query.to || ''));
    const limit = Number(req.query.limit || 20);
    const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
    
    let items = await allInterviews();
    
    if (profileId) {
      items = items.filter((i: any) => i.profileId === profileId);
    }
    
    if (q) {
      items = items.filter((i: any) => 
        (i.title || '').toLowerCase().includes(q) || 
        (i.notes || '').toLowerCase().includes(q)
      );
    }
    
    if (status) {
      items = items.filter((i: any) => i.status === status);
    }
    
    if (from) {
      items = items.filter((i: any) => i.scheduledAt && new Date(i.scheduledAt) >= from);
    }
    
    if (to) {
      items = items.filter((i: any) => i.scheduledAt && new Date(i.scheduledAt) <= to);
    }
    
    // Sort by createdAt desc, then by id
    items.sort((a: any, b: any) => 
      b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)
    );
    
    const result = paginate(items, limit, cursor);
    res.json(result);
  } catch (e) {
    next(e);
  }
});
