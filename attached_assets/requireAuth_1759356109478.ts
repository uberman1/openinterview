import type { Request, Response, NextFunction } from 'express';
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const anyReq = req as any;
  if (anyReq && anyReq.user) return next();
  return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
}
