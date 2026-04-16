#!/bin/bash
# Start FastAPI backend in foreground
cd backend && exec uvicorn main:app --host 0.0.0.0 --port 8000
