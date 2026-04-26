// server/services/resumeImportService.js
// Shared service for applying a parsed resume data object to an existing profile.
// Used by both the native /api/profiles/:id/ingest endpoint and the
// private /api/internal/resume-import endpoint so both paths stay in sync.

import { getProfile, updateProfile } from '../db/pg-client.js';

/**
 * Maps a parsed-resume data object onto an existing profile row.
 *
 * @param {string}  profileId       - ID of the profile to update.
 * @param {object}  parsedData      - Fields matching the parseResumeWithAI() output shape
 *                                    (name, title, email, phone, location, linkedin, github,
 *                                     website, summary, highlights[], skills[],
 *                                     experience[], education[]).
 * @param {object}  [existingProfile] - Already-fetched profile object. When provided the
 *                                      function avoids an extra DB round-trip.
 * @returns {Promise<object>}  The updated profile row.
 */
export async function applyParsedResumeToProfile(profileId, parsedData, existingProfile = null) {
  const profile = existingProfile ?? await getProfile(profileId);
  if (!profile) throw new Error(`Profile not found: ${profileId}`);

  const name = parsedData.name || '';
  const title = parsedData.title || '';
  let profileName = '';
  if (name && title) profileName = `${name} - ${title}`;
  else if (name) profileName = name;
  else if (title) profileName = title;

  return updateProfile(profileId, {
    profileName,
    person: { ...profile.person, name },
    title,
    location: parsedData.location || '',
    city: parsedData.location || '',
    about: parsedData.summary || '',
    summary: parsedData.summary || '',
    highlights: (parsedData.highlights || []).map((text, idx) => ({
      id: `hi_${idx + 1}`, text, pin: idx < 3, order: idx + 1
    })),
    skills: parsedData.skills || [],
    social: {
      linkedin: parsedData.linkedin || '',
      website: parsedData.website || '',
      github: parsedData.github || ''
    },
    contact: {
      email: parsedData.email || '',
      phone: parsedData.phone || ''
    },
    experience: (parsedData.experience || []).map(exp => ({
      company: exp.company || '',
      role: exp.title || '',
      startDate: exp.startDate || '',
      endDate: exp.endDate || '',
      description: exp.description || ''
    })),
    education: (parsedData.education || []).map(edu => ({
      institution: edu.school || '',
      degree: edu.degree || '',
      field: edu.field || '',
      year: edu.endDate || edu.startDate || ''
    }))
  });
}
