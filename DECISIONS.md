# DECISIONS.md

---

## D-001 · Bun over npm

**Date:** 2026-08-11  
**Status:** decided

### Reasoning
I chose Bun myself — not a recommendation. I needed `bun:sqlite` as a zero-install built-in so I could skip the `better-sqlite3` native C++ binding and its build toolchain entirely.

### Upsides
- `bun:sqlite` built-in — no extra package, no native build step
- Faster installs than npm
- One tool: runtime + package manager + test runner

### Cons accepted
- Less mature than Node/npm — edge cases exist
- Not pre-installed; everyone on the team must install Bun manually
- Windows support is newer, historically more bugs

### Limits
- `bun:sqlite` is Bun-only — switching to Node.js later means swapping the driver import
- Covers backend and monorepo root only; Vite frontend is runtime-agnostic

---

## D-002 · SQLite over JSON for state storage

**Date:** 2026-08-11  
**Status:** decided

### Reasoning
The hardest requirement (§4.3) is: read state → check → write new state as one uninterruptible operation. With a JSON file I'd have to hand-roll that myself: read file → parse → mutate → write to a temp file → rename over the original. One mistake in that sequence causes a real race condition when two requests arrive at the same time. SQLite solves it with `db.transaction()` — one line, the engine guarantees atomicity. I don't have extra time to write and debug a custom file-lock system, so I took the option that removes the hard part entirely.

### Upsides
- `db.transaction()` gives atomic read-check-write for free — no hand-rolled locking
- Engine blocks concurrent writers automatically; race conditions are impossible by design
- Less code to write and test at exactly the riskiest part of the project
- Data persists to a real file on disk (`backend/data/app.db`) — survives server restarts

### Cons accepted
- SQLite is heavier than a plain JSON file for data this small
- Adds a binary `.db` file to the project that must be git-ignored

### Limits
- Must always open with a real file path — `new Database("backend/data/app.db")` — never `:memory:`, which loses all data on restart
- Not suitable if the project ever needs multiple machines writing to the same DB (SQLite is single-process)
