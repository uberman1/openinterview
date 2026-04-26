# Archived: Modular Guardrails Implementation

This directory contains the previous modular ES6 implementation that has been replaced with the loose standalone version.

## Archived Files
- `home-uat.js` (411 lines) - Modular ES6 implementation with exports
- `home.actions.spec.js` (160 lines) - Jest tests for actions
- `home.attachments-avatar.spec.js` (138 lines) - Jest tests for uploads/avatar
- `home.guardrails.spec.js` (189 lines) - Jest tests for guardrails features
- `jest.config.js` - Jest configuration
- `setup.js` - Test setup (TextEncoder polyfill)

## Why Replaced
Switched to loose standalone architecture for:
- Cleaner separation (separate file vs inline)
- Playwright E2E tests instead of Jest unit tests
- Simpler deployment (script injection)
- Lighter weight (133 lines vs 411 lines)

## Archive Date
October 15, 2025

## Total Test Coverage (Archived)
487 lines of Jest tests
