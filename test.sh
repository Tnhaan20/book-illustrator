#!/bin/bash
set -e

echo "Running backend tests..."
(cd backend && bun test)

echo ""
echo "Running frontend tests..."
(cd frontend && bun run test)

echo ""
echo "✅ All tests passed."