# DECISIONS.md

---

## D-001 · Use Bun instead of npm

**Date:** 2026-08-11  
**Status:** decided

### Reasoning
I wanted a single tool that handles runtime, package manager, and SQLite without extra native dependencies. Bun ships `bun:sqlite` as a built-in API, which removes the need for `better-sqlite3` — a native C++ binding that requires build tools and a matching Node.js ABI. That alone solved my biggest setup pain point, and the speed gain on installs was a bonus I was happy to take.

### Upsides
- `bun:sqlite` is built-in — zero extra packages, no native build step
- Install speed is significantly faster than npm in this monorepo
- One tool covers runtime + package manager + test runner

### Cons accepted
- Bun is less mature than Node.js/npm — some edge cases and ecosystem packages may behave unexpectedly
- Team members unfamiliar with Bun need to install it separately; it is not pre-installed like Node.js
- Windows support in Bun is newer and has had more bugs historically

### Limits
- `bun:sqlite` API is Bun-specific — if the runtime ever needs to switch to plain Node.js, the SQLite driver import must be swapped out (`import { Database } from "better-sqlite3"`)
- This decision only covers the backend and monorepo root; the frontend (Vite) is runtime-agnostic

---

## D-002 · SQLite instead of JSON files

**Date:** 2026-08-11  
**Status:** decided

### Reasoning
The hardest requirement in this assessment is atomic step-locking — checking a step's state and flipping it to "running" without a second request slipping in between (§4.3, no duplicate Gemini calls). JSON files can do this, but only with hand-rolled file locking (write-to-temp + atomic rename) — more code, more ways to get it subtly wrong. SQLite's `db.transaction()` gives this atomicity natively, still as a single embedded file with no server process, so it doesn't cost anything JSON would have kept for free.

### Upsides
- Atomic transactions solve the concurrency requirement correctly, out of the box
- Still zero-config — one file, no docker-compose
- Built into Bun (`bun:sqlite`) — no native dependency risk

### Cons accepted
- Slightly more upfront schema/typing work than free-form JSON
- Adds SQL as a mental dependency, though it's a small, well-known surface here

### Limits
- Doesn't scale past a single process/local server — acceptable, since the assessment explicitly runs locally only

---

## D-003 · Per-step status stored in `pipeline_state` table

**Date:** 2026-08-12  
**Status:** decided

### Reasoning
Each of the five pipeline steps (style, characters, portraits, chapters, illustrations)
must be independently trackable so that:

1. A duplicate HTTP request can be detected and short-circuited before touching Gemini.
2. A failed step can be retried without re-running steps that already succeeded.
3. The frontend stepper can render exactly which step is running/done/failed without
   guessing from the overall project status.

Storing the status inside the DB row — rather than in memory or a JSON file — means
the state survives a server restart and is visible to any query.

### Implementation
`pipeline_state` has five `TEXT` columns (`step_style`, `step_characters`,
`step_portraits`, `step_chapters`, `step_illustrations`), each constrained to
`'pending' | 'running' | 'done' | 'failed'` via a SQLite `CHECK` constraint.

**Concurrency rule (applied to every step endpoint):**
> In one SQLite transaction: check `step_x == 'pending'` → set to `'running'` → commit.
> Then call Gemini outside the transaction. If `step_x` is already `'running'`,
> return the current state immediately — no Gemini call is made.

This single pattern satisfies all three requirements above atomically.

### Upsides
- Gemini is never called twice for the same step, even if two requests arrive simultaneously
- A server crash mid-step leaves the row as `'running'`; the retry endpoint detects
  a stale `step_started_at` and resets it to `'pending'`
- SQLite CHECK constraints enforce valid values at the DB level, independent of TypeScript

### Cons accepted
- Five extra columns per project row — negligible at local scale
- The "stuck step" timeout (3 min) is a magic number; documented in `src/db/migrate.ts`

D-004 · Caught Antigravity hardcoding a Files-API upload that only worked for one of two input paths

Date: 2026-08-12
Status: decided (AI override)

What happened

§4.2 requires the book to reach the app two ways — pasted text or an uploaded .txt file — and both must work identically from that point on. Antigravity's first implementation of runStyleStep() called ai.files.upload() unconditionally, treating the book as if it always arrived as a real file handle. I only noticed because I tested the paste-text path specifically: pasted text is already an in-memory string, not something the Files API can upload, and the call failed immediately. Tracing it back, POST /projects only ever built a file reference for the multer-upload branch and never normalized the paste-text branch to match before either reached the style step — so the bug was invisible if you only ever tested by uploading files, which is what Antigravity's own test had done.

Fix

Made POST /projects converge both input methods to the same representation before returning: regardless of paste or upload, the content is written to backend/data/{userId}/{projectId}/book.txt. The style step reads that file back as a plain string via readBookText() and sends it inline in the Interactions API prompt — no Files API call anywhere in the text chain anymore, so there's no second code path to drift out of sync again.

Cost accepted
Loses the Files API's token-caching benefit for very long books — inline text costs more tokens per call. Acceptable at this project's scale (short fiction texts, local use); would reconsider with a size threshold (e.g. re-introduce Files API upload above ~50,000 chars) if this became a real product.