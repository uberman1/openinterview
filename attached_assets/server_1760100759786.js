import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// In-memory mock data
const now = () => new Date().toISOString();
let profiles = [
  { id: 'p_123abc', title: 'Senior Product Manager', summary: 'PM with 7+ years in SaaS and marketplaces...', status: 'active', created_at: now(), updated_at: now() },
  { id: 'p_xyz789', title: '', summary: 'Data engineer with Spark/DBT experience delivering pipelines...', status: 'draft', created_at: now(), updated_at: now() }
];

// API
app.get('/api/profiles', (req, res) => { res.json(profiles); });

// Static files (public)
app.use('/test_output', express.static(path.join(__dirname, 'test_output')));
app.use('/', express.static(path.join(__dirname, 'public')));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
