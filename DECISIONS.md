# DECISIONS.md

---

## D-001 · Use Bun instead of npm

**Date:** 2026-08-11  
**Status:** decided

### Reasoning
Wanted one tool for runtime, package manager, and SQLite, without extra native dependencies. Bun's built-in `bun:sqlite` removes the need for `better-sqlite3` — a native C++ binding requiring build tools and a matching Node ABI. That alone solved my main setup pain point; faster installs were a bonus.

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
The hardest requirement (§4.3) is atomic step-locking — check a step's state and flip it to `'running'` without a second request slipping in between. JSON needs hand-rolled file locking to do this safely; SQLite's `db.transaction()` gives it natively, still as a single embedded file with no server process.

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
Each of the five steps needs independently trackable, persisted state so that: a duplicate request can be short-circuited before touching Gemini, a failed step can be retried without redoing finished ones, and the frontend stepper can render exact progress without guessing from overall project status. Storing this in the DB — not memory or a JSON file — survives a server restart and stays queryable.

### Implementation
`pipeline_state` has five `TEXT` columns (`step_style`, `step_characters`, `step_portraits`, `step_chapters`, `step_illustrations`), each constrained to `'pending' | 'running' | 'done' | 'failed'` via a SQLite `CHECK` constraint.

**Concurrency rule (applied to every step endpoint):**
> In one SQLite transaction: check `step_x == 'pending'` → set to `'running'` → commit.
> Then call Gemini outside the transaction. If `step_x` is already `'running'`,
> return the current state immediately — no Gemini call is made.

This single pattern satisfies all three requirements above atomically.

### Upsides
- Gemini is never called twice for the same step, even if two requests arrive simultaneously
- A server crash mid-step leaves the row as `'running'`; the retry endpoint detects a stale `step_started_at` and resets it to `'pending'`
- SQLite CHECK constraints enforce valid values at the DB level, independent of TypeScript

### Cons accepted
- Five extra columns per project row — negligible at local scale
- The "stuck step" timeout (3 min) is a magic number; documented in `src/db/migrate.ts`

---

## D-004 · Caught Antigravity hardcoding a Files-API upload that only worked for one of two input paths

**Date:** 2026-08-12  
**Status:** decided (AI override)

### What happened
§4.2 requires the book to arrive two ways — pasted text or an uploaded `.txt` file — and both must behave identically afterward. Antigravity's first `runStyleStep()` called `ai.files.upload()` unconditionally, assuming a real file handle always existed. Testing the paste-text path broke this immediately — pasted text is just a string, not something the Files API can upload. `POST /projects` only built a file reference for the upload branch, never the paste branch, so the bug stayed invisible as long as testing only used file uploads.

### Fix
`POST /projects` now writes the book content to `backend/data/{userId}/{projectId}/book.txt` regardless of input method. The style step reads that file back as plain text and sends it inline in the prompt — no Files API call in the text chain, so there's no second path to drift out of sync.

### Cost accepted
Loses the Files API's token-caching benefit for very long books — inline text costs more tokens per call. Acceptable at this project's scale (short fiction texts, local use); would reconsider with a size threshold (e.g. re-introduce Files API upload above ~50,000 chars) if this became a real product.

---

## D-005 · Botanical Field Notebook "Google Stitch" UI and Palette

**Date:** 2026-08-12  
**Status:** decided

### Problem
The frontend needed a distinct visual concept — a naturalist's field notebook, blending scientific precision with archival texture — plus a defined palette, typography, component states, and two stepper layouts (with/without sidebar).

### Decision
Used Google Stitch to generate the UI and color palette, standardizing on the **Botanical Field Notebook** specification outlined in `frontend/Design.md`.
- **Palette (Tactile Pigments):**
  - Ink (`#1F2A24`): Primary text and glyphs for contrast.
  - Paper (`#F1EFE6` / `#f0fdf3` container colors): Warm, organic background to mimic archival sheets.
  - Moss (`#3D5C42`): Completed pipeline steps.
  - Ochre (`#B8823A`): Active status, highlights, and focus borders.
  - Sage (`#DCE3D5`): Card surfaces and utility dividers.
  - Rust (`#A6432E`): Error states and stuck retries.
- **Typography:**
  - Serif (`Fraunces`): For manuscript content, story headers, and editorial titles.
  - Sans (`Inter`): For UI labels, inputs, statistics, and controls.
- **Shapes & Accents:**
  - Standard buttons and inputs: 4px corner radius (`rounded`) to avoid a generic digital look.
  - Cards: 8px corner radius (`rounded-lg`) using Sage color backgrounds.
- **State Indicators:**
  - 5 progress bars showing completed steps in Moss, the active step in Ochre, and future steps in Sage.
- **Dual Layout Modes:**
  - Sidebar layout: A vertical progress stepper anchored to the left.
  - Full-width layout (No Sidebar): A horizontal stepper banner at the top, allowing the workspace to expand.

---

## D-006 · Caught Antigravity adding a style field to project creation that didn't belong there

**Date:** 2026-08-12  
**Status:** decided (AI override)

### What happened
The initial `NewProject` form had an optional style field that posted `art_style` to `POST /projects`. But style generation is its own pipeline step (`/projects/:id/steps/style`, which already accepts `{ style }`) — collecting it at creation time duplicated the parameter and risked mismatches during validation.

### Fix
Standardized on strict bounds for the creation payload — `POST /projects` accepts ONLY `title` and `text`/`file` (manuscript text or text file). Style definition is deferred entirely to the first pipeline step, where the user can customize the visual direction right before style extraction runs. The optional Style Preference field was removed from the frontend project initialization form.

### Cost accepted
- None functionally — this was pure removal of an unnecessary field; it did mean re-checking that no other part of the frontend still referenced the removed field before deleting it

---

## D-007 · Use the official @google/genai SDK instead of hand-written REST calls

**Date:** 2026-08-12  
**Status:** decided

### Reasoning
The assessment brief itself notes the newest Interactions API is only wrapped by the Python and JS SDKs so far, with REST as the fallback for stacks without one. Since the backend is TypeScript on Bun, `@google/genai` covers it directly — no reason to hand-roll `fetch` calls, headers, and JSON parsing for something the official SDK already does correctly.

### Upsides
- Less boilerplate — no manual auth headers, URL building, or response parsing
- Typed request/response shapes catch mistakes at compile time instead of at runtime
- Built-in error handling (`ApiError`) instead of manually checking `res.ok`

### Cons accepted
- One more external dependency versus a zero-dependency raw `fetch` call
- Slightly less visibility into the exact HTTP request, which made an early endpoint-version mismatch a little harder to spot than reading a raw `curl` would have been

### Limits
- Ties the code to the SDK's API surface — if Google changes it, `gemini/client.ts` needs updating, not just a URL string

---

## D-008 · Caught the step action button only handling one state, not four

**Date:** 2026-08-12  
**Status:** decided (AI override)

### What happened
Each pipeline step has four possible states (`pending`/`running`/`done`/`failed`), and §4.4 requires the UI to reflect each one distinctly. Antigravity's first pass at the step action button only really handled `pending`: a single "Run" button wired to `onClick`, with no branching on step status. I found this by actually exercising the other three states instead of trusting the default render — clicking the button rapidly (it fired the request again while one was already in flight, since nothing disabled it), forcing a failure (no retry affordance appeared, just a dead end), and checking a completed step (the button still read "Run" instead of reflecting `done`).

### Fix
Made the button's label, enabled/disabled state, and handler all derive from the step's status instead of being a single static element: `pending` → "Run", enabled; `running` → disabled, loading state, no second request possible; `done` → hidden or shown as a completed indicator, not clickable; `failed` → relabeled "Retry", enabled, calls the retry endpoint instead of the normal step endpoint.

### Cost accepted
- One more branch of UI logic per step card instead of a single static button — small added complexity, but it's exactly the four states the backend's `pipeline_state` already tracks, so no new state had to be invented on the frontend

---

## D-009 · Caught Antigravity showing "Continue" even when a step's items hadn't all succeeded

**Date:** 2026-08-12  
**Status:** decided (AI override)

### What happened
Portraits and Illustrations aren't single pass/fail steps — each generates one card per item (up to 2 characters, 1 chapter), and any individual card can fail independently. I forced one portrait call to fail while testing and found the Portraits screen still showed "Continue to Chapters →" right next to the failed card's retry button — the button only checked whether the step had been attempted, not whether every item in it had actually finished. That let the pipeline advance to Chapters while a character portrait was still sitting in `'failed'`, directly contradicting §4.3's "a step cannot run before the previous ones have succeeded."

### Fix
The "Continue to next step" button is now gated on every item in the current step being `'done'` — if any character/chapter card is `'failed'` or `'running'`, only the per-card Retry button shows, and Continue is hidden entirely. It only appears once the step's items are all done. Also added the same check server-side in `tryStartStep()`, so even if a UI gate is ever bypassed or regresses, the backend independently refuses to start the next step until the previous one is fully done — not just attempted.

### Cost accepted
- The step's "done" status now has to be derived from all its items' statuses rather than a single flag — one more thing to keep in sync, but it reuses the same per-character/per-chapter `status` column already in the schema, no new state needed

---

## D-010 · Fixed a wrong request shape in the image-generation call

**Date:** 2026-08-13  
**Status:** decided (AI override)

### What happened
The portraits step failed with a real Gemini 400 error: `"Unknown parameter 'config'"`. Antigravity's `ai.interactions.create()` call nested `responseModalities` inside a `config` object with capitalized values (`["IMAGE", "TEXT"]`) — that shape belongs to the older `generateContent` API, not the Interactions API. I checked the official SDK docs (`googleapis/js-genai` on GitHub) directly rather than trust the code or guess a fix, and confirmed the Interactions API expects `response_modalities` as a **top-level** parameter, snake_case, lowercase values (e.g. `['image']`) — no `config` wrapper at all.

### Fix
Moved `response_modalities: ["image"]` to a top-level field on the `interactions.create()` call, matching the SDK's own documented example exactly. Also flagged that this SDK's TypeScript types for the Interactions namespace are known to be unreliable (beta API, autogenerated from protobuf) — so a type error on this field going forward is a types bug, not a signal to revert the shape.

### Confirmation
Re-running the portraits step after the fix returned a **429** (quota/billing) instead of the original **400** (malformed request) — proof the request shape is now valid and accepted by Gemini; the remaining failure is the separate, already-documented billing blocker (D-004/D-006/D-009), not a code defect.

### Cost accepted
- None functionally — this was a straightforward correction once verified against the real SDK docs instead of guessing from the (unreliable) shipped types


---

## If I had one more day...

I'd focus on validating the two image-generation steps (portraits, illustrations) against a live paid Gemini key — everything else in the pipeline has been verified, including a real server-crash-and-recover test (see TESTING.md §5), but image output itself remains unverified due to an unresolved billing blocker (a Vietnamese-issued Visa was rejected by Google Billing). I'd also add the retry/attempt history bonus feature, since `step_started_at` already exists in the schema and makes it a small addition once image generation is confirmed working.


