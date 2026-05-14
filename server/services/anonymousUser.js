// server/services/anonymousUser.js
// Anonymous User Management Service
// Handles creation and linking of anonymous users

import crypto from 'crypto';
import pgClient from '../db/pg-client.js';

/**
 * Generate a unique user ID
 * @param {string} prefix - ID prefix (default: 'usr')
 * @returns {string} - Unique user ID
 */
function generateUserId(prefix = 'usr') {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Create an anonymous user with permanent database record
 * @param {Object} options - User creation options
 * @param {string} options.name - User name (from resume parsing)
 * @returns {Promise<Object>} - User object with id, status='anonymous'
 */
export async function createAnonymousUser(options = {}) {
  const { name = 'Anonymous User' } = options;
  
  // Generate unique user ID (retry up to 3 times if collision)
  let userId;
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    userId = generateUserId();
    
    try {
      // Try to create user with this ID
      const user = await pgClient.createUser({
        id: userId,
        name,
        email: null,
        password_hash: null,
        google_id: null,
        status: 'anonymous',
        avatar: null,
        timezone: 'America/Los_Angeles',
        role: 'user'
      });
      
      console.log(`[anonymousUser] Created anonymous user: ${userId}`);
      return user;
      
    } catch (error) {
      // If duplicate key error, try again with new ID
      if (error.code === '23505' && attempts < maxAttempts - 1) {
        console.warn(`[anonymousUser] ID collision for ${userId}, retrying...`);
        attempts++;
        continue;
      }
      
      // Other error or max attempts reached
      console.error('[anonymousUser] Failed to create anonymous user:', error);
      throw new Error(`Failed to create anonymous user: ${error.message}`);
    }
  }
  
  throw new Error('Failed to generate unique user ID after maximum attempts');
}

/**
 * Link anonymous user to authenticated account
 * @param {string} anonymousUserId - ID of anonymous user
 * @param {Object} authData - Authentication data
 * @param {string} authData.email - User email
 * @param {string} authData.password_hash - Hashed password (optional)
 * @param {string} authData.google_id - Google ID (optional)
 * @param {string} authData.name - User name (optional, updates if provided)
 * @returns {Promise<Object>} - Updated user object
 */
export async function linkAnonymousUser(anonymousUserId, authData) {
  try {
    // Find the anonymous user
    const user = await pgClient.getUserById(anonymousUserId);
    
    if (!user) {
      throw new Error(`Anonymous user not found: ${anonymousUserId}`);
    }
    
    if (user.status !== 'anonymous') {
      throw new Error(`User ${anonymousUserId} is not anonymous (status: ${user.status})`);
    }
    
    // Check if email already exists (for another user)
    if (authData.email) {
      const existingUser = await pgClient.getUserByEmail(authData.email);
      if (existingUser && existingUser.id !== anonymousUserId) {
        throw new Error(`Email ${authData.email} is already registered to another account`);
      }
    }
    
    // Prepare update data
    const updateData = {
      status: 'registered'
    };
    
    if (authData.email) updateData.email = authData.email;
    if (authData.password_hash) updateData.password_hash = authData.password_hash;
    if (authData.google_id) updateData.google_id = authData.google_id;
    if (authData.name) updateData.name = authData.name;
    if (authData.avatar) updateData.avatar = authData.avatar;
    
    // Update the user
    const updatedUser = await pgClient.updateUser(anonymousUserId, updateData);
    
    console.log(`[anonymousUser] Linked anonymous user ${anonymousUserId} to authenticated account`);
    
    return updatedUser;
    
  } catch (error) {
    console.error('[anonymousUser] Failed to link anonymous user:', error);
    throw error;
  }
}

/**
 * Check if a user is anonymous
 * @param {string} userId - User ID to check
 * @returns {Promise<boolean>} - True if user is anonymous
 */
export async function isAnonymousUser(userId) {
  try {
    const user = await pgClient.getUserById(userId);
    return user && user.status === 'anonymous';
  } catch (error) {
    console.error('[anonymousUser] Failed to check user status:', error);
    return false;
  }
}

export default {
  createAnonymousUser,
  linkAnonymousUser,
  isAnonymousUser
};
