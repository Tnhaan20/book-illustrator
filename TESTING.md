# TESTING.md — Book Illustrator Test Report

This document reports the testing strategy, test cases, and the real execution results for the automated tests implemented for the **Book Illustrator** project.

---

## 1. Test Architecture

### Backend Tests
- **Runner:** Bun's built-in test runner (`bun:test`).
- **Database Isolation:** All tests run against an isolated, in-memory SQLite database (`:memory:`) created fresh in `beforeEach`.
- **Gemini Mocking:** The Gemini API `@google/genai` is fully mocked via Bun's `mock.module` to prevent any external API calls during testing.

### Frontend Tests
- **Runner:** Vitest.
- **Environment:** JSDOM + React Testing Library + `@testing-library/jest-dom`.
- **Mocking:** All async API endpoints and queries are mocked at the component boundary.

---

## 2. Test Cases and Scenarios

### Backend Tests (`backend/tests/`)

1. **`stateMachine.test.ts`** — State transition logic and locking mechanisms:
   - `pending` → `running` → `done` state transition cycle.
   - Prevention of concurrent runs (duplicate Gemini calls blocked) when a step is already `running`.
   - Pipeline ordering restriction: next step cannot start if the predecessor is not `done`.
   - Retrying a failed step transitions it back to `running` without affecting other steps' status.
   - Stuck step recovery: overriding a step that has been `running` for more than 3 minutes using the retry logic.

2. **`caps.test.ts`** — Character and chapter list cap limits:
   - Verifies that when Gemini returns 3 character profiles, it is sliced server-side and exactly 2 are saved.
   - Verifies that when Gemini returns 2 chapter scene profiles, it is sliced and exactly 1 is saved.

### Frontend Tests (`frontend/tests/`)

3. **`StepButton.test.tsx`** — Action button state machine rendering:
   - Renders active "Process Style" (Run) when status is `pending`.
   - Renders disabled "Processing..." when status is `running`.
   - Renders a clean "Complete" badge and hides action button when status is `done`.
   - Renders "Retry" when status is `failed`.

4. **`ProjectList.test.tsx`** — Project listing empty state:
   - Renders the empty state layout with "No active field notebooks" and "Create First Project" CTA button when given an empty list.

---

## 3. What We Deliberately Don't Test

- **Simple CRUD passthroughs** (`findOrCreateUser`, `listProjectsForUser`) — these are thin wrappers around a single SQL statement with no branching logic; a test here would just re-assert that SQLite works, not catch a real bug.
- **Visual styling** (colors, spacing, the Botanical Field Notebook palette) — not something an automated assertion meaningfully verifies; caught by manual review instead.
- **Real calls to the Gemini API** — every test mocks Gemini entirely. Hitting the live API from an automated suite would burn quota, cost money, and make results non-deterministic (model output varies between calls).
- **Full end-to-end browser tests** — not required by the assessment brief (§5.4 explicitly states E2E is not expected); the state-machine and caps tests already cover the pipeline's core correctness logic without needing a real browser.
- **The "server dies mid-call" scenario** — covered by the `stuck-threshold override` unit test (which simulates a stale timestamp), but the actual real-server-kill scenario was verified manually rather than automated, since reliably killing and restarting a live process inside a test suite adds more flakiness than value at this scope.

---

## 4. Real Test Execution Outputs

### Backend Tests (`bun test`)
```bash
bun test v1.2.15 (df017990)

tests\caps.test.ts:
[db] migrations complete
(pass) Caps Enforcement Tests > should cap characters to exactly 2 when Gemini returns 3
[db] migrations complete
(pass) Caps Enforcement Tests > should cap chapters to exactly 1 when Gemini returns 2

tests\stateMachine.test.ts:
[db] migrations complete
(pass) State Machine - Pipeline State Transitions > should transition pending -> running -> done correctly
[db] migrations complete
(pass) State Machine - Pipeline State Transitions > should block starting a step that is already running
[db] migrations complete
(pass) State Machine - Pipeline State Transitions > should block starting a step if its previous step in order is not done
[db] migrations complete
(pass) State Machine - Pipeline State Transitions > should allow retrying a failed step without affecting other steps
[db] migrations complete
(pass) State Machine - Pipeline State Transitions > should allow restarting a stuck running step via retry after stuck-threshold

 7 pass
 0 fail
 30 expect() calls
Ran 7 tests across 2 files. [196.00ms]
```

### Frontend Tests (`vitest run` / `bun run test`)
```bash
$ vitest run

 RUN  v4.1.10 C:/Study/book illustrator/frontend

 ✓ tests/StepButton.test.tsx (5 tests) 59ms
 ✓ tests/ProjectList.test.tsx (1 test) 155ms

 Test Files  2 passed (2)
      Tests  6 passed (6)
   Start at  10:19:00
   Duration  2.18s (transform 133ms, setup 540ms, import 241ms, tests 214ms, environment 2.61s)
```