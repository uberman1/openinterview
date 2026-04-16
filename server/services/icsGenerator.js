// server/services/icsGenerator.js
// WP6 + WP12: ICS Calendar File Generator with Timezone Support

import { createEvents } from 'ics';

/**
 * Generate an ICS calendar file for a booking
 * @param {Object} booking - Booking details
 * @param {string} booking.title - Event title
 * @param {string} booking.description - Event description
 * @param {Date|string} booking.startTime - Start time (ISO string or Date)
 * @param {number} booking.duration - Duration in minutes
 * @param {string} booking.location - Location
 * @param {Object} booking.organizer - Organizer details { name, email }
 * @param {Object} booking.attendee - Attendee details { name, email }
 * @param {string} booking.profileUrl - Profile URL
 * @param {string} booking.timezone - Timezone (e.g., 'America/Los_Angeles')
 * @returns {Promise<string>} - ICS file content
 */
export async function generateICS(booking) {
  const {
    title,
    description,
    startTime,      // ISO string or Date
    duration,       // minutes
    location,
    organizer,      // { name, email }
    attendee,       // { name, email }
    profileUrl,
    timezone        // WP12: Timezone support
  } = booking;
  
  // Parse start time - handle both ISO strings and Date objects
  const start = new Date(startTime);
  
  // Validate date
  if (isNaN(start.getTime())) {
    throw new Error('Invalid start time');
  }
  
  const durationHours = Math.floor(duration / 60);
  const durationMinutes = duration % 60;
  
  // WP12: Use UTC time for ICS generation
  // Calendar apps will convert to user's local timezone
  const event = {
    start: [
      start.getUTCFullYear(),
      start.getUTCMonth() + 1,
      start.getUTCDate(),
      start.getUTCHours(),
      start.getUTCMinutes()
    ],
    startInputType: 'utc',  // WP12: Specify UTC input
    startOutputType: 'utc', // WP12: Output as UTC
    duration: { hours: durationHours, minutes: durationMinutes },
    title: title || 'Interview Booking',
    description: description || `Interview scheduled via OpenInterview.me\n\nProfile: ${profileUrl || 'N/A'}`,
    location: location || 'Video Call',
    url: profileUrl,
    status: 'CONFIRMED',
    busyStatus: 'BUSY',
    organizer: organizer ? { name: organizer.name, email: organizer.email } : undefined,
    attendees: attendee ? [
      { 
        name: attendee.name, 
        email: attendee.email, 
        rsvp: true, 
        partstat: 'ACCEPTED',
        role: 'REQ-PARTICIPANT'
      }
    ] : undefined,
    productId: 'openinterview.me/ics',
    calName: 'OpenInterview Booking',
    // WP12: Add timezone if provided (for VTIMEZONE component)
    ...(timezone && { timezone })
  };
  
  return new Promise((resolve, reject) => {
    createEvents([event], (error, value) => {
      if (error) {
        console.error('[ics] Generation error:', error);
        reject(error);
      } else {
        resolve(value);
      }
    });
  });
}

/**
 * Generate ICS for multiple events
 * @param {Array} bookings - Array of booking objects
 * @returns {Promise<string>} - ICS file content
 */
export async function generateMultipleICS(bookings) {
  const events = bookings.map(booking => {
    const start = new Date(booking.startTime);
    const durationHours = Math.floor(booking.duration / 60);
    const durationMinutes = booking.duration % 60;
    
    return {
      start: [
        start.getFullYear(),
        start.getMonth() + 1,
        start.getDate(),
        start.getHours(),
        start.getMinutes()
      ],
      duration: { hours: durationHours, minutes: durationMinutes },
      title: booking.title || 'Interview Booking',
      description: booking.description || 'Interview scheduled via OpenInterview.me',
      location: booking.location || 'Video Call',
      status: 'CONFIRMED',
      busyStatus: 'BUSY'
    };
  });
  
  return new Promise((resolve, reject) => {
    createEvents(events, (error, value) => {
      if (error) {
        reject(error);
      } else {
        resolve(value);
      }
    });
  });
}

export default { generateICS, generateMultipleICS };
