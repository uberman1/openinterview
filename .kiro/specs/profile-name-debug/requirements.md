# Profile Name Auto-fill Debug Requirements

## Introduction

The Profile Name field remains empty when uploading a resume from the home page, despite implementing fixes to the `createProfile` function. This spec will systematically debug and fix the issue to ensure the Profile Name field is properly populated across all resume upload flows.

## Glossary

- **Profile Name Field**: The input field with ID `input-profile-name` in the profile edit page
- **Anonymous Upload Flow**: Home page → Upload resume → Create profile → Redirect to owner preview → Edit profile
- **Profile Edit Populate Flow**: Profile edit page → "Populate from resume" button → Auto-fill fields
- **Backend Endpoints**: `/api/upload-resume-anon` and `/api/profiles/:id/ingest`
- **Database Layer**: PostgreSQL functions in `server/db/pg-client.js`

## Requirements

### Requirement 1: Debug Data Flow

**User Story:** As a developer, I want to trace the complete data flow from resume upload to profile display, so that I can identify where the Profile Name field is being lost.

#### Acceptance Criteria

1. WHEN a resume is uploaded via anonymous flow, THE system SHALL log the generated profileName value at each step
2. WHEN the profile is created in the database, THE system SHALL log the actual SQL INSERT values including profile_name
3. WHEN the profile is updated with parsed data, THE system SHALL log the UPDATE values including profile_name
4. WHEN the profile is retrieved for display, THE system SHALL log the returned profileName value
5. WHEN the frontend loads the profile, THE system SHALL log what profileName value is received and set

### Requirement 2: Verify Database State

**User Story:** As a developer, I want to verify the actual database state, so that I can confirm whether the profile_name is being saved correctly.

#### Acceptance Criteria

1. WHEN a profile is created, THE system SHALL verify the profile_name column contains the expected value in the database
2. WHEN a profile is updated, THE system SHALL verify the profile_name column is properly updated in the database
3. WHEN a profile is retrieved, THE system SHALL return the actual profile_name value from the database
4. THE system SHALL provide a way to inspect the raw database record for debugging

### Requirement 3: Fix Profile Name Population

**User Story:** As a user uploading a resume from the home page, I want the Profile Name field to be automatically populated when I edit my profile, so that I don't have to manually enter this information.

#### Acceptance Criteria

1. WHEN I upload a resume from the home page, THE system SHALL generate a profileName in "Name - Title" format
2. WHEN the profile is created, THE system SHALL save the profileName to the database
3. WHEN I navigate to the profile edit page, THE system SHALL display the generated profileName in the input field
4. WHEN the resume contains only a name, THE system SHALL use just the name as profileName
5. WHEN the resume contains only a title, THE system SHALL use just the title as profileName

### Requirement 4: Ensure Consistency Across Flows

**User Story:** As a user, I want the Profile Name field to work consistently whether I upload from the home page or use the populate feature in profile edit, so that I have a consistent experience.

#### Acceptance Criteria

1. WHEN I upload via home page flow, THE profileName generation SHALL use the same logic as profile edit populate
2. WHEN I use profile edit populate, THE profileName generation SHALL continue to work as before
3. WHEN both flows process the same resume, THE system SHALL generate identical profileName values
4. THE system SHALL handle edge cases (missing name/title) consistently across both flows

### Requirement 5: Add Debugging Capabilities

**User Story:** As a developer, I want comprehensive logging and debugging tools, so that I can quickly identify and fix similar issues in the future.

#### Acceptance Criteria

1. THE system SHALL provide detailed console logs for profile creation and updates
2. THE system SHALL log the exact SQL queries and parameters being executed
3. THE system SHALL provide a debug endpoint to inspect profile data
4. THE system SHALL log frontend profile loading and field population
5. THE system SHALL include error handling and logging for edge cases