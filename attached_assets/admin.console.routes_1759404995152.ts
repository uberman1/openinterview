import type { Express, Request } from 'express';
import { requireAdmin } from './middleware/requireAdmin';
import { getFlags, updateFlags } from './flags.store';
import { load } from './data/fsStore';
type UserRow = { id: string; email: string; createdAt?: string };
async function listUsers(): Promise<UserRow[]> {
  const users = await load<UserRow[]>('users.json', []);
  if (users.length) return users;
  const profiles = await load<any[]>('profiles.json', []);
  const derived = profiles.filter(p => p?.email).map((p: any) => ({ id: p.id || p.email, email: String(p.email), createdAt: p.createdAt }));
  const seen = new Set<string>(); const out: UserRow[] = [];
  for (const u of derived) { const key = u.email.toLowerCase(); if (!seen.has(key)) { seen.add(key); out.push(u); } }
  return out;
}
export function mountAdminConsoleRoutes(app: Express, base: string) {
  app.get(`${base}/admin/users`, requireAdmin as any, async (_req, res) => { const users = await listUsers(); res.json({ users }); });
  app.get(`${base}/admin/flags`, requireAdmin as any, async (_req, res) => { const flags = await getFlags(); res.json({ flags }); });
  app.patch(`${base}/admin/flags`, requireAdmin as any, async (req: Request, res) => { const patch = req.body || {}; const flags = await updateFlags(patch); res.json({ flags }); });
}
