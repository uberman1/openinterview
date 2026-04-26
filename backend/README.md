# OpenInterview - API Testing Backend

## Purpose

This FastAPI backend provides a **testing layer** for running QA packs in API-mode with real HTTP endpoints. It's designed to validate your frontend against actual API responses without modifying the main Node.js/Express application.

## Quick Start

### 1. Start the API Server

```bash
# From repository root
bash scripts/serve_api.sh
```

The API will start on `http://127.0.0.1:8000` (configurable via `PORT` in `.env`)

### 2. Run Release Gate with API Health Checks

```bash
# In a separate terminal
export HOME_API=1
export HEALTH_URL="http://127.0.0.1:8000/health"
PYTHONPATH=. python release_gate/run_all.py
```

## API Documentation

Once the server is running, visit:

- **Swagger UI**: http://127.0.0.1:8000/docs
- **OpenAPI JSON**: http://127.0.0.1:8000/openapi.json

## Available Endpoints

### Health & Auth
- `GET /health` - Health check endpoint
- `POST /api/auth/reset` - Request password reset (mock)
- `POST /api/auth/apply-reset` - Apply password reset (mock)

### Stripe (Mock/Live Toggle)
- `POST /api/stripe/checkout` - Create checkout session
- `POST /api/stripe/webhook` - Handle Stripe webhooks
- `GET /api/stripe/portal` - Get customer portal URL

### Profiles
- `POST /api/profile` - Create/update profile
- `GET /api/profile/{slug}` - Get public profile

### Availability
- `GET /api/availability/{profile_id}` - List availability slots
- `POST /api/availability` - Create availability slots

### Uploads
- `POST /api/uploads` - Create upload metadata
- `GET /api/uploads/{upload_id}` - Get upload details

## Configuration

Edit `backend/.env` to customize:

```bash
# Database (SQLite for testing)
DATABASE_URL=sqlite:///./app.db

# Stripe mode
STRIPE_MODE=mock  # or 'live' for production

# Base URL
BASE_URL=http://127.0.0.1:8000

# Port
PORT=8000
```

## Database

The backend uses SQLite for lightweight testing. The database file (`app.db`) is created automatically on first run.

**Tables:**
- `users` - User accounts with Stripe subscription info
- `profiles` - User profiles with public URLs
- `slots` - Availability time slots
- `uploads` - Upload metadata

## Architecture Notes

- **Mock-first**: Stripe endpoints default to mock mode
- **Stateless testing**: Use SQLite for isolated test runs
- **API-compatible**: Matches the frontend's expected contract
- **Security**: No PAN storage, Stripe handles payment data

## Integration with QA Packs

The home pack (`home_pack/run.py`) supports API health checking:

```bash
# Enable API mode
export HOME_API=1
export HEALTH_URL="http://127.0.0.1:8000/health"

# Run home pack
python home_pack/run.py
```

When enabled, the pack will:
1. Check if the API is reachable
2. Validate the health endpoint response
3. Report API status in test results

## Development

### Install Dependencies

```bash
pip install -r backend/requirements.txt
```

### Run Server with Auto-reload

```bash
cd backend
uvicorn main:app --reload --port 8000
```

### Check API Status

```bash
curl http://127.0.0.1:8000/health
# Expected: {"status":"ok"}
```

## Troubleshooting

**Port already in use:**
```bash
# Change port in backend/.env
PORT=8001
```

**Database locked:**
```bash
# Remove the database file and restart
rm backend/app.db
bash scripts/serve_api.sh
```

**Module not found:**
```bash
# Reinstall dependencies
pip install -r backend/requirements.txt
```

## Version

**v0.1.0** - Initial API testing layer release
