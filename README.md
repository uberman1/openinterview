# OpenInterview.me

Video-first professional profile platform. Record an intro video and AI automatically fills your entire profile.

## 🚀 Quick Start

### Option 1: Local Development (In-Memory)

```bash
# Install dependencies
npm install

# Start the server
npm start

# Open http://localhost:3000
```

### Option 2: Docker with Postgres (Recommended)

```bash
# Start app + Postgres
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop
docker-compose down
```

## 🔑 Environment Variables

Create a `.env` file in the root directory:

```bash
# REQUIRED: AI APIs for Video-to-Profile
OPENAI_API_KEY=sk-your-openai-key      # For Whisper transcription
DEEPSEEK_API_KEY=sk-your-deepseek-key  # For AI profile parsing

# DATABASE (leave empty for in-memory, or use Postgres)
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# AUTHENTICATION
SESSION_SECRET=your-strong-secret-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
BASE_URL=http://localhost:3000

# PAYMENTS (Stripe)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

## 📋 Features

### WP1: Video-to-Profile (Core Feature)
- Upload intro video (MP4, WebM, MOV)
- OpenAI Whisper transcription
- AI extracts: name, title, skills, experience, etc.
- Auto-fills all profile fields

### WP2: Profile Management
- Create/edit profiles
- Persistent storage (Postgres or in-memory)
- Profile linked to user on signup

### WP3: Authentication
- Email/password signup & login
- Google OAuth (optional)
- Session-based auth

### WP4: Usage Limits
- Free plan: 1 share
- Paid plans: More shares + bookings
- Monthly credit reset

### WP5: Stripe Payments
- Subscription checkout
- Webhook for instant upgrades
- Plan management

### WP6: Booking System
- Public profile booking
- ICS calendar download
- Email notifications

### WP7: Public Paywall
- Share profile publicly
- Paywall for additional shares
- View/booking analytics

## 🧪 Testing

```bash
# Run selftest
npm test

# Check system health
node selftest.mjs
```

## 📁 Project Structure

```
├── index.js                 # Main Express server
├── server/
│   ├── auth/               # Authentication (passport, routes)
│   ├── db/                 # Database (postgres, schema)
│   ├── services/           # Business logic
│   │   ├── whisper.js      # Video transcription
│   │   ├── videoParser.js  # Video → Profile
│   │   ├── resumeParser.js # PDF → Profile
│   │   └── credits.js      # Usage limits
│   └── middleware/         # Auth middleware
├── public/
│   ├── js/                 # Frontend scripts
│   ├── profile_edit.html   # Profile editor
│   ├── home.html           # Dashboard
│   └── login-page.html     # Login/signup
├── docker-compose.yml      # Docker setup
├── Dockerfile              # App container
└── .env                    # Environment variables
```

## 🐳 Docker Commands

```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop and remove
docker-compose down

# Reset database
docker-compose down -v
docker-compose up -d
```

## 📝 API Endpoints

### Authentication
- `POST /auth/signup` - Create account
- `POST /auth/login` - Login
- `POST /auth/logout` - Logout
- `GET /auth/me` - Current user
- `GET /auth/google` - Google OAuth

### Profiles
- `GET /api/profiles/mine` - Current user's profile
- `GET /api/profiles/:id` - Get profile
- `PATCH /api/profiles/:id` - Update profile
- `POST /api/profiles/:id/share` - Share profile
- `POST /api/profiles/:id/ingest` - Parse resume
- `POST /api/profiles/:id/ingest-video` - Parse video

### Dashboard
- `GET /api/dashboard` - Credits, analytics, share link

### Payments
- `POST /api/checkout` - Start Stripe checkout
- `POST /api/stripe/webhook` - Stripe webhook

## 🔧 Troubleshooting

### "Invalid email or password"
- You need to sign up first (click "Sign up" on login page)
- In-memory mode: users are lost on restart

### "DATABASE_URL not set"
- This is fine for development (uses in-memory)
- For persistence, use Docker or set DATABASE_URL

### Video upload fails
- Check OPENAI_API_KEY is set
- Max file size: 25MB (Whisper limit)
- Supported formats: MP4, WebM, MOV

## 📄 License

MIT
