import type { Request, Response, NextFunction } from 'express';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const anyReq = req as any;
  const user = anyReq?.user;
  if (!user) return res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
  if (String(user.email || '').toLowerCase() === 'admin@example.com') return next();
  return res.status(403).json({ error: { code: 'FORBIDDEN' } });
}
