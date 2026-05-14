// Profile routes for Module 7 - File-backed persistence with search and pagination
import { z } from 'zod';
import express, { Request, Response, NextFunction } from 'express';
import { load, save, paginate } from './data/fsStore';
import { Errors } from './errors';
// @ts-ignore
import * as pgClientModule from './db/pg-client.js';
const { getAvailability, updateAvailability, getProfile, getProfileByHandle } = pgClientModule;

export const router = express.Router();

const CreateProfile = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  headline: z.string().optional(),
});

const UpdateProfile = z.object({}).passthrough(); // Allow all fields for now to support full profile updates

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

// WP: Public profile by handle (for public views)
router.get('/public/profile/:handle', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const handle = req.params.handle;
    
    // 1. Try fetching from Postgres (Primary)
    let p = await getProfileByHandle(handle);

    // 2. Fallback to JSON (Legacy)
    if (!p) {
      console.log('[profiles] Profile not found in DB for handle:', handle, 'checking JSON...');
      const items = await load('profiles.json', []);
      // Find by publicHandle or handle
      p = items.find((item: any) => item.publicHandle === handle || item.handle === handle);
    }
    
    if (!p) {
        throw Errors.notFound('Profile not found');
    }

    // Fetch availability from Postgres
    try {
      console.log('[profiles] Fetching availability for profile:', p.id);
      const av = await getAvailability(p.id);
      if (av) {
        console.log('[profiles] Availability found');
        p.availability = av;
      } else {
        console.log('[profiles] Availability NOT found, using default');
        // Enforce default empty availability if not found
        p.availability = { 
          slots: [], 
          timezone: 'UTC', 
          windowDays: 60, 
          durationMinutes: 30,
          rules: { windowDays: 60, durationMinutes: 30 }
        };
      }
    } catch (err) {
      console.error('[profiles] Failed to fetch availability for public profile:', err);
      // Fallback to safe default
      p.availability = { slots: [], timezone: 'UTC', windowDays: 60, durationMinutes: 30, rules: { windowDays: 60, durationMinutes: 30 } };
    }

    res.json(p); // Return unwrapped profile
  } catch (e) {
    next(e);
  }
});

router.get('/profiles/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    
    // 1. Try fetching from Postgres (Primary)
    let p = await getProfile(id);

    // 2. Fallback to JSON (Legacy)
    if (!p) {
      const items = await load('profiles.json', []);
      p = items.find((item: any) => item.id === id);
    }

    if (!p) throw Errors.notFound('Profile not found');

    // Fetch availability from Postgres
    try {
      const av = await getAvailability(id);
      if (av) {
        p.availability = av;
      } else {
        // Enforce default empty availability if not found
        p.availability = { 
          slots: [], 
          timezone: 'UTC', 
          windowDays: 60, 
          durationMinutes: 30 
        };
      }
    } catch (err) {
      console.error('[profiles] Failed to fetch availability:', err);
      // Fallback to safe default
      p.availability = { slots: [], timezone: 'UTC', windowDays: 60, durationMinutes: 30 };
    }

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
    const patch = req.body; // Use full body
    
    // 1. Update in Postgres (Primary)
    console.log('[profiles] Updating profile in Postgres:', id);
    let updatedProfile = await pgClientModule.updateProfile(id, patch);
    
    // 2. Update Availability if present
    if (patch.availability) {
      console.log('[profiles] Updating availability for profile:', id);
      const updatedAv = await updateAvailability(id, patch.availability);
      if (updatedProfile) {
        updatedProfile.availability = updatedAv;
      }
    }

    // 3. Fallback/Legacy: Update JSON file
    try {
      const items = await load('profiles.json', []);
      const idx = items.findIndex((p: any) => p.id === id);
      
      if (idx !== -1) {
        const updated = { ...items[idx], ...patch };
        items[idx] = updated;
        await save('profiles.json', items);
      }
    } catch (err) {
      console.warn('[profiles] Failed to update legacy JSON profile:', err);
      // Ignore JSON error if Postgres succeeded
    }
    
    if (!updatedProfile) {
        // If Postgres update failed (e.g. profile not found), fall back to checking if we updated JSON
        // But for now, let's assume if Postgres failed, it's a 404 or error
        // Re-fetch from JSON if needed? No, let's just return what we have.
        // If we didn't find it in Postgres, maybe we should return 404.
        // But the legacy code might have only had it in JSON.
        // Let's stick to the behavior: if we found it in JSON, return that.
        const items = await load('profiles.json', []);
        const jsonProfile = items.find((p: any) => p.id === id);
        if (jsonProfile) {
             updatedProfile = jsonProfile;
        } else {
             throw Errors.notFound('Profile not found');
        }
    }
    
    res.json({ profile: updatedProfile });
  } catch (e) {
    next(e);
  }
});
