/**
 * Splits raw doc bodies into sections using explicit start/end substrings from the client doc.
 * Run: node scripts/build-help-sections.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const raw = JSON.parse(
  fs.readFileSync(path.join(root, 'public/js/help-center/raw-bodies.json'), 'utf8')
);

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

function extractSection(body, startNeedle, endNeedle) {
  const a = body.indexOf(startNeedle);
  if (a === -1) throw new Error('start not found: ' + startNeedle);
  const from = a;
  if (!endNeedle) return body.slice(from).trim();
  const b = body.indexOf(endNeedle, from + startNeedle.length);
  if (b === -1) return body.slice(from).trim();
  return body.slice(from, b).trim();
}

/** @type {Record<string, { title: string, sections: { id: string, title: string, start: string, end: string | null }[] }>} */
const blueprint = {
  '/docs/help/dashboard': {
    title: 'Dashboard',
    sections: [
      { id: 'intro', title: 'Introduction', start: 'Dashboard (Right Side)', end: 'What this page is' },
      { id: 'what-this-page-is', title: 'What this page is', start: 'What this page is', end: 'When to use this page' },
      { id: 'when-to-use', title: 'When to use this page', start: 'When to use this page', end: 'Page overview' },
      { id: 'page-overview', title: 'Page overview', start: 'Page overviewThe Dashboard', end: 'Storage usageDisplays' },
      { id: 'storage-usage', title: 'Storage usage', start: 'Storage usageDisplays', end: 'Performance metricsProvides' },
      { id: 'performance-metrics', title: 'Performance metrics', start: 'Performance metricsProvides', end: 'Plan and upgrade' },
      { id: 'plan-and-upgrade', title: 'Plan and upgrade', start: 'Plan and upgrade', end: 'My Interviews' },
      { id: 'my-interviews', title: 'My Interviews', start: 'My Interviews', end: 'My Resumes' },
      { id: 'my-resumes', title: 'My Resumes', start: 'My Resumes', end: 'My Attachments' },
      { id: 'my-attachments', title: 'My Attachments', start: 'My Attachments', end: 'Common workflows' },
      { id: 'common-workflows', title: 'Common workflows', start: 'Common workflows', end: 'Limitations (Free plan)' },
      { id: 'limitations-free-plan', title: 'Limitations (Free plan)', start: 'Limitations (Free plan)', end: null }
    ]
  },
  '/docs/help/create-first-openinterview': {
    title: 'Create Your First OpenInterview',
    sections: [
      { id: 'intro', title: 'Introduction', start: 'Create Your First OpenInterview (Right Side)', end: '>ContentCreate Your First OpenInterview' },
      { id: 'summary', title: 'Overview', start: '>ContentCreate Your First OpenInterview', end: 'What this guide covers' },
      { id: 'what-guide-covers', title: 'What this guide covers', start: 'What this guide covers', end: 'Before you begin' },
      { id: 'before-you-begin', title: 'Before you begin', start: 'Before you begin', end: 'Step 1: Upload your resume' },
      { id: 'step-1', title: 'Step 1: Upload your resume', start: 'Step 1: Upload your resume', end: 'Step 2: Resume processing' },
      { id: 'step-2', title: 'Step 2: Resume processing', start: 'Step 2: Resume processing', end: 'Step 3: Review your generated profile' },
      { id: 'step-3', title: 'Step 3: Review your generated profile', start: 'Step 3: Review your generated profile', end: 'Profile page overview' },
      { id: 'profile-page-overview', title: 'Profile page overview', start: 'Profile page overview', end: 'Top action bar' },
      { id: 'top-action-bar', title: 'Top action bar', start: 'Top action bar', end: 'Main video section' },
      { id: 'main-video', title: 'Main video section', start: 'Main video section', end: 'Right-side profile card' },
      { id: 'profile-card', title: 'Right-side profile card', start: 'Right-side profile card', end: 'Bookings panel' },
      { id: 'bookings-panel', title: 'Bookings panel', start: 'Bookings panel', end: 'Attachments section' },
      { id: 'attachments', title: 'Attachments section', start: 'Attachments section', end: 'Connect section' },
      { id: 'connect', title: 'Connect section', start: 'Connect section', end: 'Highlights section' },
      { id: 'highlights', title: 'Highlights section', start: 'Highlights section', end: 'Resume section' },
      { id: 'resume-section', title: 'Resume section', start: 'Resume section', end: 'What OpenInterview has done for you so far' },
      { id: 'what-done', title: 'What OpenInterview has done for you so far', start: 'What OpenInterview has done for you so far', end: 'What to review before editing' },
      { id: 'review-before-editing', title: 'What to review before editing', start: 'What to review before editing', end: 'Next step: Edit your profile' },
      { id: 'next-step-edit', title: 'Next step: Edit your profile', start: 'Next step: Edit your profile', end: 'What comes next' },
      { id: 'what-comes-next', title: 'What comes next', start: 'What comes next', end: null }
    ]
  },
  '/docs/help/edit-profile': {
    title: 'Edit Your OpenInterview Profile',
    sections: [
      { id: 'intro', title: 'Introduction', start: 'Edit Your OpenInterview Profile (Right Side)', end: '>ContentEdit Your OpenInterview Profile' },
      { id: 'summary', title: 'Overview', start: '>ContentEdit Your OpenInterview Profile', end: 'What this page is' },
      { id: 'what-page', title: 'What this page is', start: 'What this page is', end: 'When to use this page' },
      { id: 'when-use', title: 'When to use this page', start: 'When to use this page', end: 'Page overview' },
      { id: 'page-overview', title: 'Page overview', start: 'Page overview', end: 'Profile setup' },
      { id: 'profile-setup', title: 'Profile setup', start: 'Profile setup', end: 'Identity and media' },
      { id: 'identity-media', title: 'Identity and media', start: 'Identity and media', end: 'Personal details' },
      { id: 'personal-details', title: 'Personal details', start: 'Personal details', end: 'Resume and attachments' },
      { id: 'resume-attachments', title: 'Resume and attachments', start: 'Resume and attachments', end: 'Professional content' },
      { id: 'professional-content', title: 'Professional content', start: 'Professional content', end: 'Availability (Bookings)' },
      { id: 'availability', title: 'Availability (Bookings)', start: 'Availability (Bookings)', end: 'Save your profile' },
      { id: 'save-profile', title: 'Save your profile', start: 'Save your profile', end: 'Final step: Share your profile' },
      { id: 'final-share', title: 'Final step: Share your profile', start: 'Final step: Share your profile', end: 'What a complete profile includes' },
      { id: 'complete-includes', title: 'What a complete profile includes', start: 'What a complete profile includes', end: null }
    ]
  },
  '/docs/help/share-profile': {
    title: 'Share Your OpenInterview Profile',
    sections: [
      { id: 'intro', title: 'Introduction', start: 'Share Your OpenInterview Profile (Right Side)', end: 'Share Your OpenInterview ProfileOnce' },
      { id: 'overview', title: 'Overview', start: 'Share Your OpenInterview ProfileOnce', end: 'When to share your profile' },
      { id: 'when-share', title: 'When to share your profile', start: 'When to share your profile', end: 'Return to your profile page' },
      { id: 'return-profile', title: 'Return to your profile page', start: 'Return to your profile page', end: 'Share button' },
      { id: 'share-button', title: 'Share button', start: 'Share button', end: 'Share modal overview' },
      { id: 'share-modal', title: 'Share modal overview', start: 'Share modal overview', end: 'Share via email' },
      { id: 'share-via-email', title: 'Share via email', start: 'Share via email', end: 'Copy profile link' },
      { id: 'copy-link', title: 'Copy profile link', start: 'Copy profile link', end: 'When to use each option' },
      { id: 'when-each', title: 'When to use each option', start: 'When to use each option', end: 'What recruiters see' },
      { id: 'recruiters-see', title: 'What recruiters see', start: 'What recruiters see', end: 'Best practices for sharing' },
      { id: 'best-practices', title: 'Best practices for sharing', start: 'Best practices for sharing', end: 'You’re now live' },
      { id: 'now-live', title: 'You’re now live', start: 'You’re now live', end: null }
    ]
  },
  '/docs/help/create-new-openinterview': {
    title: 'Create a New OpenInterview',
    sections: [
      { id: 'intro', title: 'Introduction', start: 'Create a New OpenInterview (Right Side)', end: 'Create a New OpenInterviewAfter' },
      { id: 'overview', title: 'Overview', start: 'Create a New OpenInterviewAfter', end: 'What this step is' },
      { id: 'what-step', title: 'What this step is', start: 'What this step is', end: 'When to create a new OpenInterview' },
      { id: 'when-create', title: 'When to create a new OpenInterview', start: 'When to create a new OpenInterview', end: 'Access New InterviewFrom anywhere' },
      { id: 'access-new', title: 'Access New Interview', start: 'Access New InterviewFrom anywhere', end: 'New editor overview' },
      { id: 'new-editor', title: 'New editor overview', start: 'New editor overview', end: 'Upload resume (required)' },
      { id: 'upload-required', title: 'Upload resume (required)', start: 'Upload resume (required)', end: 'Auto-populate profile' },
      { id: 'auto-populate', title: 'Auto-populate profile', start: 'Auto-populate profile', end: 'Continue profile setup' },
      { id: 'continue-setup', title: 'Continue profile setup', start: 'Continue profile setup', end: 'Key difference from first OpenInterview' },
      { id: 'key-difference', title: 'Key difference from first OpenInterview', start: 'Key difference from first OpenInterview', end: 'Save your profile' },
      { id: 'save-profile', title: 'Save your profile', start: 'Save your profile', end: 'Share your new profile' },
      { id: 'share-new', title: 'Share your new profile', start: 'Share your new profile', end: 'Best practices' },
      { id: 'best-practices', title: 'Best practices', start: 'Best practices', end: 'You can now manage multiple profiles' },
      { id: 'manage-multiple', title: 'You can now manage multiple profiles', start: 'You can now manage multiple profiles', end: null }
    ]
  }
};

const pages = [];
for (const [slug, spec] of Object.entries(blueprint)) {
  const body = raw[slug];
  if (!body) throw new Error('Missing raw body for ' + slug);
  const sections = [];
  for (const s of spec.sections) {
    let text = extractSection(body, s.start, s.end);
    text = text.replace(/^>\s*Content/i, '').trim();
    text = text.replace(/Share Your OpenInterview ProfileOnce/g, 'Share Your OpenInterview Profile Once');
    text = text.replace(/Create a New OpenInterviewAfter/g, 'Create a New OpenInterview After');
    sections.push({ id: s.id, title: s.title, text });
  }
  pages.push({ slug, title: spec.title, sections });
}

fs.writeFileSync(
  path.join(root, 'public/js/help-center/pages.json'),
  JSON.stringify({ pages }, null, 2),
  'utf8'
);
console.log('Wrote pages.json, pages:', pages.length);
