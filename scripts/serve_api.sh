#!/bin/bash
set -e

cd "$(dirname "$0")/.."

if [ ! -f backend/.env ]; then
  cp backend/.env.sample backend/.env
  echo "Created backend/.env from .env.sample"
fi

export $(cat backend/.env | grep -v '^#' | xargs)

echo "Starting FastAPI server on port ${PORT:-8000}..."
cd backend && uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}" --reload
