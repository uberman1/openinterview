// server/routes.interviews.reference.ts
import type { Express } from 'express';
import express from 'express';
import { load, save, paginate } from './data/fsStore';

type Interview = {
  id: string;
  profileId: string;
  title: string;
  scheduledAt?: string; // ISO datetime
  status?: 'draft'|'scheduled'|'completed'|'canceled';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
};

type Profile = { id: string; name: string; email: string };

const FILE = 'interviews.json';
const PFILE = 'profiles.json';

export const router = express.Router();

async function allInterviews(): Promise<Interview[]> { return load<Interview[]>(FILE, []); }
async function saveInterviews(items: Interview[]) { return save(FILE, items); }
async function allProfiles(): Promise<Profile[]> { return load<Profile[]>(PFILE, []); }

function like(s: string, q: string) { return s?.toLowerCase().includes(q.toLowerCase()); }
function parseISO(s?: string){ if(!s) return undefined; const d = new Date(s); return isNaN(+d) ? undefined : d; }

function allowedTransition(from: Interview['status'], to: Interview['status']){
  const f = from || 'draft';
  if (f === to) return true;
  if (f === 'draft' && to === 'scheduled') return true;
  if (f === 'scheduled' && (to === 'completed' || to === 'canceled')) return true;
  return false;
}

router.post('/interviews', express.json(), async (req, res) => {
  const { profileId, title, scheduledAt, status, notes } = req.body || {};
  if (!profileId || !title) return res.status(400).json({ error: 'profileId and title are required' });

  const profiles = await allProfiles();
  if (!profiles.some(p => p.id === profileId)) return res.status(404).json({ error: 'profile not found' });

  const items = await allInterviews();
  const iv: Interview = {
    id: crypto.randomUUID(),
    profileId, title, notes,
    scheduledAt: parseISO(scheduledAt)?.toISOString(),
    status: (status as Interview['status']) || 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (!allowedTransition('draft', iv.status)) return res.status(400).json({ error: 'invalid initial status' });
  items.push(iv);
  await saveInterviews(items);
  return res.status(201).json({ interview: iv });
});

router.patch('/interviews/:id', express.json(), async (req, res) => {
  const { id } = req.params;
  const { title, scheduledAt, status, notes } = req.body || {};
  const items = await allInterviews();
  const idx = items.findIndex(i => i.id === id);
  if (idx < 0) return res.status(404).json({ error: 'not found' });
  const prev = items[idx];

  const nextStatus = (status as Interview['status']) || prev.status || 'draft';
  if (!allowedTransition(prev.status, nextStatus)) return res.status(400).json({ error: 'invalid transition' });

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
  return res.json({ interview: next });
});

router.post('/interviews/:id/remind', async (req, res) => {
  const { id } = req.params;
  const items = await allInterviews();
  const iv = items.find(i => i.id === id);
  if (!iv) return res.status(404).end();
  // No-op side-effect; append to logs for observability
  try {
    const fs = await import('fs/promises');
    await fs.mkdir('logs', { recursive: true });
    await fs.appendFile('logs/mod-09.log', `[remind] interview=${id} at ${new Date().toISOString()}\n`, 'utf8');
  } catch {}
  return res.status(204).end();
});

router.get('/interviews', async (req, res) => {
  const profileId = String(req.query.profileId || '');
  const q = String(req.query.q || '');
  const status = String(req.query.status || '');
  const from = parseISO(String(req.query.from || ''));
  const to = parseISO(String(req.query.to || ''));
  const limit = Number(req.query.limit || 20);
  const cursor = String(req.query.cursor || '' ) || undefined;

  let items = await allInterviews();
  if (profileId) items = items.filter(i => i.profileId === profileId);
  if (q) items = items.filter(i => like(i.title, q) || like(i.notes||'', q));
  if (status) items = items.filter(i => i.status === status);
  if (from) items = items.filter(i => i.scheduledAt && new Date(i.scheduledAt) >= from);
  if (to) items = items.filter(i => i.scheduledAt && new Date(i.scheduledAt) <= to);

  items.sort((a,b)=> (b.createdAt.localeCompare(a.createdAt)) || (a.id.localeCompare(b.id)) );
  const page = paginate(items, limit, cursor);
  return res.json(page);
});

export default router;
