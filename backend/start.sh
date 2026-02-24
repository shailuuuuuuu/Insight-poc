#!/usr/bin/env bash
set -e

if [ ! -f insight.db ]; then
  echo ">>> Seeding database..."
  python seed_data.py
fi

echo ">>> Starting server on port ${PORT:-8000}..."
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
