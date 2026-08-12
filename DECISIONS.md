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

