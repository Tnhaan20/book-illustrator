# AGENTS.md — AI Coding Agent Context File

> This file is the primary context document for **Antigravity** (Google Deepmind AI coding
> assistant) working on this repository. Read it at the start of every session.
> Keep it up to date after completing each phase.

---

## 1. Project Overview

**Name:** Book Illustrator  
**Goal:** A local-only full-stack web app that takes a user's book text, sends it through
a Gemini AI pipeline, and produces illustrated characters and chapter images.  
**Assessment context:** This is a graded university project. Code quality, modularity,
and documented decisions matter.

---

## 2. Tech Stack (final decisions — do not re-debate)

| Layer | Choice | Locked in |
|---|---|---|
| Runtime | **Bun** | ✅ D-001 |
| Backend | **Express 5** + TypeScript | ✅ |
| Frontend | **React 19** + Vite 8 + TypeScript | ✅ |
| Styling | **Tailwind CSS** (via `@tailwindcss/vite`) | ✅ |
| Storage | **SQLite** via `bun:sqlite` (built-in) | ✅ D-002 |
| AI | **Gemini** `@google/genai` SDK (Interactions API) | ✅ |
| File storage | Local disk `backend/data/{userId}/{projectId}/` | ✅ |
| Dev runner | `concurrently` from repo root | ✅ |

> **No npm.** All installs use `bun install`. All scripts use `bun run`.

---

## 3. Repo Layout

```
book-illustrator/
├── package.json                ← root scripts: dev, backend, frontend
├── DECISIONS.md                ← architectural decision records (D-001..D-003)
├── AGENTS.md                   ← this file
├── docs/
│   └── Plan.md                 ← full feature plan & data model reference
├── backend/
│   ├── index.ts                ← server entry point (Express + migrations + static files)
│   ├── .env                    ← PORT, GEMINI_API_KEY, NODE_ENV, GEMINI_IMAGE_MOCK
│   ├── .env.example            ← committed template
│   ├── data/
│   │   └── app.db              ← SQLite file (auto-created, git-ignored)
│   └── src/
│       ├── db/
│       │   ├── schema.ts       ← TypeScript types for every table row
│       │   ├── client.ts       ← singleton bun:sqlite connection (WAL mode)
│       │   ├── migrate.ts      ← idempotent CREATE TABLE IF NOT EXISTS
│       │   ├── index.ts        ← barrel export
│       │   └── queries/
│       │       ├── users.ts    ← findUserByEmail, insertUser
│       │       ├── projects.ts ← CRUD for projects table
│       │       ├── pipeline.ts ← claimStep, markStepDone, markStepFailed, retry
│       │       ├── style.ts    ← upsertStyleResult, getStyleResult
│       │       ├── characters.ts
│       │       └── chapters.ts
│       ├── routes/
│       │   ├── auth.ts         ← POST /auth/login (find-or-create)
│       │   ├── projects.ts     ← GET+POST /projects, GET /projects/:id
│       │   └── steps.ts        ← 5 step endpoints + /:step/retry
│       ├── gemini/
│       │   ├── client.ts       ← GoogleGenAI singleton + MODELS constants
│       │   ├── text-chain.ts   ← runStyleStep, runCharactersStep, runChaptersStep
│       │   └── image-chain.ts  ← runPortraitStep, runIllustrationStep (dual-mode)
│       └── storage/
│           └── files.ts        ← saveBookText, readBookText, saveImage, absolutePath
└── frontend/
    ├── vite.config.ts          ← proxy: /api → http://localhost:3001
    ├── .env                    ← VITE_API_BASE_URL
    ├── .env.example
    └── src/
        ├── App.tsx             ← currently: connection-test page
        └── ...
```

---

## 4. Environment Variables

### backend/.env
```
PORT=3001
GEMINI_API_KEY=<your key>
NODE_ENV=development
```

### frontend/.env
```
VITE_API_BASE_URL=http://localhost:3001
```

Vite dev proxy (`/api → backend`) is active — frontend calls `/api/*` in dev,
`VITE_API_BASE_URL` is used for non-proxied environments only.

---

## 5. Database Schema (source of truth: `src/db/migrate.ts`)

```
users             id, email (UNIQUE), name, created_at
projects          id, user_id→users, title, book_text_path, art_style, status, created_at
pipeline_state    project_id→projects (PK),
                  text_interaction_id, image_interaction_id,
                  step_style, step_characters, step_portraits,
                  step_chapters, step_illustrations,  ← all StepStatus
                  step_started_at
style_result      project_id→projects (PK), style_text
characters        id, project_id→projects, name, prompt, portrait_path, status
chapters          id, project_id→projects, name, prompt, illustration_path, status
```

**StepStatus values:** `'pending' | 'running' | 'done' | 'failed'`  
Enforced by both TypeScript types (`src/db/schema.ts`) and SQLite `CHECK` constraints.

---

## 6. Key Constraints & Rules (non-negotiable)

1. **No duplicate Gemini calls** — step endpoint checks `step_x == 'pending'` in a
   transaction, sets to `'running'`, commits, *then* calls Gemini. If already
   `'running'`, return current state immediately. (D-003)

2. **Caps enforced server-side** — `characters` sliced to max 2, `chapters` to max 1
   after parsing Gemini JSON, before saving to DB.

3. **Stuck-step recovery** — if `step_started_at` is older than 3 minutes while
   `step_x == 'running'`, the retry endpoint may reset it to `'pending'`.

4. **No Docker** — SQLite + local disk. `bun install && bun run dev` is the only setup.

5. **Type safety** — all DB reads must be cast to the types in `src/db/schema.ts`.
   Never use `any` for DB results.

---

## 7. Backend API Contract (from Plan.md)

```
POST   /auth/login                  { email, name }        → user
GET    /projects                                            → project[]
POST   /projects                    { title, text | file } → project
GET    /projects/:id                                        → full project
POST   /projects/:id/steps/style         { style? }
POST   /projects/:id/steps/characters
POST   /projects/:id/steps/portraits
POST   /projects/:id/steps/chapters
POST   /projects/:id/steps/illustrations
POST   /projects/:id/steps/:step/retry   ← only if failed or stuck running
```

---

## 8. Gemini Call Sequence

1. Upload book text → Files API → get file `uri`
2. **Text chain** (one interaction, chained via `previous_interaction_id`):
   style → characters (cap 2) → chapters (cap 1)
3. **Image chain** (separate interaction, seeded with style + system instructions):
   portrait per character → illustration per chapter
4. Only `text_interaction_id` and `image_interaction_id` (latest in each chain)
   are persisted in `pipeline_state` — Gemini server holds the history.

> **Known blocker:** Gemini image models need paid tier. Vietnamese Visa rejected by
> Google Billing. Image chain is implemented per spec but validated against mocked
> responses until resolved.

---

## 9. Build Order (phases)

| Phase | Description | Status |
|---|---|---|
| 1 | Scaffold repo, bun monorepo, mock endpoints, env vars | ✅ Done |
| 2 | SQLite schema + migrations wired into server startup | ✅ Done |
| 3 | Auth + project CRUD routes | ✅ Done |
| 4 | Text chain: style → characters → chapters (step-locking) | ✅ Done |
| 5 | Image chain: portraits → illustrations (dual-mode) | ✅ Done |
| 6 | Frontend: stepper + all states, wired to real backend | 🔲 Next |
| 7 | Resumability / concurrency hardening (kill-server test) | 🔲 |
| 8 | Tests, TESTING.md, final README, DECISIONS, AGENTS cleanup | 🔲 |

**Current position: start of Phase 6 — frontend UI.**

---

## 10. Code Style Rules

- All files have a top-of-file comment block explaining purpose (see `src/db/*.ts`)
- No `any` — use proper types or `unknown` with a type guard
- No barrel re-exports that hide types — each module exports its own types
- SQL lives in `migrate.ts` only — routes/pipeline never write raw SQL (use helper
  functions in future `src/db/queries/` files)
- Mock route handlers in `index.ts` are clearly marked `// TODO: replace with real router`
  once route modules exist

---

## 11. What the AI Agent Knows / Has Done

- Read `docs/Plan.md` in full — data model, API contract, Gemini sequence all understood
- Researched official Gemini model list — confirmed `gemini-3.5-flash` (text) and `gemini-3.1-flash-image` (image)
- **Phase 1:** scaffold, mock endpoints, env vars, Vite proxy
- **Phase 2:** `src/db/` — schema.ts, client.ts, migrate.ts, index.ts wired into server startup
- **Phase 3:** `src/routes/auth.ts` + `src/db/queries/users.ts` — POST /auth/login (find-or-create)
- **Phase 3:** `src/routes/projects.ts` + `src/db/queries/projects.ts` — GET/POST /projects, GET /projects/:id
- **Phase 4:** `src/gemini/text-chain.ts` — runStyleStep, runCharactersStep, runChaptersStep using Interactions API
- **Phase 5:** `src/gemini/image-chain.ts` — dual-mode portrait/illustration (mock PNG or real gemini-3.1-flash-image)
- **Phase 4+5:** `src/routes/steps.ts` — all 5 step endpoints + retry, full step-locking via `src/db/queries/pipeline.ts`
- `src/storage/files.ts` — saveBookText, readBookText, saveImage
- `src/db/queries/style.ts`, `characters.ts`, `chapters.ts` — all query helpers
- Installed `@google/genai@2.16.0`
- Updated `docs/Plan.md` with model IDs and dual-mode image strategy
- Updated `DECISIONS.md` D-003 from user's raw note
- Updated this `AGENTS.md`

**Known limitation:** `GEMINI_IMAGE_MOCK=true` is the default. Flip to `false` once billing is resolved.

---

## 12. Do Not Do (for this project)

- ❌ Do not use `better-sqlite3` — use `bun:sqlite`
- ❌ Do not use `docker-compose` — no server processes
- ❌ Do not add SSR — this is a plain SPA
- ❌ Do not run migrations manually — `runMigrations()` fires on every server start
- ❌ Do not commit `.env` files — only `.env.example`
- ❌ Do not re-debate D-001 / D-002 / D-003 — they are locked
