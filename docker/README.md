# Docker Setup for OpenInterview.me

## Quick Start

### 1. Start Postgres
```bash
cd docker
docker-compose up -d
```

### 2. Update .env
Add this to your `.env` file in the project root:
```bash
DATABASE_URL=postgresql://openinterview:openinterview123@localhost:5432/openinterview
```

### 3. Run the app
```bash
cd ..
npm start
```

### 4. Open browser
http://localhost:3000

## Commands

```bash
# Start Postgres
docker-compose up -d

# View logs
docker-compose logs -f

# Stop Postgres
docker-compose down

# Reset database (delete all data)
docker-compose down -v
docker-compose up -d
```

## Connection Details

- Host: localhost
- Port: 5432
- Database: openinterview
- User: openinterview
- Password: openinterview123
- Connection String: `postgresql://openinterview:openinterview123@localhost:5432/openinterview`
