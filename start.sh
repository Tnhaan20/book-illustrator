#!/bin/bash
set -e

echo "Installing root dependencies (concurrently)..."
bun install

echo "Installing backend dependencies..."
(cd backend && bun install)

echo "Installing frontend dependencies..."
(cd frontend && bun install)

if [ ! -f backend/.env ]; then
  echo ""
  echo "⚠️  backend/.env not found."
  echo "   Copy backend/.env.example to backend/.env and add your GEMINI_API_KEY, then run this script again."
  exit 1
fi

echo ""
echo "Starting backend (http://localhost:3001) + frontend (http://localhost:5173)..."
bun run dev