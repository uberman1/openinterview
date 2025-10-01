// /server/server.js (Module 4 patch)
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { APP_VERSION, API_BASE } from '../shared/constants.js';
import flags from '../config/flags.json' assert { type: 'json' };
import { errorMiddleware } from './errors.js'
import { router as profiles } from './routes.profiles.js'
import { router as interviews } from './routes.interviews.js'
import { mountAuth } from './auth.routes.js'
import { router as protectedRouter } from './protected.routes.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5050;

// Security + hardening
app.use(helmet());
const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
app.use(cors({
  origin: function(origin, cb){
    if (!origin || allowed.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'), false);
  }
}));
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: false, limit: '200kb' }));

// Rate limit
const limiter = rateLimit({ windowMs: 60*1000, max: 120 });
app.use(limiter);

// Logging
const logsDir = path.resolve(__dirname, '../logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
const accessLog = path.join(logsDir, 'access.log');
const accessStream = fs.createWriteStream(accessLog, { flags: 'a' });
app.use(morgan('combined', { stream: accessStream }));

// Health route
app.get(`${API_BASE}/health`, async (req, res) => {
  const adapters = flags.adapters || {};
  res.json({
    status: 'ok',
    env: process.env.NODE_ENV || 'development',
    version: APP_VERSION,
    adapters,
    flags: { useMockAdapters: flags.useMockAdapters, useMockAuth: !!/^true$/i.test(String(process.env.USE_MOCK_AUTH||'')) }
  });
});

// Auth routes (mock or real based on USE_MOCK_AUTH)
mountAuth(app, API_BASE)

// Domain routes
app.use(`${API_BASE}`, profiles)
app.use(`${API_BASE}`, interviews)

// Protected sample route
app.use(`${API_BASE}`, protectedRouter)

// 404
app.use((req, res)=> res.status(404).json({ error: 'Not Found' }));

// Error handler (unified)
app.use(errorMiddleware)

app.listen(PORT, ()=>{
  console.log(`[server] listening on :${PORT}`);
});
