// server/routes.internal.js
// Private server-to-server API — not publicly documented.
// All endpoints require the INTERNAL_API_SECRET environment variable.

import express from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { getPool, getProfile, createProfile } from './db/pg-client.js';
import { createAnonymousUser } from './services/anonymousUser.js';
import { applyParsedResumeToProfile } from './services/resumeImportService.js';

const router = express.Router();

// One-time handoff tokens are valid for 15 minutes.
const HANDOFF_TTL_MS = 15 * 60 * 1000;

// ── Internal auth guard ──────────────────────────────────────────────────────

function requireInternalAuth(req, res, next) {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    return res.status(503).json({
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Internal API not configured' }
    });
  }
  const provided = req.headers['x-internal-token'] || req.headers['x-api-key'];
  if (!provided) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Internal token required' }
    });
  }
  const a = Buffer.from(String(secret), 'utf8');
  const b = Buffer.from(String(provided), 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Invalid internal token' }
    });
  }
  next();
}

// ── Zod validation schema (canonical ResumeGPT payload format) ───────────────

const CandidateSchema = z.object({
  full_name: z.string().default(''),
  email: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  location: z.string().optional().default(''),
  linkedin_url: z.string().optional().default(''),
  github_url: z.string().optional().default(''),
  website_url: z.string().optional().default('')
});

const ResumeExperienceSchema = z.object({
  company: z.string().default(''),
  title: z.string().optional().default(''),
  start_date: z.string().optional().default(''),
  end_date: z.string().optional().default(''),
  current: z.boolean().optional().default(false),
  description: z.string().optional().default('')
});

const ResumeEducationSchema = z.object({
  institution: z.string().optional().default(''),
  degree: z.string().optional().default(''),
  field: z.string().optional().default(''),
  start_date: z.string().optional().default(''),
  end_date: z.string().optional().default(''),
  gpa: z.string().optional().default('')
});

const ParsedResumeSchema = z.object({
  headline: z.string().optional().default(''),
  summary: z.string().optional().default(''),
  highlights: z.array(z.string()).optional().default([]),
  skills: z.array(z.string()).optional().default([]),
  experience: z.array(ResumeExperienceSchema).optional().default([]),
  education: z.array(ResumeEducationSchema).optional().default([])
});

const ResumePayloadSchema = z.object({
  source: z.literal('resumegpt'),
  external_resume_id: z.string().min(1).max(500),
  candidate: CandidateSchema,
  parsed_resume: ParsedResumeSchema
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildBaseUrl(req) {
  const proto = process.env.NODE_ENV === 'production' ? 'https' : req.protocol;
  return `${proto}://${req.get('host')}`;
}

async function issueHandoffToken(importId, profileId) {
  const pool = getPool();
  const tokenId = `tok_${crypto.randomBytes(8).toString('hex')}`;
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + HANDOFF_TTL_MS);
  await pool.query(
    `INSERT INTO resumegpt_handoff_tokens (id, import_id, profile_id, token, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [tokenId, importId, profileId, token, expiresAt]
  );
  return token;
}

// Atomically marks token used; returns profileId or null if invalid/expired/used.
async function consumeHandoffToken(token) {
  const pool = getPool();
  const { rows } = await pool.query(
    `UPDATE resumegpt_handoff_tokens
     SET used = true
     WHERE token = $1
       AND used = false
       AND expires_at > NOW()
     RETURNING profile_id`,
    [token]
  );
  return rows[0]?.profile_id ?? null;
}

// ── ResumeGPT → native parsed-data adapter ───────────────────────────────────
// Converts the canonical ResumeGPT payload shape into the flat camelCase shape
// expected by applyParsedResumeToProfile (which mirrors parseResumeWithAI output).

function mapResumeGPTPayloadToParsedData(payload) {
  const c = payload.candidate ?? {};
  const r = payload.parsed_resume ?? {};
  return {
    name: c.full_name || '',
    email: c.email || '',
    phone: c.phone || '',
    location: c.location || '',
    linkedin: c.linkedin_url || '',
    github: c.github_url || '',
    website: c.website_url || '',
    title: r.headline || '',
    summary: r.summary || '',
    highlights: r.highlights || [],
    skills: r.skills || [],
    experience: (r.experience || []).map(exp => ({
      company: exp.company || '',
      title: exp.title || '',
      startDate: exp.start_date || '',
      endDate: exp.end_date || '',
      current: exp.current || false,
      description: exp.description || ''
    })),
    education: (r.education || []).map(edu => ({
      school: edu.institution || '',
      degree: edu.degree || '',
      field: edu.field || '',
      startDate: edu.start_date || '',
      endDate: edu.end_date || '',
      gpa: edu.gpa || ''
    }))
  };
}

// Thin wrapper around the native import pipeline.
// Adapts the canonical ResumeGPT payload to parsed-data, then delegates to
// the shared applyParsedResumeToProfile service (same function used by
// the native /api/profiles/:id/ingest endpoint).
async function buildProfileFromPayload(payload) {
  const parsedData = mapResumeGPTPayloadToParsedData(payload);

  const user = await createAnonymousUser({ name: parsedData.name || 'Guest' });

  const profileId = `prof_${Date.now().toString(36)}`;
  const profile = await createProfile({
    id: profileId,
    userId: user.id,
    person: { name: parsedData.name || '' },
    contact: { email: parsedData.email || '' },
    isDefault: true,
    visibility: 'private'
  });

  const enrichedProfile = await applyParsedResumeToProfile(profileId, parsedData, profile);

  return { user, profile: enrichedProfile };
}

// ── POST /api/internal/resume-import ─────────────────────────────────────────

router.post('/api/internal/resume-import', requireInternalAuth, async (req, res) => {
  const pool = getPool();
  let importId = null;

  try {
    // 1. Validate payload
    const parseResult = ResumePayloadSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid payload',
          details: parseResult.error.errors
        }
      });
    }
    const payload = parseResult.data;

    // 2. Attempt to insert import log (unique constraint prevents duplicate successful drafts)
    importId = `imp_${crypto.randomBytes(8).toString('hex')}`;
    const safePayload = {
      source: payload.source,
      external_resume_id: payload.external_resume_id,
      has_email: !!payload.candidate?.email,
      has_phone: !!payload.candidate?.phone,
      skills_count: payload.parsed_resume?.skills?.length ?? 0,
      experience_count: payload.parsed_resume?.experience?.length ?? 0,
      education_count: payload.parsed_resume?.education?.length ?? 0
    };

    const { rowCount } = await pool.query(
      `INSERT INTO resumegpt_imports (id, source, external_resume_id, status, request_payload)
       VALUES ($1, $2, $3, 'pending', $4)
       ON CONFLICT (source, external_resume_id) DO NOTHING`,
      [importId, payload.source, payload.external_resume_id, JSON.stringify(safePayload)]
    );

    if (rowCount === 0) {
      // A record already exists for this (source, external_resume_id)
      const { rows } = await pool.query(
        `SELECT id, profile_id, status FROM resumegpt_imports
         WHERE source = $1 AND external_resume_id = $2 LIMIT 1`,
        [payload.source, payload.external_resume_id]
      );
      const existing = rows[0];

      if (existing?.status === 'success' && existing.profile_id) {
        // Idempotent: return the existing draft with a fresh token
        const cachedProfile = await getProfile(existing.profile_id);
        if (cachedProfile) {
          const handoffToken = await issueHandoffToken(existing.id, existing.profile_id);
          const editorUrl = `${buildBaseUrl(req)}/api/internal/handoff?token=${handoffToken}`;
          return res.status(200).json({
            status: 'ok',
            idempotent: true,
            draft_id: existing.profile_id,
            editor_url: editorUrl,
            handoff_token: handoffToken
          });
        }
      }

      if (existing?.status === 'pending') {
        return res.status(409).json({
          error: { code: 'IMPORT_IN_PROGRESS', message: 'An import for this resume ID is already in progress' }
        });
      }

      if (existing?.status === 'failed') {
        // Retry allowed: remove the failed log entry and re-insert
        await pool.query(`DELETE FROM resumegpt_imports WHERE id = $1`, [existing.id]);
        const { rowCount: retryCount } = await pool.query(
          `INSERT INTO resumegpt_imports (id, source, external_resume_id, status, request_payload)
           VALUES ($1, $2, $3, 'pending', $4)
           ON CONFLICT (source, external_resume_id) DO NOTHING`,
          [importId, payload.source, payload.external_resume_id, JSON.stringify(safePayload)]
        );
        if (retryCount === 0) {
          return res.status(409).json({
            error: { code: 'CONFLICT', message: 'Concurrent import in progress' }
          });
        }
        // Fall through to create the profile
      }
    }

    // 3. Create anonymous user + profile using native pipeline
    const { user, profile } = await buildProfileFromPayload(payload);

    // 4. Mark import successful
    await pool.query(
      `UPDATE resumegpt_imports
       SET status = 'success', profile_id = $2, user_id = $3, updated_at = NOW()
       WHERE id = $1`,
      [importId, profile.id, user.id]
    );

    // 5. Issue one-time handoff token
    const handoffToken = await issueHandoffToken(importId, profile.id);
    const editorUrl = `${buildBaseUrl(req)}/api/internal/handoff?token=${handoffToken}`;

    return res.status(201).json({
      status: 'ok',
      draft_id: profile.id,
      editor_url: editorUrl,
      handoff_token: handoffToken
    });

  } catch (error) {
    console.error('[resume-import] Error:', error);

    if (importId) {
      try {
        const pool2 = getPool();
        await pool2.query(
          `UPDATE resumegpt_imports SET status = 'failed', error = $2, updated_at = NOW() WHERE id = $1`,
          [importId, String(error.message).substring(0, 500)]
        );
      } catch (_) { /* best-effort */ }
    }

    return res.status(500).json({
      error: { code: 'IMPORT_FAILED', message: 'Failed to import resume' }
    });
  }
});

// ── GET /api/internal/handoff?token=... ──────────────────────────────────────
// Validates and consumes the one-time handoff token, sets the anonUserId cookie,
// and redirects the user's browser to the profile editor.

router.get('/api/internal/handoff', async (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';

  if (!token) {
    return res.status(400).type('html').send(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invalid Link</title></head>' +
      '<body style="font-family:system-ui;padding:2rem;"><p>This link is missing a token.</p>' +
      '<p><a href="/">Go to homepage</a></p></body></html>'
    );
  }

  try {
    const profileId = await consumeHandoffToken(token);

    if (!profileId) {
      return res.status(410).type('html').send(
        '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Link Expired</title></head>' +
        '<body style="font-family:system-ui;padding:2rem;"><p>This link has expired or already been used.</p>' +
        '<p><a href="/">Go to homepage</a></p></body></html>'
      );
    }

    const profile = await getProfile(profileId);
    if (!profile) {
      return res.status(404).type('html').send(
        '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Not Found</title></head>' +
        '<body style="font-family:system-ui;padding:2rem;"><p>Profile not found.</p>' +
        '<p><a href="/">Go to homepage</a></p></body></html>'
      );
    }

    // Set the anonymous user cookie so the editor can load the profile —
    // mirrors the cookie set by /api/upload-resume-anon.
    const userId = profile.userId || profile.user_id;
    if (userId) {
      res.cookie('anonUserId', userId, {
        maxAge: 365 * 24 * 60 * 60 * 1000,
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
    }

    return res.redirect(302, `/profile_edit.html?id=${profileId}&guest=true`);

  } catch (error) {
    console.error('[handoff] Error:', error);
    return res.status(500).type('html').send(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Error</title></head>' +
      '<body style="font-family:system-ui;padding:2rem;"><p>Something went wrong. Please try again.</p>' +
      '<p><a href="/">Go to homepage</a></p></body></html>'
    );
  }
});

export default router;
