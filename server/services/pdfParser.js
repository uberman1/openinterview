// server/services/pdfParser.js
// PDF Text Extraction Service

import { PDFParse } from 'pdf-parse';

import fs from 'fs';

/**
 * Extract text content from a PDF file
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<string>} - Extracted text content
 */
export async function extractTextFromPDF(filePath) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`PDF file not found: ${filePath}`);
    }
    
    // Read the PDF file
    const dataBuffer = fs.readFileSync(filePath);
    
    // Parse the PDF
    const parser = new PDFParse({ data: dataBuffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text || '';
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

/**
 * Extract text from a buffer (for uploaded files)
 * @param {Buffer} buffer - PDF file buffer
 * @returns {Promise<string>} - Extracted text content
 */
export async function extractTextFromBuffer(buffer) {
  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text || '';
  } catch (error) {
    console.error('PDF buffer extraction error:', error);
    throw new Error(`Failed to extract text from PDF buffer: ${error.message}`);
  }
}

export default { extractTextFromPDF, extractTextFromBuffer };
