// server/services/replitDB.js
// Replit Database Service - Persistent key-value storage
// Replaces in-memory JSON database with real persistence

let db = null;

// Only initialize Replit DB if we're on Replit (REPLIT_DB_URL exists)
if (process.env.REPLIT_DB_URL) {
  const Database = (await import('@replit/database')).default;
  db = new Database();
  console.log('[replitDB] Connected to Replit Database');
} else {
  // Use in-memory fallback for local development
  console.log('[replitDB] No REPLIT_DB_URL - using in-memory storage');
  const memoryStore = new Map();
  db = {
    async get(key) { return memoryStore.get(key) || null; },
    async set(key, value) { memoryStore.set(key, value); },
    async delete(key) { memoryStore.delete(key); },
    async list(prefix = '') { 
      return Array.from(memoryStore.keys()).filter(k => k.startsWith(prefix)); 
    }
  };
}

export const replitDB = {
  // Direct database access for advanced operations
  db,

  // ============ USERS ============
  async getUser(userId) {
    try {
      return await db.get(`user:${userId}`);
    } catch (e) {
      console.error('getUser error:', e);
      return null;
    }
  },

  async setUser(userId, userData) {
    try {
      userData.updatedAt = new Date().toISOString();
      await db.set(`user:${userId}`, userData);
      return userData;
    } catch (e) {
      console.error('setUser error:', e);
      throw e;
    }
  },

  async getUserByEmail(email) {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const keys = await db.list('user:');
      for (const key of keys) {
        const user = await db.get(key);
        if (user && user.email && user.email.toLowerCase() === normalizedEmail) {
          return user;
        }
      }
      return null;
    } catch (e) {
      console.error('getUserByEmail error:', e);
      return null;
    }
  },

  async listUsers() {
    try {
      const keys = await db.list('user:');
      const users = [];
      for (const key of keys) {
        const user = await db.get(key);
        if (user) users.push(user);
      }
      return users;
    } catch (e) {
      console.error('listUsers error:', e);
      return [];
    }
  },

  async deleteUser(userId) {
    try {
      await db.delete(`user:${userId}`);
      return true;
    } catch (e) {
      console.error('deleteUser error:', e);
      return false;
    }
  },

  // ============ PROFILES ============
  async getProfile(profileId) {
    try {
      return await db.get(`profile:${profileId}`);
    } catch (e) {
      console.error('getProfile error:', e);
      return null;
    }
  },

  async setProfile(profileId, profileData) {
    try {
      profileData.updatedAt = new Date().toISOString();
      await db.set(`profile:${profileId}`, profileData);
      return profileData;
    } catch (e) {
      console.error('setProfile error:', e);
      throw e;
    }
  },

  async listProfilesByUser(userId) {
    try {
      const keys = await db.list('profile:');
      const profiles = [];
      for (const key of keys) {
        const profile = await db.get(key);
        if (profile && profile.userId === userId) {
          profiles.push(profile);
        }
      }
      return profiles.sort((a, b) => 
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
    } catch (e) {
      console.error('listProfilesByUser error:', e);
      return [];
    }
  },

  async listAllProfiles() {
    try {
      const keys = await db.list('profile:');
      const profiles = [];
      for (const key of keys) {
        const profile = await db.get(key);
        if (profile) profiles.push(profile);
      }
      return profiles;
    } catch (e) {
      console.error('listAllProfiles error:', e);
      return [];
    }
  },

  async getProfileByHandle(handle) {
    try {
      const keys = await db.list('profile:');
      for (const key of keys) {
        const profile = await db.get(key);
        if (profile && profile.publicHandle === handle) {
          return profile;
        }
      }
      return null;
    } catch (e) {
      console.error('getProfileByHandle error:', e);
      return null;
    }
  },

  async deleteProfile(profileId) {
    try {
      await db.delete(`profile:${profileId}`);
      return true;
    } catch (e) {
      console.error('deleteProfile error:', e);
      return false;
    }
  },

  // ============ FILES ============
  async getFile(fileId) {
    try {
      return await db.get(`file:${fileId}`);
    } catch (e) {
      console.error('getFile error:', e);
      return null;
    }
  },

  async setFile(fileId, fileData) {
    try {
      fileData.updatedAt = new Date().toISOString();
      await db.set(`file:${fileId}`, fileData);
      return fileData;
    } catch (e) {
      console.error('setFile error:', e);
      throw e;
    }
  },

  async listFilesByUser(userId) {
    try {
      const keys = await db.list('file:');
      const files = [];
      for (const key of keys) {
        const file = await db.get(key);
        if (file && file.userId === userId) {
          files.push(file);
        }
      }
      return files;
    } catch (e) {
      console.error('listFilesByUser error:', e);
      return [];
    }
  },

  async deleteFile(fileId) {
    try {
      await db.delete(`file:${fileId}`);
      return true;
    } catch (e) {
      console.error('deleteFile error:', e);
      return false;
    }
  },

  // ============ ENTITLEMENTS ============
  async getEntitlement(userId) {
    try {
      const entitlement = await db.get(`entitlement:${userId}`);
      if (!entitlement) {
        // Return default free entitlement
        return {
          userId,
          plan: 'free',
          sharesUsed: 0,
          sharesLimit: 1,
          bookingsUsed: 0,
          bookingsLimit: 0,
          createdAt: new Date().toISOString()
        };
      }
      return entitlement;
    } catch (e) {
      console.error('getEntitlement error:', e);
      return {
        userId,
        plan: 'free',
        sharesUsed: 0,
        sharesLimit: 1,
        bookingsUsed: 0,
        bookingsLimit: 0
      };
    }
  },

  async setEntitlement(userId, entitlementData) {
    try {
      entitlementData.updatedAt = new Date().toISOString();
      await db.set(`entitlement:${userId}`, entitlementData);
      return entitlementData;
    } catch (e) {
      console.error('setEntitlement error:', e);
      throw e;
    }
  },

  // ============ BOOKINGS ============
  async getBooking(bookingId) {
    try {
      return await db.get(`booking:${bookingId}`);
    } catch (e) {
      console.error('getBooking error:', e);
      return null;
    }
  },

  async setBooking(bookingId, bookingData) {
    try {
      bookingData.updatedAt = new Date().toISOString();
      await db.set(`booking:${bookingId}`, bookingData);
      return bookingData;
    } catch (e) {
      console.error('setBooking error:', e);
      throw e;
    }
  },

  async listBookingsByOwner(ownerId) {
    try {
      const keys = await db.list('booking:');
      const bookings = [];
      for (const key of keys) {
        const booking = await db.get(key);
        if (booking && booking.ownerId === ownerId) {
          bookings.push(booking);
        }
      }
      return bookings.sort((a, b) => 
        new Date(a.scheduledAt) - new Date(b.scheduledAt)
      );
    } catch (e) {
      console.error('listBookingsByOwner error:', e);
      return [];
    }
  },

  async listBookingsByProfile(profileId) {
    try {
      const keys = await db.list('booking:');
      const bookings = [];
      for (const key of keys) {
        const booking = await db.get(key);
        if (booking && booking.profileId === profileId) {
          bookings.push(booking);
        }
      }
      return bookings.sort((a, b) => 
        new Date(a.scheduledAt) - new Date(b.scheduledAt)
      );
    } catch (e) {
      console.error('listBookingsByProfile error:', e);
      return [];
    }
  },

  // ============ AVAILABILITY ============
  async getAvailability(userId) {
    try {
      return await db.get(`availability:${userId}`);
    } catch (e) {
      console.error('getAvailability error:', e);
      return null;
    }
  },

  async setAvailability(userId, availabilityData) {
    try {
      availabilityData.updatedAt = new Date().toISOString();
      await db.set(`availability:${userId}`, availabilityData);
      return availabilityData;
    } catch (e) {
      console.error('setAvailability error:', e);
      throw e;
    }
  },

  // ============ ANALYTICS ============
  async incrementProfileView(profileId) {
    try {
      const key = `analytics:views:${profileId}`;
      const current = (await db.get(key)) || 0;
      const newValue = current + 1;
      await db.set(key, newValue);
      return newValue;
    } catch (e) {
      console.error('incrementProfileView error:', e);
      return 0;
    }
  },

  async getProfileViews(profileId) {
    try {
      return (await db.get(`analytics:views:${profileId}`)) || 0;
    } catch (e) {
      console.error('getProfileViews error:', e);
      return 0;
    }
  },

  async incrementProfileBooking(profileId) {
    try {
      const key = `analytics:bookings:${profileId}`;
      const current = (await db.get(key)) || 0;
      const newValue = current + 1;
      await db.set(key, newValue);
      return newValue;
    } catch (e) {
      console.error('incrementProfileBooking error:', e);
      return 0;
    }
  },

  async getProfileBookings(profileId) {
    try {
      return (await db.get(`analytics:bookings:${profileId}`)) || 0;
    } catch (e) {
      console.error('getProfileBookings error:', e);
      return 0;
    }
  },

  // ============ SESSIONS (for auth) ============
  async getSession(sessionId) {
    try {
      return await db.get(`session:${sessionId}`);
    } catch (e) {
      console.error('getSession error:', e);
      return null;
    }
  },

  async setSession(sessionId, sessionData) {
    try {
      await db.set(`session:${sessionId}`, sessionData);
      return sessionData;
    } catch (e) {
      console.error('setSession error:', e);
      throw e;
    }
  },

  async deleteSession(sessionId) {
    try {
      await db.delete(`session:${sessionId}`);
      return true;
    } catch (e) {
      console.error('deleteSession error:', e);
      return false;
    }
  },

  // ============ UTILITY ============
  async exists(key) {
    try {
      const value = await db.get(key);
      return value !== null && value !== undefined;
    } catch (e) {
      return false;
    }
  },

  async clearAll(prefix) {
    try {
      const keys = await db.list(prefix);
      for (const key of keys) {
        await db.delete(key);
      }
      return true;
    } catch (e) {
      console.error('clearAll error:', e);
      return false;
    }
  },

  async getStats() {
    try {
      const users = await db.list('user:');
      const profiles = await db.list('profile:');
      const files = await db.list('file:');
      const bookings = await db.list('booking:');
      
      return {
        users: users.length,
        profiles: profiles.length,
        files: files.length,
        bookings: bookings.length
      };
    } catch (e) {
      console.error('getStats error:', e);
      return { users: 0, profiles: 0, files: 0, bookings: 0 };
    }
  }
};

export default replitDB;
