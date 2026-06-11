# Requirements Document

## Introduction

This spec addresses a bug in the resume-first flow where the "Profile Name" field remains empty after uploading a resume from the home page, even though other fields (name, title, etc.) are correctly auto-populated. The Profile Name field should be automatically filled with a descriptive label combining the candidate's name and title.

## Glossary

- **Profile Name**: A descriptive label field at the top of the profile edit page that helps users identify different profiles (e.g., "John Doe - Senior Product Manager Application")
- **Resume-First Flow**: The user journey where a user uploads their resume from the home page without logging in first
- **Auto-populate Button Flow**: The user journey where a user clicks the "Auto-populate from Resume" button on the profile edit page
- **Guest User**: An anonymous user created when uploading a resume without authentication
- **Profile Edit Page**: The page at `/profile_edit.html` where users edit their profile information

## Requirements

### Requirement 1

**User Story:** As a user who uploads my resume from the home page, I want the Profile Name field to be automatically filled with a descriptive name, so that I can easily identify my profile without manual input.

#### Acceptance Criteria

1. WHEN a user uploads a resume from the home page AND the resume is successfully parsed THEN the system SHALL generate a Profile Name by combining the candidate's name and title
2. WHEN the Profile Name is generated AND both name and title are available THEN the system SHALL format it as "{Name} - {Title}"
3. WHEN the Profile Name is generated AND only the name is available THEN the system SHALL use the name alone
4. WHEN the Profile Name is generated AND only the title is available THEN the system SHALL use the title alone
5. WHEN the profile edit page loads with pre-populated data THEN the system SHALL display the generated Profile Name in the Profile Name input field

### Requirement 2

**User Story:** As a user who clicks the "Auto-populate from Resume" button, I want the Profile Name field to be filled consistently with the resume-first flow, so that the behavior is predictable regardless of which method I use.

#### Acceptance Criteria

1. WHEN a user clicks the "Auto-populate from Resume" button AND the resume is successfully parsed THEN the system SHALL generate a Profile Name using the same logic as the resume-first flow
2. WHEN the Profile Name is generated via the button THEN the system SHALL use the format "{Name} - {Title}" when both are available
3. WHEN the Profile Name is generated via the button THEN the system SHALL handle missing name or title gracefully by using whichever is available

### Requirement 3

**User Story:** As a developer, I want the Profile Name generation logic to be centralized and consistent, so that maintenance is easier and behavior is predictable.

#### Acceptance Criteria

1. WHEN the system generates a Profile Name THEN the system SHALL use a single, consistent algorithm regardless of the entry point
2. WHEN the Profile Name generation logic is updated THEN the system SHALL apply the same logic to both backend parsing and frontend auto-population
3. WHEN the system stores a profile THEN the system SHALL persist the generated Profile Name to the database
