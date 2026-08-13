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
import fs from "node:fs";

/** Resolve DB directory and ensure it exists. */
const DATA_DIR = path.join(
  import.meta.dir,   // …/backend/src/db
  "..",              // …/backend/src
  "..",              // …/backend
  "data"
);

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "app.db");

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
