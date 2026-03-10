# Implementation Plan: WP01 Enhancements

## Task List

- [x] 1. Database schema updates
  - Add `status` column to users table
  - Add `avatar_url` and `video_url` columns to profiles table
  - Create migration script
  - Update existing users to 'registered' status
  - _Requirements: 3.3, 3.4, 4.1, 5.1_

- [x] 2. Create anonymous user service
  - [x] 2.1 Implement `createAnonymousUser()` function
    - Generate unique user ID
    - Create user record with status='anonymous'
    - Return user object
    - _Requirements: 1.1, 3.3_
  
  - [x] 2.2 Implement `linkAnonymousUser()` function
    - Find anonymous user by ID
    - Update with authentication credentials
    - Change status to 'registered'
    - Preserve existing user ID
    - _Requirements: 2.2, 2.3, 2.4, 2.5_
  
  - [x] 2.3 Write property test for anonymous user creation
    - **Property 1: Anonymous user persistence**
    - **Validates: Requirements 1.1, 1.2, 1.3, 3.3**
  
  - [x] 2.4 Write property test for profile linking
    - **Property 2: Session-based profile linking**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.5**

- [x] 3. Update resume upload endpoint
  - [x] 3.1 Modify `POST /api/upload/resume/:profileId` to create anonymous user
    - Check if user is authenticated
    - If not authenticated, call `createAnonymousUser()`
    - Store userId in session
    - Create profile linked to anonymous user
    - _Requirements: 1.1, 1.2, 3.3_
  
  - [x] 3.2 Update resume ingest to work with anonymous users
    - Allow profile updates for anonymous users
    - Don't require authentication
    - _Requirements: 1.3, 1.4_
  
  - [x] 3.3 Write property test for data preservation
    - **Property 3: Data preservation during linking**
    - **Validates: Requirements 2.3, 2.4**

- [x] 4. Update authentication endpoints
  - [x] 4.1 Modify signup endpoint to check for anonymous user in session
    - Check session for `anonymousUserId`
    - If found, call `linkAnonymousUser()` instead of creating new user
    - Preserve profile data
    - Clear `anonymousUserId` from session
    - _Requirements: 2.1, 2.2, 2.3, 2.5_
  
  - [x] 4.2 Modify Google OAuth callback to check for anonymous user
    - Same linking logic as signup
    - _Requirements: 2.1, 2.2, 2.3, 2.5_
  
  - [x] 4.3 Write property test for no guest IDs
    - **Property 4: No guest user IDs**
    - **Validates: Requirements 3.1, 3.2, 3.5**

- [x] 5. Implement default assets configuration
  - [x] 5.1 Create `server/config/defaults.js`
    - Export DEFAULT_AVATAR_URL
    - Export DEFAULT_VIDEO_URL
    - Read from environment variables
    - Provide hardcoded fallbacks
    - _Requirements: 4.5, 5.5_
  
  - [x] 5.2 Add default asset URLs to `.env.example`
    - Document DEFAULT_AVATAR_URL
    - Document DEFAULT_VIDEO_URL
    - _Requirements: 4.5, 5.5_
  
  - [x] 5.3 Place default assets in `public/assets/`
    - Add default-avatar.jpg (placeholder)
    - Add default-video.mp4 (placeholder - client will provide)
    - _Requirements: 4.3, 5.3_

- [x] 6. Update profile display logic
  - [x] 6.1 Modify profile retrieval to include default assets
    - Check if avatar_url is null
    - If null, use DEFAULT_AVATAR_URL
    - Check if video_url is null
    - If null, use DEFAULT_VIDEO_URL
    - _Requirements: 4.1, 4.2, 5.1, 5.2_
  
  - [x] 6.2 Update frontend profile loaders
    - `public/js/owner-preview-loader.js` - use default assets
    - `public/js/public-profile-loader.js` - use default assets
    - Show "Sample Video" label for default video
    - _Requirements: 4.2, 5.2, 5.6_
  
  - [x] 6.3 Write property test for default avatar
    - **Property 5: Default avatar assignment**
    - **Validates: Requirements 4.1, 4.2, 4.3**
  
  - [x] 6.4 Write property test for default video
    - **Property 6: Default video assignment**
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 7. Update media upload endpoints
  - [x] 7.1 Modify avatar upload to set custom avatar_url
    - Update profile.avatar_url with uploaded file URL
    - Override default avatar
    - _Requirements: 4.4_
  
  - [x] 7.2 Modify video upload to set custom video_url
    - Update profile.video_url with uploaded file URL
    - Override default video
    - _Requirements: 5.4_
  
  - [x] 7.3 Write property test for custom media override
    - **Property 7: Custom media override**
    - **Validates: Requirements 4.4, 5.4**

- [x] 8. Update pgClient database functions
  - [x] 8.1 Add `createAnonymousUser()` to pg-client.js
    - Insert user with status='anonymous'
    - Return user object
    - _Requirements: 1.1, 3.3_
  
  - [x] 8.2 Add `updateUserStatus()` to pg-client.js
    - Update user status field
    - _Requirements: 2.4, 3.4_
  
  - [x] 8.3 Add `linkUserAuth()` to pg-client.js
    - Update user with email, password_hash, or google_id
    - Change status to 'registered'
    - _Requirements: 2.2, 2.4_

- [x] 9. Session management updates
  - [x] 9.1 Store anonymousUserId in session after resume upload
    - Set `req.session.anonymousUserId` after user creation
    - _Requirements: 2.1_
  
  - [x] 9.2 Check session during registration
    - Read `req.session.anonymousUserId`
    - If present, trigger linking flow
    - _Requirements: 2.1, 2.2_
  
  - [x] 9.3 Clear anonymousUserId after successful linking
    - Delete `req.session.anonymousUserId`
    - _Requirements: 2.5_

- [x] 10. Frontend updates
  - [x] 10.1 Update resume upload UI to work without authentication
    - Remove auth checks from resume upload button
    - Allow anonymous users to upload
    - _Requirements: 1.1_
  
  - [x] 10.2 Add "Sample Video" label for default videos
    - Show badge/label when displaying default video
    - Hide label when custom video is uploaded
    - _Requirements: 5.6_
  
  - [x] 10.3 Update profile edit page to show default assets
    - Display default avatar if no custom avatar
    - Display default video if no custom video
    - _Requirements: 4.2, 5.2_

- [x] 11. Testing and validation
  - [x] 11.1 Test anonymous user creation flow
    - Upload resume without authentication
    - Verify user created with status='anonymous'
    - Verify profile created and linked
    - Verify data persists in database
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 11.2 Test profile linking flow
    - Upload resume as anonymous
    - Register in same session
    - Verify profile linked to authenticated user
    - Verify same user ID preserved
    - Verify all data intact
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 11.3 Test default assets display
    - Create profile without avatar upload
    - Verify default avatar displays
    - Create profile without video upload
    - Verify default video displays
    - Upload custom media
    - Verify defaults are replaced
    - _Requirements: 4.1, 4.2, 4.4, 5.1, 5.2, 5.4_
  
  - [x] 11.4 Test data persistence
    - Upload resume as anonymous
    - Close browser
    - Restart server
    - Verify data still in database
    - _Requirements: 1.4, 3.2_

- [x] 12. Documentation updates
  - Update README with new anonymous user flow
  - Document default asset configuration
  - Update API documentation
  - Add migration guide for existing deployments
  - _Requirements: All_

- [x] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

