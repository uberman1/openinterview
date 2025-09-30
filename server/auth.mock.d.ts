import type { Request, Response, NextFunction, Express } from 'express';

export function attachUser(req: Request, res: Response, next: NextFunction): void;
export function ensureAuth(req: Request, res: Response, next: NextFunction): void;
export function mountAuthRoutes(app: Express, base: string): void;
