// server/services/resumeParser.js
// FINAL VERSION – Switch between OpenRouter (free), Real DeepSeek, Gemini, and OpenAI

import fetch from 'node-fetch';

// ──────────────────────────────────────────────────────────────
// CONFIG: Choose your provider – just change ONE line below
// ──────────────────────────────────────────────────────────────

const USE_REAL_DEEPSEEK = process.env.NODE_ENV === 'production' || process.env.USE_REAL_DEEPSEEK === 'true';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'mistralai/devstral-2512:free'||'deepseek/deepseek-chat';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const RESUME_AI_PROVIDER = process.env.RESUME_AI_PROVIDER || 'openrouter';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

const API_CONFIG = USE_REAL_DEEPSEEK && DEEPSEEK_API_KEY
  ? {
      baseURL: 'https://api.deepseek.com/v1',
      apiKey: DEEPSEEK_API_KEY,
      model: 'deepseek-chat'
    }
  : {
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: OPENROUTER_API_KEY,
      model: OPENROUTER_MODEL,
      extraHeaders: {
        'HTTP-Referer': 'https://openinterview.me',
        'X-Title': 'OpenInterview.me',
      }
    };

const ACTIVE_PROVIDER = (() => {
  if (RESUME_AI_PROVIDER === 'gemini') return 'Google Gemini';
  if (RESUME_AI_PROVIDER === 'openai') return 'OpenAI';
  return (USE_REAL_DEEPSEEK && DEEPSEEK_API_KEY ? 'REAL DeepSeek' : 'OpenRouter (free)');
})();

const ACTIVE_MODEL = (() => {
  if (RESUME_AI_PROVIDER === 'gemini') return GEMINI_MODEL;
  if (RESUME_AI_PROVIDER === 'openai') return OPENAI_MODEL;
  return API_CONFIG.model;
})();

console.log(`[AI] Using ${ACTIVE_PROVIDER} → ${ACTIVE_MODEL}`);

/**
 * Parse resume/video transcript using DeepSeek (via OpenRouter or real API)
 */
export async function parseResumeWithAI(text) {
  const prompt = `You are an expert resume parser. Extract ALL information and return ONLY valid JSON (no explanation, no markdown, no code blocks).

CRITICAL: You MUST fill ALL fields for EVERY experience and education entry. Do not skip any fields!

Return this EXACT structure:
{
  "name": "Full Name",
  "title": "Current or Target Role",
  "email": "email@example.com",
  "phone": "+1234567890",
  "location": "City, Country",
  "linkedin": "https://linkedin.com/in/username",
  "github": "https://github.com/username",
  "website": "",
  "summary": "2-3 sentence professional summary",
  "experience": [
    {
      "company": "Company Name",
      "title": "Job Title/Role",
      "location": "City, Country",
      "startDate": "Jan 2020",
      "endDate": "Present",
      "current": true,
      "description": "Brief description"
    }
  ],
  "education": [
    {
      "school": "University Name",
      "degree": "Bachelor of Science",
      "field": "Computer Science",
      "location": "City, Country",
      "startDate": "2015",
      "endDate": "2019",
      "gpa": "3.8"
    }
  ],
  "skills": ["Skill1", "Skill2"],
  "highlights": ["Achievement 1", "Achievement 2"]
}

RULES FOR PROFILES:
- linkedin: LinkedIn profile URL if found
- github: GitHub profile URL if found (look for github.com/username patterns)
- website: Personal website or portfolio URL (not GitHub or LinkedIn)

CRITICAL FOR GITHUB:
- Extract ANY GitHub URL mentioned in the resume
- Common formats: github.com/username, https://github.com/username, GitHub: username
- If multiple GitHub URLs, use the most prominent/main one
- If no GitHub found, use empty string ""

RULES FOR EXPERIENCE:
- company: Company/Organization name
- title: Job title or role (e.g., "Software Engineer", "Product Manager")
- location: City and country/state where you worked
- startDate: When you started (e.g., "Jan 2020", "2020")
- endDate: When you ended or "Present" if current
- current: true if currently working there, false otherwise
- description: Brief description of responsibilities and achievements

RULES FOR EDUCATION:
- school: Full university/college name
- degree: Degree type ONLY (e.g., "Bachelor of Science", "Master of Arts", "PhD", "Bachelor's", "Master's")
- field: Major/field of study ONLY (e.g., "Computer Science", "Business Administration", "Engineering", "Psychology")
- location: City and country/state of the school
- startDate: Year started (e.g., "2015")
- endDate: Year graduated (e.g., "2019")
- gpa: GPA if mentioned (e.g., "3.8", "3.8/4.0") or empty string if not found

CRITICAL FOR EDUCATION: Always separate degree and field! 
- If you see "Bachelor of Science in Computer Science", use degree="Bachelor of Science" and field="Computer Science"
- If you see "MBA in Finance", use degree="MBA" and field="Finance"  
- If you see "PhD in Psychology", use degree="PhD" and field="Psychology"
- If you see "BS Computer Science", use degree="BS" and field="Computer Science"
- If you see "Master's in Engineering", use degree="Master's" and field="Engineering"
- If you see "Bachelor's Computer Science", use degree="Bachelor's" and field="Computer Science"
- NEVER leave field empty if the major/specialization is mentioned anywhere in the education entry
- Look for field information in degree names, course descriptions, or major listings
- Extract field even from abbreviated forms like "BS CS" → field="Computer Science"

HIGHLIGHTS GENERATION RULES:
- First, look for explicit achievements, awards, certifications, or accomplishments in the resume
- If NO explicit highlights are found, you MUST generate 3-5 professional highlights based on:
  * Job titles and experience level (e.g., "Senior Software Engineer with 5+ years experience")
  * Skills and technologies mentioned (e.g., "Proficient in React, Node.js, and cloud technologies")
  * Education background (e.g., "Computer Science graduate from [University]")
  * Industry experience (e.g., "Experienced in fintech and e-commerce platforms")
  * Leadership or team experience (e.g., "Led cross-functional teams")
- NEVER return empty highlights array - always provide 3-5 meaningful highlights
- Make highlights specific and professional, not generic

IMPORTANT:
- Extract ALL 7 fields for EVERY experience entry
- Extract ALL 7 fields for EVERY education entry
- If a field is not found in the resume, use empty string "" (not null, not undefined)
- For current positions, use "Present" for endDate and true for current
- ALWAYS generate highlights - never leave empty array
- Return pure JSON only - no markdown, no explanations, no code blocks

Resume text:
${text.substring(0, 12000)}`;

  try {
    if (RESUME_AI_PROVIDER === 'gemini') {
      if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not configured');
      }
      const content = await callGemini(prompt);
      return parseAndCleanJSON(content);
    }

    if (RESUME_AI_PROVIDER === 'openai') {
      if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not configured');
      }
      const content = await callOpenAI(prompt);
      return parseAndCleanJSON(content);
    }

    const response = await fetch(`${API_CONFIG.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_CONFIG.apiKey}`,
        ...(API_CONFIG.extraHeaders || {})
      },
      body: JSON.stringify({
        model: API_CONFIG.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.0,
        max_tokens: 8192,
        response_format: {
          type: "json_object"
        }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    return parseAndCleanJSON(content);

  } catch (error) {
    console.error('AI parsing failed:', error.message);
    // Do NOT return mock data - throw error so user can fill manually
    throw new Error('Could not parse resume. Please fill your profile manually.');
  }
}

async function callOpenAI(prompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.0,
      max_tokens: 4096,
      response_format: {
        type: "json_object"
      }
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  if (!content) {
      throw new Error('Empty response from OpenAI');
  }
  
  return content;
}

async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        temperature: 0.1
      }
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const content = parts.map(p => p.text || '').join('\n').trim();
  if (!content) {
    throw new Error('Empty response from Gemini');
  }
  return content;
}

function parseAndCleanJSON(raw) {
  function cleanData(data) {
    const cleaned = {
      name: String(data.name || '').trim(),
      title: String(data.title || '').trim(),
      email: String(data.email || '').trim().toLowerCase(),
      phone: String(data.phone || '').trim(),
      location: String(data.location || '').trim(),
      linkedin: String(data.linkedin || '').trim(),
      website: String(data.website || '').trim(),
      github: String(data.github || '').trim(),
      summary: String(data.summary || '').trim(),
      experience: Array.isArray(data.experience) ? data.experience.slice(0, 10).map(exp => ({
        company: String(exp.company || '').trim(),
        title: String(exp.title || '').trim(),
        location: String(exp.location || '').trim(),
        startDate: String(exp.startDate || '').trim(),
        endDate: String(exp.endDate || '').trim(),
        current: Boolean(exp.current),
        description: String(exp.description || '').trim()
      })) : [],
      education: Array.isArray(data.education) ? data.education.map(edu => {
        let cleanedEdu = {
          school: String(edu.school || '').trim(),
          degree: String(edu.degree || '').trim(),
          field: String(edu.field || '').trim(),
          location: String(edu.location || '').trim(),
          startDate: String(edu.startDate || '').trim(),
          endDate: String(edu.endDate || '').trim(),
          gpa: String(edu.gpa || '').trim()
        };
        if (!cleanedEdu.field && cleanedEdu.degree) {
          const extractedField = extractFieldFromDegree(cleanedEdu.degree);
          if (extractedField) {
            console.log('[resumeParser] Extracted field from degree:', cleanedEdu.degree, '→', extractedField);
            cleanedEdu.field = extractedField;
          } else {
            console.log('[resumeParser] WARNING: Could not extract field from degree:', cleanedEdu.degree);
          }
        }
        console.log('[resumeParser] Education processed:', {
          original: edu,
          cleaned: cleanedEdu,
          fieldExtracted: !edu.field && cleanedEdu.field
        });
        return cleanedEdu;
      }) : [],
      skills: Array.isArray(data.skills) ? data.skills.slice(0, 20) : [],
      highlights: Array.isArray(data.highlights) ? data.highlights.slice(0, 5).filter(h => h && h.trim()) : []
    };
    if (cleaned.highlights.length === 0) {
      console.log('[resumeParser] No highlights found, generating fallback highlights');
      cleaned.highlights = generateFallbackHighlights(cleaned);
    }
    return cleaned;
  }

  let jsonStr = raw.trim();
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) jsonStr = jsonMatch[0];

  try {
    const data = JSON.parse(jsonStr);
    return cleanData(data);
  } catch (e) {
    const repaired = repairJsonString(raw);
    try {
      const data = JSON.parse(repaired);
      return cleanData(data);
    } catch (e2) {
      console.error('JSON parse failed:', raw.substring(0, 500));
      throw new Error('Invalid JSON from AI');
    }
  }
}

function repairJsonString(raw) {
  let s = raw || '';
  s = s.trim();

  const fenceRegex = /```[a-zA-Z]*\s*[\s\S]*?```/g;
  if (fenceRegex.test(s)) {
    const parts = s.split(/```[a-zA-Z]*\s*|\s*```/);
    if (parts.length > 1) {
      s = parts[1].trim() || parts[0].trim();
    }
  }

  const lines = s.split('\n').filter(line => {
    const t = line.trim();
    if (!t) return false;
    if (t.startsWith('```')) return false;
    if (t.startsWith('//')) return false;
    if (t.startsWith('#')) return false;
    if (/^Here is/i.test(t)) return false;
    if (/^The JSON/i.test(t)) return false;
    return true;
  });
  s = lines.join('\n');

  let jsonStr = s.trim();
  const firstBrace = jsonStr.indexOf('{');
  if (firstBrace !== -1) {
    jsonStr = jsonStr.substring(firstBrace);
  }
  const lastBrace = jsonStr.lastIndexOf('}');
  if (lastBrace !== -1) {
    jsonStr = jsonStr.substring(0, lastBrace + 1);
  }

  return jsonStr;
}

// Fallback utilities
function extractFieldFromDegree(degree) {
  if (!degree) return null;
  const d = degree.toLowerCase();
  
  // Common patterns
  if (d.includes(' in ')) {
    return degree.split(/ in /i)[1].trim();
  }
  
  // Bachelor of X, Master of X
  if (/^(bachelor|master|doctor) of /.test(d)) {
    return degree.replace(/^(bachelor|master|doctor) of /i, '').trim();
  }
  
  return null;
}

function generateFallbackHighlights(data) {
  const highlights = [];
  
  if (data.title) {
    highlights.push(`Experienced ${data.title}`);
  } else {
    highlights.push('Experienced Professional');
  }
  
  if (data.skills && data.skills.length > 0) {
    const topSkills = data.skills.slice(0, 3).join(', ');
    highlights.push(`Skilled in ${topSkills}`);
  }
  
  if (data.education && data.education.length > 0) {
    const edu = data.education[0];
    if (edu.degree && edu.school) {
      highlights.push(`${edu.degree} from ${edu.school}`);
    } else if (edu.degree) {
      highlights.push(`${edu.degree} Graduate`);
    }
  }
  
  // Fill remaining if needed
  while (highlights.length < 3) {
    if (highlights.length === 0) highlights.push('Strong professional background');
    else if (highlights.length === 1) highlights.push('Proven track record of success');
    else highlights.push('Dedicated team player');
  }
  
  return highlights;
}
