import type { Express } from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';

const uploads: Record<string, any> = {};
const upload = multer({ storage: multer.memoryStorage() });

export function mountStorage(app: Express, base: string) {
  const allowed = ['application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png','image/jpeg'];
  
  app.post(`${base}/uploads`, upload.single('file'), (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file' });
    if (file.size > 10*1024*1024) return res.status(413).json({ error: 'File too large' });
    if (!allowed.includes(file.mimetype)) return res.status(415).json({ error: 'Unsupported type' });

    const id = randomUUID();
    const url = `/uploads/${id}`;
    uploads[id] = { id, url, size: file.size, contentType: file.mimetype };
    return res.status(201).json({ upload: { id, url, size: file.size, contentType: file.mimetype } });
  });

  app.get(`${base}/uploads/:id/meta`, (req, res) => {
    const u = uploads[req.params.id];
    if (!u) return res.status(404).json({ error: 'Not found' });
    return res.json({ upload: u });
  });

  app.delete(`${base}/uploads/:id`, (req, res) => {
    if (!uploads[req.params.id]) return res.status(404).json({ error: 'Not found' });
    delete uploads[req.params.id];
    return res.status(204).end();
  });
}
