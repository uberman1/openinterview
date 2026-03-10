// server/services/videoParser.js
// Video-to-Profile Parser - Transcribe video and extract structured data

import fetch from 'node-fetch';
import { transcribeWithWhisper, transcribeBuffer } from './whisper.js';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';
const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

/**
 * Parse video intro and extract structured profile data
 * @param {string} filePath - Path to video file
 * @returns {Promise<Object>} - Structured profile data
 */
export async function parseVideoIntro(filePath) {
  // Step 1: Transcribe video
  console.log('[video-parser] Step 1: Transcribing video...');
  const transcript = await transcribeWithWhisper(filePath);
  
  if (!transcript || transcript.length < 20) {
    throw new Error('Could not transcribe video. Please ensure the video has clear audio.');
  }
  
  console.log(`[video-parser] Transcript: ${transcript.substring(0, 200)}...`);
  
  // Step 2: Extract structured data from transcript
  console.log('[video-parser] Step 2: Extracting profile data...');
  const profileData = await extractProfileFromTranscript(transcript);
  
  return profileData;
}

/**
 * Parse video from buffer
 * @param {Buffer} buffer - Video buffer
 * @param {string} filename - Original filename
 * @returns {Promise<Object>} - Structured profile data
 */
export async function parseVideoBuffer(buffer, filename) {
  // Step 1: Transcribe
  console.log('[video-parser] Transcribing video buffer...');
  const transcript = await transcribeBuffer(buffer, filename);
  
  if (!transcript || transcript.length < 20) {
    throw new Error('Could not transcribe video. Please ensure the video has clear audio.');
  }
  
  // Step 2: Extract structured data
  console.log('[video-parser] Extracting profile data from transcript...');
  const profileData = await extractProfileFromTranscript(transcript);
  
  return profileData;
}

/**
 * Extract structured profile data from transcript using AI
 * @param {string} transcript - Video transcript text
 * @returns {Promise<Object>} - Structured profile data
 */
async function extractProfileFromTranscript(transcript) {
  const prompt = `You are an expert resume parser. Extract structured data from this spoken intro video transcript.

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "name": "Full Name",
  "title": "Current Job Title or Target Role",
  "email": "email@example.com or empty string",
  "phone": "phone number or empty string",
  "location": "City, State/Country",
  "linkedin": "LinkedIn URL or empty string",
  "website": "personal website or empty string",
  "summary": "2-3 sentence professional summary based on what they said",
  "experience": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "duration": "Time period mentioned",
      "description": "Key responsibilities or achievements mentioned"
    }
  ],
  "education": [
    {
      "school": "University/School Name",
      "degree": "Degree and Major",
      "year": "Year if mentioned"
    }
  ],
  "skills": ["Skill1", "Skill2", "Skill3"],
  "highlights": [
    "Key achievement or qualification mentioned",
    "Another notable point from the video",
    "Third highlight"
  ]
}

If any field cannot be determined from the transcript, use an empty string "" or empty array [].
Focus on extracting the most important professional information mentioned.

Transcript:
${transcript.substring(0, 8000)}`;

  // Try DeepSeek first
  if (DEEPSEEK_API_KEY) {
    try {
      return await callDeepSeek(prompt);
    } catch (error) {
      console.error('[video-parser] DeepSeek error:', error.message);
    }
  }

  // Fallback to OpenAI
  if (OPENAI_API_KEY) {
    try {
      return await callOpenAI(prompt);
    } catch (error) {
      console.error('[video-parser] OpenAI error:', error.message);
    }
  }

  // No API keys - return mock data
  console.warn('[video-parser] No AI API keys configured - using mock extraction');
  return extractBasicInfo(transcript);
}

async function callDeepSeek(prompt) {
  const response = await fetch(DEEPSEEK_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 2500
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('Empty response from DeepSeek');
  }

  return parseJSONResponse(content);
}

async function callOpenAI(prompt) {
  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 2500
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('Empty response from OpenAI');
  }

  return parseJSONResponse(content);
}

function parseJSONResponse(content) {
  let jsonStr = content.trim();
  
  // Remove markdown code blocks if present
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }
  
  // Try to find JSON object
  const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    jsonStr = objectMatch[0];
  }
  
  try {
    const parsed = JSON.parse(jsonStr);
    return validateAndCleanData(parsed);
  } catch (e) {
    console.error('[video-parser] Failed to parse JSON:', e);
    throw new Error('Failed to parse AI response as JSON');
  }
}

function validateAndCleanData(data) {
  return {
    name: String(data.name || '').trim(),
    title: String(data.title || '').trim(),
    email: String(data.email || '').trim().toLowerCase(),
    phone: String(data.phone || '').trim(),
    location: String(data.location || '').trim(),
    linkedin: String(data.linkedin || '').trim(),
    website: String(data.website || '').trim(),
    summary: String(data.summary || '').trim(),
    experience: Array.isArray(data.experience) ? data.experience.map(exp => ({
      company: String(exp.company || '').trim(),
      title: String(exp.title || '').trim(),
      duration: String(exp.duration || '').trim(),
      description: String(exp.description || '').trim()
    })) : [],
    education: Array.isArray(data.education) ? data.education.map(edu => ({
      school: String(edu.school || '').trim(),
      degree: String(edu.degree || '').trim(),
      year: String(edu.year || '').trim()
    })) : [],
    skills: Array.isArray(data.skills) ? data.skills.map(s => String(s).trim()).filter(Boolean) : [],
    highlights: Array.isArray(data.highlights) ? data.highlights.map(h => String(h).trim()).filter(Boolean) : []
  };
}

/**
 * Basic extraction without AI (fallback)
 */
function extractBasicInfo(transcript) {
  const emailMatch = transcript.match(/[\w.-]+@[\w.-]+\.\w+/);
  const phoneMatch = transcript.match(/[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/);
  const linkedinMatch = transcript.match(/linkedin\.com\/in\/[\w-]+/i);
  
  // Try to extract name from "my name is" or "I'm"
  const nameMatch = transcript.match(/(?:my name is|I'm|I am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  
  return {
    name: nameMatch ? nameMatch[1] : '',
    title: '',
    email: emailMatch ? emailMatch[0] : '',
    phone: phoneMatch ? phoneMatch[0] : '',
    location: '',
    linkedin: linkedinMatch ? `https://${linkedinMatch[0]}` : '',
    website: '',
    summary: transcript.substring(0, 300) + '...',
    experience: [],
    education: [],
    skills: [],
    highlights: [
      'Professional with relevant experience',
      'Strong communication skills',
      'Results-oriented'
    ]
  };
}

export default { parseVideoIntro, parseVideoBuffer, extractProfileFromTranscript };
