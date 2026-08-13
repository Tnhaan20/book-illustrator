# Book Illustrator — Project Plan

## 1. Stack decision

| Layer | Choice | Why |
|---|---|---|
| Runtime | Bun + TypeScript | Single tool for runtime, package manager, and test runner; built-in `bun:sqlite` removes a native-dependency risk |
| Backend | Express | Matches existing skillset, minimal setup, first-class `fetch`/SDK calls to Gemini |
| Frontend | React + Vite + TypeScript + Tailwind | Simple SPA, no SSR needed, fast dev loop |
| Storage | SQLite (via `bun:sqlite`, built-in) | Transactions give atomic step-locking for free — solves the hardest requirement (no duplicate calls) without hand-rolled file locking. No server process, no docker-compose needed. See `DECISIONS.md` D-002 for SQLite vs JSON. |
| Files (book text, images) | Local disk under `backend/data/{userId}/{projectId}/` | Per spec §5.2 — served via a static Express route, no S3/CDN |
| Gemini access | `@google/genai` SDK (Interactions API, not `generateContent`) | Official JS SDK wraps the Interactions API per Gemini's own docs — see `DECISIONS.md` for model IDs chosen |
| AI coding tool | Google Antigravity | Context file is `AGENTS.md` (Antigravity's convention), not `CLAUDE.md` — functionally equivalent artifact per spec §2.2 |

**Repo layout:** `backend/` and `frontend/` are independent (own `package.json`, own `node_modules`) — no npm/bun workspaces. Root `package.json` only holds `concurrently` to run both via one `bun run dev`. No `docker-compose.yml` — SQLite + local disk means `bun install && bun run dev` is enough per side. State this explicitly in `README.md`.

**Known blocker (as of Aug 2026):** Gemini's image-generation models require paid tier; free tier shows `limit: 0`. Payment method could not be provisioned (Google Billing rejecting Vietnamese-issued Visa). Backend implements the image-chain calls per the API contract, but validated via mocked responses until resolved — see `DECISIONS.md`.

## 2. Data model (SQLite tables)

```
users
  id, email (unique), name, created_at

projects
  id, user_id, title, book_text_path, art_style (nullable, user-supplied),
  status ('draft' | 'in_progress' | 'done'), created_at

pipeline_state          -- one row per project
  project_id (PK/FK),
  text_interaction_id,    -- last interaction id in the TEXT chain (style/characters/chapters)
  image_interaction_id,   -- last interaction id in the IMAGE chain (portraits/illustrations)
  step_style      ('pending'|'running'|'done'|'failed'),
  step_characters ('pending'|'running'|'done'|'failed'),
  step_portraits  ('pending'|'running'|'done'|'failed'),
  step_chapters   ('pending'|'running'|'done'|'failed'),
  step_illustrations ('pending'|'running'|'done'|'failed'),
  step_started_at  -- timestamp of whichever step is currently 'running', for stuck-step detection

style_result
  project_id, style_text

characters
  id, project_id, name, prompt, portrait_path (nullable), status

chapters
  id, project_id, name, prompt, illustration_path (nullable), status
```

**Why `status` and `step_*` are separate fields, not one enum:** a project's overall status (`in_progress`) doesn't tell you *which* step is running or stuck — a page refresh needs to know exactly that. Five per-step fields let the UI render the stepper accurately and let the backend lock exactly one step at a time.

**Stuck-step recovery:** if a step is `running` and `step_started_at` is older than a threshold (e.g. 3 minutes — comfortably above the 10–30s call time), the retry endpoint is allowed to override it back to `pending` and re-run. This is the "no manual DB surgery" requirement from §4.3.

## 3. Backend API

```
POST   /auth/login                 { email, name }              -> user (create if new)
GET    /projects                   -> [{ id, title, status, created_at, progress }]
POST   /projects                   { title, text | file } -> project
GET    /projects/:id               -> full project incl. book text, style, characters, chapters, pipeline_state

POST   /projects/:id/steps/style        { style?: string }
POST   /projects/:id/steps/characters
POST   /projects/:id/steps/portraits
POST   /projects/:id/steps/chapters
POST   /projects/:id/steps/illustrations
POST   /projects/:id/steps/:step/retry  -- only valid if step is 'failed' or stuck 'running'
```

**Concurrency rule for every step endpoint:** in one SQLite transaction, check `step_x == 'pending'` (or `'failed'` for retry) → set to `'running'` → commit → then call Gemini. If the step is already `'running'` when the request lands, return the current state immediately with no Gemini call. This single pattern satisfies §4.3's resumability, no-duplicate-call, and retryable-failure rules all at once.

**Gemini models (locked — see DECISIONS.md)**
- Text chain: `gemini-3.5-flash` via `ai.interactions.create()` + `previous_interaction_id`
- Image chain: `gemini-3.1-flash-image` (Nano Banana 2) via `ai.interactions.create()` + `previous_interaction_id`
  - Requires paid tier. Use `GEMINI_IMAGE_MOCK=true` in `backend/.env` to skip real calls and
    receive a placeholder PNG so the full save/serve/DB pipeline can be tested without billing.

**Caps enforced here, not in the frontend:** slice `characters` to 2 and `chapters` to 1 server-side right after parsing Gemini's JSON response, before saving to DB.

## 4. Gemini call sequence (per DECISIONS.md, confirmed from the notebook)

1. Upload book text by txt file or input text field
2. **Text chain** — `ai.interactions.create()` seeded with the book file:
   - style → `interactionId` saved as `text_interaction_id`
   - characters (JSON, capped to 2) → chained via `previous_interaction_id`; new `interactionId` replaces saved one
   - chapters (JSON, capped to 1) → same chain continuation
3. **Image chain** — separate `ai.interactions.create()` seeded with style text:
   - portrait per character → `interactionId` saved as `image_interaction_id`
   - illustration per chapter → chained via `previous_interaction_id` (model sees prior portraits)
4. Only `text_interaction_id` and `image_interaction_id` (always the latest in each chain) are
   persisted — Gemini's server holds the full conversation history.

**Image dual-mode** (`GEMINI_IMAGE_MOCK` env var):
- `true` → `src/gemini/image-chain.ts` returns a real 1×1 PNG placeholder; no API call made.
  Exercises the full disk-save / DB-update / `/files/*` serve path for Postman testing.
- `false` / unset → real `gemini-3.1-flash-image` call via Interactions API (paid tier required).

## 5. Frontend screens

- **Login** — email + name, simple validation
- **Project list** — cards: title, created date, status pill, 5-step progress indicator, empty state
- **New project** — title + paste-text or `.txt` upload
- **Project detail** — book text (collapsible), 5-step stepper (done/current/pending), per-step result panel (style text / character cards with portrait / chapter cards with illustration), one action button for the current step, in-progress state naming the step, error state with retry, stuck-step recovery affordance
- **Sign out**

Reference `app-demo.html` for scope, but real timings (10–30s+) and real error states — don't port its `localStorage` or fake 2s/8s timings.

## 6. Testing plan (see TESTING.md for the real report)

- **Backend**: unit tests for the step-locking transaction (pending→running→done, duplicate call rejected, stuck-step timeout override), and for the 2/1 caps enforcement. Mock the Gemini HTTP calls.
- **Frontend**: component tests for the stepper's loading/error/empty states.
- **Nice to have**: one mocked end-to-end happy path through all 5 steps.

## 7. Build order

1. Scaffold repo, SQLite schema
2. Auth + project CRUD (no Gemini yet)
3. Text chain: style → characters → chapters (with caps + step-locking)
4. Image chain: portraits → illustrations
5. Frontend: stepper + all states, wired to real backend
6. Resumability/concurrency hardening — test by killing the server mid-call
7. Tests, TESTING.md, DECISIONS.md, README.md, .env.example