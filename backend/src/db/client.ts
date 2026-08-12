// ─────────────────────────────────────────────────────────────────────────────
// src/db/client.ts
//
// Singleton bun:sqlite Database instance.
// Import `db` from this file anywhere in the backend — you will always get
// the same open connection (module-level singleton, safe in a single-process
// Bun server).
// ─────────────────────────────────────────────────────────────────────────────

import { Database } from "bun:sqlite";
import path from "node:path";

/** Resolve DB path relative to the backend root, not the CWD. */
const DB_PATH = path.join(
  import.meta.dir,   // …/backend/src/db
  "..",              // …/backend/src
  "..",              // …/backend
  "data",
  "app.db"
);

/**
 * The single shared Database connection for the whole process.
 *
 * Options:
 *   strict   — enforces stricter SQLite type checking
 *   create   — creates the file if it does not exist
 */
export const db = new Database(DB_PATH, { strict: true, create: true });

// Enable WAL mode once on startup.
// WAL allows concurrent reads while a write is in progress — important for
// the pipeline steps, which read state and then write it in a transaction.
db.run("PRAGMA journal_mode = WAL;");
db.run("PRAGMA foreign_keys = ON;");
