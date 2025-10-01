import type { Express } from 'express';
import { requireAdmin } from './middleware/requireAdmin';
import { load } from './data/fsStore';

type Interview = { id:string; status?: 'draft'|'scheduled'|'completed'|'canceled'; createdAt:string };
type Profile = { id:string; createdAt:string };

function countRecent(items: { createdAt?: string }[], days=7){
  const since = Date.now() - days*24*3600*1000;
  return items.filter(i => i.createdAt && new Date(i.createdAt).getTime() >= since).length;
}

export function mountAdminRoutes(app: Express, base: string){
  app.get(`${base}/admin/stats`, requireAdmin as any, async (_req, res) => {
    const profiles = (await load('profiles.json', [])) as Profile[];
    const interviews = (await load('interviews.json', [])) as Interview[];

    const totals = { profiles: profiles.length, interviews: interviews.length };
    const interviewsByStatus = {
      draft: interviews.filter((i: Interview) => i.status === 'draft').length,
      scheduled: interviews.filter((i: Interview) => i.status === 'scheduled').length,
      completed: interviews.filter((i: Interview) => i.status === 'completed').length,
      canceled: interviews.filter((i: Interview) => i.status === 'canceled').length,
    };
    const recentProfiles = countRecent(profiles, 7);
    const recentInterviews = countRecent(interviews, 7);

    return res.json({ totals, interviewsByStatus, recentProfiles, recentInterviews });
  });
}
