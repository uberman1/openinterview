# Requirements Document: WP01 Enhancements

## Introduction

This document specifies enhancements to WP01 (Resume-First Profile Creation) based on client feedback. The changes focus on improving user data persistence, eliminating guest user concepts, and providing default media assets.

## Glossary

- **Anonymous User**: A user who has uploaded a resume but has not yet registered/authenticated
- **Session**: A browser session tracked by cookies or session storage
- **Profile**: A user's professional profile containing resume data, video, and avatar
- **Default Assets**: Fallback media (avatar, video) used when user hasn't uploaded their own

## Requirements

### Requirement 1: Persistent Anonymous User Data

**User Story:** As an anonymous user, I want my uploaded resume data to be permanently stored in the database, so that I don't lose my information even if I don't register immediately.

#### Acceptance Criteria

1. WHEN an anonymous user uploads a resume THEN the system SHALL create a permanent user record in the database with a unique user ID
2. WHEN an anonymous user uploads a resume THEN the system SHALL create a permanent profile record linked to that user ID
3. WHEN an anonymous user's resume is parsed THEN the system SHALL store all extracted data in the permanent profile record
4. WHEN an anonymous user closes their browser THEN the system SHALL retain their user and profile data in the database
5. WHEN an anonymous user returns in a new session THEN the system SHALL provide a way to claim their existing profile data

### Requirement 2: Session-Based Profile Claiming

**User Story:** As an anonymous user who later registers, I want my uploaded resume data to be automatically linked to my new account, so that I don't have to re-upload my information.

#### Acceptance Criteria

1. WHEN an anonymous user uploads a resume THEN the system SHALL store the user ID in the browser session
2. WHEN an anonymous user registers within the same session THEN the system SHALL link the existing profile to the new authenticated user account
3. WHEN an anonymous user registers within the same session THEN the system SHALL preserve all previously uploaded data (resume, parsed fields)
4. WHEN profile linking occurs THEN the system SHALL update the user record with authentication credentials
5. WHEN profile linking occurs THEN the system SHALL maintain the same user ID that was created during anonymous upload

### Requirement 3: No Guest User Concept

**User Story:** As a system administrator, I want all users to be stored as permanent records in the database, so that we can track and retain all user data regardless of authentication status.

#### Acceptance Criteria

1. THE system SHALL NOT use temporary or guest user IDs
2. THE system SHALL NOT delete user records for unauthenticated users
3. WHEN a user uploads a resume THEN the system SHALL create a permanent user record with status 'anonymous'
4. WHEN an anonymous user registers THEN the system SHALL update the user status to 'registered'
5. THE system SHALL store all user data in the canonical Postgres database using pgClient

### Requirement 4: Default Avatar for Users Without Upload

**User Story:** As a user who hasn't uploaded an avatar, I want a default professional avatar to be displayed on my profile, so that my profile looks complete and professional.

#### Acceptance Criteria

1. WHEN a user profile is created THEN the system SHALL assign a default avatar URL if no avatar is uploaded
2. WHEN a profile is displayed THEN the system SHALL show the default avatar if the user has not uploaded a custom avatar
3. THE default avatar SHALL be a professional placeholder image provided by the client
4. WHEN a user uploads a custom avatar THEN the system SHALL replace the default avatar with the uploaded image
5. THE default avatar URL SHALL be configurable via environment variable or configuration file

### Requirement 5: Default Video for Users Without Upload

**User Story:** As a user who hasn't uploaded a video, I want a default professional video to be displayed on my profile, so that visitors can see a sample of what a video profile looks like.

#### Acceptance Criteria

1. WHEN a user profile is created THEN the system SHALL assign a default video URL if no video is uploaded
2. WHEN a profile is displayed THEN the system SHALL show the default video if the user has not uploaded a custom video
3. THE default video SHALL be a professional sample video provided by the client
4. WHEN a user uploads a custom video THEN the system SHALL replace the default video with the uploaded video
5. THE default video URL SHALL be configurable via environment variable or configuration file
6. THE default video SHALL be clearly marked as a sample/placeholder in the UI

---

## Technical Notes

### Database Schema Changes

The `users` table needs a `status` field:
- `anonymous` - User created from resume upload, not yet registered
- `registered` - User has completed registration with email/password or OAuth

### Session Management

- Store `anonymousUserId` in session after resume upload
- Check session during registration to link existing profile
- Clear `anonymousUserId` from session after successful linking

### Default Assets Configuration

Environment variables needed:
```
DEFAULT_AVATAR_URL=/assets/default-avatar.jpg
DEFAULT_VIDEO_URL=/assets/default-video.mp4
```

### Profile Display Logic

```
displayAvatar = user.avatarUrl || DEFAULT_AVATAR_URL
displayVideo = user.videoUrl || DEFAULT_VIDEO_URL
```

---

## Out of Scope

- Merging multiple anonymous profiles for the same user
- Email-based profile claiming (user must register in same session)
- Custom default avatars per user type
- Video transcoding or optimization

---

## Success Metrics

- 100% of resume uploads create permanent database records
- 0% data loss for anonymous users who register in same session
- 100% of profiles without custom media show default assets
- All user data persists across server restarts

