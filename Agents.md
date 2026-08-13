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
| Styling | **Tailwind CSS v4** (via `@tailwindcss/vite`) | ✅ D-005 |
| State / Data | **TanStack Query v5** + **Axios** | ✅ D-006 |
| Routing | State-based view switcher (no React Router DOM) | ✅ |
| Storage | **SQLite** via `bun:sqlite` (built-in) | ✅ D-002 |
| AI | **Gemini** `@google/genai` SDK (Interactions API) | ✅ D-007 |
| File storage | Local disk `backend/data/{userId}/{projectId}/` | ✅ |
| Dev runner | `concurrently` from repo root | ✅ |

> **No npm.** All installs use `bun install`. All scripts use `bun run`.

---

## 3. Repo Layout

```
book-illustrator/
├── package.json                ← root scripts: dev, backend, frontend
├── DECISIONS.md                ← architectural decision records (D-001..D-008)
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
│       │   ├── text-chain.ts   ← runStyleStep(bookText, hint), runCharactersStep, runChaptersStep
│       │   └── image-chain.ts  ← runPortraitStep, runIllustrationStep (dual-mode)
│       └── storage/
│           └── files.ts        ← saveBookText, readBookText, saveImage, absolutePath
└── frontend/
    ├── vite.config.ts          ← proxy: /api → http://localhost:3001, /files → http://localhost:3001
    ├── .env                    ← VITE_API_BASE_URL
    ├── .env.example
    └── src/
        ├── index.css           ← Tailwind v4 @theme tokens (Ink, Paper, Moss, Ochre, Sage, Rust)
        ├── App.tsx             ← Providers (QueryClient + AuthProvider) + view-state router
        ├── main.tsx            ← createRoot entry
        ├── App.css             ← empty (cleared; all styling via Tailwind)
        ├── api/
        │   ├── axios.ts        ← singleton Axios (baseURL=/api, x-user-id interceptor)
        │   ├── auth.service.ts ← authService.login
        │   ├── projects.service.ts ← projectsService.list / get / create
        │   └── steps.service.ts    ← stepsService.run / retry
        ├── types/
        │   ├── auth.ts         ← User, LoginPayload
        │   ├── project.ts      ← ProjectSummary, ProjectDetail, Character, Chapter
        │   └── pipeline.ts     ← StepStatus, StepName, PipelineState, STEP_ORDER, currentStep()
        ├── context/
        │   └── AuthContext.tsx ← AuthProvider, useAuth — persists user to localStorage
        ├── hooks/
        │   ├── useProjects.ts  ← useQuery(['projects'])
        │   ├── useProject.ts   ← useQuery(['project', id]) + 4s polling while running
        │   └── useSteps.ts     ← useRunStep, useRetryStep mutations
        ├── components/
        │   └── Header.tsx      ← shared top bar (brand + Sign Out)
        └── pages/
            ├── login/
            │   └── index.tsx   ← Login form (dark dot-grid bg, card, name+email fields)
            └── projects/
                ├── index.tsx   ← ProjectsList (grid, status badges, 5-bar step progress)
                ├── new.tsx     ← NewProject form (title + paste/upload tabs)
                └── detail.tsx  ← ProjectDetail (sidebar stepper OR horizontal banner + 5 step views)
```

---

## 4. Environment Variables

### backend/.env
```
PORT=3001
GEMINI_API_KEY=<your key>
NODE_ENV=development
GEMINI_IMAGE_MOCK=true
```

### frontend/.env
```
VITE_API_BASE_URL=http://localhost:3001
```

Vite dev proxy:
- `/api/*` → `http://localhost:3001/*` (API calls)
- `/files/*` → `http://localhost:3001/files/*` (generated image assets)

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

6. **POST /projects only takes `title` + `text|file`** — style hint is deferred to the
   style step endpoint. Do not add `art_style` back to the creation form. (D-006)

7. **No default Content-Type on the Axios instance** — let Axios auto-detect per request
   so FormData uploads get `multipart/form-data; boundary=…` automatically. (D-006 bug fix)

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

1. **Book text stored inline** — `POST /projects` saves content to `book.txt` regardless
   of input method (paste or file upload). No Files API upload. (D-004)
2. **Text chain** (one interaction, chained via `previous_interaction_id`):
   style → characters (cap 2) → chapters (cap 1)
3. **Image chain** (separate interaction, seeded with style + system instructions):
   portrait per character → illustration per chapter
4. Only `text_interaction_id` and `image_interaction_id` (latest in each chain)
   are persisted in `pipeline_state` — Gemini server holds the history.

> **Known blocker:** Gemini image models need paid tier. Vietnamese Visa rejected by
> Google Billing. Image chain is implemented per spec but validated against mocked
> responses until resolved. (`GEMINI_IMAGE_MOCK=true`)

---

## 9. Build Order (phases)

| Phase | Description | Status |
|---|---|---|
| 1 | Scaffold repo, bun monorepo, mock endpoints, env vars | ✅ Done |
| 2 | SQLite schema + migrations wired into server startup | ✅ Done |
| 3 | Auth + project CRUD routes | ✅ Done |
| 4 | Text chain: style → characters → chapters (step-locking) | ✅ Done |
| 5 | Image chain: portraits → illustrations (dual-mode) | ✅ Done |
| 6 | Frontend: design system, all pages, API layer, wired to backend | ✅ Done |
| 7 | Hardening: sidebar lock, completed-project view, retry auto-advance, remove mocks, drop art_style from creation | ✅ Done |
| 8 | Tests, TESTING.md, final README, DECISIONS, AGENTS cleanup | ✅ Done |

**Current position: Phase 8 complete. All implementation and verification goals met.**

### Phase 8 changes (testing)
- **Backend tests** (`backend/tests/`) — implemented using `bun:test`:
  - `stateMachine.test.ts` — validates pending → running → done transitions, concurrency locks, step order dependency checks, retry isolation, and stuck step timeout overrides. Uses isolated fresh in-memory SQLite instances.
  - `caps.test.ts` — validates that character results are capped to 2 and chapter results are capped to 1 before being written to the database.
- **Frontend tests** (`frontend/tests/`) — implemented using Vitest + React Testing Library:
  - `StepButton.test.tsx` — validates all four button states (pending, running/loading, done, failed) and ensures they function/lock as expected.
  - `ProjectList.test.tsx` — validates that the page correctly renders an empty state with a "New Project" call-to-action when given an empty list.
- **Test execution** — verified all tests pass: `bun test` in backend (7/7 pass) and `bun run test` (via Vitest) in frontend (6/6 pass). Details documented in `TESTING.md`.

### Phase 7 changes (hardening)
- **Sidebar lock** — step buttons disabled + lock icon shown when previous step is not `'done'`; `isStepDisabled()` already existed, now applied to sidebar `<button disabled>` with `cursor-not-allowed` and `opacity-50`.
- **Completed project gallery** — when `project.status === 'done'`, `ProjectDetail` renders a dedicated gallery view (characters + portraits, chapters + illustrations, full manuscript) instead of the stepper UI.
- **Retry auto-advances** — `useRetryStep.onSuccess` now immediately calls `stepsService.run()` on the same step after the retry endpoint resets it to `pending`, so the user never needs to manually click Run after a retry (implements D-009).
- **Continue button D-009 gate** — `continueBtn` for portraits/illustrations now checks that every character/chapter item has `status === 'done'` before rendering; hidden if any item is still `'failed'` or `'running'`.
- **Removed all mocks** — `GEMINI_IMAGE_MOCK` env var deleted, `IS_MOCK` constant and all mock helper functions removed from `image-chain.ts`. Both `runPortraitStep` and `runIllustrationStep` now make real Gemini API calls only.
- **Removed `art_style` from project creation** — dropped from `migrate.ts` DDL, `schema.ts` `ProjectRow`, `queries/projects.ts` `insertProject`, `routes/projects.ts` POST handler, and `routes/steps.ts` style-step handler. The `art_style` column no longer exists in new databases; existing `app.db` must be deleted and re-created.

---

## 10. Code Style Rules

### Backend
- All files have a top-of-file comment block explaining purpose (see `src/db/*.ts`)
- No `any` — use proper types or `unknown` with a type guard
- No barrel re-exports that hide types — each module exports its own types
- SQL lives in `migrate.ts` only — routes/pipeline never write raw SQL

### Frontend
- Tailwind CSS v4 only — no inline `style={{}}` props, no raw CSS classes outside `index.css`
- All pages are in `src/pages/<name>/index.tsx` — folder-per-page convention
- All API calls go through `src/api/*.service.ts` — no bare `fetch` or `axios` in components
- All server state is managed by TanStack Query hooks in `src/hooks/`
- Auth state lives in `AuthContext` — do not read `localStorage` directly in components
- Types are strict — no `any`, no implicit `unknown`

---

## 11. What the AI Agent Knows / Has Done

### Backend (Phases 1–5)
- Read `docs/Plan.md` in full — data model, API contract, Gemini sequence all understood
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

### Backend Bug Fixes
- **D-004 fix:** `runStyleStep` signature changed from `(bookTextPath)` to `(bookText: string)`.
  Removed `ai.files.upload()` — book text is now passed inline in the prompt. Both paste and
  upload paths now converge at `book.txt` and behave identically.
- Steps route updated: reads `book.txt` via `readBookText()` then passes string to `runStyleStep`.

### Frontend (Phase 6)
- Installed: `axios@1.x`, `@tanstack/react-query@5.x`, `tailwindcss@4.x`, `@tailwindcss/vite@4.x`
- **Design system** (`frontend/Design.md` + `src/index.css`):
  - Tailwind v4 `@theme` block with named colour tokens (Ink, Paper, Moss, Ochre, Sage, Rust)
  - Google Fonts: Fraunces (serif, headings) + Inter (sans, UI)
  - Dot-grid dark background class `.bg-dot-grid` for Login
- **API layer** (single Axios instance, per-service files):
  - `api/axios.ts` — baseURL `/api`, x-user-id interceptor, **no default Content-Type**
  - `api/auth.service.ts`, `api/projects.service.ts`, `api/steps.service.ts`
- **Types**: `types/auth.ts`, `types/project.ts`, `types/pipeline.ts` (strict, no `any`)
- **Auth**: `context/AuthContext.tsx` — find-or-create user, persisted to localStorage
- **TanStack Query hooks**:
  - `useProjects` — project list query
  - `useProject` — single project with auto-poll (4 s) while any step is `'running'`
  - `useRunStep`, `useRetryStep` — mutations that invalidate `['project', id]` on success
- **Pages**:
  - `pages/login/index.tsx` — dark dot-grid bg, centred card, name + email, LOGIN button
  - `pages/projects/index.tsx` — grid of project cards, 5-bar step progress visualiser, status badges
  - `pages/projects/new.tsx` — title + paste/upload toggle (tabs), no style field (D-006)
  - `pages/projects/detail.tsx` — sidebar stepper OR horizontal banner (toggle), context modal,
    per-step views for style/characters/portraits/chapters/illustrations, retry support
- **Vite proxy** extended to also forward `/files/*` → backend so image `src` paths work with relative URLs
- **Fixed** multipart upload bug: removed `headers: { 'Content-Type': 'application/json' }` from
  the Axios instance so FormData gets the correct `boundary=` header and multer can parse the file

### Documentation Updates
- `DECISIONS.md` updated through **D-007**
- This `AGENTS.md` updated to reflect Phase 6 completion

**Known limitation:** `GEMINI_IMAGE_MOCK=true` is the default. Flip to `false` once billing is resolved.

---

## 12. Do Not Do (for this project)

- ❌ Do not use `better-sqlite3` — use `bun:sqlite`
- ❌ Do not use `docker-compose` — no server processes
- ❌ Do not add SSR — this is a plain SPA
- ❌ Do not run migrations manually — `runMigrations()` fires on every server start
- ❌ Do not commit `.env` files — only `.env.example`
- ❌ Do not re-debate D-001 / D-002 / D-003 — they are locked
- ❌ Do not add `art_style` back to the `POST /projects` payload or the creation form (D-006)
- ❌ Do not set a default `Content-Type` on the Axios instance — it breaks FormData uploads
- ❌ Do not use inline `style={{}}` props or raw CSS in frontend components — Tailwind only
- ❌ Do not call `localStorage` directly in components — use `useAuth()` from `AuthContext`
