import type { Express } from 'express';
import { mountStorage } from './storage.mock';

export function mountStorageRoutes(app: Express, base: string) {
  mountStorage(app, base);
}
