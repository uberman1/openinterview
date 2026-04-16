/**
 * Help handbook text loaded once at process startup (not per request).
 * Separate from resume parsing / resumeParser.js.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { extractDocxPlainSync } from '../utils/docxPlainText.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCX_PATH = path.join(
  __dirname,
  '../../public/assets_crousel/helping_docs/Help Docs_040626 (1).docx'
);

let knowledgeText = '';
try {
  knowledgeText = extractDocxPlainSync(DOCX_PATH);
  console.log('[help-doc] Knowledge base loaded:', knowledgeText.length, 'chars');
} catch (e) {
  console.error('[help-doc] Failed to load knowledge docx:', e.message);
  knowledgeText =
    'Help documentation is currently unavailable. Please try again later or contact support@openinterview.me.';
}

export function getHelpKnowledgeText() {
  return knowledgeText;
}
