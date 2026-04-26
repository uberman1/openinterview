# Design Document: WP01 Enhancements

## Overview

This design implements persistent anonymous user data storage, session-based profile claiming, and default media assets for the WP01 resume-first flow. The solution eliminates the guest user concept and ensures all user data is permanently stored in Postgres.

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Anonymous User Uploads Resume                            │
│    - Create permanent user record (status: 'anonymous')     │
│    - Create permanent profile record                         │
│    - Store userId in session                                 │
│    - Parse resume and populate profile                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. User Continues Editing (Optional)                        │
│    - All changes saved to permanent profile                 │
│    - Session maintains userId reference                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌───────┴───────┐
                    │               │
                    ▼               ▼
        ┌──────────────────┐  ┌──────────────────┐
        │ User Registers   │  │ User Leaves      │
        │ (Same Session)   │  │ (No Registration)│
        └──────────────────┘  └──────────────────┘
                    │               │
                    ▼               ▼
        ┌──────────────────┐  ┌──────────────────┐
        │ Link Profile     │  │ Data Persists    │
        │ - Update user    │  │ - User: anonymous│
        │ - Add auth creds │  │ - Profile: saved │
        │ - Keep same ID   │  │ - Can claim later│
        └──────────────────┘  └──────────────────┘
```

## Components and Interfaces

### 1. Anonymous User Creation Service

**Location:** `server/services/anonymousUser.js` (NEW)

**Functions:**
```javascript
/**
 * Create an anonymous user with permanent database record
 * @returns {Promise<Object>} - User object with id, status='anonymous'
 */
async function createAnonymousUser()

/**
 * Link anonymous user to authenticated account
 * @param {string} anonymousUserId - ID of anonymous user
 * @param {Object} authData - Authentication data (email, password, googleId)
 * @returns {Promise<Object>} - Updated user object
 */
async function linkAnonymousUser(anonymousUserId, authData)
```

### 2. Session Management

**Location:** `index.js` (MODIFY)

**Session Data:**
```javascript
{
  anonymousUserId: 'usr_abc123',  // Set after resume upload
  passport: { user: 'usr_abc123' } // Set after authentication
}
```

### 3. Database Schema Updates

**Table:** `users`

**New Column:**
```sql
ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'anonymous';
-- Values: 'anonymous', 'registered'
```

**New Columns for Default Assets:**
```sql
ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN video_url TEXT;
```

### 4. Default Assets Configuration

**Location:** `.env` (MODIFY)

```bash
# Default media assets
DEFAULT_AVATAR_URL=/assets/default-avatar.jpg
DEFAULT_VIDEO_URL=/assets/default-video.mp4
```

**Location:** `server/config/defaults.js` (NEW)

```javascript
export const DEFAULT_AVATAR_URL = process.env.DEFAULT_AVATAR_URL || '/assets/default-avatar.jpg';
export const DEFAULT_VIDEO_URL = process.env.DEFAULT_VIDEO_URL || '/assets/default-video.mp4';
```

## Data Models

### User Model (Updated)

```javascript
{
  id: 'usr_abc123',
  email: null,                    // null for anonymous users
  password_hash: null,            // null for anonymous users
  google_id: null,                // null for anonymous users
  name: 'John Doe',               // from resume parsing
  avatar: '/uploads/avatar.jpg',  // or DEFAULT_AVATAR_URL
  status: 'anonymous',            // 'anonymous' or 'registered'
  created_at: '2025-12-13T...',
  updated_at: '2025-12-13T...'
}
```

### Profile Model (Updated)

```javascript
{
  id: 'prof_xyz789',
  user_id: 'usr_abc123',
  person: { name: 'John Doe' },
  title: 'Software Engineer',
  avatar_url: '/uploads/avatar.jpg',  // or null (use default)
  video_url: '/uploads/video.mp4',    // or null (use default)
  resume_file_id: 'file_resume123',
  // ... other fields
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Anonymous user persistence
*For any* resume upload by an unauthenticated user, the system should create a permanent user record with status 'anonymous' that persists in the database indefinitely.
**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 3.3**

### Property 2: Session-based profile linking
*For any* anonymous user who registers within the same session, the system should link their existing profile to the new authenticated account while preserving the same user ID.
**Validates: Requirements 2.1, 2.2, 2.3, 2.5**

### Property 3: Data preservation during linking
*For any* profile linking operation, all previously stored data (resume, parsed fields, uploads) should remain unchanged except for authentication credentials.
**Validates: Requirements 2.3, 2.4**

### Property 4: No guest user IDs
*For any* user creation operation, the system should never use temporary or guest-prefixed IDs, and should always create permanent database records.
**Validates: Requirements 3.1, 3.2, 3.5**

### Property 5: Default avatar assignment
*For any* profile without a custom avatar upload, the system should display the configured default avatar URL.
**Validates: Requirements 4.1, 4.2, 4.3**

### Property 6: Default video assignment
*For any* profile without a custom video upload, the system should display the configured default video URL.
**Validates: Requirements 5.1, 5.2, 5.3**

### Property 7: Custom media override
*For any* profile where a user uploads custom avatar or video, the system should replace the default with the uploaded media.
**Validates: Requirements 4.4, 5.4**

## Error Handling

### Anonymous User Creation Failures
- **Database connection error:** Return 500, log error, don't create profile
- **User ID generation collision:** Retry with new ID (max 3 attempts)
- **Session storage failure:** Log warning, continue (user can still use profile)

### Profile Linking Failures
- **Anonymous user not found:** Return 404, prompt user to create new profile
- **Email already exists:** Return 409, suggest login instead
- **Session expired:** Create new authenticated user, don't link

### Default Asset Failures
- **Default avatar URL invalid:** Use hardcoded fallback `/assets/placeholder-avatar.png`
- **Default video URL invalid:** Use hardcoded fallback `/assets/placeholder-video.mp4`
- **Asset file not found:** Log warning, show broken image placeholder

## Testing Strategy

### Unit Tests
- Test `createAnonymousUser()` creates user with status='anonymous'
- Test `linkAnonymousUser()` updates user status to 'registered'
- Test `linkAnonymousUser()` preserves user ID
- Test default avatar URL is returned when no custom avatar
- Test default video URL is returned when no custom video
- Test custom media overrides defaults

### Property-Based Tests
- **Property 1:** Generate random resume uploads, verify all create permanent users
- **Property 2:** Generate random registration flows, verify linking preserves ID
- **Property 3:** Generate random profile data, verify no data loss during linking
- **Property 4:** Generate random user creations, verify no guest IDs used
- **Property 5:** Generate random profiles, verify default avatar when no upload
- **Property 6:** Generate random profiles, verify default video when no upload
- **Property 7:** Generate random media uploads, verify defaults are replaced

### Integration Tests
- Test full flow: upload resume → parse → register → verify data linked
- Test full flow: upload resume → leave → return → verify data persists
- Test full flow: upload resume → upload avatar → verify custom avatar used
- Test full flow: upload resume → no video → verify default video shown

## Implementation Notes

### Session Management
- Use `express-session` with Postgres store for persistence
- Store `anonymousUserId` in session after resume upload
- Check session during registration to detect linking opportunity
- Clear `anonymousUserId` after successful linking

### Database Migrations
```sql
-- Migration 1: Add status column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'anonymous';

-- Migration 2: Add media URLs to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Migration 3: Update existing users to 'registered' status
UPDATE users SET status = 'registered' WHERE email IS NOT NULL;
```

### Backward Compatibility
- Existing users without status → default to 'registered'
- Existing profiles without avatar_url → use DEFAULT_AVATAR_URL
- Existing profiles without video_url → use DEFAULT_VIDEO_URL
- No breaking changes to existing APIs

### Performance Considerations
- Index on `users.status` for filtering anonymous vs registered
- Index on `users.email` for fast lookup during linking
- Cache default asset URLs in memory (don't query DB each time)

