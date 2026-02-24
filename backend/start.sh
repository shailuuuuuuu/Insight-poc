#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

if [ ! -f insight.db ]; then
  echo ">>> Seeding database..."
  python seed_data.py
  echo ">>> Seeding complete."
fi

PORT="${PORT:-8000}"
echo ">>> Starting server on port ${PORT}..."
exec uvicorn main:app --host 0.0.0.0 --port "${PORT}"
