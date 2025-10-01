// server/routes.reference.ts
// Reference structure for registerRoutes with unified auth router.

import type { Express } from "express";
import { API_BASE } from "../shared/constants";
import { mountAuth } from "./auth.routes.js";

export function registerRoutes(app: Express) {
  // Mount unified auth first so downstream routes see req.user when applicable.
  mountAuth(app, API_BASE);

  // Example domain routes (replace with your actual routers)
  // app.use(`${API_BASE}`, profilesRouter);
  // app.use(`${API_BASE}`, interviewsRouter);

  app.get(`${API_BASE}/health`, (_req, res) => {
    res.json({
      status: "ok",
      env: process.env.NODE_ENV || "development",
      version: "0.1.0",
      flags: {
        useMockAdapters: undefined, // or your real flag
        useMockAuth: /^true$/i.test(String(process.env.USE_MOCK_AUTH || "")),
      },
    });
  });
}
