/**
 * Extract plain text from a .docx (same approach as scripts/build-help-pages.mjs).
 */
import { execSync } from 'child_process';

export function extractDocxPlainSync(docxPath) {
  const xml = execSync(`unzip -p ${JSON.stringify(docxPath)} word/document.xml`, {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });
  return xml
    .replace(/<w:tab[^/]*\/>/g, '\t')
    .replace(/<w:br[^/]*\/>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}
