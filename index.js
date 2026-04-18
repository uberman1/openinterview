// Load environment variables from .env file
import 'dotenv/config';

import fs from "fs";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";
import cors from "cors";
import { v4 as uuid } from "uuid";
import cookieParser from "cookie-parser";



// Database - Real PostgreSQL (CANONICAL)
import * as pgClient from './server/db/pg-client.js';
import { initDatabase } from './server/db/pg-client.js';
import * as mailer from './server/services/mailer.js';
import * as emailTemplates from './server/services/emailTemplates.js';
import {
  sendBookingRequestedOwnerSms,
  sendBookingCancelledOwnerSms
} from './server/services/smsService.js';
import crypto from 'crypto';

// Initialize shared Stripe client
let stripeClient = null;
async function getStripeClient() {
  if (!stripeClient && process.env.STRIPE_SECRET_KEY) {
    const Stripe = (await import('stripe')).default;
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

// WP1: Resume parsing imports
import { extractTextFromPDF, extractTextFromBuffer } from './server/services/pdfParser.js';
import { parseResumeWithAI } from './server/services/resumeParser.js';

// REMOVED: dbAdapter (deprecated - use pgClient only)

// WP3: Authentication imports
import session from 'express-session';
import passport from './server/auth/passport.js';
import authRoutes from './server/auth/routes.js';
import { requireAuth, optionalAuth, requireRole } from './server/middleware/auth.js';
import {
  RECRUITER_VIEW_COOKIE,
  signRecruiterViewCookie,
  verifyRecruiterViewCookie
} from './server/utils/recruiter-access-cookie.js';
import { uploadRateLimiter, aiParseRateLimiter, profileRateLimiter } from './server/middleware/rateLimiter.js';

// WP9: Credits management
import { getCreditsInfo, getUpgradedCredits } from './server/services/credits.js';

// Help Center Q&A (OpenAI + Vercel AI SDK) — separate from resumeParser.js
import { streamHelpDocAnswer } from './server/services/helpDocChat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize PostgreSQL connection
await initDatabase();

const app = express();
app.use(cors({
  origin: true,
  credentials: true
}));

// WP5: Stripe Webhook - MUST be before express.json() for raw body access
const stripeWebhookHandler = async (req, res) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // If no webhook secret, accept all events (dev mode)
  if (!webhookSecret) {
    console.log('[stripe-webhook] No webhook secret configured - accepting event in dev mode');
    try {
      const event = JSON.parse(req.body.toString());
      await handleStripeEvent(event);
      return res.json({ received: true });
    } catch (e) {
      console.error('[stripe-webhook] Parse error:', e);
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }

  // Verify signature in production
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const stripe = await getStripeClient();
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    await handleStripeEvent(event);
    res.json({ received: true });
  } catch (error) {
    console.error('[stripe-webhook] Handler error:', error);
    res.status(500).json({ error: error.message });
  }
};

// WP5: Stripe Webhook - MUST be before express.json() for raw body access
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler);
// Support Stripe CLI default path
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookHandler);

// WP5: Handle Stripe events
async function handleStripeEvent(event) {
  console.log(`[stripe-webhook] Received event: ${event.type}`);

  //idempotancy
  if (event?.id) {
    const firstTime = await pgClient.markStripeWebhookEventProcessed(event.id, event.type);
    if (!firstTime) {
      console.log(`[stripe-webhook] Duplicate event ignored: ${event.id} (${event.type})`);
      return;
    }
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.client_reference_id || session.metadata?.userId;
      const planId = session.metadata?.planId;

      if (!userId || !planId) {
        console.error('[stripe-webhook] Missing userId or planId in session');
        return;
      }

      // Get plan from database
      const plan = await pgClient.getPlanByCode(planId);
      if (!plan) {
        console.error('[stripe-webhook] Invalid planId:', planId);
        return;
      }

      // Update user entitlement (PostgreSQL)
      let entitlement = await pgClient.getEntitlement(userId);
      if (!entitlement) {
        entitlement = await pgClient.createEntitlement({
          userId,
          plan: 'free',
          sharesUsed: 0,
          sharesLimit: 1,
          bookingsUsed: 0,
          bookingsLimit: 0
        });
      }

      // Get subscription to set billing period start
      let billingPeriodStart = new Date().toISOString();
      if (session.subscription) {
        try {
          const stripe = await getStripeClient();
          // Check if session.subscription is a string (ID) or object
          const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
          
          if (subId) {
            const subscription = await stripe.subscriptions.retrieve(subId);
            if (subscription && subscription.current_period_start) {
              billingPeriodStart = new Date(subscription.current_period_start * 1000).toISOString();
            }
          }
        } catch (error) {
          console.error('[stripe-webhook] Error fetching subscription:', error);
        }
      }

      await pgClient.updateEntitlement(userId, {
        plan: planId,
        sharesLimit: plan.sharesLimit,
        bookingsLimit: plan.bookingsLimit,
        bookingsUsed: 0, // Reset on upgrade
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        creditsResetAt: billingPeriodStart
      });

      console.log(`[stripe-webhook] ✅ Upgraded user ${userId} to ${planId} plan`);
      console.log(`[stripe-webhook] New limits: ${plan.sharesLimit ?? 'Unlimited'} shares, ${plan.bookingsLimit ?? 'Unlimited'} bookings`);
      console.log(`[stripe-webhook] Credits reset at billing period: ${billingPeriodStart}`);
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;

      // Find user by Stripe customer ID (PostgreSQL)
      const entitlement = await pgClient.getEntitlementByStripeCustomerId(subscription.customer);
      if (!entitlement) {
        console.log('[stripe-webhook] No user found for customer:', subscription.customer);
        return;
      }

      await pgClient.updateEntitlement(entitlement.userId, {
        stripeSubscriptionStatus: subscription.status
      });

      if (subscription.status === 'active') {
        console.log(`[stripe-webhook] Subscription active for user ${entitlement.userId}`);
      } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
        // Downgrade to free plan using database
        const freePlan = await pgClient.getPlanByCode('free');
        if (freePlan) {
          await pgClient.updateEntitlement(entitlement.userId, {
            plan: 'free',
            sharesLimit: freePlan.sharesLimit,
            bookingsLimit: freePlan.bookingsLimit
          });
          console.log(`[stripe-webhook] ⚠️ Downgraded user ${entitlement.userId} to free plan`);
        } else {
          console.error('[stripe-webhook] Free plan not found in database - cannot downgrade user:', entitlement.userId);
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;

      const entitlement = await pgClient.getEntitlementByStripeCustomerId(subscription.customer);
      if (!entitlement) {
        console.log('[stripe-webhook] No user found for customer:', subscription.customer);
        return;
      }

      // Downgrade to free plan using database
      const freePlan = await pgClient.getPlanByCode('free');
      if (freePlan) {
        await pgClient.updateEntitlement(entitlement.userId, {
          plan: 'free',
          sharesLimit: freePlan.sharesLimit,
          bookingsLimit: freePlan.bookingsLimit,
          stripeSubscriptionStatus: 'canceled'
        });
        console.log(`[stripe-webhook] ⚠️ Subscription deleted - downgraded user ${entitlement.userId} to free`);
      } else {
        console.error('[stripe-webhook] Free plan not found in database - cannot downgrade user:', entitlement.userId);
        // Only update subscription status, preserve existing limits
        await pgClient.updateEntitlement(entitlement.userId, {
          stripeSubscriptionStatus: 'canceled'
        });
      }
      break;
    }

    case 'invoice.payment_succeeded': {
      // New billing period started - reset credits
      const invoice = event.data.object;
      const customerId = invoice.customer;

      const entitlement = await pgClient.getEntitlementByStripeCustomerId(customerId);
      if (entitlement && entitlement.stripeSubscriptionId) {
        try {
          const stripe = await getStripeClient();
          const subId = typeof entitlement.stripeSubscriptionId === 'string' ? 
            entitlement.stripeSubscriptionId : 
            entitlement.stripeSubscriptionId?.id;
            
          if (subId) {
            const subscription = await stripe.subscriptions.retrieve(subId);
            if (subscription && subscription.current_period_start) {
              const billingPeriodStart = new Date(subscription.current_period_start * 1000).toISOString();

              // Reset booking, share, and view credits for new billing period
              await pgClient.resetMonthlyUsage(entitlement.userId, billingPeriodStart);

              console.log(`[stripe-webhook] ✅ Credits reset for user ${entitlement.userId} at billing period: ${billingPeriodStart}`);
            }
          }
        } catch (error) {
          console.error('[stripe-webhook] Error resetting credits:', error);
        }
      }

      console.log('[stripe-webhook] Payment succeeded:', invoice.id);
      break;
    }

    case 'invoice.payment_failed':
      console.log('[stripe-webhook] Payment failed:', event.data.object.id);
      break;

    default:
      console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
  }
}

app.use(express.json());
app.use(cookieParser());

// Health check endpoint (for Docker)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    db: process.env.DATABASE_URL ? 'postgres' : 'in-memory',
    uptime: process.uptime()
  });
});

function normalizeHelpAiMessages(body) {
  const { messages } = body || {};
  if (!Array.isArray(messages) || !messages.length) return null;
  const out = [];
  for (const m of messages) {
    if (!m || typeof m !== 'object') continue;
    const role = m.role;
    if (role !== 'user' && role !== 'assistant') continue;
    let content = m.content;
    if (typeof content !== 'string') {
      if (Array.isArray(m.parts)) {
        content = m.parts.map((p) => (typeof p === 'string' ? p : p?.text ?? '')).join('');
      } else {
        content = '';
      }
    }
    const s = String(content).trim().slice(0, 48000);
    if (!s) continue;
    out.push({ role, content: s });
  }
  if (!out.length || out[out.length - 1].role !== 'user') return null;
  return out;
}

/** Help handbook Q&A: streams plain text; uses OPENAI_API_KEY + OPENAI_MODEL only (see helpDocChat.js). */
app.post('/api/help/ai', (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'Help AI is not configured (OPENAI_API_KEY).' });
  }
  const messages = normalizeHelpAiMessages(req.body);
  if (!messages) {
    return res.status(400).json({
      error:
        'Invalid body: expected { messages: [{ role: "user"|"assistant", content: string }, ...] } with last message from user.'
    });
  }
  try {
    const result = streamHelpDocAnswer(messages);
    result.pipeTextStreamToResponse(res);
  } catch (err) {
    console.error('[help-ai]', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Help AI failed' });
    }
  }
});

// WP3: Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'openinterview-dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));

// WP3: Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// WP3: Mount auth routes
app.use('/auth', authRoutes);

/** Recruiter cookie grant: valid signed cookie + non-revoked DB row. Owner and env bypass. */
async function recruiterMayViewPublicProfile(req, profile) {
  if (process.env.PUBLIC_VIEW_REQUIRES_GRANT === 'false') return true;
  if (req.user && profile.userId === req.user.id) return true;
  const cookieVal = req.cookies?.[RECRUITER_VIEW_COOKIE];
  if (!cookieVal) return false;
  if (!verifyRecruiterViewCookie(cookieVal, profile.id, profile.publicHandle)) return false;
  return pgClient.isPublicAccessGrantActive(profile.id);
}

// Exchange token URL → HttpOnly cookie → clean public profile URL
app.get('/p/access', async (req, res) => {
  try {
    const handle = typeof req.query.handle === 'string' ? req.query.handle : '';
    const t = typeof req.query.t === 'string' ? req.query.t : '';
    const validated = await pgClient.validateExchangeToken(handle, t);
    if (!validated) {
      return res.status(403).type('html').send('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Link invalid</title></head><body style="font-family:system-ui;padding:2rem;"><p>This link is invalid or has expired.</p><p><a href="/">Home</a></p></body></html>');
    }
    const now = Date.now();
    const expMs = validated.expiresAt
      ? Math.min(validated.expiresAt.getTime(), now + 365 * 864e5)
      : now + 365 * 864e5;
    const cookieVal = signRecruiterViewCookie(validated.profileId, validated.publicHandle, expMs);
    const maxAge = Math.max(0, expMs - now);
    res.cookie(RECRUITER_VIEW_COOKIE, cookieVal, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge
    });
    res.redirect(302, `/u/${encodeURIComponent(validated.publicHandle)}`);
  } catch (e) {
    console.error('[p/access]', e);
    res.status(500).send('Server error');
  }
});

// Plans endpoint - Single source of truth from database
app.get('/api/plans', async (req, res) => {
  try {
    const plans = await pgClient.getPlans();
    res.json(plans);
  } catch (error) {
    console.error('[plans] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Create Plan
app.post('/api/plans', requireRole('admin'), async (req, res) => {
  try {
    const plan = await pgClient.createPlan(req.body);
    res.json(plan);
  } catch (error) {
    console.error('[plans] Create error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update Plan
app.put('/api/plans/:code', requireRole('admin'), async (req, res) => {
  try {
    const plan = await pgClient.updatePlan(req.params.code, req.body);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    res.json(plan);
  } catch (error) {
    console.error('[plans] Update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// CANONICAL DB: All database operations use pgClient from pg-client.js
// ============================================================================
// DO NOT use dbAdapter, replitDB, or in-memory stores
// ALL data flows through Postgres via pgClient functions
// ============================================================================

// ---- Inject client binder for uploads.html (no file changes) ----
/* UPLOADS_BIND_INJECT_BEFORE_STATIC */
app.get('/uploads.html', (req, res) => {
  const p = path.join(__dirname, 'public', 'uploads.html');
  try {
    let html = fs.readFileSync(p, 'utf8');
    html = html.replace('</body>', '<script src="/js/uploads.bind.js" defer></script></body>');
    html = html.replace('</body>', '<script src="/js/header.avatar.bind.js" defer></script></body>');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) {
    res.status(500).send('Failed to load uploads.html');
  }
});

// ---- Serve /home.html with binder; alias /profile(.html) -> /home.html
/* HOME_BIND_INJECT */
function serveHome(req, res) {
  const p = path.join(__dirname, 'public', 'home.html');
  try {
    let html = fs.readFileSync(p, 'utf8');
    html = html.replace('</body>', '<script type="module" src="/js/data-store.js"></script></body>');
    html = html.replace('</body>', '<script type="module" src="/js/home.js"></script></body>');
    html = html.replace('</body>', '<script src="/js/header.avatar.bind.js" defer></script></body>');
    html = html.replace('</body>', '<script src="/js/home.upcoming.contact.bind.js" defer></script></body>');
    html = html.replace('</body>', '<script src="/js/home.links.bind.js" defer></script></body>');
    // WP3: Auth scripts
    html = html.replace('</body>', '<script src="/js/auth.js" defer></script></body>');
    html = html.replace('</body>', '<script src="/js/login-modal.js" defer></script></body>');
    html = html.replace('</body>', '<script src="/js/paywall-modal.js" defer></script></body>');
    html = html.replace('</body>', '<script src="/js/share-profile.js" defer></script></body>');
    // WP11: Payment toast notifications
    html = html.replace('</body>', '<script src="/js/payment-toast.js" defer></script></body>');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) { res.status(500).send('Failed to load home.html'); }
}
app.get('/home.html', serveHome);
app.get('/profile.html', (req, res) => res.redirect(302, '/home.html#profile'));
app.get('/profile', (req, res) => res.redirect(302, '/home.html#profile'));
app.get('/account', (req, res) => res.redirect(302, '/home.html#profile'));

// Legacy routes for uploads/documents -> home.html#attachments
app.get('/uploads', (req, res) => res.redirect(302, '/home.html#attachments'));
app.get('/documents', (req, res) => res.redirect(302, '/home.html#attachments'));

// ---- Serve /subscription(.html) with binder
/* SUBSCRIPTION_BIND_INJECT */
function serveSubscription(req, res) {
  const p = path.join(__dirname, 'public', 'subscription.html');
  try {
    let html = fs.readFileSync(p, 'utf8');
    html = html.replace('</body>', '<script src="/js/subscription.bind.js" defer></script></body>');
    html = html.replace('</body>', '<script src="/js/header.avatar.bind.js" defer></script></body>');
    html = html.replace('</body>', '<script src="/js/paywall-modal.js" defer></script></body>');
    // WP11: Payment toast for cancelled payments
    html = html.replace('</body>', '<script src="/js/payment-toast.js" defer></script></body>');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) { res.status(500).send('Failed to load subscription.html'); }
}
app.get('/subscription.html', serveSubscription);
app.get('/subscription', serveSubscription);
app.get('/billing', (req, res) => res.redirect(302, '/subscription.html'));

// ---- Serve /password(.html) with binder
/* PASSWORD_BIND_INJECT */
function servePassword(req, res) {
  const p = path.join(__dirname, 'public', 'password.html');
  try {
    let html = fs.readFileSync(p, 'utf8');
    html = html.replace('</body>', '<script src="/js/password.bind.js" defer></script></body>');
    html = html.replace('</body>', '<script src="/js/header.avatar.bind.js" defer></script></body>');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) { res.status(500).send('Failed to load password.html'); }
}
app.get('/password.html', servePassword);
app.get('/password', servePassword);
app.get('/settings/password', servePassword);

// ---- Serve /profiles(.html) with binder
/* PROFILES_BIND_INJECT */
function serveProfiles(req, res) {
  const p = path.join(__dirname, 'public', 'profiles.html');
  try {
    let html = fs.readFileSync(p, 'utf8');
    html = html.replace('</body>', '<script src="/js/profiles.bind.js" defer></script></body>');
    html = html.replace('</body>', '<script src="/js/header.avatar.bind.js" defer></script></body>');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) { res.status(500).send('Failed to load profiles.html'); }
}
app.get('/profiles.html', serveProfiles);
app.get('/profiles', serveProfiles);

// ---- Serve /availability.html with header unifier
/* AVAILABILITY_HEADER_UNIFY */
function serveAvailability(req, res) {
  const p = path.join(__dirname, 'public', 'availability.html');
  try {
    let html = fs.readFileSync(p, 'utf8');
    html = html.replace('</body>', '<script src="/js/header.avatar.bind.js" defer></script></body>');
    html = html.replace('</body>', '<script src="/js/availability.home.bind.js" defer></script></body>');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) { res.status(500).send('Failed to load availability.html'); }
}
app.get('/availability.html', serveAvailability);
app.get('/availability', serveAvailability);

// ---- Serve /downloads(.html)
function serveDownloads(req, res) {
  const p = path.join(__dirname, 'public', 'downloads.html');
  try {
    let html = fs.readFileSync(p, 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) { res.status(500).send('Failed to load downloads.html'); }
}
app.get('/downloads.html', serveDownloads);
app.get('/downloads', serveDownloads);

// ---- Serve /status2 - public system status page
function serveStatus2(req, res) {
  const p = path.join(__dirname, 'public', 'status2.html');
  try {
    let html = fs.readFileSync(p, 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) { res.status(500).send('Failed to load status2.html'); }
}
app.get('/status2.html', serveStatus2);
app.get('/status2', serveStatus2);

// ---- /for/tutors — dynamic assembly from home.html

function validateHomeStructure(html) {
  const checks = [
    { label: '<main>',    re: /<main[\s>]/g,   expected: 1 },
    { label: '</main>',   re: /<\/main>/g,      expected: 1 },
    { label: '<footer',   re: /<footer[\s>]/g,  expected: 1 },
    { label: '</footer>', re: /<\/footer>/g,     expected: 1 },
    { label: '<title>',   re: /<title>/g,        expected: 1 },
  ];
  for (const c of checks) {
    const count = (html.match(c.re) || []).length;
    if (count !== c.expected) {
      return `home.html structure error: expected ${c.expected} ${c.label}, found ${count}`;
    }
  }
  const sharedMarker = '<!-- Why OpenInterview Section -->';
  if (!html.includes(sharedMarker)) {
    return `home.html missing required marker: ${sharedMarker}`;
  }
  return null;
}

const TUTORS_HERO_HTML = `
                            <section class="w-full bg-white dark:bg-neutral-950 py-16 md:py-24 relative overflow-hidden">
                                <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-100/80 via-transparent to-transparent dark:from-white/3 pointer-events-none -z-10"></div>
                                <div class="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
                                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                                        <!-- Left column: copy -->
                                        <div class="flex flex-col gap-6">
                                            <!-- Eyebrow badge -->
                                            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 w-fit shadow-sm">
                                                <span class="relative flex h-2 w-2">
                                                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                    <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                                </span>
                                                <span class="text-xs font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">For Tutors &amp; Coaches</span>
                                            </div>
                                            <!-- Headline -->
                                            <h1 class="text-4xl font-black leading-tight tracking-tighter md:text-5xl lg:text-6xl text-neutral-900 dark:text-white">
                                                Show parents how you teach before they ever book a session.
                                            </h1>
                                            <!-- Description -->
                                            <p class="text-lg font-normal leading-relaxed text-neutral-600 dark:text-neutral-400">
                                                OpenInterview helps tutors present more than credentials. Instead of relying on a profile photo and a few lines of text, you can show your communication style, clarity, warmth, and confidence in one simple link. Parents and students get a faster, stronger first impression, which helps you earn trust sooner and convert more profile views into real sessions.
                                            </p>
                                            <!-- Bullets -->
                                            <ul class="flex flex-col gap-3">
                                                <li class="flex items-start gap-3 text-neutral-700 dark:text-neutral-300">
                                                    <span class="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-neutral-900 dark:bg-white flex items-center justify-center">
                                                        <svg class="w-3 h-3 text-white dark:text-neutral-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                                                    </span>
                                                    <span class="font-medium">Build trust before the first lesson</span>
                                                </li>
                                                <li class="flex items-start gap-3 text-neutral-700 dark:text-neutral-300">
                                                    <span class="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-neutral-900 dark:bg-white flex items-center justify-center">
                                                        <svg class="w-3 h-3 text-white dark:text-neutral-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                                                    </span>
                                                    <span class="font-medium">Show how clearly you explain concepts</span>
                                                </li>
                                                <li class="flex items-start gap-3 text-neutral-700 dark:text-neutral-300">
                                                    <span class="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-neutral-900 dark:bg-white flex items-center justify-center">
                                                        <svg class="w-3 h-3 text-white dark:text-neutral-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                                                    </span>
                                                    <span class="font-medium">Stand out from text-only tutor profiles</span>
                                                </li>
                                                <li class="flex items-start gap-3 text-neutral-700 dark:text-neutral-300">
                                                    <span class="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-neutral-900 dark:bg-white flex items-center justify-center">
                                                        <svg class="w-3 h-3 text-white dark:text-neutral-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                                                    </span>
                                                    <span class="font-medium">Reduce back-and-forth before booking</span>
                                                </li>
                                                <li class="flex items-start gap-3 text-neutral-700 dark:text-neutral-300">
                                                    <span class="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-neutral-900 dark:bg-white flex items-center justify-center">
                                                        <svg class="w-3 h-3 text-white dark:text-neutral-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                                                    </span>
                                                    <span class="font-medium">Convert more views into real sessions</span>
                                                </li>
                                            </ul>
                                            <!-- CTAs -->
                                            <div class="flex flex-col sm:flex-row gap-4 pt-2">
                                                <a href="/login-page.html" class="inline-flex items-center justify-center rounded-full bg-neutral-900 dark:bg-white px-8 py-4 text-base font-bold text-white dark:text-neutral-900 shadow-sm hover:bg-neutral-700 dark:hover:bg-neutral-100 transition-all hover:scale-105">
                                                    Create Your Free Interview
                                                </a>
                                                <a href="#" class="inline-flex items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-600 bg-transparent px-8 py-4 text-base font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all hover:scale-105">
                                                    See an Example
                                                </a>
                                            </div>
                                        </div>
                                        <!-- Right column: image -->
                                        <div class="flex items-center justify-center lg:justify-end">
                                            <div class="relative w-full max-w-lg">
                                                <div class="absolute inset-0 bg-gradient-to-tr from-neutral-100 to-transparent dark:from-neutral-800 rounded-2xl -z-10 scale-105 blur-xl opacity-60"></div>
                                                <img
                                                    src="/defaults/screenShotOfApp.png"
                                                    alt="OpenInterview profile preview for tutors and coaches"
                                                    class="w-full h-auto rounded-2xl shadow-2xl border border-neutral-100 dark:border-neutral-800"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>`;

function serveForTutors(req, res) {
  const homePath = path.join(__dirname, 'public', 'home.html');
  try {
    const html = fs.readFileSync(homePath, 'utf8');

    // Structural validation — fail loudly before touching anything
    const structErr = validateHomeStructure(html);
    if (structErr) {
      console.error('[serveForTutors]', structErr);
      return res.status(500).send('Page assembly failed: ' + structErr);
    }

    // Block A: <head> (title replaced, no duplicates)
    const HEAD_CLOSE = '</head>';
    const headEnd = html.indexOf(HEAD_CLOSE) + HEAD_CLOSE.length;
    if (headEnd < HEAD_CLOSE.length) throw new Error('</head> not found');
    const headHtml = html.slice(0, headEnd)
      .replace(/<title>[^<]*<\/title>/, '<title>For Tutors &amp; Coaches \u2013 OpenInterview.me</title>');
    if ((headHtml.match(/<title>/g) || []).length !== 1) {
      throw new Error('Title replacement produced duplicate <title> tags');
    }

    // Block B: body open + wrapper divs + header nav (</head> → <main)
    const mainOpenIdx = html.indexOf('<main');
    if (mainOpenIdx === -1) throw new Error('<main> not found');
    const bodyAndHeader = html.slice(headEnd, mainOpenIdx);

    // Block D: shared sections (<!-- Why OI --> → just before </main>)
    const SHARED_MARKER = '<!-- Why OpenInterview Section -->';
    const sharedStart = html.indexOf(SHARED_MARKER);
    const mainCloseIdx = html.indexOf('</main>');
    if (sharedStart >= mainCloseIdx) {
      throw new Error('Shared marker appears after </main> — unexpected structure');
    }
    const sharedContent = html.slice(sharedStart, mainCloseIdx);

    // Block E: footer + closing wrapper divs + ALL scripts (<footer → </body>)
    // Slicing from <footer to lastIndexOf('</body>') captures everything intact:
    // closing </div>s, all <script> blocks, module scripts. No surgical script slicing needed.
    const footerIdx = html.indexOf('<footer');
    if (footerIdx === -1) throw new Error('<footer not found');
    const bodyCloseIdx = html.lastIndexOf('</body>');
    if (bodyCloseIdx === -1) throw new Error('</body> not found');
    const footerAndScripts = html.slice(footerIdx, bodyCloseIdx);

    // Assemble
    const page = [
      headHtml,
      bodyAndHeader,
      '\n                        <main class="w-full">',
      TUTORS_HERO_HTML,
      '\n\n                            ',
      sharedContent,
      '\n                        </main>',
      '\n                        ',
      footerAndScripts,
      '\n    </body>\n</html>',
    ].join('');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(page);
  } catch (err) {
    console.error('[serveForTutors] Assembly error:', err.message);
    res.status(500).send('Failed to assemble tutors page: ' + err.message);
  }
}

app.get('/for/tutors', serveForTutors);
app.get('/for/tutors-coaches', serveForTutors);

// ---- Serve /profile/new with new interview editor
function serveNewProfile(req, res) {
  const p = path.join(__dirname, 'public', 'profile_v4_1_package', 'public', 'index.html');
  try {
    let html = fs.readFileSync(p, 'utf8');
    html = html.replace('</body>', '<script type="module" src="/js/data-store.js"></script></body>');
    html = html.replace('</body>', '<script type="module" src="/js/asset-library.js"></script></body>');
    html = html.replace('</body>', '<script type="module" src="/js/profile-editor.js"></script></body>');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) { res.status(500).send('Failed to load profile template'); }
}
app.get('/profile/new', serveNewProfile);

// ---- Serve /profile/:id with BOTH view and edit capabilities
function serveProfileView(req, res) {
  const p = path.join(__dirname, 'public', 'profile_v4_1_package', 'public', 'index.html');
  try {
    let html = fs.readFileSync(p, 'utf8');
    // Inject all scripts for both view and edit modes
    html = html.replace('</body>', '<script type="module" src="/js/data-store.js"></script></body>');
    html = html.replace('</body>', '<script type="module" src="/js/asset-library.js"></script></body>');
    html = html.replace('</body>', '<script type="module" src="/js/profile-editor.js"></script></body>');
    // Inject owner-bind script for Edit Profile button on view mode
    html = html.replace('</body>', '<script type="module" src="/js/public_profile.owner.bind.js"></script></body>');
    // WP3: Auth scripts for share functionality
    html = html.replace('</body>', '<script src="/js/auth.js" defer></script></body>');
    html = html.replace('</body>', '<script src="/js/login-modal.js" defer></script></body>');
    html = html.replace('</body>', '<script src="/js/paywall-modal.js" defer></script></body>');
    html = html.replace('</body>', '<script src="/js/share-profile.js" defer></script></body>');

    html = html.replace('</body>', '<script src="/js/guest-profile-handler.js" defer></script></body>');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) { res.status(500).send('Failed to load profile page'); }
}
app.get('/profile/:id', serveProfileView);

// ---- Serve availability editor for profiles
function serveProfileAvailability(req, res) {
  const p = path.join(__dirname, 'public', 'availability.html');
  try {
    let html = fs.readFileSync(p, 'utf8');
    html = html.replace('</body>', '<script type="module" src="/js/data-store.js"></script></body>');
    html = html.replace('</body>', '<script type="module" src="/js/availability.js"></script></body>');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) { res.status(500).send('Failed to load availability editor'); }
}
app.get('/availability/:id', serveProfileAvailability);

// ---- Serve public profile with booking binder
/* PUBLIC_PROFILE_BOOK_BIND */
async function servePublicProfile(req, res) {
  const p = path.join(__dirname, 'public', 'public_profile.html');
  try {
    // Check view limits if handle is present
    const handle = req.params.handle;
    if (handle) {
      try {
        const profile = await pgClient.getProfileByHandle(handle);
        if (profile) {
          const entitlement = await pgClient.getEntitlement(profile.userId);
          if (entitlement) {
            const plan = await pgClient.getPlanByCode(entitlement.plan || 'free');
            
            // Check if views limit is applicable and exceeded
            // Note: plan object uses camelCase (viewsLimit), entitlement uses camelCase (viewsUsed)
            if (plan && plan.viewsLimit !== null && plan.viewsLimit !== undefined) {
              const limit = BigInt(plan.viewsLimit);
              const used = BigInt(entitlement.viewsUsed || 0);
              
              if (used >= limit) {
                // Limit reached! Serve error modal page
                const errorHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8"/>
    <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
    <title>Profile Unavailable - OpenInterview.me</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet"/>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
    <style>
      body { font-family: 'Inter', sans-serif; }
    </style>
    <script>
      tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            colors: {
              "primary": "#141414",
              "background-light": "#f7f7f7",
              "background-dark": "#191919",
              "foreground-light": "#141414",
              "foreground-dark": "#f7f7f7",
              "muted-light": "#737373",
              "muted-dark": "#a3a3a3",
            }
          }
        }
      }
    </script>
</head>
<body class="bg-background-light dark:bg-background-dark text-foreground-light dark:text-foreground-dark flex items-center justify-center min-h-screen">
  <div class="relative w-full max-w-md p-6 mx-4">
    <div class="relative flex flex-col overflow-hidden bg-white dark:bg-background-dark rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800">
        <div class="p-8 pt-12 text-center">
            <div class="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-6">
                <span class="material-symbols-outlined text-4xl text-red-600 dark:text-red-500" style="font-size: 40px;">error</span>
            </div>
            <h2 class="text-2xl font-bold text-primary dark:text-neutral-50 mb-2">Profile Unavailable</h2>
            <p class="text-muted-light dark:text-muted-dark text-base font-normal leading-normal mb-1">
                This profile has reached its view limit.
            </p>
             <p class="text-xs text-muted-light dark:text-muted-dark">
                Owner Plan: ${plan.name} (Limit: ${limit})
            </p>
        </div>
        <div class="px-8 pb-8">
            <a href="/" class="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-primary text-neutral-50 text-base font-bold leading-normal tracking-wide hover:bg-primary/90 dark:hover:bg-primary/80 transition-colors">
                <span class="truncate">Go Home</span>
            </a>
        </div>
    </div>
  </div>
</body>
</html>`;
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                return res.send(errorHtml);
              }
            }
          }
        }
      } catch (err) {
        console.error('[servePublicProfile] Error checking limits:', err);
        // Fail open: continue to serve profile
      }
    }

    let html = fs.readFileSync(p, 'utf8');
    html = html.replace('</body>', '<script type="module" src="/js/public_profile.book.bind.js" defer></script></body>');
    // WP7: Add paywall banner script
    html = html.replace('</body>', '<script src="/js/public_profile.paywall.bind.js" defer></script></body>');
    // WP13: Analytics tracking
    html = html.replace('</body>', '<script src="/js/analytics.track.js" defer></script></body>');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) { res.status(404).send('profile_public.html not found'); }
}
app.get('/u/:handle', servePublicProfile);
app.get('/profile_public.html', servePublicProfile);

// ---- Enhanced editor page
app.get("/profile_edit_enhanced.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "profile_edit_enhanced.html"));
});

// ---- Serve classic editor page directly with guest handler
app.get("/profile_edit.html", (req, res) => {
  const filePath = path.join(__dirname, "public", "profile_edit.html");
  try {
    let html = fs.readFileSync(filePath, 'utf8');
    // Inject guest profile handler script
    html = html.replace('</body>', '<script src="/js/guest-profile-handler.js" defer></script></body>');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) {
    res.status(500).send('Failed to load profile_edit.html');
  }
});

// ---- Serve profiles v2 list page
/* PROFILES_V2_ROUTE */
function serveProfilesV2(req, res) {
  const p = path.join(__dirname, 'public', 'profiles_v2.html');
  try {
    const html = fs.readFileSync(p, 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) { res.status(404).send('profiles_v2.html not found'); }
}
app.get('/profiles_v2.html', serveProfilesV2);
app.get('/profiles_v2', serveProfilesV2);

// ---- Serve profile v2 detail page (uses static JSON data)
/* PROFILE_V2_ROUTE */
function serveProfileV2(req, res) {
  const p = path.join(__dirname, 'public', 'profile_pagev2.html');
  try {
    const html = fs.readFileSync(p, 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) { res.status(404).send('profile_pagev2.html not found'); }
}
app.get('/profile_pagev2.html', serveProfileV2);
app.get('/v2/:handle', serveProfileV2);

// ---- Serve booking manage page with binder
/* BOOKING_MANAGE_BIND */
function serveBookingManage(req, res) {
  const p = path.join(__dirname, 'public', 'booking_manage.html');
  try {
    let html = fs.readFileSync(p, 'utf8');
    html = html.replace('</body>', '<script src="/js/booking_manage.bind.js" defer></script></body>');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) { res.status(500).send('Failed to load booking_manage.html'); }
}
app.get('/booking_manage.html', serveBookingManage);
app.get('/booking/manage/:token', serveBookingManage);

// Cloudinary video upload signing endpoint (MUST be before static middleware)
app.post("/api/v1/upload/sign", async (req, res) => {
  const {
    folder = 'openinterview/assets',
    public_id,
    profileId = 'anonymous',
    resource_type
  } = req.body || {};

  const {
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
  } = process.env;
  const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'oi_signed_videos';

  // Validate required env vars
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return res.status(500).json({
      error: 'Cloudinary not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.'
    });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const finalFolder = `${folder}/${profileId}`;

  // Build parameters to sign (note: resource_type must NOT be included in signature)
  const paramsToSign = {
    folder: finalFolder,
    timestamp,
    upload_preset: CLOUDINARY_UPLOAD_PRESET,
  };

  if (public_id) {
    paramsToSign.public_id = public_id;
  }

  // Generate signature according to Cloudinary spec
  const toSign = Object.keys(paramsToSign)
    .sort()
    .map(k => `${k}=${paramsToSign[k]}`)
    .join('&');

  const crypto = await import('crypto');
  const signature = crypto.createHash('sha1')
    .update(`${toSign}${CLOUDINARY_API_SECRET}`)
    .digest('hex');

  // Return all necessary data for client-side upload
  res.json({
    timestamp,
    signature,
    apiKey: CLOUDINARY_API_KEY,
    cloudName: CLOUDINARY_CLOUD_NAME,
    uploadPreset: CLOUDINARY_UPLOAD_PRESET,
    folder: finalFolder,
    public_id: public_id || undefined,
    resource_type: resource_type || 'auto'
  });
});



// Serve test output files
app.use('/test_output', express.static(path.join(__dirname, "test_output")));

// Serve QA artifacts
app.use('/qa', express.static(path.join(__dirname, "qa")));

// WP3: Serve login page with auth scripts
function serveLoginPage(req, res) {
  const p = path.join(__dirname, 'public', 'login-page.html');
  try {
    let html = fs.readFileSync(p, 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) {
    // Fallback to original login.html
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
  }
}
app.get('/login-page.html', serveLoginPage);
app.get('/signin', serveLoginPage);
app.get('/signup', serveLoginPage);

// Help Center — single shell; slug drives client-side content from /js/help-center/pages.json
const HELP_DOC_SLUGS = new Set([
  'dashboard',
  'create-first-openinterview',
  'edit-profile',
  'share-profile',
  'create-new-openinterview'
]);
app.get('/docs/help/:slug', (req, res) => {
  if (!HELP_DOC_SLUGS.has(req.params.slug)) {
    return res.status(404).type('html').send('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Not found</title></head><body><p>Not found</p></body></html>');
  }
  res.sendFile(path.join(__dirname, 'public', 'docs', 'help', 'index.html'));
});

// Serve React app assets (CSS, JS) at root level
app.use('/assets', express.static(path.join(__dirname, "dist/public/assets")));

// Serve React app from /dist/public at /app route
app.use('/app', express.static(path.join(__dirname, "dist/public")));

// Serve React app SPA fallback
app.get('/app/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/public/index.html'));
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_req, res) => res.redirect("/home.html"));

// Auth - LEGACY ENDPOINT REMOVED
// Use /auth/login (Passport) instead - see server/auth/routes.js

// WP13: Metrics - Real analytics from Postgres
app.get("/api/metrics", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id; // Use authenticated user, not query param
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    // Get user's profiles from Postgres
    const profiles = await pgClient.listProfilesByUser(userId);

    // Calculate real analytics from profiles
    let totalViews = 0;
    let totalBookings = 0;
    profiles.forEach(p => {
      totalViews += p.viewCount || 0;
      totalBookings += p.bookingCount || 0;
    });

    // Get bookings count from Postgres
    const bookings = await pgClient.getBookingsByOwner(userId);
    const totalInterviews = bookings.length;

    res.json({
      totalInterviews,
      totalViews,
      totalShares: profiles.filter(p => p.visibility === 'public').length
    });
  } catch (error) {
    console.error('[metrics] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// WP13: Interviews (Bookings) - Real data from Postgres
app.get("/api/interviews", async (req, res) => {
  try {
    const { scope, userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    // Get bookings from Postgres (interviews = bookings)
    let rows = await pgClient.getBookingsByOwner(userId);

    // Filter by scope if provided
    const now = new Date();
    if (scope === "upcoming") {
      rows = rows.filter(b => {
        const bookingDate = new Date(`${b.scheduled_date}T${b.scheduled_time}:00`);
        return bookingDate > now;
      });
    }

    // Format for frontend (map to interview format)
    const formatted = rows.map(b => ({
      id: b.id,
      userId: b.owner_id,
      when: `${b.scheduled_date}T${b.scheduled_time}:00`,
      startTime: b.start_time ? new Date(b.start_time).toISOString() : new Date(`${b.scheduled_date}T${b.scheduled_time}:00`).toISOString(),
      duration: b.duration,
      with: b.booker_name,
      status: b.status
    }));

    res.json(formatted);
  } catch (error) {
    console.error('[interviews] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/interviews/:id", async (req, res) => {
  try {
    // Delete booking from Postgres
    const booking = await pgClient.getBookingById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    // Update status to cancelled instead of deleting
    await pgClient.updateBooking(req.params.id, { status: 'cancelled' });
    res.status(204).end();
  } catch (error) {
    console.error('[interviews/delete] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Files (library) - WP1/WP2: Uses pgClient (Postgres)
app.get("/api/files", optionalAuth, async (req, res) => {
  const { userId, profileId } = req.query;
  if (!userId && !profileId) return res.status(400).json({ error: 'Missing userId or profileId' });
  try {
    let rows;
    if (profileId) {
      const profile = await pgClient.getProfile(profileId);
      if (!profile || profile.visibility === 'deleted') {
        return res.status(404).json({ error: 'Profile not found' });
      }
      if (profile.visibility === 'public') {
        const allowed = await recruiterMayViewPublicProfile(req, profile);
        if (!allowed) {
          return res.status(401).json({
            error: 'Unauthorized',
            code: 'PUBLIC_GRANT_REQUIRED',
            message: 'Use the share link you received to open this profile.'
          });
        }
      }
      rows = await pgClient.listFilesByProfile(profileId);
    } else {
      rows = await pgClient.listFilesByUser(userId);
    }
    res.json(rows);
  } catch (e) {
    console.error('[files] Error listing files:', e);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

app.post("/api/files", async (req, res) => {
  try {
    const { userId, profileId, name, mime, url, kind, public_id } = req.body || {};
    const fileData = {
      id: `file_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      userId,
      profileId,
      name: name || `file_${Date.now()}.pdf`,
      mime: mime || "application/pdf",
      sizeLabel: "1MB",
      url: url || "#",
      kind: kind || 'attachment',
      public_id: public_id || null
    };
    const created = await pgClient.createFile(fileData);
    res.json(created);
  } catch (e) {
    console.error('[files] Error creating file:', e);
    res.status(500).json({ error: 'Failed to create file' });
  }
});

app.patch("/api/files/:id", async (req, res) => {
  try {
    const file = await pgClient.getFile(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });
    // Note: pgClient doesn't have updateFile, so this is a placeholder
    // For M1, we don't need file updates - files are immutable
    res.json(file);
  } catch (e) {
    console.error('[files] Error updating file:', e);
    res.status(500).json({ error: 'Failed to update file' });
  }
});

app.delete("/api/files/:id", async (req, res) => {
  try {
    const fileId = req.params.id;

    // Get the file to check if it exists and get its URL for filesystem cleanup
    const file = await pgClient.getFile(fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }


    if (file.public_id) {
      // It's a Cloudinary file, delete it from cloud
      try {
        const { v2: cloudinary } = await import('cloudinary');
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        let resourceType = 'raw';
        if (file.mime && file.mime.startsWith('image/')) resourceType = 'image';
        else if (file.mime && file.mime.startsWith('video/')) resourceType = 'video';

        await cloudinary.uploader.destroy(file.public_id, { resource_type: resourceType });
        console.log(`[files] Deleted from Cloudinary: ${file.public_id}`);
      } catch (cloudError) {
        console.error(`[files] Failed to delete from Cloudinary: ${cloudError.message}`);
        // Continue to delete from DB even if cloud delete fails
      }
    }
    // Delete the file from the database
    await pgClient.deleteFile(fileId);

    // WP: Release storage quota
    try {
      if (file.size_bytes && file.size_bytes > 0) {
        const type = file.kind === 'video' ? 'video' : 'doc';
        await pgClient.atomicUpdateStorageUsage(file.user_id, type, -file.size_bytes, false); // false = don't check limit for reduction
        console.log(`[files] Released ${file.size_bytes} bytes of ${type} storage for user ${file.user_id}`);
      }
    } catch (quotaError) {
      console.error('[files] Failed to release storage quota:', quotaError);
    }

    // Delete the physical file from filesystem if it exists
    if (file.url && file.url.startsWith('/uploads/')) {
      const filename = file.url.replace('/uploads/', '');
      const filepath = path.join(__dirname, 'public', 'uploads', filename);
      try {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
          console.log('[files] Deleted physical file:', filename);
        }
      } catch (fsError) {
        console.error('[files] Error deleting physical file:', fsError);
        // Continue anyway - database record is deleted
      }
    }

    res.status(204).end();
  } catch (e) {
    console.error('[files] Error deleting file:', e);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Assets (shared resumes and attachments across profiles) - PostgreSQL backed
app.get("/api/v1/assets", async (req, res) => {
  if (!dbClient) {
    return res.status(503).json({ error: "Database not configured" });
  }
  try {
    const { type } = req.query;

    let results;
    if (type) {
      results = await dbClient.select().from(assets).where(eq(assets.type, type));
    } else {
      results = await dbClient.select().from(assets);
    }

    // Map database columns to frontend expected format (url instead of storageUrl)
    const formattedAssets = results.map(asset => ({
      id: asset.id,
      type: asset.type,
      name: asset.name,
      url: asset.storageUrl || "",
      uploadedAt: asset.uploadedAt,
      ownerUserId: asset.ownerUserId,
      tags: asset.tags || []
    }));

    res.json(formattedAssets);
  } catch (error) {
    console.error("Error listing assets:", error);
    res.status(500).json({ error: "Failed to list assets" });
  }
});

app.get("/api/v1/assets/:id", async (req, res) => {
  if (!dbClient) {
    return res.status(503).json({ error: "Database not configured" });
  }
  try {
    const result = await dbClient.select().from(assets).where(eq(assets.id, req.params.id));

    if (result.length === 0) {
      return res.status(404).json({ error: "Asset not found" });
    }

    const asset = result[0];
    res.json({
      id: asset.id,
      type: asset.type,
      name: asset.name,
      url: asset.storageUrl || "",
      uploadedAt: asset.uploadedAt,
      ownerUserId: asset.ownerUserId,
      tags: asset.tags || []
    });
  } catch (error) {
    console.error("Error getting asset:", error);
    res.status(500).json({ error: "Failed to get asset" });
  }
});

app.post("/api/v1/assets", async (req, res) => {
  if (!dbClient) {
    return res.status(503).json({ error: "Database not configured" });
  }
  try {
    const { id, type, name, url, ownerUserId, tags } = req.body || {};

    const assetData = {
      id: id || `asset_${type || 'att'}_${uuid().slice(0, 8)}`,
      type: type || "attachment",
      name: name || `${type || 'attachment'}-${Date.now()}`,
      storageUrl: url || "",
      ownerUserId: ownerUserId || "me",
      tags: tags || []
    };

    const result = await dbClient.insert(assets).values(assetData).returning();
    const created = result[0];

    res.status(201).json({
      id: created.id,
      type: created.type,
      name: created.name,
      url: created.storageUrl || "",
      uploadedAt: created.uploadedAt,
      ownerUserId: created.ownerUserId,
      tags: created.tags || []
    });
  } catch (error) {
    console.error("Error creating asset:", error);
    res.status(500).json({ error: "Failed to create asset" });
  }
});

app.delete("/api/v1/assets/:id", profileRateLimiter, async (req, res) => {
  if (!dbClient) {
    return res.status(503).json({ error: "Database not configured" });
  }
  try {
    const result = await dbClient.delete(assets).where(eq(assets.id, req.params.id)).returning();

    if (result.length === 0) {
      return res.status(404).json({ error: "Asset not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting asset:", error);
    res.status(500).json({ error: "Failed to delete asset" });
  }
});

// Rate limiting for profiles is applied selectively on write endpoints.

// Profiles list (PostgreSQL) - returns current user's profiles
app.get("/api/profiles", optionalAuth, async (req, res) => {
  try {
    const userId = (req.query.userId || req.user?.id);
    if (!userId) return res.json([]);
    const list = await pgClient.listProfilesByUser(userId);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// WP2: Get current user's profile (PostgreSQL)
app.get("/api/profiles/mine", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    let profile = await pgClient.getProfileByUserId(userId);

    if (!profile) {
      // Create profile if none exists
      const profileId = `prof_${Date.now().toString(36)}`;
      profile = await pgClient.createProfile({
        id: profileId,
        userId: userId,
        person: { name: req.user.name || '' },
        contact: { email: req.user.email || '' },
        isDefault: true
      });

      // Ensure database consistency
      await pgClient.ensureSingleDefaultProfile(userId);
    }

    // Fetch availability data
    const availability = await pgClient.getAvailability(profile.id);
    if (availability) {
      profile.availability = availability;
    }

    res.json(profile);
  } catch (error) {
    console.error('[profiles/mine] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/profiles/default", async (req, res) => {
  try {
    const { userId } = req.query;
    const profile = await pgClient.getProfileByUserId(userId);
    if (!profile) return res.status(404).send("no profiles");

    // Fetch availability data
    const availability = await pgClient.getAvailability(profile.id);
    if (availability) {
      profile.availability = availability;
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// WP: Public profile by handle (for public views) - PostgreSQL
app.get('/api/public/profile/:handle', optionalAuth, async (req, res) => {
  try {
    const handle = req.params.handle;

    // 1. Fetch from Postgres
    let p = await pgClient.getProfileByHandle(handle);

    if (!p) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const allowed = await recruiterMayViewPublicProfile(req, p);
    if (!allowed) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'PUBLIC_GRANT_REQUIRED',
        message: 'Use the share link you received to open this profile.'
      });
    }

    // 2. Fetch availability
    try {
      const av = await pgClient.getAvailability(p.id);
      if (av) {
        p.availability = av;
      } else {
        // Enforce default empty availability if not found
        p.availability = {
          slots: [],
          timezone: 'UTC',
          windowDays: 60,
          durationMinutes: 30,
          rules: { windowDays: 60, durationMinutes: 30 }
        };
      }
    } catch (err) {
      console.error('[profiles] Failed to fetch availability for public profile:', err);
      // Fallback to safe default
      p.availability = {
        timezone: 'UTC',
        windowDays: 60,
        durationMinutes: 30,
        weekly: {},
        rules: { windowDays: 60, durationMinutes: 30 }
      };
      //p.availability = { slots: [], timezone: 'UTC', windowDays: 60, durationMinutes: 30, rules: { windowDays: 60, durationMinutes: 30 } };


    }

    try {
      const pool = pgClient.getPool();
      const windowDays = Number(p?.availability?.rules?.windowDays ?? p?.availability?.windowDays ?? 60);
      const now = new Date();
      // const lower = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      // const upper = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000).toISOString();
      const lower = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const upper = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);
      const { rows } = await pool.query(
        `
          SELECT start_time, duration, status
          FROM bookings
          WHERE profile_id = $1
            AND status IN ('pending','confirmed')
            AND start_time BETWEEN $2 AND $3
          ORDER BY start_time ASC
        `,
        [p.id, lower, upper]
      );
      p.bookings = rows.map(r => ({
        startTime: new Date(r.start_time).toISOString(),
        duration: r.duration,
        status: String(r.status || '').toLowerCase()
      }));
    } catch (err) {
      console.error('[profiles] Failed to fetch active bookings for public profile:', err);
      p.bookings = [];
    }

    // 3. Apply defaults for avatar/video
    const { DEFAULT_AVATAR_URL, DEFAULT_VIDEO_URL } = await import('./server/config/defaults.js');
    if (!p.avatar_url) p.avatar_url = DEFAULT_AVATAR_URL;
    if (!p.video_url) p.video_url = DEFAULT_VIDEO_URL;

    res.json(p);
  } catch (e) {
    console.error('[profiles] Error fetching public profile:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/profiles/:id", async (req, res) => {
  try {
    const profile = await pgClient.getProfile(req.params.id);
    if (!profile || profile.visibility === 'deleted') return res.status(404).end();

    // Fetch availability data
    const availability = await pgClient.getAvailability(req.params.id);
    if (availability) {
      profile.availability = availability;
    }

    // WP01 Enhancement: Add default assets if custom not uploaded
    const { DEFAULT_AVATAR_URL, DEFAULT_VIDEO_URL } = await import('./server/config/defaults.js');

    // Apply defaults only if fields are null/empty - no duplicate fields
    if (!profile.avatar_url) {
      profile.avatar_url = DEFAULT_AVATAR_URL;
    }
    if (!profile.video_url) {
      profile.video_url = DEFAULT_VIDEO_URL;
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/profiles/:id", profileRateLimiter, async (req, res) => {
  try {
    const profile = await pgClient.getProfile(req.params.id);
    if (!profile || profile.visibility === 'deleted') return res.status(404).end();

    const updates = req.body || {};

    // Separate availability from profile updates
    const { availability, ...profileUpdates } = updates;

    // Update profile fields if any
    let updated = profile;
    if (Object.keys(profileUpdates).length > 0) {
      updated = await pgClient.updateProfile(req.params.id, profileUpdates);
    }

    // Update availability if provided
    if (availability) {
      const updatedAvailability = await pgClient.updateAvailability(req.params.id, availability);
      // Attach to response
      updated.availability = updatedAvailability;
    } else {
      // If not updating, fetch existing to include in response (optional but good for consistency)
      const existingAvailability = await pgClient.getAvailability(req.params.id);
      if (existingAvailability) {
        updated.availability = existingAvailability;
      }
    }

    res.json(updated);
  } catch (error) {
    console.error('[profiles/patch] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/profiles/:id", requireAuth, profileRateLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    const profileId = req.params.id;

    // 1. Soft delete in DB and get files to cleanup
    const filesToDelete = await pgClient.softDeleteProfile(userId, profileId);

    // 2. Delete files from Cloudinary
    if (filesToDelete && filesToDelete.length > 0) {
      try {
        // Dynamic import if not already available
        const { v2: cloudinary } = await import('cloudinary');
        
        // Ensure config
        if (process.env.CLOUDINARY_CLOUD_NAME) {
             cloudinary.config({
                cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                api_key: process.env.CLOUDINARY_API_KEY,
                api_secret: process.env.CLOUDINARY_API_SECRET
            });
        }

        // Delete in parallel
        await Promise.all(filesToDelete.map(file => 
          cloudinary.uploader.destroy(file.public_id, { resource_type: file.resource_type })
            .catch(err => console.error(`[profile-delete] Failed to delete Cloudinary asset ${file.public_id}:`, err))
        ));
        
        console.log(`[profile-delete] Deleted ${filesToDelete.length} assets from Cloudinary`);
      } catch (e) {
        console.error('[profile-delete] Cloudinary cleanup error:', e);
        // Don't fail the request since DB part is done
      }
    }

    // 3. Ensure a default profile exists if we deleted the default one
    await pgClient.ensureSingleDefaultProfile(userId);

    res.json({ success: true });
  } catch (error) {
    console.error('[profile-delete] Error:', error);
    res.status(500).json({ error: error.message });
  }
});
app.patch("/api/profiles/:id/default", requireAuth, profileRateLimiter, async (req, res) => {
  try {
    const id = req.params.id;
    const profile = await pgClient.getProfile(id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    // Verify ownership - user can only set their own profiles as default
    if (profile.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized: You can only set your own profiles as default' });
    }

    // Set all user's profiles to non-default, then set this one to default
    const userProfiles = await pgClient.listProfilesByUser(profile.userId);
    for (const p of userProfiles) {
      if (p.id !== id && p.is_default) {
        await pgClient.updateProfile(p.id, { isDefault: false });
      }
    }

    const updated = await pgClient.updateProfile(id, { isDefault: true });
    res.json(updated);
  } catch (e) {
    console.error('[profiles/default] Error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/link-guest-profile", requireAuth, profileRateLimiter, async (req, res) => {
  try {
    const { profileId } = req.body;
    const userId = req.user.id;

    if (!profileId) {
      return res.status(400).json({ error: 'profileId required' });
    }

    const profile = await pgClient.getProfile(profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    // Get the user who owns this profile
    const profileOwner = await pgClient.getUser(profile.userId);
    if (!profileOwner) {
      return res.status(404).json({ error: 'Profile owner not found' });
    }

    // Check if profile belongs to an anonymous user (can be linked)
    if (profileOwner.status !== 'anonymous') {
      return res.status(400).json({ error: 'Profile already linked to a registered user' });
    }

    // SPECIAL CASE: If the logged-in user IS the anonymous user (signup scenario)
    if (profile.userId === userId) {
      // Just update the user status from anonymous to registered
      await pgClient.updateUser(userId, { status: 'registered' });
      console.log(`[link-profile] Updated anonymous user ${userId} to registered status`);
      return res.json({
        success: true,
        profile: profile,
        message: 'Anonymous user converted to registered user'
      });
    }


    // // Check if profile belongs to a guest user OR anonymous user
    // if (!profile.userId.startsWith('guest_') && !profile.userId.startsWith('usr_')) {
    //   return res.status(400).json({ error: 'Profile already linked to a user' });
    // }

    // // Additional check: if usr_ prefix, verify it's actually anonymous
    // if (profile.userId.startsWith('usr_')) {
    //   const anonymousUser = await pgClient.getUser(profile.userId);
    //   if (!anonymousUser || anonymousUser.status !== 'anonymous') {
    //     return res.status(400).json({ error: 'Profile already linked to a registered user' });
    //   }

    //   // SPECIAL CASE: If the logged-in user IS the anonymous user (signup scenario)
    //   if (profile.userId === userId) {
    //     // Just update the user status from anonymous to registered
    //     await pgClient.updateUser(userId, { status: 'registered' });
    //     console.log(`[link-profile] Updated anonymous user ${userId} to registered status`);
    //     return res.json({ 
    //       success: true, 
    //       profile: profile,
    //       message: 'Anonymous user converted to registered user'
    //     });
    //   }
    // }

    const guestId = profile.userId;

    // Check if the authenticated user already has profiles
    const userProfiles = await pgClient.listProfilesByUser(userId);
    const hasExistingDefault = userProfiles.some(p => p.is_default);

    // Determine if the guest profile should remain default
    let shouldBeDefault = profile.is_default;
    if (hasExistingDefault && profile.is_default) {
      // If user already has a default profile and guest profile is also default,
      // we need to decide which one should be default
      // Option 1: Keep the existing user's default (set guest profile to non-default)
      shouldBeDefault = false;
      console.log(`[link-profile] User ${userId} already has a default profile, setting guest profile to non-default`);
    } else if (!hasExistingDefault && !profile.is_default) {
      // If user has no default profile and guest profile is not default, make guest profile default
      shouldBeDefault = true;
      console.log(`[link-profile] User ${userId} has no default profile, setting guest profile as default`);
    }

    // Link profile to authenticated user
    const updated = await pgClient.updateProfile(profileId, {
      userId: userId,
      isDefault: shouldBeDefault
    });

    // Ensure database consistency - only one default profile per user
    await pgClient.ensureSingleDefaultProfile(userId);

    // Update any files owned by guest
    try {
      const pool = pgClient.getPool();
      await pool.query('UPDATE files SET user_id = $1 WHERE user_id = $2', [userId, guestId]);
    } catch (fileError) {
      console.error('[link-profile] Error updating files:', fileError);
      // Continue even if file update fails
    }

    console.log(`[link-profile] Linked guest profile ${profileId} (guest: ${guestId}) to user ${userId}`);

    res.json({
      success: true,
      profile: updated
    });
  } catch (error) {
    console.error('[link-profile] Error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Link guest profile to authenticated user (Resume-First Flow)
// app.post("/api/link-guest-profile", requireAuth, async (req, res) => {
//   try {
//     const { profileId } = req.body;
//     const userId = req.user.id;

//     if (!profileId) {
//       return res.status(400).json({ error: 'profileId required' });
//     }

//     const profile = await pgClient.getProfile(profileId);
//     if (!profile) {
//       return res.status(404).json({ error: 'Profile not found' });
//     }

//     console.log("i foudn id as user nt the guest ",profile);

//     // Check if profile belongs to a guest user OR anonymous user
//     if (!profile.userId.startsWith('guest_') && !profile.userId.startsWith('usr_')) {
//       return res.status(400).json({ error: 'Profile already linked to a user' });
//     }

//     // Additional check: if usr_ prefix, verify it's actually anonymous
//     if (profile.userId.startsWith('usr_')) {
//       const user = await pgClient.getUser(profile.userId);
//       if (!user || user.status !== 'anonymous') {
//         return res.status(400).json({ error: 'Profile already linked to a registered user' });
//       }
//     }

//     const guestId = profile.userId;

//     // Link profile to authenticated user
//     const updated = await pgClient.updateProfile(profileId, { 
//       userId: userId
//     });

//     // Update any files owned by guest
//     try {
//       const pool = pgClient.getPool();
//       await pool.query('UPDATE files SET user_id = $1 WHERE user_id = $2', [userId, guestId]);
//     } catch (fileError) {
//       console.error('[link-profile] Error updating files:', fileError);
//       // Continue even if file update fails
//     }

//     console.log(`[link-profile] Linked guest profile ${profileId} (guest: ${guestId}) to user ${userId}`);

//     res.json({ 
//       success: true, 
//       profile: updated 
//     });
//   } catch (error) {
//     console.error('[link-profile] Error:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// Attachments and resume endpoints - simplified for M1
app.post("/api/profiles/:id/attachments", profileRateLimiter, async (req, res) => {
  try {
    const profile = await pgClient.getProfile(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    // Attachments handling deferred to later milestones
    res.json(profile);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/profiles/:id/attachments/:fileId", profileRateLimiter, async (req, res) => {
  try {
    const profile = await pgClient.getProfile(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    // Attachments handling deferred to later milestones
    res.json(profile);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch("/api/profiles/:id/resume", profileRateLimiter, async (req, res) => {
  try {
    const profile = await pgClient.getProfile(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const updated = await pgClient.updateProfile(req.params.id, { resume_file_id: req.body?.fileId || null });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Availability

// NOTE: Public profile JSON is served only by the earlier app.get('/api/public/profile/:handle', ...) handler.
// A duplicate route lived here previously; it was removed so private profiles cannot be fetched by UUID via this path.

// WP7: Check profile owner's booking/share status (for paywall banner) - PostgreSQL
app.get("/api/profiles/status/:ownerId", async (req, res) => {
  try {
    const { ownerId } = req.params;
     const bypass = String(process.env.BYPASS_BOOKING_LIMITS || '').toLowerCase() === 'true';
  
console.log("bypassing value env ",process.env.BYPASS_BOOKING_LIMITS);
     console.log("bypassing value is ",bypass);
    
    // Get owner's entitlement (PostgreSQL)
    const entitlement = await pgClient.getEntitlement(ownerId);
    // WP: Get comprehensive plan limits including storage
    const storageLimits = await pgClient.getActivePlanLimits(ownerId);

    if (!entitlement) {
      // Default free plan
      return res.json({
        plan: 'free',
        sharesExceeded: false,
        bookingsExceeded: false,
        limitExceeded: false,
        storage: storageLimits // Include default storage limits
      });
    }

    const effectiveSharesLimit = entitlement.sharesLimit === null ? Infinity : (entitlement.sharesLimit ?? 1);
    const effectiveBookingsLimit = entitlement.bookingsLimit === null ? Infinity : (entitlement.bookingsLimit ?? 0);

    let sharesExceeded = (entitlement.sharesUsed || 0) >= effectiveSharesLimit;
    let bookingsExceeded = (entitlement.bookingsUsed || 0) >= effectiveBookingsLimit;

    if (bypass) {
      bookingsExceeded = false;
      sharesExceeded = false;
    }

    
    res.json({
      plan: entitlement.plan || 'free',
      sharesExceeded,
      bookingsExceeded,
      limitExceeded: sharesExceeded || bookingsExceeded,
      storage: storageLimits,
      message: sharesExceeded
        ? 'Profile owner has reached their share limit'
        : bookingsExceeded
          ? 'Profile owner has reached their booking limit'
          : null
    });
  } catch (error) {
    console.error('[profiles/status] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload directly to a profile (resume | attachment)
const MAX_RESUME = (+process.env.MAX_RESUME_MB || 5) * 1024 * 1024;
const MAX_ATTACHMENT = (+process.env.MAX_ATTACHMENT_MB || 25) * 1024 * 1024;
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: Math.max(MAX_ATTACHMENT, MAX_RESUME) } });

// Cloudinary Upload Functions - Cloudinary-Only Implementation

async function uploadToCloudinary(buffer, originalName, userId, folder, resourceType) {
  const {
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
  } = process.env;

  // Validate Cloudinary config
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary not configured');
  }

  // Import cloudinary dynamically
  const { v2: cloudinary } = await import('cloudinary');

  // Configure if not already done
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });

  // Upload to Cloudinary using upload_stream with Promise wrapper
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `openinterview/${folder}`,
        resource_type: resourceType,
        public_id: `${folder}_${Date.now()}`,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          // Return file record format compatible with existing code
          const sizeMB = Math.round((buffer.length / 1048576) * 10) / 10;
          resolve({
            id: `cloudinary_${result.public_id.replace(/[\/]/g, '_')}`,
            public_id: result.public_id,
            userId,
            name: originalName || `${folder}.${result.format || 'file'}`,
            mime: result.format ? getMimeFromFormat(result.format, resourceType) : 'application/octet-stream',
            sizeLabel: `${sizeMB}MB`,
            url: result.secure_url,
            duration: result.duration, // Include duration for video validation
            uploadedAt: new Date().toISOString().slice(0, 10)
          });
        }
      }
    );

    // Write buffer to upload stream
    uploadStream.end(buffer);
  });
}

function getMimeFromFormat(format, resourceType) {
  if (resourceType === 'image') {
    const imageMimes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    };
    return imageMimes[format] || 'image/jpeg';
  } else if (resourceType === 'video') {
    const videoMimes = {
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mov': 'video/quicktime'
    };
    return videoMimes[format] || 'video/mp4';
  } else {
    // raw files
    const rawMimes = {
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'txt': 'text/plain',
      'rtf': 'application/rtf'
    };
    return rawMimes[format] || 'application/octet-stream';
  }
}

// Helper to delete specific Cloudinary asset by public_id
async function deleteCloudinaryAsset(publicId, resourceType) {
  if (!publicId) return;
  try {
    const { v2: cloudinary } = await import('cloudinary');
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    console.log(`[cloudinary-cleanup] Deleted asset: ${publicId} (${resourceType})`);
  } catch (err) {
    console.error(`[cloudinary-cleanup] Failed to delete asset ${publicId}:`, err);
  }
}

// Helper to delete old file and release storage (used during replacement)
async function deleteOldFile(fileId) {
  if (!fileId) return;
  try {
    const file = await pgClient.getFile(fileId);
    if (!file) {
      console.log(`[cleanup] File record not found for ID: ${fileId}`);
      return;
    }

    console.log(`[cleanup] Deleting old file: ${fileId} (kind: ${file.kind}, public_id: ${file.public_id})`);

    // Cloudinary delete
    if (file.public_id) {
       try {
        const { v2: cloudinary } = await import('cloudinary');
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        let resourceType = 'raw';
        if (file.mime && file.mime.startsWith('image/')) resourceType = 'image';
        else if (file.mime && file.mime.startsWith('video/')) resourceType = 'video';
        // Robust fallback based on kind if mime is missing or generic
        else if (file.kind === 'thumbnail' || file.kind === 'avatar' || file.kind === 'image') resourceType = 'image';
        else if (file.kind === 'video') resourceType = 'video';

        console.log(`[cleanup] Destroying Cloudinary asset: ${file.public_id} (type: ${resourceType})`);
        
        // Use invalidate: true to flush CDN cache immediately
        const result = await cloudinary.uploader.destroy(file.public_id, { 
          resource_type: resourceType,
          invalidate: true 
        });
        
        console.log(`[cleanup] Cloudinary destroy result:`, JSON.stringify(result));
      } catch (cloudError) {
        console.error(`[cleanup] Failed to delete from Cloudinary: ${cloudError.message}`);
      }
    }

    // DB Delete
    await pgClient.deleteFile(fileId);

    // Storage Release
    if (file.size_bytes && file.size_bytes > 0) {
      const type = file.kind === 'video' ? 'video' : 'doc';
      await pgClient.atomicUpdateStorageUsage(file.user_id, type, -file.size_bytes, false);
      console.log(`[cleanup] Released ${file.size_bytes} bytes of ${type} storage for user ${file.user_id}`);
    }
  } catch (error) {
    console.error(`[cleanup] Error deleting old file ${fileId}:`, error);
  }
}

app.post("/api/upload/:kind(resume|attachment)/:profileId", upload.single("file"), async (req, res) => {
  try {
    const { kind, profileId } = req.params;
    const p = await pgClient.getProfile(profileId);
    if (!p) return res.status(404).send("Profile not found");
    const buf = req.file?.buffer;
    if (!buf) return res.status(400).send("No file");

    const ALLOWED_MIME = new Set([
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "application/rtf",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/gif",
      "image/webp"
    ]);
    const ft = await fileTypeFromBuffer(buf).catch(() => null);
    const mime = ft?.mime || req.file.mimetype;
    if (!ALLOWED_MIME.has(mime)) return res.status(415).send("Unsupported file type");

    // WP: Check limits (File Size & Storage)
    let limits = { maxResumeFileSizeBytes: 0, docStorageLimitBytes: null, docStorageUsedBytes: 0 };
    try {
      if (p.userId) {
        limits = await pgClient.getActivePlanLimits(p.userId);
      }
    } catch (e) {
      console.error('[upload] Failed to fetch limits:', e);
    }

    let max = kind === "resume" ? MAX_RESUME : MAX_ATTACHMENT;
    if (kind === "resume" && limits.maxResumeFileSizeBytes) {
      max = limits.maxResumeFileSizeBytes;
    }

    if (buf.length > max) return res.status(413).send(`File too large (max ${Math.round(max / 1048576)} MB)`);

    try {
      const fileSize = buf.length;
      const type = 'doc'; // Resumes and attachments are docs
      
      if (limits.docStorageLimitBytes !== null) {
        let used = limits.docStorageUsedBytes || 0;
        
        // Calculate net usage if replacing a RESUME (attachments are additive usually)
        if (kind === 'resume' && p.resume_file_id) {
           const oldFile = await pgClient.getFile(p.resume_file_id);
           if (oldFile && oldFile.size_bytes) {
             used = Math.max(0, used - oldFile.size_bytes);
             console.log(`[resume-upload] Adjusted usage for replacement: ${used} (subtracted ${oldFile.size_bytes})`);
           }
        }

        const limit = limits.docStorageLimitBytes;
        if (used + fileSize > limit) {
           return res.status(413).json({ 
             error: `Storage limit exceeded. Plan limit: ${Math.round(limit/1048576)}MB. Used: ${Math.round(used/1048576)}MB.`,
             code: 'STORAGE_LIMIT_EXCEEDED'
           });
        }
      }
    } catch (limitError) {
      console.error('[upload] Error checking limits:', limitError);
      return res.status(500).json({ error: "Failed to check storage limits" });
    }

    // Cloudinary-only upload - HARD FAIL if Cloudinary fails
    let rec;
    const folder = kind === "resume" ? "resumes" : "attachments";

    try {
      rec = await uploadToCloudinary(buf, req.file.originalname, p.userId, folder, 'raw');
      console.log(`[${kind}-upload] Uploaded to Cloudinary: ${rec.url}`);
    } catch (cloudinaryError) {
      console.error(`[${kind}-upload] Cloudinary upload failed: ${cloudinaryError.message}`);
      return res.status(500).json({ error: `Upload failed: ${cloudinaryError.message}` });
    }

    rec.kind = kind; // Set the kind field (resume or attachment)
    rec.profileId = profileId;
    rec.sizeBytes = buf.length; // Ensure size_bytes is passed to createFile
    await pgClient.createFile(rec);

    // WP: Update storage usage
    try {
      await pgClient.atomicUpdateStorageUsage(p.userId, 'doc', buf.length, false);
    } catch (quotaError) {
      console.error('[upload] Failed to update storage usage:', quotaError);
      // Don't fail the request, just log error - usage will be corrected on next sync/check if we had one, 
      // but for now we rely on atomic updates. If this fails, we are slightly out of sync.
    }

    let updated = p;
    if (kind === "resume") {
       const oldResumeId = p.resume_file_id;
       updated = await pgClient.updateProfile(profileId, { resume_file_id: rec.id });
       
       // Delete old resume if it existed and is different from new one
       if (oldResumeId && oldResumeId !== rec.id) {
         try {
           await deleteOldFile(oldResumeId);
         } catch (err) {
           console.error('[cleanup] Failed to clean up old resume:', err);
         }
       }
    } else if (kind === "attachment") {
      // Add attachment to profile's attachment_file_ids array
      const currentAttachments = p.attachment_file_ids || [];
      updated = await pgClient.updateProfile(profileId, {
        attachment_file_ids: [...currentAttachments, rec.id]
      });
    }
    res.json({ file: rec, profile: updated });
  } catch (error) {
    console.error(`[upload] Error:`, error);
    res.status(500).json({ error: "Upload failed" });
  }
});



// Anonymous Resume Upload - NO AUTH REQUIRED (Resume-First Flow)
app.post("/api/upload-resume-anon", uploadRateLimiter, upload.single("file"), async (req, res) => {
  try {
    const buf = req.file?.buffer;
    if (!buf) return res.status(400).json({ error: "No file uploaded" });

    // Validate file type
    const ALLOWED_MIME = new Set([
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "application/rtf"
    ]);
    const ft = await fileTypeFromBuffer(buf).catch(() => null);
    const mime = ft?.mime || req.file.mimetype;
    if (!ALLOWED_MIME.has(mime)) {
      return res.status(415).json({ error: "Unsupported file type. Please upload PDF, DOCX, TXT, or RTF." });
    }

    if (buf.length > MAX_RESUME) {
      return res.status(413).json({ error: `File too large (max ${Math.round(MAX_RESUME / 1048576)} MB)` });
    }

    // WP01 Enhancement: Cookie-based anonymous user persistence
    // Check for existing anonymous user ID from cookie, request body, or session
    let existingAnonUserId = req.cookies.anonUserId || req.body.anonUserId || req.session?.anonymousUserId;
    let anonymousUser;
    let isReturningUser = false;

    const { createAnonymousUser } = await import('./server/services/anonymousUser.js');

    if (existingAnonUserId) {
      // Try to find existing user (anonymous OR registered)
      try {
        const existingUser = await pgClient.getUser(existingAnonUserId);
        if (existingUser) {
          if (existingUser.status === 'anonymous') {
            // Reuse existing anonymous user
            anonymousUser = existingUser;
            isReturningUser = true;
            console.log(`[anonymous-upload] Reusing existing anonymous user: ${existingAnonUserId}`);
          } else if (existingUser.status === 'registered') {
            // User is registered - check if they are authenticated
            if (req.user && req.user.id === existingUser.id) {
              // User is properly authenticated - allow upload
              anonymousUser = existingUser;
              isReturningUser = true;
              console.log(`[anonymous-upload] Reusing existing registered user: ${existingAnonUserId} (authenticated)`);
            } else {
              // User is registered but not authenticated - treat as new anonymous user
              console.log(`[anonymous-upload] User ${existingAnonUserId} is registered but not authenticated. Treating as new anonymous user to allow upload.`);
              // Do not set anonymousUser, so a new one will be created below
            }
          } else {
            console.log(`[anonymous-upload] User ${existingAnonUserId} has unknown status: ${existingUser.status}, creating new anonymous user`);
          }
        } else {
          console.log(`[anonymous-upload] User ${existingAnonUserId} not found, creating new anonymous user`);
        }
      } catch (error) {
        console.log(`[anonymous-upload] Error finding existing user ${existingAnonUserId}: ${error.message}`);
      }
    }

    // Create new anonymous user if none found
    if (!anonymousUser) {
      // Check if user is currently authenticated - use their account instead of creating new anonymous user
      if (req.user && req.user.id) {
        anonymousUser = req.user;
        isReturningUser = true;
        console.log(`[anonymous-upload] Using authenticated user account: ${req.user.id} instead of creating anonymous user`);
      } else {
        anonymousUser = await createAnonymousUser({ name: 'Anonymous User' });
        console.log(`[anonymous-upload] Created new anonymous user: ${anonymousUser.id}`);
      }
    }

    // Set persistent anonymous user cookie (365 days, accessible to JavaScript)
    res.cookie('anonUserId', anonymousUser.id, {
      maxAge: 365 * 24 * 60 * 60 * 1000, // 365 days
      httpOnly: false, // Allow JavaScript access for frontend reading
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    // Also store in session for compatibility with existing profile linking system
    req.session.anonymousUserId = anonymousUser.id;
    console.log(`[anonymous-upload] Set persistent cookie and session for anonymousUserId: ${anonymousUser.id}`);

    // Create profile
    const profileId = `prof_${Date.now().toString(36)}`;
    const profile = await pgClient.createProfile({
      id: profileId,
      userId: anonymousUser.id,
      person: { name: '' },
      contact: { email: '' },
      isDefault: true,
      visibility: 'private'
    });

    // WP: Check storage limits for anonymous user
    try {
      const limits = await pgClient.getActivePlanLimits(anonymousUser.id);
      const fileSize = buf.length;
      const type = 'doc';
      
      if (limits.docStorageLimitBytes !== null) {
        const used = limits.docStorageUsedBytes || 0;
        const limit = limits.docStorageLimitBytes;
        if (used + fileSize > limit) {
           return res.status(413).json({ 
             error: `Storage limit exceeded. Plan limit: ${Math.round(limit/1048576)}MB. Used: ${Math.round(used/1048576)}MB.`,
             code: 'STORAGE_LIMIT_EXCEEDED'
           });
        }
      }
    } catch (limitError) {
       console.error('[anon-upload] Error checking limits:', limitError);
       // Proceed cautiously or fail? For anonymous, maybe lenient, but let's be consistent.
       // return res.status(500).json({ error: "Failed to check storage limits" });
    }

    // Cloudinary-only upload - HARD FAIL if Cloudinary fails
    let rec;
    try {
      rec = await uploadToCloudinary(buf, req.file.originalname, anonymousUser.id, 'resumes', 'raw');
      console.log(`[anon-resume-upload] Uploaded to Cloudinary: ${rec.url}`);
    } catch (cloudinaryError) {
      console.error(`[anon-resume-upload] Cloudinary upload failed: ${cloudinaryError.message}`);
      return res.status(500).json({ error: `Upload failed: ${cloudinaryError.message}` });
    }

    rec.kind = 'resume'; // Set kind for proper categorization
    rec.profileId = profileId;
    rec.sizeBytes = buf.length;
    await pgClient.createFile(rec);

    // WP: Update storage usage
    try {
      await pgClient.atomicUpdateStorageUsage(anonymousUser.id, 'doc', buf.length, false);
    } catch (quotaError) {
      console.error('[anon-upload] Failed to update storage usage:', quotaError);
    }

    // Link resume to profile
    await pgClient.updateProfile(profileId, { resume_file_id: rec.id });

    // Extract and parse resume - SOFT FAIL (never blocks profile creation)
    let resumeText;
    let parsedData = null;
    let parseError = null;

    try {
      // Since we're using Cloudinary, always use buffer for parsing
      if (mime === 'text/plain' || mime === 'application/rtf') {
        // For text files, read from buffer
        resumeText = buf.toString('utf8');
      } else {
        // For PDF and DOCX files, use buffer parser
        resumeText = await extractTextFromBuffer(buf);
      }

      if (resumeText && resumeText.trim().length >= 50) {
        // Parse with AI - SOFT FAIL
        try {
          parsedData = await parseResumeWithAI(resumeText);
          console.log(`[anonymous-upload] AI parsed data:`, JSON.stringify(parsedData, null, 2));
        } catch (parseErr) {
          console.error('[anonymous-upload] AI Parse error:', parseErr.message);
          parseError = `AI parsing failed: ${parseErr.message}`;
          // Continue with default profile - don't fail the upload
        }
      } else {
        console.warn('[anonymous-upload] Could not extract sufficient text from file');
        parseError = "Could not extract sufficient text from file";
        // Continue with default profile - don't fail the upload
      }
    } catch (textExtractionError) {
      console.error('[anonymous-upload] Text extraction error:', textExtractionError.message);
      parseError = `Text extraction failed: ${textExtractionError.message}`;
      // Continue with default profile - don't fail the upload
    }

    // Update profile with parsed data (or leave empty if parsing failed)
    let enrichedProfile = profile;
    if (parsedData) {
      // Generate profileName like the auto-populate script does
      let profileName = '';
      const name = parsedData.name || 'Guest';
      const title = parsedData.title || '';

      if (name && title) {
        profileName = `${name} - ${title}`;
      } else if (name) {
        profileName = name;
      } else if (title) {
        profileName = title;
      }

      enrichedProfile = await pgClient.updateProfile(profileId, {
        profileName: profileName, // Add the missing profileName field
        person: { ...profile.person, name: name },
        title: title,
        location: parsedData.location || '',
        city: parsedData.location || '',
        about: parsedData.summary || '',
        summary: parsedData.summary || '',
        highlights: parsedData.highlights.map((text, idx) => ({
          id: `hi_${idx + 1}`,
          text,
          pin: idx < 3,
          order: idx + 1
        })),
        skills: parsedData.skills || [],
        social: {
          linkedin: parsedData.linkedin || '',
          website: parsedData.website || '',
          github: ''
        },
        contact: {
          email: parsedData.email || '',
          phone: parsedData.phone || ''
        },
        experience: (parsedData.experience || []).map(exp => {
          const mapped = {
            company: exp.company || '',
            role: exp.title || '', // Map 'title' to 'role'
            startDate: exp.startDate || '',
            endDate: exp.endDate || '',
            description: exp.description || ''
          };
          console.log(`[anonymous-upload] Mapping experience:`, exp, '→', mapped);
          return mapped;
        }),
        education: (parsedData.education || []).map(edu => {
          const mapped = {
            institution: edu.school || '', // Map 'school' to 'institution'
            degree: edu.degree || '',
            field: edu.field || '',
            year: edu.endDate || edu.startDate || '' // Use endDate (graduation year) or startDate as fallback
          };
          console.log(`[anonymous-upload] Mapping education:`, edu, '→', mapped);
          return mapped;
        })
      });
      console.log(`[anonymous-upload] Profile ${profileId} created and enriched for anonymous user ${anonymousUser.id}`);
    } else {
      // If parsing failed, update profile with "Guest" name
      enrichedProfile = await pgClient.updateProfile(profileId, {
        person: { ...profile.person, name: 'Guest' }
      });
      console.log(`[anonymous-upload] Profile ${profileId} created (parse failed) for anonymous user ${anonymousUser.id}`);
    }

    res.json({
      success: true,
      profileId: enrichedProfile.id,
      userId: anonymousUser.id,
      userStatus: anonymousUser.status || (req.user ? 'registered' : 'anonymous'), // 'anonymous' or 'registered'
      isReturningUser: isReturningUser,
      redirectUrl: `/owner_preview.html?id=${enrichedProfile.id}${parseError ? '&parseError=true' : ''}`,
      parseError: parseError || null,
      parsedFields: parsedData ? {
        name: !!parsedData.name,
        title: !!parsedData.title,
        email: !!parsedData.email,
        summary: !!parsedData.summary,
        highlights: parsedData.highlights.length,
        skills: parsedData.skills.length,
        experience: parsedData.experience.length
      } : null
    });
  } catch (error) {
    console.error('[anonymous-upload] Error:', error);
    res.status(500).json({
      error: 'Failed to process resume',
      details: error.message
    });
  }
});

// POST /api/profiles/new-guest - Create a new guest profile without resume
app.post("/api/profiles/new-guest", async (req, res) => {
  try {
    // Authentication required
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be signed in to create a new interview.',
        requiresAuth: true,
        loginUrl: '/login-page.html'
      });
    }

    const userId = req.user.id;
    const userName = req.user.name || 'Guest';

    // Create profile linked to logged-in user
    const profileId = `prof_${Date.now().toString(36)}`;
    const profile = await pgClient.createProfile({
      id: profileId,
      userId: userId,
      person: { name: userName },
      title: 'New Interview',
      contact: { email: req.user.email || '' },
      isDefault: true,
      visibility: 'private'
    });

    res.json({
      success: true,
      profileId: profile.id,
      userId: userId,
      redirectUrl: `/profile_edit.html?id=${profile.id}&guest=true`
    });

  } catch (error) {
    console.error('[new-guest] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// WP1: Resume Parsing (No Save) - Direct file upload to AI parsing
app.post("/api/resume/parse", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const buf = req.file.buffer;
    const fileType = await fileTypeFromBuffer(buf).catch(() => null);
    const mime = fileType?.mime || req.file.mimetype;

    console.log(`[resume-parse] Received file: ${req.file.originalname} (${mime}, ${buf.length} bytes)`);

    let resumeText = "";
    
    // Extract text based on file type
    if (mime === "text/plain" || mime === "application/rtf") {
      resumeText = buf.toString("utf8");
    } else {
      // For PDF and DOCX files, use buffer parser
      // extractTextFromBuffer handles both PDF and DOCX text extraction
      resumeText = await extractTextFromBuffer(buf);
    }

    if (!resumeText || resumeText.trim().length < 50) {
      return res.status(400).json({ error: "Could not extract sufficient text from file" });
    }

    console.log(`[resume-parse] Extracted ${resumeText.length} characters. Parsing with AI...`);

    // Parse with AI
    const parsedData = await parseResumeWithAI(resumeText);
    
    console.log(`[resume-parse] AI parsing successful`);
    
    res.json({ parsedData });

  } catch (error) {
    console.error("[resume-parse] Error:", error);
    res.status(500).json({ error: "Failed to parse resume: " + error.message });
  }
});

// WP1: Real Resume Parsing with DeepSeek AI
// POST /api/profiles/:id/ingest - Parse resume and auto-fill profile
// WP01 Enhancement: Now works with anonymous users (no auth required)
app.post("/api/profiles/:id/ingest", aiParseRateLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { resumeFileId: requestResumeFileId } = req.body; // Optional: specific resume to parse

    const profile = await pgClient.getProfile(id);

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    // WP01 Enhancement: Allow anonymous users to update their profiles
    // No authentication check needed - profile ownership verified by profileId

    // Get the resume file - use provided resumeFileId or fall back to profile's resume_file_id
    const resumeFileId = requestResumeFileId || profile.resume_file_id;
    if (!resumeFileId) {
      return res.status(400).json({ error: "No resume uploaded. Please upload a resume first." });
    }

    const resumeFile = await pgClient.getFile(resumeFileId);
    if (!resumeFile) {
      return res.status(400).json({ error: "Resume file not found" });
    }

    console.log(`[ingest] Parsing resume for profile ${id}: ${resumeFile.url}`);

    // Extract text - handle both Cloudinary URLs and legacy local files
    let resumeText;
    let parsedData = null;
    let parseError = null;

    try {
      if (resumeFile.url.startsWith('http')) {
        // Cloudinary URL - fetch and parse from URL
        const response = await fetch(resumeFile.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch file from Cloudinary: ${response.status}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());

        if (resumeFile.mime === 'text/plain' || resumeFile.mime === 'application/rtf') {
          // For text files, read from buffer
          resumeText = buffer.toString('utf8');
        } else {
          // For PDF and DOCX files, use buffer parser
          resumeText = await extractTextFromBuffer(buffer);
        }
      } else {
        // Legacy local file - read from disk
        let filePath;
        if (resumeFile.url.startsWith('/uploads/')) {
          filePath = path.join(__dirname, 'public', resumeFile.url);
        } else if (resumeFile.url.startsWith('/')) {
          filePath = path.join(__dirname, 'public', resumeFile.url);
        } else {
          throw new Error("Invalid resume file path");
        }

        // Check if file exists
        if (!fs.existsSync(filePath)) {
          throw new Error("Resume file not found on disk");
        }

        const fileExtension = path.extname(filePath).toLowerCase();

        if (fileExtension === '.txt' || resumeFile.mime === 'text/plain' || resumeFile.mime === 'application/rtf') {
          // For text files, read directly
          resumeText = fs.readFileSync(filePath, 'utf8');
        } else {
          // For PDF and DOCX files, use PDF parser
          resumeText = await extractTextFromPDF(filePath);
        }
      }

      if (!resumeText || resumeText.trim().length < 50) {
        throw new Error("Could not extract sufficient text from file");
      }

      console.log(`[ingest] Extracted ${resumeText.length} characters from file`);

      // Parse with AI - SOFT FAIL (never blocks profile creation)
      try {
        parsedData = await parseResumeWithAI(resumeText);
        console.log(`[ingest] AI parsed data:`, JSON.stringify(parsedData, null, 2).substring(0, 500));
      } catch (aiError) {
        console.error('[ingest] AI parsing failed:', aiError.message);
        parseError = `AI parsing failed: ${aiError.message}`;
        // Continue with manual profile editing
      }
    } catch (textExtractionError) {
      console.error('[ingest] Text extraction failed:', textExtractionError.message);
      parseError = `Text extraction failed: ${textExtractionError.message}`;
      // Continue with manual profile editing
    }

    // If parsing failed completely, return error but don't fail with 500
    if (!parsedData) {
      return res.status(400).json({
        error: 'We could not parse your resume. Please fill your profile manually.',
        details: parseError || 'No valid data extracted from resume'
      });
    }

    console.log(`[ingest] AI parsed data:`, JSON.stringify(parsedData, null, 2).substring(0, 500));

    // Validate that we got meaningful data from parsing
    const hasValidData = parsedData.name || parsedData.title || parsedData.email ||
      parsedData.summary || (parsedData.skills && parsedData.skills.length > 0);

    if (!hasValidData) {
      // Parsing returned empty data - don't update profile
      return res.status(400).json({
        error: 'We could not parse your resume. Please fill your profile manually.',
        details: 'No valid data extracted from resume'
      });
    }

    // Generate profileName like the auto-populate script does
    let profileName = '';
    const name = parsedData.name || '';
    const title = parsedData.title || '';

    if (name && title) {
      profileName = `${name} - ${title}`;
    } else if (name) {
      profileName = name;
    } else if (title) {
      profileName = title;
    }

    // Build updated profile with parsed data (only use parsed data, no fallbacks)
    const updatedProfile = await pgClient.updateProfile(id, {
      profileName: profileName, // Add the missing profileName field
      person: { ...profile.person, name: name },
      title: title,
      location: parsedData.location || '',
      city: parsedData.location || '',
      about: parsedData.summary || '',
      summary: parsedData.summary || '',
      highlights: parsedData.highlights.map((text, idx) => ({ id: `hi_${idx + 1}`, text, pin: idx < 3, order: idx + 1 })),
      skills: parsedData.skills || [],
      social: {
        linkedin: parsedData.linkedin || '',
        website: parsedData.website || '',
        github: parsedData.github||''
      },
      contact: {
        email: parsedData.email || '',
        phone: parsedData.phone || ''
      },
      experience: (parsedData.experience || []).map(exp => {
        const mapped = {
          company: exp.company || '',
          role: exp.title || '', // Map 'title' to 'role'
          startDate: exp.startDate || '',
          endDate: exp.endDate || '',
          description: exp.description || ''
        };
        console.log(`[ingest] Mapping experience:`, exp, '→', mapped);
        return mapped;
      }),
      education: (parsedData.education || []).map(edu => {
        const mapped = {
          institution: edu.school || '', // Map 'school' to 'institution'
          degree: edu.degree || '',
          field: edu.field || '',
          year: edu.endDate || edu.startDate || '' // Use endDate (graduation year) or startDate as fallback
        };
        console.log(`[ingest] Mapping education:`, edu, '→', mapped);
        return mapped;
      })
    });

    console.log(`[ingest] Profile ${id} updated successfully`);

    res.json({
      populated: true,
      profile: updatedProfile,
      parsedFields: {
        name: !!parsedData.name,
        title: !!parsedData.title,
        email: !!parsedData.email,
        phone: !!parsedData.phone,
        location: !!parsedData.location,
        summary: !!parsedData.summary,
        highlights: parsedData.highlights.length,
        skills: parsedData.skills.length,
        experience: parsedData.experience.length
      }
    });
  } catch (error) {
    console.error('[ingest] Unexpected error:', error);
    // Even unexpected errors should not return 500 for AI parsing
    // This preserves the manual profile editing flow
    res.status(400).json({
      error: 'We could not parse your resume. Please fill your profile manually.',
      details: error.message
    });
  }
});

// WP1 CORE: Video Upload Endpoint
const MAX_VIDEO = (+process.env.MAX_VIDEO_MB || 100) * 1024 * 1024;
const videoUpload = multer({
  storage,
  limits: { fileSize: MAX_VIDEO },
  fileFilter: (req, file, cb) => {
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (validTypes.includes(file.mimetype) || file.originalname.match(/\.(mp4|webm|mov)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only video files (MP4, WebM, MOV) are allowed'));
    }
  }
});

// WP1: Video Upload - Store video file for profile (SECONDARY ASSET) - Cloudinary Only
app.post("/api/upload/video/:profileId", videoUpload.single("file"), async (req, res) => {
  try {
    const { profileId } = req.params;
    const profile = await pgClient.getProfile(profileId);

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const buf = req.file?.buffer;
    if (!buf) {
      return res.status(400).json({ error: "No video file uploaded" });
    }

    console.log(`[video-upload] Received video: ${req.file.originalname} (${Math.round(buf.length / 1048576)}MB)`);

    // WP: Check storage limits
    try {
      const userId = profile.userId;
      if (userId) {
        const limits = await pgClient.getActivePlanLimits(userId);
        const fileSize = buf.length;
        const type = 'video';
        
        if (limits.videoStorageLimitBytes !== null) {
          let used = limits.videoStorageUsedBytes || 0;
          
          // Calculate net usage if replacing an existing file
          if (profile.video_file_id) {
             const oldFile = await pgClient.getFile(profile.video_file_id);
             if (oldFile && oldFile.size_bytes) {
               used = Math.max(0, used - oldFile.size_bytes);
               console.log(`[video-upload] Adjusted usage for replacement: ${used} (subtracted ${oldFile.size_bytes})`);
             }
          }

          const limit = limits.videoStorageLimitBytes;
          if (used + fileSize > limit) {
             return res.status(413).json({ 
               error: `Storage limit exceeded. Plan limit: ${Math.round(limit/1048576)}MB. Used: ${Math.round(used/1048576)}MB.`,
               code: 'STORAGE_LIMIT_EXCEEDED'
             });
          }
        }
      }
    } catch (limitError) {
      console.error('[video-upload] Error checking limits:', limitError);
      return res.status(500).json({ error: "Failed to check storage limits" });
    }

    // Cloudinary-only upload - HARD FAIL if Cloudinary fails
    let rec;
    try {
      rec = await uploadToCloudinary(buf, req.file.originalname, profile.userId || 'guest', 'videos', 'auto');
      console.log(`[video-upload] Uploaded to Cloudinary: ${rec.url}`);

      // WP: Validate video duration (Server-side)
      if (rec.duration && profile.userId) {
        try {
          const limits = await pgClient.getActivePlanLimits(profile.userId);
          const maxSeconds = limits.maxInterviewLengthSeconds || 420; // Default 7 mins
          
          if (rec.duration > maxSeconds) {
            console.warn(`[video-upload] Duration ${rec.duration}s exceeds limit ${maxSeconds}s. Deleting...`);
            // Delete from Cloudinary immediately
            await deleteCloudinaryAsset(rec.public_id, 'video');
            
            return res.status(400).json({ 
              error: `Video duration (${Math.round(rec.duration)}s) exceeds your plan limit of ${maxSeconds}s.`,
              code: 'DURATION_LIMIT_EXCEEDED'
            });
          }
        } catch (limitErr) {
          console.error('[video-upload] Error validating duration:', limitErr);
          // If check fails, we allow it (fail open) as per "if unable to calculate then bydefault allow it" principle
        }
      }

    } catch (cloudinaryError) {
      console.error(`[video-upload] Cloudinary upload failed: ${cloudinaryError.message}`);
      return res.status(500).json({ error: `Video upload failed: ${cloudinaryError.message}` });
    }

    rec.kind = 'video';
    rec.profileId = profileId;
    rec.sizeBytes = buf.length;
    const fileRecord = await pgClient.createFile(rec);

    // WP: Update storage usage
    try {
      if (profile.userId) {
        await pgClient.atomicUpdateStorageUsage(profile.userId, 'video', buf.length, false);
      }
    } catch (quotaError) {
      console.error('[video-upload] Failed to update storage usage:', quotaError);
    }

    // WP01 Enhancement: Update profile with video file ID and URL (does NOT overwrite resume data)
    const oldVideoId = profile.video_file_id;
    const updatedProfile = await pgClient.updateProfile(profileId, {
      video_file_id: rec.id,  // ✅ Use snake_case to match database
      video_url: rec.url      // ✅ Use snake_case to match database
    });

    // Delete old video if it existed and is different from new one
    if (oldVideoId && oldVideoId !== rec.id) {
      try {
        await deleteOldFile(oldVideoId);
      } catch (err) {
        console.error('[cleanup] Failed to clean up old video:', err);
      }
    }

    console.log(`[video-upload] Video saved: ${rec.id}`);

    res.json({
      success: true,
      videoFileId: rec.id,
      video_url: rec.url,
      message: "Video uploaded successfully (secondary asset)"
    });
  } catch (error) {
    console.error('[video-upload] Error:', error);
    res.status(500).json({ error: error.message || "Video upload failed" });
  }
});

// Avatar Upload Endpoint
const MAX_AVATAR = 5 * 1024 * 1024; // 5MB max for avatars
const avatarUpload = multer({
  storage,
  limits: { fileSize: MAX_AVATAR },
  fileFilter: (req, file, cb) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (validTypes.includes(file.mimetype) || file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, GIF, WEBP) are allowed'));
    }
  }
});

app.post("/api/upload/avatar/:profileId", avatarUpload.single("file"), async (req, res) => {
  try {
    const { profileId } = req.params;
    const profile = await pgClient.getProfile(profileId);

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const buf = req.file?.buffer;
    if (!buf) {
      return res.status(400).json({ error: "No avatar file uploaded" });
    }

    console.log(`[avatar-upload] Received avatar: ${req.file.originalname} (${Math.round(buf.length / 1024)}KB)`);

    // Cloudinary-only upload - HARD FAIL if Cloudinary fails
    let rec;
    try {
      rec = await uploadToCloudinary(buf, req.file.originalname, profile.userId || 'guest', 'avatars', 'image');
      console.log(`[avatar-upload] Uploaded to Cloudinary: ${rec.url}`);
    } catch (cloudinaryError) {
      console.error(`[avatar-upload] Cloudinary upload failed: ${cloudinaryError.message}`);
      return res.status(500).json({ error: `Avatar upload failed: ${cloudinaryError.message}` });
    }

    rec.profileId = profileId;
    const fileRecord = await pgClient.createFile(rec);

    // WP01 Enhancement: Update person.avatar_url (avatar_url column doesn't exist in schema)
    const personUpdate = { ...profile.person, avatar_url: rec.url };
    console.log(`[avatar-upload] Updating person object:`, JSON.stringify(personUpdate));

    const updatedProfile = await pgClient.updateProfile(profileId, {
      person: personUpdate
    });

    console.log(`[avatar-upload] Avatar saved: ${rec.id}, URL: ${rec.url}`);
    console.log(`[avatar-upload] Updated profile person:`, JSON.stringify(updatedProfile.person));

    res.json({
      success: true,
      url: rec.url,
      message: "Avatar uploaded successfully"
    });
  } catch (error) {
    console.error('[avatar-upload] Error:', error);
    res.status(500).json({ error: error.message || "Avatar upload failed" });
  }
});

// Thumbnail Upload Endpoint
const thumbnailUpload = multer({
  storage,
  limits: { fileSize: MAX_AVATAR }, // Same limit as avatar (5MB)
  fileFilter: (req, file, cb) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (validTypes.includes(file.mimetype) || file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, GIF, WEBP) are allowed'));
    }
  }
});

app.post("/api/upload/thumbnail/:profileId", thumbnailUpload.single("file"), async (req, res) => {
  try {
    const { profileId } = req.params;
    const profile = await pgClient.getProfile(profileId);

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const buf = req.file?.buffer;
    if (!buf) {
      return res.status(400).json({ error: "No thumbnail file uploaded" });
    }

    console.log(`[thumbnail-upload] Received thumbnail: ${req.file.originalname} (${Math.round(buf.length / 1024)}KB)`);

    // Cloudinary-only upload
    let rec;
    try {
      rec = await uploadToCloudinary(buf, req.file.originalname, profile.userId || 'guest', 'thumbnails', 'image');
      console.log(`[thumbnail-upload] Uploaded to Cloudinary: ${rec.url}`);
    } catch (cloudinaryError) {
      console.error(`[thumbnail-upload] Cloudinary upload failed: ${cloudinaryError.message}`);
      return res.status(500).json({ error: `Thumbnail upload failed: ${cloudinaryError.message}` });
    }

    rec.kind = 'thumbnail'; // Explicitly set kind
    rec.profileId = profileId;
    const fileRecord = await pgClient.createFile(rec);

    // Update profile with thumbnail_url and thumbnail_file_id
    // Note: ensure column names match database schema
    const updatedProfile = await pgClient.updateProfile(profileId, {
      thumbnail_url: rec.url,
      thumbnail_file_id: rec.id
    });
    
    // Cleanup old thumbnail if exists
    const oldThumbnailId = profile.thumbnail_file_id;
    if (oldThumbnailId && oldThumbnailId !== rec.id) {
       console.log(`[thumbnail-upload] Found old thumbnail to cleanup: ${oldThumbnailId}`);
       try {
         await deleteOldFile(oldThumbnailId);
       } catch (err) {
         console.error('[cleanup] Failed to clean up old thumbnail:', err);
       }
    } else {
       console.log(`[thumbnail-upload] No old thumbnail to cleanup (oldId: ${oldThumbnailId}, newId: ${rec.id})`);
    }

    console.log(`[thumbnail-upload] Thumbnail saved: ${rec.id}, URL: ${rec.url}`);

    res.json({
      success: true,
      thumbnail_url: rec.url,
      thumbnailFileId: rec.id,
      message: "Thumbnail uploaded successfully"
    });
  } catch (error) {
    console.error('[thumbnail-upload] Error:', error);
    res.status(500).json({ error: error.message || "Thumbnail upload failed" });
  }
});

// WP1: Video Ingest - DISABLED BY DEFAULT (Optional secondary asset)
// This endpoint is disabled per plan requirements - video does NOT overwrite resume data
app.post("/api/profiles/:id/ingest-video", async (req, res) => {
  try {
    // Video enrichment is disabled by default per WP1 requirements
    // Video is stored as secondary asset only, does NOT trigger auto-populate
    res.status(400).json({
      error: "Video enrichment is disabled by default",
      message: "Video is stored as secondary asset only. Use resume upload for profile auto-population."
    });
  } catch (error) {
    console.error('[video-ingest] Error:', error);
    res.status(500).json({ error: "Failed to process video: " + error.message });
  }
});

// WP3 + WP4: Share endpoint with PostgreSQL
function buildProfilePublicHandle(profile) {
  const baseName = profile?.person?.name || profile?.title || 'profile';
  const stem = `${baseName}-${String(profile?.id || '').slice(0, 6)}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return stem || `profile-${String(profile?.id || '').slice(0, 6)}`;
}

function isPublicHandleUniqueViolation(err) {
  return (
    err?.code === '23505' &&
    String(err?.constraint || '').includes('profiles_public_handle_key')
  );
}

async function updateProfileWithUniqueHandle(profileId, baseHandle, extraUpdates = {}, maxAttempts = 5) {
  const cleanBase = String(baseHandle || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || `profile-${String(profileId).slice(0, 6)}`;

  for (let i = 0; i < maxAttempts; i++) {
    const candidate =
      i === 0
        ? cleanBase
        : i < maxAttempts - 1
          ? `${cleanBase}-${i + 1}`
          : `${cleanBase}-${crypto.randomBytes(2).toString('hex')}`;
    try {
      return await pgClient.updateProfile(profileId, {
        ...extraUpdates,
        publicHandle: candidate
      });
    } catch (err) {
      if (!isPublicHandleUniqueViolation(err) || i === maxAttempts - 1) throw err;
    }
  }
  throw new Error('Could not reserve unique public handle');
}

app.post("/api/profiles/:id/share", requireAuth, profileRateLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const profile = await pgClient.getProfile(id);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    // Verify ownership (profile must belong to logged-in user)
    if (profile.userId !== userId) {
      console.log('[share] Ownership check failed - Profile belongs to:', profile.userId, 'but logged in as:', userId);
      return res.status(403).json({ error: "Not authorized to share this profile" });
    }

    // Check if ALREADY public - if so, just return the handle without consuming credits
    if (profile.visibility === 'public') {
      let publicHandle = profile.publicHandle;

      // Self-healing: if public but no handle, generate one (edge case)
      if (!publicHandle) {
        const updated = await updateProfileWithUniqueHandle(id, buildProfilePublicHandle(profile));
        publicHandle = updated.publicHandle;
      }

      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
      const entitlement = await pgClient.getEntitlement(userId);
      
      
      const sharesUsed = entitlement?.sharesUsed || 0;
      console.log('Shaer Limit safdar test:', entitlement?.sharesLimit);
      
      const sharesLimit = entitlement?.sharesLimit; // null means unlimited
      
      
      const effectiveLimit = sharesLimit === null ? Infinity : (sharesLimit ?? 1);

      const accessMeta = await pgClient.ensurePublicAccessToken(id, baseUrl);
      const accessUrl = accessMeta?.accessUrl || `${baseUrl}/u/${publicHandle}`;

      return res.json({
        success: true,
        alreadyPublic: true,
        publicUrl: `${baseUrl}/u/${publicHandle}`, // Full URL
        accessUrl,
        url: accessUrl,
        sharesUsed,
        sharesLimit,
        sharesRemaining: sharesLimit === null ? 'Unlimited' : Math.max(0, effectiveLimit - sharesUsed)
      });
    }

    // Get or create entitlement (PostgreSQL)
    // Ensure credits are fresh before checking limits
    await pgClient.ensureCreditsFresh(userId);

    let entitlement = await pgClient.getEntitlement(userId);
    if (!entitlement) {
      entitlement = await pgClient.createEntitlement({
        id: `ent_${Date.now().toString(36)}`,
        userId,
        plan: 'free',
        sharesUsed: 0,
        sharesLimit: 1,
        bookingsUsed: 0,
        bookingsLimit: 0
      });
    }

    // WP4: Check share limit (1 free share for free plan, null = unlimited)
    const sharesUsed = entitlement.sharesUsed || 0;
    const sharesLimit = entitlement.sharesLimit;
    const effectiveLimit = sharesLimit === null ? Infinity : (sharesLimit ?? 1);

    if (sharesUsed >= effectiveLimit) {
      // WP4 + WP7: Return paywall response
      return res.status(403).json({
        error: 'Share limit reached',
        requiresUpgrade: true,
        sharesUsed,
        sharesLimit,
        plan: entitlement.plan || 'free'
      });
    }

    // Generate public handle if not exists
    let publicHandle = profile.publicHandle;
    if (!publicHandle) {
      publicHandle = buildProfilePublicHandle(profile);
    }

    const publishResult = await pgClient.publishProfileConsumeShareAtomic({
      userId,
      profileId: id,
      baseHandle: publicHandle,
      nextShareCount: (profile.shareCount || 0) + 1
    });
    const updatedProfile = publishResult.profile;

    console.log(`[share] Profile ${id} shared by user ${userId}. Shares used: ${entitlement.sharesUsed}/${sharesLimit}`);

    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const ent = publishResult.entitlement;
    const accessMeta = await pgClient.ensurePublicAccessToken(id, baseUrl);
    const accessUrl = accessMeta?.accessUrl || `${baseUrl}/u/${updatedProfile.publicHandle}`;
    res.json({
      success: true,
      publicUrl: `${baseUrl}/u/${updatedProfile.publicHandle}`,
      accessUrl,
      url: accessUrl,
      sharesUsed: ent?.shares_used ?? sharesUsed + 1,
      sharesLimit,
      sharesRemaining:
        sharesLimit === null
          ? 'Unlimited'
          : Math.max(0, effectiveLimit - (ent?.shares_used ?? sharesUsed + 1))
    });
  } catch (error) {
    console.error('[share] Error:', error);
    if (isPublicHandleUniqueViolation(error)) {
      return res.status(409).json({ error: 'Could not reserve unique public handle. Please retry.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Unpublish: private + clear handle + refund share credit when profile was public (same rule as softDeleteProfile)
app.post("/api/profiles/:id/unpublish", requireAuth, profileRateLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existing = await pgClient.getProfile(id);
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const profile = await pgClient.unpublishProfile(userId, id);
    await pgClient.ensureCreditsFresh(userId);
    const entitlement = await pgClient.getEntitlement(userId);

    return res.json({
      success: true,
      profile,
      sharesRefunded: existing.visibility === "public",
      sharesUsed: entitlement?.sharesUsed ?? null,
      sharesLimit: entitlement?.sharesLimit ?? null
    });
  } catch (error) {
    console.error("[unpublish] Error:", error);
    const msg = error?.message || String(error);
    if (msg.includes("not found") || msg.includes("access denied")) {
      return res.status(404).json({ error: "Profile not found" });
    }
    if (msg.includes("deleted profile")) {
      return res.status(400).json({ error: msg });
    }
    return res.status(500).json({ error: msg });
  }
});

// WP3: Send Invite Endpoint
app.post("/api/profiles/:id/invite", requireAuth, profileRateLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, message } = req.body;
    const userId = req.user.id;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const profile = await pgClient.getProfile(id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (profile.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Ensure profile is public before inviting
    if (profile.visibility !== 'public') {
      return res.status(400).json({ error: 'Profile must be public to send invites' });
    }

    // Get sender details
    const sender = await pgClient.getUser(userId);
    const senderName = sender?.name || 'A user';
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const accessMeta = await pgClient.ensurePublicAccessToken(id, baseUrl);
    const profileUrl =
      accessMeta?.accessUrl ||
      `${baseUrl}/u/${profile.publicHandle || profile.id}`;

    // Prepare email
    const { subject, html } = emailTemplates.profileInvite({
      senderName,
      profileTitle: profile.title || 'Professional Profile',
      profileUrl,
      message
    });

    // Send email
    await mailer.sendMail({
      to: email,
      subject,
      html
    });

    console.log(`[invite] Sent invite for profile ${id} to ${email}`);

    res.json({ success: true });
  } catch (error) {
    console.error('[invite] Error:', error);
    res.status(500).json({ error: error.message });
  }
});


// WP4: Get user's usage and limits - PostgreSQL
app.get("/api/usage", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Ensure credits are fresh before reading
    await pgClient.ensureCreditsFresh(userId);

    // Get entitlement (PostgreSQL)
    let entitlement = await pgClient.getEntitlement(userId);
    if (!entitlement) {
      entitlement = await pgClient.createEntitlement({
        id: `ent_${Date.now().toString(36)}`,
        userId,
        plan: 'free',
        sharesUsed: 0,
        sharesLimit: 1,
        bookingsUsed: 0,
        bookingsLimit: 0
      });
    }

    // Get user's profiles (PostgreSQL)
    const profiles = await pgClient.listProfilesByUser(userId);

    // WP13: Calculate real analytics from Postgres
    let totalViews = 0;
    let totalBookings = 0;
    profiles.forEach(p => {
      totalViews += p.viewCount || 0;
      totalBookings += p.bookingCount || 0;
    });

    res.json({
      plan: entitlement.plan || 'free',
      shares: {
        used: entitlement.sharesUsed || 0,
        limit: entitlement.sharesLimit,
        remaining: entitlement.sharesLimit === null ? null : Math.max(0, entitlement.sharesLimit - (entitlement.sharesUsed || 0))
      },
      bookings: {
        used: entitlement.bookingsUsed || 0,
        limit: entitlement.bookingsLimit,
        remaining: entitlement.bookingsLimit === null ? null : Math.max(0, entitlement.bookingsLimit - (entitlement.bookingsUsed || 0))
      },
      analytics: {
        totalViews,
        totalBookings,
        profileCount: profiles.length,
        publicProfiles: profiles.filter(p => p.visibility === 'public').length
      }
    });
  } catch (error) {
    console.error('[usage] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// WP10: Dashboard API - Credits + Share Link + Analytics (PostgreSQL)
app.get("/api/dashboard", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Ensure credits are fresh before reading
    await pgClient.ensureCreditsFresh(userId);

    // Get entitlement from PostgreSQL
    let entitlement = await pgClient.getEntitlement(userId);

    console.log("entittlement at dashboard", entitlement);


    // if (!entitlement) {
    //   entitlement = await pgClient.createEntitlement({
    //     id: `ent_${Date.now().toString(36)}`,
    //     userId,
    //     plan: 'free',
    //     sharesUsed: 0,
    //     sharesLimit: 1,
    //     bookingsUsed: 0,
    //     bookingsLimit: 0
    //   });
    // }
    if (!entitlement) {
      entitlement = await pgClient.createEntitlement({
        userId: req.user.id,
        plan: 'free',
        sharesUsed: 0,
        bookingsUsed: 0
      });
    }
    // Get credits info with Stripe billing cycle dates
    // Ensure all numeric fields are explicitly set (no undefined/null/NaN)




    const bookingsUsed = Number(entitlement.bookingsUsed) || 0;
    // Allow null to pass through (means unlimited)
    const bookingsLimit = entitlement.bookingsLimit === null ? null : Number(entitlement.bookingsLimit);
    const sharesUsed = Number(entitlement.sharesUsed) || 0;
    const sharesLimit = entitlement.sharesLimit === null ? null : Number(entitlement.sharesLimit);

    let credits = {
      // Booking credits
      bookingsUsed,
      bookingsLimit,
      bookingsRemaining: Math.max(0, bookingsLimit - bookingsUsed),
      // Share credits
      sharesUsed,
      sharesLimit,
      sharesRemaining: Math.max(0, sharesLimit - sharesUsed),
      // Plan info
      plan: entitlement.plan || 'free',
      // Legacy fields for backward compatibility
      used: bookingsUsed,
      limit: bookingsLimit,
      remaining: Math.max(0, bookingsLimit - bookingsUsed),
      resetDate: null,
      nextBillingDate: null
    };

    // Get next reset date from entitlement first, then Stripe if needed
    if (entitlement.creditsResetAt) {
      // Use existing reset date from entitlement
      credits.resetDate = entitlement.creditsResetAt;
      credits.nextBillingDate = entitlement.creditsResetAt;
    } else if (entitlement.stripeSubscriptionId && process.env.STRIPE_SECRET_KEY) {
      // Only call Stripe if creditsResetAt is NULL
      try {
        const stripe = await getStripeClient();
        const subscription = await stripe.subscriptions.retrieve(entitlement.stripeSubscriptionId);
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        credits.resetDate = currentPeriodEnd.toISOString();
        credits.nextBillingDate = currentPeriodEnd.toISOString();
      } catch (error) {
        console.error('[dashboard] Error fetching Stripe subscription:', error);
      }
    }

    // Get user's profile
    // WP1-WP3: Profile logic - If 1 profile, use it. If multiple, use default.
    const allProfiles = await pgClient.listProfilesByUser(userId);

    // Fetch availability for each profile to get timezone
    const profilesWithTimezone = await Promise.all(allProfiles.map(async (p) => {
      const availability = await pgClient.getAvailability(p.id);
      return {
        ...p,
        timezone: availability?.timezone || 'UTC'
      };
    }));

    // Get user's files
    const allFiles = await pgClient.listFilesByUser(userId);

    let profile = null;

    if (profilesWithTimezone.length > 0) {
      if (profilesWithTimezone.length === 1) {
        profile = profilesWithTimezone[0];
      } else {
        // More than one profile - find the default one
        profile = profilesWithTimezone.find(p => p.is_default) || profilesWithTimezone[0];
      }
    }

    console.log('[dashboard] Looking for profile with userId:', userId);
    console.log('[dashboard] Profiles found:', allProfiles.length);
    console.log('[dashboard] Selected profile:', profile ? profile.id : 'NULL');

    // Build share link (public + published: token exchange URL matches invite/share API)
    let shareLink = null;
    if (profile && profile.publicHandle) {
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
      const cleanUrl = `${baseUrl}/u/${profile.publicHandle}`;
      let url = cleanUrl;
      if (profile.visibility === 'public') {
        const accessMeta = await pgClient.ensurePublicAccessToken(profile.id, baseUrl);
        if (accessMeta?.accessUrl) {
          url = accessMeta.accessUrl;
        }
      }
      shareLink = {
        url,
        publicUrl: cleanUrl,
        handle: profile.publicHandle,
        active: profile.visibility === 'public'
      };
    }

    res.json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email
      },
      profile: profile ? {
        id: profile.id,
        title: profile.title,
        publicHandle: profile.publicHandle,
        visibility: profile.visibility,
        timezone: profile.timezone
      } : null,
      credits,
      shareLink,
      analytics: {
        totalViews: allProfiles.reduce((sum, p) => sum + (p.view_count || 0), 0),
        totalBookings: allProfiles.reduce((sum, p) => sum + (p.booking_count || 0), 0),
        profileCount: allProfiles.length
      },
      profiles: profilesWithTimezone.map(p => ({
        id: p.id,
        title: p.title,
        profileName: p.profileName,
        publicHandle: p.publicHandle,
        visibility: p.visibility,
        viewCount: p.view_count || 0,
        bookingCount: p.booking_count || 0,
        isDefault: p.is_default,
        createdAt: p.created_at,
        timezone: p.timezone
      })),
      files: allFiles
    });
  } catch (error) {
    console.error('[dashboard] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// WP13: Analytics - Track profile view
app.post("/api/analytics/view", async (req, res) => {
  try {
    const { profileId } = req.body;
    if (!profileId) {
      return res.status(400).json({ error: 'profileId required' });
    }

    // Get visitor IP (hashed for privacy)
    const visitorIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const crypto = await import('crypto');
    const hashedIp = crypto.createHash('sha256')
      .update(visitorIp + 'openinterview-salt')
      .digest('hex')
      .slice(0, 16);

    // Check for recent view from same IP (simple rate limiting)
    // Use atomic increment and sync with entitlements
    const newViewCount = await pgClient.incrementProfileView(profileId);
    
    if (newViewCount === null) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    console.log(`[analytics] View tracked for profile ${profileId}: ${newViewCount} total`);

    res.json({ success: true, viewCount: newViewCount });
  } catch (error) {
    console.error('[analytics] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// WP5: Stripe Checkout - Create checkout session
app.post("/api/checkout", requireAuth, async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.user.id;

    // Get plan from database
    const plan = await pgClient.getPlanByCode(planId);
    if (!plan) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    // Check if plan is purchasable
    if (!plan.isPurchasable) {
      return res.status(400).json({
        error: 'Plan not available for purchase yet',
        message: 'This plan is not yet available for purchase. Please try again later.'
      });
    }

    console.log("stripe key",process.env.STRIPE_SECRET_KEY);
    
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      // Mock checkout for development (PostgreSQL)
      console.log(`[checkout] Mock checkout for plan ${planId}, user ${userId}`);

      // Simulate successful payment - update entitlement directly
      let entitlement = await pgClient.getEntitlement(userId);
      if (!entitlement) {
        entitlement = await pgClient.createEntitlement({
          userId,
          plan: 'free',
          sharesUsed: 0,
          sharesLimit: 1,
          bookingsUsed: 0,
          bookingsLimit: 0
        });
      }

      await pgClient.updateEntitlement(userId, {
        plan: planId,
        sharesLimit: plan.sharesLimit,
        bookingsLimit: plan.bookingsLimit
      });

      return res.json({
        success: true,
        message: 'Plan upgraded (dev mode)',
        redirectUrl: '/subscription.html?payment=success'
      });
    }

    // Real Stripe checkout
    const stripe = await getStripeClient();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: plan.stripePriceId,
        quantity: 1
      }],
      mode: 'subscription',
      success_url: `${process.env.BASE_URL || 'http://localhost:3000'}/subscription.html?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL || 'http://localhost:3000'}/subscription.html?payment=cancelled`,
      client_reference_id: userId,
      metadata: {
        userId,
        planId
      }
    });

    res.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error('[checkout] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// New endpoint: POST /api/purchases - PostgreSQL
app.post("/api/purchases", requireAuth, async (req, res) => {
  try {
    const { bundleId } = req.body;
    const userId = req.user.id;

    let entitlement = await pgClient.getEntitlement(userId);
    // if (!entitlement) {
    //   entitlement = await pgClient.createEntitlement({
    //     id: `ent_${Date.now().toString(36)}`,
    //     userId,
    //     plan: 'free',
    //     sharesUsed: 0,
    //     sharesLimit: 1,
    //     bookingsUsed: 0,
    //     bookingsLimit: 0
    //   });
    // }
    if (!entitlement) {
      entitlement = await pgClient.createEntitlement({

        userId,
        plan: 'free',
        sharesUsed: 0,
        sharesLimit: 1,
        bookingsUsed: 0,
        bookingsLimit: 0
      });
    }
    const bundles = {
      B1: { shares: 1, price: 7 },
      B5: { shares: 5, price: 10 },
      B15: { shares: 15, price: 20 },
    };

    const bundle = bundles[bundleId];
    if (bundle) {
      const newSharesLimit = (entitlement.sharesLimit || 0) + bundle.shares;
      await pgClient.updateEntitlement(userId, { sharesLimit: newSharesLimit });

      res.json({
        success: true,
        sharesLimit: newSharesLimit,
        sharesUsed: entitlement.sharesUsed || 0,
        sharesRemaining: newSharesLimit - (entitlement.sharesUsed || 0)
      });
    } else {
      res.status(400).json({ error: "Invalid bundle ID" });
    }
  } catch (error) {
    console.error('[purchases] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// // New endpoint: GET /api/billing/portal
// app.get("/api/billing/portal", (req, res) => {
//     res.json({ url: "https://stripe.com/billing/portal" });
// });

// ✅ WP5: Stripe Customer Portal (requires auth)
app.post("/api/billing/portal", requireAuth, async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(400).json({ error: "Stripe is not configured" });
    }

    const entitlement = await pgClient.getEntitlement(req.user.id);
    if (!entitlement?.stripeCustomerId) {
      return res.status(400).json({ error: "No Stripe customer on file" });
    }

    const stripe = await getStripeClient();

    const session = await stripe.billingPortal.sessions.create({
      customer: entitlement.stripeCustomerId,
      return_url: `${process.env.BASE_URL || "http://localhost:3000"}/subscription.html`,
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error("[billing-portal] Error:", error);
    return res.status(500).json({ error: "Failed to create billing portal session" });
  }
});

// Optional: block GET to avoid confusion
app.get("/api/billing/portal", (req, res) => {
  res.status(405).json({ error: "Use POST /api/billing/portal" });
});
// New endpoint: POST /api/billing/checkout
app.post("/api/billing/checkout", (req, res) => {
  res.json({ url: "https://stripe.com/checkout" });
});

// WP6: Booking endpoint - Create booking and generate ICS
// app.post("/api/bookings", async (req, res) => {
//   try {
//     const {
//       profileId,
//       startTime,      // ISO string
//       startISO,       // ISO string (alias)
//       duration,       // minutes
//       bookerName,
//       bookerEmail,
//       message,
//       // Legacy fields to reject
//       scheduledDate,
//       scheduledTime,
//       date,
//       time
//     } = req.body;

//     // Strict rejection of legacy fields
//     if (scheduledDate || scheduledTime || date || time) {
//       return res.status(400).json({
//         error: "start_time (UTC ISO) is required; scheduledDate/scheduledTime are not supported."
//       });
//     }

//     const effectiveStartTime = startTime || startISO;



//     if (!profileId || !effectiveStartTime || !bookerEmail) {
//       return res.status(400).json({ error: 'Missing required fields (profileId, startISO, bookerEmail)' });
//     }

//     const hasTZ = /([zZ]|[+\-]\d{2}:\d{2})$/.test(effectiveStartTime);
//     if (!hasTZ) {
//       return res.status(400).json({ error: 'startTime/startISO must include timezone (e.g., ...Z or +05:00)' });
//     }

//     console.log('[booking] profileId', profileId);
//     let profile = await pgClient.getProfile(profileId);
//     if (!profile) {
//       return res.status(404).json({ error: 'Profile not found' });
//     }

//     const owner = await pgClient.getUser(profile.userId);

//     const bookingId = 'bk_' + uuid().slice(0, 12);
//     const startDt = new Date(effectiveStartTime);
//     if (isNaN(startDt.getTime())) {
//       return res.status(400).json({ error: 'Invalid start time format' });
//     }
//     // const bookingDuration = duration || 15;
//     const bookingDuration = Number(duration ?? 15);
//     if (!Number.isFinite(bookingDuration) || bookingDuration <= 0) {
//       return res.status(400).json({ error: 'Invalid duration' });
//     }

//     let icsContent = null;

//     // ICS generation moved to confirmation (PATCH)
//     // icsContent = null for pending bookings

//     // WP4: Atomic booking creation with credit enforcement
//     // Ensure credits are fresh before checking limits
//     await pgClient.ensureCreditsFresh(profile.userId);

//     const result = await pgClient.atomicCreateBookingWithCredit(profile.userId, {
//       id: bookingId,
//       profileId,
//       ownerId: profile.userId,
//       bookerName: bookerName || 'Guest',
//       bookerEmail,
//       message: message || '',
//       startTime: startDt.toISOString(),
//       duration: bookingDuration,
//       status: 'pending',
//       icsContent
//     });

//     if (!result.success) {
//       console.log(`[booking] Credit limit reached for user ${profile.userId}. Used: ${result.entitlement.bookingsUsed}/${result.entitlement.bookingsLimit}`);
//       return res.status(403).json({
//         error: 'Booking limit reached',
//         requiresUpgrade: true,
//         bookingsUsed: result.entitlement.bookingsUsed,
//         bookingsLimit: result.entitlement.bookingsLimit,
//         plan: result.entitlement.plan || 'free',
//         plans: result.plans
//       });
//     }

//     console.log(`[booking] Booking created for user ${profile.userId}. Credits used: ${result.entitlement.bookingsUsed}/${result.entitlement.bookingsLimit}`);

//     // Derive display fields from start_time for response
//     const dateStr = startDt.toISOString().split('T')[0];
//     const timeStr = startDt.toISOString().split('T')[1].substring(0, 5);

//     res.status(201).json({
//       success: true,
//       booking: {
//         id: result.booking.id,
//         date: dateStr,
//         time: timeStr,
//         scheduledDate: dateStr,
//         scheduledTime: timeStr,
//         startTime: result.booking.start_time,
//         duration: bookingDuration,
//         status: 'pending'
//       },
//       hasICS: false
//     });
//   } catch (error) {
//     if (error?.code === '23505') {
//       return res.status(409).json({ error: 'This time slot is already booked.' });
//     }
//     console.error('[booking] Error:', error);
//     res.status(500).json({ error: error.message });

//   }
// });
app.post("/api/bookings", async (req, res) => {
  try {
    const {
      profileId,
      startTime,
      startISO,
      duration,
      bookerName,
      bookerEmail,
      message,
      scheduledDate,
      scheduledTime,
      date,
      time,
      timeZone,
      recruiterTimeZone
    } = req.body;

    if (scheduledDate || scheduledTime || date || time) {
      return res.status(400).json({
        error: "start_time (UTC ISO) is required; scheduledDate/scheduledTime are not supported."
      });
    }

    const effectiveStartTime = startTime || startISO;

    if (!profileId || !effectiveStartTime || !bookerEmail) {
      return res.status(400).json({ error: 'Missing required fields (profileId, startISO, bookerEmail)' });
    }

    const hasTZ = /([zZ]|[+\-]\d{2}:\d{2})$/.test(effectiveStartTime);
    if (!hasTZ) {
      return res.status(400).json({ error: 'startTime/startISO must include timezone (e.g., ...Z or +05:00)' });
    }

    // Resolve recruiter timezone (client should send it, fallback to 'UTC' if not provided)
    const resolvedRecruiterTimezone = recruiterTimeZone || timeZone || 'UTC';

    let profile = await pgClient.getProfile(profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const bookingId = 'bk_' + uuid().slice(0, 12);
    const startDt = new Date(effectiveStartTime);
    if (isNaN(startDt.getTime())) {
      return res.status(400).json({ error: 'Invalid start time format' });
    }

    const bookingDuration = Number(duration ?? 15);
    if (!Number.isFinite(bookingDuration) || bookingDuration <= 0) {
      return res.status(400).json({ error: 'Invalid duration' });
    }

    const bypassLimits = String(process.env.BYPASS_BOOKING_LIMITS || '').toLowerCase() === 'true';

    let result;

    if (bypassLimits) {
      // DEV bypass: insert booking directly, no credit checks/deductions
      const pool = pgClient.getPool();
      const { rows } = await pool.query(
        `
        INSERT INTO bookings (
          id, profile_id, owner_id, booker_name, booker_email, message,
          start_time, duration, status, ics_content, recruiter_timezone
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING *
        `,
        [
          bookingId,
          profileId,
          profile.userId,
          bookerName || 'Guest',
          bookerEmail,
          message || '',
          startDt.toISOString(),
          bookingDuration,
          'pending',
          null,
          resolvedRecruiterTimezone
        ]
      );

      result = { success: true, booking: rows[0] };
    } else {
      // PROD normal flow
      await pgClient.ensureCreditsFresh(profile.userId);

      result = await pgClient.atomicCreateBookingWithCredit(profile.userId, {
        id: bookingId,
        profileId,
        ownerId: profile.userId,
        bookerName: bookerName || 'Guest',
        bookerEmail,
        message: message || '',
        startTime: startDt.toISOString(),
        duration: bookingDuration,
        status: 'pending',
        icsContent: null,
        recruiterTimezone: resolvedRecruiterTimezone
      });

      if (!result.success) {
        return res.status(403).json({
          error: 'Booking limit reached',
          requiresUpgrade: true,
          bookingsUsed: result.entitlement.bookingsUsed,
          bookingsLimit: result.entitlement.bookingsLimit,
          plan: result.entitlement.plan || 'free',
          plans: result.plans
        });
      }
    }

    const dateStr = startDt.toISOString().split('T')[0];
    const timeStr = startDt.toISOString().split('T')[1].substring(0, 5);

    // --- EMAIL TRIGGER: NOTIFY OWNER ---
    try {
      const owner = await pgClient.getUser(profile.userId);
      // Fetch profile availability for timezone
      const availability = await pgClient.getAvailability(profileId);
      const profileTimezone = availability?.timezone || 'UTC';

      if (owner && owner.email) {
        const { subject, html } = emailTemplates.bookingRequestOwner({
          ownerName: owner.name || 'User',
          recruiterName: bookerName || 'Guest',
          startTime: startDt.toUTCString(),
          profileTitle: profile.title || 'Profile',
          link: `${process.env.BASE_URL || 'https://openinterview.me'}/my_bookings.html`,
          profileTimezone,
          recruiterTimezone: resolvedRecruiterTimezone,
          message: message || ''
        });
        mailer.sendMail({ to: owner.email, subject, html }).catch(e => console.error('[email] Failed:', e));
      }
    } catch (emailErr) {
      console.error('[email] Error preparing owner email:', emailErr);
    }
    // --- SMS TRIGGER: NOTIFY OWNER (booking request) ---
    let bookingRequestSms = null;
    try {
      bookingRequestSms = await sendBookingRequestedOwnerSms(result.booking.id);
    } catch (smsErr) {
      console.error('[sms] Booking request SMS failed:', smsErr);
      bookingRequestSms = {
        attempted: true,
        success: false,
        errorMessage: smsErr?.message ? String(smsErr.message) : 'SMS error'
      };
    }
    // -----------------------------------

    res.status(201).json({
      success: true,
      booking: {
        id: result.booking.id,
        date: dateStr,
        time: timeStr,
        scheduledDate: dateStr,
        scheduledTime: timeStr,
        startTime: result.booking.start_time,
        duration: bookingDuration,
        status: result.booking.status || 'pending',
        recruiterTimezone: resolvedRecruiterTimezone
      },
      hasICS: false,
      sms: bookingRequestSms && bookingRequestSms.attempted ? bookingRequestSms : null
    });
  } catch (error) {
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'This time slot is already booked.' });
    }
    console.error('[booking] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// WP6: Download ICS file for a booking
// app.get("/api/bookings/:id/ics", async (req, res) => {
//   try {
//     const { id } = req.params;
//     const booking = await pgClient.getBookingById(id);
//     if (!booking) {
//       return res.status(404).json({ error: 'Booking not found' });
//     }

//     let icsContent = booking.ics_content;
//     if (!icsContent) {
//       const profile = await pgClient.getProfile(booking.profile_id);
//       const owner = await pgClient.getUser(booking.owner_id);
//       const startTime = new Date(`${booking.scheduled_date}T${booking.scheduled_time}:00`);
//       const { generateICS } = await import('./server/services/icsGenerator.js');
//       icsContent = await generateICS({
//         title: `Interview with ${profile?.person?.name || 'Candidate'}`,
//         description: `Interview booking via OpenInterview.me`,
//         startTime,
//         duration: booking.duration || 30,
//         location: 'Video Call',
//         organizer: owner ? { name: owner.name, email: owner.email } : undefined,
//         attendee: { name: booking.booker_name || 'Guest', email: booking.booker_email },
//         profileUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/u/${profile?.publicHandle || profile?.id}`
//       });
//     }

//     res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
//     res.setHeader('Content-Disposition', `attachment; filename="interview-${id}.ics"`);
//     res.send(icsContent || '');
//   } catch (error) {
//     console.error('[booking-ics] Error:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// WP6: Download ICS file for a booking
app.get("/api/bookings/:id/ics", async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await pgClient.getBookingById(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (booking.status !== 'confirmed') {
      return res.status(404).json({ error: 'ICS file not available for unconfirmed bookings' });
    }

    // Determine ownership (server-side, authoritative)
    const isOwner = req.user && booking.owner_id === req.user.id;

    // Use stored ICS for public users if available
    let icsContent = (!isOwner && booking.ics_content) ? booking.ics_content : null;

    if (!icsContent) {
      const profile = await pgClient.getProfile(booking.profile_id);
      const owner = await pgClient.getUser(booking.owner_id);

      if (!booking.start_time) {
        return res.status(500).json({ error: 'Booking start_time missing' });
      }

      const startTime = new Date(booking.start_time);
      if (isNaN(startTime.getTime())) {
        return res.status(500).json({ error: 'Invalid booking start_time' });
      }

      const { generateICS } = await import('./server/services/icsGenerator.js');

      const title = isOwner 
        ? `Interview with ${booking.booker_name || 'Guest'}`
        : `Interview with ${profile?.person?.name || 'Candidate'}`;

      const description = isOwner
        ? `Interview booking via OpenInterview.me\n\n${booking.message ? 'Message: ' + booking.message : ''}`
        : `Interview booking via OpenInterview.me`;

      // Use consistent base URL
      const baseUrl = process.env.BASE_URL || 'https://openinterview.me';

      icsContent = await generateICS({
        title,
        description,
        startTime,
        duration: booking.duration || 30,
        location: 'Video Call',
        organizer: owner ? { name: owner.name, email: owner.email } : undefined,
        attendee: { name: booking.booker_name || 'Guest', email: booking.booker_email },
        profileUrl: `${baseUrl}/u/${profile?.publicHandle || profile?.id}`
      });
    }

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="interview-${id}.ics"`);
    res.send(icsContent || '');
  } catch (error) {
    console.error('[booking-ics] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// WP6: Get bookings for a profile owner - PostgreSQL
app.get("/api/bookings", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { profileId, status } = req.query;

    // Get all bookings for this owner (PostgreSQL)
    let bookings = await pgClient.getBookingsByOwner(userId);

    // Filter by profileId if provided
    if (profileId) {
      bookings = bookings.filter(b => b.profile_id === profileId);
    }

    // Filter by status if provided
    if (status) {
      bookings = bookings.filter(b => b.status === status);
    }

    // Format response (convert snake_case to camelCase for frontend)
    // const formatted = bookings.map(b => ({



    //   id: b.id,
    //   profileId: b.profile_id,
    //   ownerId: b.owner_id,
    //   bookerName: b.booker_name,
    //   bookerEmail: b.booker_email,
    //   message: b.message,
    //   date: b.scheduled_date,
    //   time: b.scheduled_time,
    //   scheduledDate: b.scheduled_date,
    //   scheduledTime: b.scheduled_time,
    //   duration: b.duration,
    //   status: b.status,
    //   startTime: b.start_time,
    //   createdAt: b.created_at,
    //   updatedAt: b.updated_at
    // }));
    const formatted = bookings.map(b => {
      let dateStr = '', timeStr = '';
      if (b.start_time) {
        const d = new Date(b.start_time);
        if (!isNaN(d.getTime())) {
          dateStr = d.toISOString().split('T')[0];
          timeStr = d.toISOString().split('T')[1].substring(0, 5);
        }
      }

      return {
        id: b.id,
        profileId: b.profile_id,
        ownerId: b.owner_id,
        bookerName: b.booker_name,
        bookerEmail: b.booker_email,
        message: b.message,
        date: dateStr,
        time: timeStr,
        scheduledDate: dateStr,    // display only, derived
        scheduledTime: timeStr,    // display only, derived
        duration: b.duration,
        status: b.status,
        startTime: b.start_time,
        createdAt: b.created_at,
        updatedAt: b.updated_at
      };
    });


    res.json(formatted);
  } catch (error) {
    console.error('[bookings] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// WP6: Update booking status - PostgreSQL
// app.patch("/api/bookings/:id", requireAuth, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const {
//       status,
//       // Legacy check
//       scheduledDate,
//       scheduledTime
//     } = req.body;

//     if (scheduledDate || scheduledTime) {
//       return res.status(400).json({
//         error: "start_time (UTC ISO) is required; scheduledDate/scheduledTime are not supported."
//       });
//     }

//     const userId = req.user.id;

//     // Get booking (PostgreSQL)
//     const booking = await pgClient.getBookingById(id);
//     if (!booking) {
//       return res.status(404).json({ error: 'Booking not found' });
//     }

//     // Verify ownership
//     if (booking.owner_id !== userId) {
//       return res.status(403).json({ error: 'Not authorized' });
//     }

//     if (status) {
//       // Ensure status is lowercase
//       status = status.toLowerCase();
//     }

//     let icsContent = undefined;

//     // If status changing to confirmed, generate ICS
//     if (status === 'confirmed' && booking.status !== 'confirmed') {
//       try {
//         const profile = await pgClient.getProfile(booking.profile_id);
//         const owner = await pgClient.getUser(booking.owner_id);
//         const startTime = new Date(booking.start_time);

//         if (!isNaN(startTime.getTime())) {
//           const { generateICS } = await import('./server/services/icsGenerator.js');
//           icsContent = await generateICS({
//             title: `Interview with ${profile?.person?.name || 'Candidate'}`,
//             description: `Interview booking via OpenInterview.me\n\n${booking.message ? 'Message: ' + booking.message : ''}`,
//             startTime,
//             duration: booking.duration || 30,
//             location: 'Video Call',
//             organizer: owner ? { name: owner.name, email: owner.email } : undefined,
//             attendee: { name: booking.booker_name || 'Guest', email: booking.booker_email },
//             profileUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/u/${profile?.publicHandle || profile?.id}`
//           });
//         }
//       } catch (icsError) {
//         console.error('[booking-update] ICS generation error:', icsError);
//       }
//     }

//     // Update booking (PostgreSQL)
//     const updated = await pgClient.updateBooking(id, { 
//       status,
//       ...(icsContent && { icsContent })
//     });

//     // Format response
//     let dateStr = '', timeStr = '';
//     if (updated.start_time) {
//       try {
//         const d = new Date(updated.start_time);
//         dateStr = d.toISOString().split('T')[0];
//         timeStr = d.toISOString().split('T')[1].substring(0, 5);
//       } catch (e) { }
//     }

//     res.json({
//       id: updated.id,
//       profileId: updated.profile_id,
//       ownerId: updated.owner_id,
//       bookerName: updated.booker_name,
//       bookerEmail: updated.booker_email,
//       message: updated.message,
//       date: dateStr,
//       time: timeStr,
//       scheduledDate: dateStr,
//       scheduledTime: timeStr,
//       duration: updated.duration,
//       status: updated.status,
//       createdAt: updated.created_at,
//       updatedAt: updated.updated_at
//     });
//   } catch (error) {
//     console.error('[booking-update] Error:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

app.patch("/api/bookings/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    let {
      status,
      // Legacy check
      scheduledDate,
      scheduledTime,
      date,
      time
    } = req.body;

    // Strict rejection of legacy fields
    if (scheduledDate || scheduledTime || date || time) {
      return res.status(400).json({
        error: "start_time (UTC ISO) is required; scheduledDate/scheduledTime are not supported."
      });
    }

    const userId = req.user.id;

    // Get booking (PostgreSQL)
    const booking = await pgClient.getBookingById(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Verify ownership
    if (booking.owner_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Validate status input
    if (!status) {
      return res.status(400).json({ error: 'Missing required field: status' });
    }

    status = String(status).toLowerCase().trim();

    const allowed = new Set(['pending', 'confirmed', 'cancelled']);
    if (!allowed.has(status)) {
      return res.status(400).json({ error: 'Invalid status. Allowed: pending, confirmed, cancelled' });
    }

    // Business rule: once confirmed, cannot be cancelled - REMOVED to allow cancellation
    // if (booking.status === 'confirmed' && status === 'cancelled') {
    //   return res.status(400).json({ error: 'Confirmed booking cannot be cancelled.' });
    // }

    // No-op
    if (booking.status === status) {
      // Return current booking in same response shape
      const d0 = booking.start_time ? new Date(booking.start_time) : null;
      const dateStr0 = d0 && !isNaN(d0.getTime()) ? d0.toISOString().split('T')[0] : '';
      const timeStr0 = d0 && !isNaN(d0.getTime()) ? d0.toISOString().split('T')[1].substring(0, 5) : '';

      return res.json({
        id: booking.id,
        profileId: booking.profile_id,
        ownerId: booking.owner_id,
        bookerName: booking.booker_name,
        bookerEmail: booking.booker_email,
        message: booking.message,
        date: dateStr0,
        time: timeStr0,
        scheduledDate: dateStr0,
        scheduledTime: timeStr0,
        duration: booking.duration,
        status: booking.status,
        createdAt: booking.created_at,
        updatedAt: booking.updated_at
      });
    }

    let icsContent = null;

    // Generate ICS only when transitioning to confirmed
    if (status === 'confirmed' && booking.status !== 'confirmed') {
      try {
        const profile = await pgClient.getProfile(booking.profile_id);
        const owner = await pgClient.getUser(booking.owner_id);

        if (!booking.start_time) {
          return res.status(500).json({ error: 'Booking start_time missing' });
        }

        const startTime = new Date(booking.start_time);
        if (isNaN(startTime.getTime())) {
          return res.status(500).json({ error: 'Invalid booking start_time' });
        }

        const { generateICS } = await import('./server/services/icsGenerator.js');
        icsContent = await generateICS({
          title: `Interview with ${profile?.person?.name || 'Candidate'}`,
          description: `Interview booking via OpenInterview.me\n\n${booking.message ? 'Message: ' + booking.message : ''}`,
          startTime,
          duration: booking.duration || 30,
          location: 'Video Call',
          organizer: owner ? { name: owner.name, email: owner.email } : undefined,
          attendee: { name: booking.booker_name || 'Guest', email: booking.booker_email },
          profileUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/u/${profile?.publicHandle || profile?.id}`
        });
      } catch (icsError) {
        console.error('[booking-update] ICS generation error:', icsError);
        // keep going; allow confirm even if ICS fails
      }
    }

    // Update booking
    const patch = { status };
    if (icsContent) patch.icsContent = icsContent;

    // Pass current status for optimistic locking
    const updated = await pgClient.updateBooking(id, patch, booking.status);

    if (!updated) {
      return res.status(409).json({ error: 'Booking status conflict. Please refresh and try again.' });
    }

    // --- EMAIL + SMS TRIGGERS ---
    let statusChangeSms = null;
    try {
      const owner = await pgClient.getUser(booking.owner_id);
      const profile = await pgClient.getProfile(booking.profile_id);
      
      // Fetch profile availability for timezone
      const availability = await pgClient.getAvailability(booking.profile_id);
      const profileTimezone = availability?.timezone || 'UTC';

      const startTimeStr = booking.start_time ? new Date(booking.start_time).toUTCString() : 'TBD';

      // 1. Confirmed
      if (status === 'confirmed' && booking.status !== 'confirmed') {
        // Generate Recruiter Token for Cancellation
        const token = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'secret').update(id).digest('hex');
        const cancelLink = `${process.env.BASE_URL || 'https://openinterview.me'}/booking_cancel.html?bookingId=${id}&token=${token}`;

        const displayOwnerName = profile?.person?.name || profile?.profileName || owner?.name || 'Candidate';

        const { subject, html } = emailTemplates.bookingConfirmedRecruiter({
          recruiterName: booking.booker_name || 'Guest',
          ownerName: displayOwnerName,
          startTime: startTimeStr,
          profileTitle: profile?.title || 'Profile',
          icsAttached: !!icsContent,
          cancelLink,
          profileTimezone,
          recruiterTimezone: booking.recruiter_timezone
        });

        const attachments = icsContent ? [{ filename: 'interview.ics', content: icsContent }] : [];
        mailer.sendMail({ to: booking.booker_email, subject, html, attachments }).catch(e => console.error('[email] Failed:', e));
      }

      // 2. Cancelled
      if (status === 'cancelled' && booking.status !== 'cancelled') {
        const wasConfirmed = booking.status === 'confirmed';
        
        // Email Recruiter
        const { subject: subR, html: htmlR } = emailTemplates.bookingCancelled({
           recipientName: booking.booker_name || 'Guest',
           role: 'recruiter',
           startTime: startTimeStr,
           profileTitle: profile?.title || 'Profile',
           profileTimezone,
           recruiterTimezone: booking.recruiter_timezone
        });
        mailer.sendMail({ to: booking.booker_email, subject: subR, html: htmlR }).catch(e => console.error('[email] Failed:', e));
        
        // Email Owner (only if it was confirmed)
        if (wasConfirmed && owner?.email) {
           const { subject: subO, html: htmlO } = emailTemplates.bookingCancelled({
            recipientName: owner.name,
            role: 'owner',
            startTime: startTimeStr,
            profileTitle: profile?.title || 'Profile',
            profileTimezone,
            recruiterTimezone: booking.recruiter_timezone
          });
          mailer.sendMail({ to: owner.email, subject: subO, html: htmlO }).catch(e => console.error('[email] Failed:', e));
        }

        // SMS to profile owner on recruiter cancellation
        try {
          statusChangeSms = await sendBookingCancelledOwnerSms(id);
        } catch (smsErr) {
          console.error('[sms] Cancellation SMS failed in booking status update:', smsErr);
          statusChangeSms = {
            attempted: true,
            success: false,
            errorMessage: smsErr?.message ? String(smsErr.message) : 'SMS error'
          };
        }
      }
    } catch (emailErr) {
      console.error('[email-trigger] Error:', emailErr);
    }
    // ----------------------

    // Format response
    let dateStr = '', timeStr = '';
    if (updated?.start_time) {
      const d = new Date(updated.start_time);
      if (!isNaN(d.getTime())) {
        dateStr = d.toISOString().split('T')[0];
        timeStr = d.toISOString().split('T')[1].substring(0, 5);
      }
    }

    return res.json({
      id: updated.id,
      profileId: updated.profile_id,
      ownerId: updated.owner_id,
      bookerName: updated.booker_name,
      bookerEmail: updated.booker_email,
      message: updated.message,
      date: dateStr,
      time: timeStr,
      scheduledDate: dateStr,
      scheduledTime: timeStr,
      duration: updated.duration,
      status: updated.status,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
      sms: statusChangeSms && statusChangeSms.attempted ? statusChangeSms : null
    });
  } catch (error) {
    console.error('[booking-update] Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Recruiter Read Route (for cancellation page details)
app.get("/api/public/bookings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.query;

    if (!token) return res.status(400).json({ error: 'Token required' });

    // Verify token
    const expected = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'secret').update(id).digest('hex');
    if (token !== expected) return res.status(403).json({ error: 'Invalid token' });

    // Fetch Booking
    const booking = await pgClient.getBookingById(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    
    // Fetch profile for candidate name
    const profile = await pgClient.getProfile(booking.profile_id);

    // Return limited details
    res.json({
      id: booking.id,
      status: booking.status,
      start: booking.start_time, // ISO string
      startTime: booking.start_time, // for compat
      candidate: {
        name: profile?.person?.name || 'Candidate'
      },
      profileName: profile?.person?.name || 'Candidate'
    });
  } catch (error) {
    console.error('[public-booking-read] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Recruiter Cancel Route
app.post(["/api/public/bookings/:id/cancel", "/api/bookings/:id/cancel"], async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.query;

    if (!token) return res.status(400).json({ error: 'Token required' });

    // Verify token
    const expected = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'secret').update(id).digest('hex');
    if (token !== expected) return res.status(403).json({ error: 'Invalid token' });

    // Fetch Booking
    const booking = await pgClient.getBookingById(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Idempotency
    if (booking.status === 'cancelled') {
      return res.json({ success: true, status: 'cancelled' });
    }

    // Update status
    const updated = await pgClient.updateBooking(id, { status: 'cancelled' });

    // --- EMAIL TRIGGERS (Recruiter Cancel) ---
    try {
      const owner = await pgClient.getUser(booking.owner_id);
      const profile = await pgClient.getProfile(booking.profile_id);
      
      // Fetch profile availability for timezone
      const availability = await pgClient.getAvailability(booking.profile_id);
      const profileTimezone = availability?.timezone || 'UTC';

      const startTimeStr = booking.start_time ? new Date(booking.start_time).toUTCString() : 'TBD';
      const wasConfirmed = booking.status === 'confirmed';

      // Email Recruiter
      const { subject: subR, html: htmlR } = emailTemplates.bookingCancelled({
         recipientName: booking.booker_name || 'Guest',
         role: 'recruiter',
         startTime: startTimeStr,
         profileTitle: profile?.title || 'Profile',
         profileTimezone,
         recruiterTimezone: booking.recruiter_timezone
      });
      mailer.sendMail({ to: booking.booker_email, subject: subR, html: htmlR }).catch(e => console.error('[email] Failed:', e));
      
      // Email Owner (if confirmed)
      if (wasConfirmed && owner?.email) {
         const { subject: subO, html: htmlO } = emailTemplates.bookingCancelled({
          recipientName: owner.name,
          role: 'owner',
          startTime: startTimeStr,
          profileTitle: profile?.title || 'Profile',
          profileTimezone,
          recruiterTimezone: booking.recruiter_timezone
        });
        mailer.sendMail({ to: owner.email, subject: subO, html: htmlO }).catch(e => console.error('[email] Failed:', e));
      }
    } catch (e) { console.error('[cancel-email] Error:', e); }
    // --- SMS TRIGGER: NOTIFY OWNER (recruiter cancellation) ---
    let cancellationSms = null;
    try {
      cancellationSms = await sendBookingCancelledOwnerSms(id);
    } catch (smsErr) {
      console.error('[sms] Cancellation SMS failed:', smsErr);
      cancellationSms = {
        attempted: true,
        success: false,
        errorMessage: smsErr?.message ? String(smsErr.message) : 'SMS error'
      };
    }
    // -----------------------------------------

    res.json({
      success: true,
      status: 'cancelled',
      sms: cancellationSms && cancellationSms.attempted ? cancellationSms : null
    });
  } catch (error) {
    console.error('[cancel-booking] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handler for multer errors
app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).send(`File too large (max ${Math.round(err.limit / 1048576)} MB)`);
  }
  if (err) return res.status(500).send("Server error");
  next();
});

// ---- Availability helpers ----
function toMin(t) { const [H, M] = t.split(':').map(Number); return H * 60 + M; }
function fromMin(m) { const H = String(Math.floor(m / 60)).padStart(2, '0'); const Mi = String(m % 60).padStart(2, '0'); return H + ':' + Mi; }
function addMinutes(dateStr, timeStr, mins) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [H, Mi] = timeStr.split(':').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, H, Mi, 0));
  return new Date(dt.getTime() + mins * 60000);
}

// Return availability for userId
app.get("/api/availability", (req, res) => {
  const userId = req.query.userId || "u1";
  const found = db.availability.find(a => a.userId === userId);
  if (!found) {
    return res.json({
      userId,
      timezone: "America/Los_Angeles",
      weekly: { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] },
      rules: { minNoticeMinutes: 120, windowDays: 30, incrementsMinutes: 30, bufferBeforeMinutes: 30, bufferAfterMinutes: 10, maxPerDay: 5, durations: [15, 30, 45], defaultDuration: 30 },
      exceptions: []
    });
  }
  res.json(found);
});

app.post("/api/availability", (req, res) => {
  const body = req.body || {};
  const userId = body.userId || "u1";
  const i = db.availability.findIndex(a => a.userId === userId);
  if (i === -1) db.availability.push(body);
  else db.availability[i] = body;
  res.json({ ok: true, userId });
});

// Generate bookable start times
app.get("/api/slots", (req, res) => {
  const userId = req.query.userId || "u1";
  const date = req.query.date; // YYYY-MM-DD
  const duration = parseInt(req.query.duration || "30", 10);
  if (!date) return res.status(400).json({ error: "date required" });

  const av = db.availability.find(a => a.userId === userId);
  if (!av) return res.json({ slots: [] });

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const d = new Date(date + "T00:00:00Z");
  const dayKey = dayNames[d.getUTCDay()];
  let blocks = av.weekly?.[dayKey] || [];

  const ex = (av.exceptions || []).find(x => x.date === date);
  if (ex) blocks = ex.type === "block" ? [] : (ex.blocks || []);

  const inc = av.rules?.incrementsMinutes || 30;
  const starts = [];
  for (const [s, e] of blocks) {
    let t = toMin(s), end = toMin(e);
    while (t + duration <= end) { starts.push(t); t += inc; }
  }

  const today = new Date();
  const todayMidnight = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const targetMidnight = new Date(date + "T00:00:00Z");
  const daysOut = Math.floor((targetMidnight - todayMidnight) / 86400000);
  const windowDays = av.rules?.windowDays ?? 30;
  const minNotice = av.rules?.minNoticeMinutes ?? 120;

  const visible = starts.filter(m => {
    if (daysOut < 0 || daysOut > windowDays) return false;
    const startISO = addMinutes(date, fromMin(m), 0);
    const diffMin = Math.floor((startISO - today) / 60000);
    if (diffMin < minNotice) return false;
    return true;
  });

  const maxPerDay = av.rules?.maxPerDay || 999;
  const limited = visible.slice(0, maxPerDay);
  res.json({ slots: limited.map(fromMin) });
});

export default app;

app.get("/api/v1/scheduler/test", (req, res) => {
  res.status(200).send("OK");
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const PORT = process.env.PORT || 3012;
  const server = app.listen(PORT, '0.0.0.0', () => console.log("Server running on", PORT));
  server.setTimeout(300000); // 5 minutes timeout for uploads
}


// ---- Availability helpers ----
// Server restart trigger Sat Jan 10 23:39:12 PKT 2026
// Server restart trigger Sat Jan 10 23:49:29 PKT 2026
