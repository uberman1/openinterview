// server/services/whisper.js
// Video Transcription Service using OpenAI Whisper API

import fs from 'fs';
import fetch from 'node-fetch';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.WHISPER_API_KEY;
const WHISPER_ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';

/**
 * Transcribe audio/video file using OpenAI Whisper API
 * @param {string} filePath - Path to audio/video file
 * @returns {Promise<string>} - Transcribed text
 */
export async function transcribeWithWhisper(filePath) {
  if (!OPENAI_API_KEY) {
    console.warn('[whisper] No API key configured - using mock transcription');
    return getMockTranscription();
  }

  try {
    console.log(`[whisper] Transcribing file: ${filePath}`);
    
    // Check file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);
    console.log(`[whisper] File size: ${fileSizeMB.toFixed(2)} MB`);

    // Whisper API limit is 25MB
    if (fileSizeMB > 25) {
      throw new Error('File too large for Whisper API (max 25MB). Please use a shorter video.');
    }

    // Create form data with file
    const FormData = (await import('form-data')).default;
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    form.append('model', 'whisper-1');
    form.append('language', 'en');
    form.append('response_format', 'text');

    // Call Whisper API
    const response = await fetch(WHISPER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        ...form.getHeaders()
      },
      body: form
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[whisper] API error:', response.status, errorText);
      throw new Error(`Whisper API error: ${response.status} - ${errorText}`);
    }

    const transcript = await response.text();
    console.log(`[whisper] Transcription complete: ${transcript.length} characters`);
    
    return transcript.trim();
  } catch (error) {
    console.error('[whisper] Transcription error:', error);
    throw error;
  }
}

/**
 * Transcribe from buffer (for uploaded files)
 * @param {Buffer} buffer - Audio/video buffer
 * @param {string} filename - Original filename
 * @returns {Promise<string>} - Transcribed text
 */
export async function transcribeBuffer(buffer, filename) {
  if (!OPENAI_API_KEY) {
    console.warn('[whisper] No API key configured - using mock transcription');
    return getMockTranscription();
  }

  try {
    const FormData = (await import('form-data')).default;
    const form = new FormData();
    
    // Append buffer as file
    form.append('file', buffer, {
      filename: filename || 'video.mp4',
      contentType: 'video/mp4'
    });
    form.append('model', 'whisper-1');
    form.append('language', 'en');
    form.append('response_format', 'text');

    const response = await fetch(WHISPER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        ...form.getHeaders()
      },
      body: form
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Whisper API error: ${response.status} - ${errorText}`);
    }

    const transcript = await response.text();
    return transcript.trim();
  } catch (error) {
    console.error('[whisper] Buffer transcription error:', error);
    throw error;
  }
}

/**
 * Mock transcription for development/testing
 */
function getMockTranscription() {
  return `Hi, my name is Alex Johnson and I'm a Senior Product Manager with over 8 years of experience 
in the tech industry. I've worked at companies like Google and Microsoft, leading cross-functional 
teams to deliver products used by millions of users.

My expertise includes product strategy, user research, agile methodologies, and data-driven 
decision making. I'm particularly passionate about building products that solve real user problems.

Some of my key achievements include launching a mobile app that reached 5 million downloads in 
its first year, and leading a team that increased user engagement by 40% through A/B testing 
and iterative improvements.

I hold an MBA from Stanford and a BS in Computer Science from MIT. I'm currently looking for 
senior product leadership roles where I can make a significant impact.

You can reach me at alex.johnson@email.com or connect with me on LinkedIn at 
linkedin.com/in/alexjohnson. I'm based in San Francisco and open to remote opportunities.

Thank you for watching my intro video!`;
}

export default { transcribeWithWhisper, transcribeBuffer };
