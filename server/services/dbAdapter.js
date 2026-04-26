// server/services/dbAdapter.js
// Database Adapter - Provides unified interface for both in-memory and Replit DB
// This allows gradual migration without breaking existing code

import { replitDB } from './replitDB.js';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if we're on Replit (has REPL_ID env var)
const USE_REPLIT_DB = !!process.env.REPL_ID || process.env.USE_REPLIT_DB === 'true';

// In-memory fallback (for local development)
let memoryDB = null;

function getMemoryDB() {
  if (!memoryDB) {
    try {
      const seedPath = path.join(__dirname, '../../seed.json');
      memoryDB = JSON.parse(readFileSync(seedPath, 'utf8'));
      
      // Ensure arrays exist
      memoryDB.users = memoryDB.users || [];
      memoryDB.profiles = memoryDB.profiles || [];
      memoryDB.files = memoryDB.files || [];
      memoryDB.interviews = memoryDB.interviews || [];
      memoryDB.availability = memoryDB.availability || [];
      memoryDB.entitlements = memoryDB.entitlements || [];
      memoryDB.bookings = memoryDB.bookings || [];
    } catch (e) {
      console.error('Failed to load seed.json:', e);
      memoryDB = {
        users: [],
        profiles: [],
        files: [],
        interviews: [],
        availability: [],
        entitlements: [],
        bookings: []
      };
    }
  }
  return memoryDB;
}

export const dbAdapter = {
  // Flag to check which DB is being used
  isReplitDB: USE_REPLIT_DB,

  // ============ USERS ============
  async getUser(userId) {
    if (USE_REPLIT_DB) {
      return await replitDB.getUser(userId);
    }
    return getMemoryDB().users.find(u => u.id === userId) || null;
  },

  async setUser(userId, userData) {
    if (USE_REPLIT_DB) {
      return await replitDB.setUser(userId, userData);
    }
    const db = getMemoryDB();
    const idx = db.users.findIndex(u => u.id === userId);
    if (idx >= 0) {
      db.users[idx] = { ...db.users[idx], ...userData };
      return db.users[idx];
    } else {
      db.users.push(userData);
      return userData;
    }
  },

  async getUserByEmail(email) {
    if (USE_REPLIT_DB) {
      return await replitDB.getUserByEmail(email);
    }
    const normalizedEmail = email.toLowerCase().trim();
    return getMemoryDB().users.find(u => 
      u.email && u.email.toLowerCase() === normalizedEmail
    ) || null;
  },

  async listUsers() {
    if (USE_REPLIT_DB) {
      return await replitDB.listUsers();
    }
    return getMemoryDB().users;
  },

  // ============ PROFILES ============
  async getProfile(profileId) {
    if (USE_REPLIT_DB) {
      return await replitDB.getProfile(profileId);
    }
    return getMemoryDB().profiles.find(p => p.id === profileId) || null;
  },

  async setProfile(profileId, profileData) {
    if (USE_REPLIT_DB) {
      return await replitDB.setProfile(profileId, profileData);
    }
    const db = getMemoryDB();
    const idx = db.profiles.findIndex(p => p.id === profileId);
    if (idx >= 0) {
      db.profiles[idx] = { ...db.profiles[idx], ...profileData };
      return db.profiles[idx];
    } else {
      db.profiles.push(profileData);
      return profileData;
    }
  },

  async listProfilesByUser(userId) {
    if (USE_REPLIT_DB) {
      return await replitDB.listProfilesByUser(userId);
    }
    return getMemoryDB().profiles.filter(p => p.userId === userId);
  },

  async listAllProfiles() {
    if (USE_REPLIT_DB) {
      return await replitDB.listAllProfiles();
    }
    return getMemoryDB().profiles;
  },

  async getProfileByHandle(handle) {
    if (USE_REPLIT_DB) {
      return await replitDB.getProfileByHandle(handle);
    }
    return getMemoryDB().profiles.find(p => 
      p.publicHandle === handle || p.handle === handle
    ) || null;
  },

  async deleteProfile(profileId) {
    if (USE_REPLIT_DB) {
      return await replitDB.deleteProfile(profileId);
    }
    const db = getMemoryDB();
    const idx = db.profiles.findIndex(p => p.id === profileId);
    if (idx >= 0) {
      db.profiles.splice(idx, 1);
      return true;
    }
    return false;
  },

  // ============ FILES ============
  async getFile(fileId) {
    if (USE_REPLIT_DB) {
      return await replitDB.getFile(fileId);
    }
    return getMemoryDB().files.find(f => f.id === fileId) || null;
  },

  async setFile(fileId, fileData) {
    if (USE_REPLIT_DB) {
      return await replitDB.setFile(fileId, fileData);
    }
    const db = getMemoryDB();
    const idx = db.files.findIndex(f => f.id === fileId);
    if (idx >= 0) {
      db.files[idx] = { ...db.files[idx], ...fileData };
      return db.files[idx];
    } else {
      db.files.push(fileData);
      return fileData;
    }
  },

  async listFilesByUser(userId) {
    if (USE_REPLIT_DB) {
      return await replitDB.listFilesByUser(userId);
    }
    return getMemoryDB().files.filter(f => f.userId === userId);
  },

  async deleteFile(fileId) {
    if (USE_REPLIT_DB) {
      return await replitDB.deleteFile(fileId);
    }
    const db = getMemoryDB();
    const idx = db.files.findIndex(f => f.id === fileId);
    if (idx >= 0) {
      db.files.splice(idx, 1);
      return true;
    }
    return false;
  },

  // ============ ENTITLEMENTS ============
  async getEntitlement(userId) {
    if (USE_REPLIT_DB) {
      return await replitDB.getEntitlement(userId);
    }
    const db = getMemoryDB();
    let ent = db.entitlements.find(e => e.userId === userId);
    if (!ent) {
      ent = {
        userId,
        plan: 'free',
        sharesUsed: 0,
        sharesLimit: 1,
        bookingsUsed: 0,
        bookingsLimit: 0,
        createdAt: new Date().toISOString()
      };
      db.entitlements.push(ent);
    }
    return ent;
  },

  async setEntitlement(userId, entitlementData) {
    if (USE_REPLIT_DB) {
      return await replitDB.setEntitlement(userId, entitlementData);
    }
    const db = getMemoryDB();
    const idx = db.entitlements.findIndex(e => e.userId === userId);
    if (idx >= 0) {
      db.entitlements[idx] = { ...db.entitlements[idx], ...entitlementData };
      return db.entitlements[idx];
    } else {
      db.entitlements.push(entitlementData);
      return entitlementData;
    }
  },

  // ============ BOOKINGS ============
  async getBooking(bookingId) {
    if (USE_REPLIT_DB) {
      return await replitDB.getBooking(bookingId);
    }
    return getMemoryDB().bookings.find(b => b.id === bookingId) || null;
  },

  async setBooking(bookingId, bookingData) {
    if (USE_REPLIT_DB) {
      return await replitDB.setBooking(bookingId, bookingData);
    }
    const db = getMemoryDB();
    const idx = db.bookings.findIndex(b => b.id === bookingId);
    if (idx >= 0) {
      db.bookings[idx] = { ...db.bookings[idx], ...bookingData };
      return db.bookings[idx];
    } else {
      db.bookings.push(bookingData);
      return bookingData;
    }
  },

  async listBookingsByOwner(ownerId) {
    if (USE_REPLIT_DB) {
      return await replitDB.listBookingsByOwner(ownerId);
    }
    return getMemoryDB().bookings
      .filter(b => b.ownerId === ownerId)
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  },

  async listBookingsByProfile(profileId) {
    if (USE_REPLIT_DB) {
      return await replitDB.listBookingsByProfile(profileId);
    }
    return getMemoryDB().bookings
      .filter(b => b.profileId === profileId)
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  },

  // ============ AVAILABILITY ============
  async getAvailability(userId) {
    if (USE_REPLIT_DB) {
      return await replitDB.getAvailability(userId);
    }
    return getMemoryDB().availability.find(a => a.userId === userId) || null;
  },

  async setAvailability(userId, availabilityData) {
    if (USE_REPLIT_DB) {
      return await replitDB.setAvailability(userId, availabilityData);
    }
    const db = getMemoryDB();
    const idx = db.availability.findIndex(a => a.userId === userId);
    if (idx >= 0) {
      db.availability[idx] = { ...db.availability[idx], ...availabilityData };
      return db.availability[idx];
    } else {
      db.availability.push(availabilityData);
      return availabilityData;
    }
  },

  // ============ ANALYTICS ============
  async incrementProfileView(profileId) {
    if (USE_REPLIT_DB) {
      return await replitDB.incrementProfileView(profileId);
    }
    // In-memory: just return a fake count
    return Math.floor(Math.random() * 100) + 1;
  },

  async getProfileViews(profileId) {
    if (USE_REPLIT_DB) {
      return await replitDB.getProfileViews(profileId);
    }
    return 0;
  },

  async incrementProfileBooking(profileId) {
    if (USE_REPLIT_DB) {
      return await replitDB.incrementProfileBooking(profileId);
    }
    return Math.floor(Math.random() * 10) + 1;
  },

  async getProfileBookings(profileId) {
    if (USE_REPLIT_DB) {
      return await replitDB.getProfileBookings(profileId);
    }
    return 0;
  },

  // ============ RAW ACCESS ============
  // For backward compatibility with existing code that uses db.profiles, db.files, etc.
  get profiles() {
    return getMemoryDB().profiles;
  },

  get users() {
    return getMemoryDB().users;
  },

  get files() {
    return getMemoryDB().files;
  },

  get interviews() {
    return getMemoryDB().interviews;
  },

  get availability() {
    return getMemoryDB().availability;
  },

  get entitlements() {
    return getMemoryDB().entitlements;
  },

  get bookings() {
    return getMemoryDB().bookings;
  }
};

export default dbAdapter;
