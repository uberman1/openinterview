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
    flags: { useMockAdapters: flags.useMockAdapters }
  });
});

// 404
app.use((req, res)=> res.status(404).json({ error: 'Not Found' }));

// Error handler
app.use((err, req, res, next)=>{
  const code = err.status || 500;
  res.status(code).json({ error: err.message || 'Server Error', code });
});

app.listen(PORT, ()=>{
  console.log(`[server] listening on :${PORT}`);
});
