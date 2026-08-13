# Book Illustrator — Fullstack Take-Home Assessment

A local-only fullstack web application that transforms book manuscripts into illustrated narratives with consistent characters and chapter art styles using the Gemini API.

---

## 1. Prerequisites

- **Bun** v1.x+ (installed globally)
- **Gemini API Key** (from Google AI Studio)

---

## 2. Setup & Environment Variables

Copy `backend/.env.example` to `backend/.env` and insert your API key:
```bash
cp backend/.env.example backend/.env
```

Ensure the following variables are defined in `backend/.env`:
- `PORT=3001`
- `GEMINI_API_KEY=AIzaSy...` (your Google Studio key)
- `NODE_ENV=development`

Ensure `frontend/.env` contains:
- `VITE_API_BASE_URL=http://localhost:3001`

---

## 3. Quick Start — One Command to Start

Run the following command at the repository root to automatically install all dependencies across the monorepo and run the backend and frontend dev servers concurrently:
```bash
./start.sh
```
*Alternatively, you can run:*
```bash
bun install && bun run dev
```

The frontend will be available at `http://localhost:5173`, and it automatically proxies API calls to the backend on `http://localhost:3001`.

---

## 4. Run Tests — One Command to Test

Run the backend and frontend unit/integration test suites with:
```bash
./test.sh
```
*Alternatively, you can run:*
- Backend tests: `cd backend && bun test`
- Frontend tests: `cd frontend && bun run test`

---

## 5. Architectural Overview

The project is structured as a Bun-powered monorepo containing a separate frontend and backend:

### Backend Architecture
- **Runtime:** Bun
- **HTTP Server:** Express 5 + TypeScript
- **Database:** SQLite via the built-in `bun:sqlite` module (using WAL mode and atomic transaction blocks to prevent duplicate API executions)
- **AI Engine:** Gemini `@google/genai` JS SDK (Interactions API)
- **File Storage:** Local disk (`backend/data/{userId}/{projectId}/`) for manuscript text (`book.txt`) and generated PNG/JPG images

### Frontend Architecture
- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite 8
- **Styling:** Tailwind CSS v4 using dynamic design tokens (Ink, Paper, Moss, Ochre, Sage, Rust) mimicking a physical naturalist's notebook
- **State Management:** TanStack Query v5 + Axios (configured with intercepts for session identity mapping)
