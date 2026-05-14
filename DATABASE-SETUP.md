# Database Setup Guide

This guide explains how to set up the OpenInterview.me database with any PostgreSQL provider (local, Neon, etc.).

## Automatic Setup (Recommended)

The application now automatically initializes and migrates the database on startup. Just set your `DATABASE_URL` in `.env` and start the server:

```bash
# Set your database URL in .env
DATABASE_URL=postgresql://user:password@host:port/database

# Start the server - it will auto-initialize
npm start
```

The auto-initialization will:
- ✅ Create all base tables if they don't exist
- ✅ Apply WP01 enhancements (anonymous users, default assets)
- ✅ Make email column nullable for anonymous users
- ✅ Add status column to users table
- ✅ Add avatar_url column to profiles table
- ✅ Create necessary indexes

## Manual Setup (If Needed)

If you need to manually initialize a database:

```bash
# Run the universal database initialization script
node server/db/init-database.mjs
```

This script works with any PostgreSQL database and ensures all migrations are applied.

## Database Providers

### Local PostgreSQL
```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/openinterview
```

### Neon Database
```bash
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb
```

### Other PostgreSQL Providers
Any PostgreSQL-compatible connection string will work.

## WP01 Enhancements

The WP01 enhancements add support for:

1. **Anonymous Users**: Users can upload resumes without registration
   - `users.status` column: 'anonymous' or 'registered'
   - `users.email` is nullable for anonymous users

2. **Default Media Assets**: Professional placeholders for avatar/video
   - `profiles.avatar_url` column for custom avatars
   - `profiles.video_url` column for custom videos

3. **Session-Based Profile Linking**: Anonymous profiles link to accounts on registration

## Troubleshooting

### Missing Columns Error
If you see errors like "column 'status' does not exist":

1. The auto-migration should handle this automatically
2. If it doesn't, run: `node server/db/init-database.mjs`
3. Check your `DATABASE_URL` is correct in `.env`

### Switching Databases
When switching from one database to another (e.g., local to Neon):

1. Update `DATABASE_URL` in `.env`
2. Restart the server - auto-migration will run
3. All tables and columns will be created automatically

### Verification
To verify your database is properly set up:

```bash
# Run the initialization script - it will show current state
node server/db/init-database.mjs
```

## Files

- `server/db/docker-init.sql` - Base schema
- `server/db/migrations/wp01-enhancements.sql` - WP01 enhancements
- `server/db/pg-client.js` - Auto-initialization logic
- `server/db/init-database.mjs` - Manual initialization script