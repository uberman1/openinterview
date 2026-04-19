/**
 * Extract plain text from a .docx using mammoth (pure Node.js, no system unzip needed).
 */
import mammoth from 'mammoth';

export async function extractDocxPlain(docxPath) {
  const result = await mammoth.extractRawText({ path: docxPath });
  return result.value;
}
