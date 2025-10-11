#!/usr/bin/env bash
cd backend && exec uvicorn main:app --host 0.0.0.0 --port 8000 --log-level info
