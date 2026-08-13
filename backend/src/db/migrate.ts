// ─────────────────────────────────────────────────────────────────────────────
// src/db/migrate.ts
//
// Idempotent migrations — every statement uses CREATE TABLE IF NOT EXISTS so
// it is safe to call runMigrations() on every server startup.
//
// Add new migrations at the bottom; never alter an existing block.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "./client.ts";

export function runMigrations(): void {
  db.transaction(() => {
    // ── users ────────────────────────────────────────────────────────────────
    // Minimal auth: email is the unique identifier; name is display-only.
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id         TEXT PRIMARY KEY,
        email      TEXT NOT NULL UNIQUE,
        name       TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      );
    `);

    // ── projects ─────────────────────────────────────────────────────────────
    // One project per uploaded book text.
    // book_text_path → relative path under backend/data/{userId}/{projectId}/
    // status         → 'draft' | 'in_progress' | 'done'
    db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id             TEXT PRIMARY KEY,
        user_id        TEXT NOT NULL REFERENCES users(id),
        title          TEXT NOT NULL,
        book_text_path TEXT NOT NULL,
        status         TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft', 'in_progress', 'done')),
        created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      );
    `);

    // ── pipeline_state ────────────────────────────────────────────────────────
    // Exactly one row per project.
    //
    // Step status values: 'pending' | 'running' | 'done' | 'failed'
    //
    // Concurrency rule (D-003): every step endpoint opens a transaction,
    // checks step_x == 'pending' (or 'failed' for retry), sets it to
    // 'running', commits — then calls Gemini outside the transaction.
    // If step_x is already 'running' the request returns the current state
    // immediately with no Gemini call.
    //
    // text_interaction_id  → last interaction id in the TEXT chain
    // image_interaction_id → last interaction id in the IMAGE chain
    // step_started_at      → set whenever any step goes to 'running';
    //                        used to detect stuck steps (> STUCK_STEP_TIMEOUT)
    db.run(`
      CREATE TABLE IF NOT EXISTS pipeline_state (
        project_id           TEXT PRIMARY KEY REFERENCES projects(id),

        text_interaction_id  TEXT,
        image_interaction_id TEXT,

        step_style            TEXT NOT NULL DEFAULT 'pending'
                                CHECK (step_style IN ('pending','running','done','failed')),
        step_characters       TEXT NOT NULL DEFAULT 'pending'
                                CHECK (step_characters IN ('pending','running','done','failed')),
        step_portraits        TEXT NOT NULL DEFAULT 'pending'
                                CHECK (step_portraits IN ('pending','running','done','failed')),
        step_chapters         TEXT NOT NULL DEFAULT 'pending'
                                CHECK (step_chapters IN ('pending','running','done','failed')),
        step_illustrations    TEXT NOT NULL DEFAULT 'pending'
                                CHECK (step_illustrations IN ('pending','running','done','failed')),

        step_started_at       TEXT
      );
    `);

    // ── style_result ─────────────────────────────────────────────────────────
    // Stores the prose style description produced by the style step.
    db.run(`
      CREATE TABLE IF NOT EXISTS style_result (
        project_id TEXT PRIMARY KEY REFERENCES projects(id),
        style_text TEXT NOT NULL
      );
    `);

    // ── characters ───────────────────────────────────────────────────────────
    // Up to 2 characters per project (cap enforced server-side after Gemini
    // parse — see Plan.md §3, "Caps enforced here, not in the frontend").
    // portrait_path is NULL until the portraits step completes for this row.
    db.run(`
      CREATE TABLE IF NOT EXISTS characters (
        id            TEXT PRIMARY KEY,
        project_id    TEXT NOT NULL REFERENCES projects(id),
        name          TEXT NOT NULL,
        prompt        TEXT NOT NULL,
        portrait_path TEXT,
        status        TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','running','done','failed'))
      );
    `);

    // ── chapters ─────────────────────────────────────────────────────────────
    // Up to 1 chapter per project (same server-side cap as characters).
    // illustration_path is NULL until the illustrations step completes.
    db.run(`
      CREATE TABLE IF NOT EXISTS chapters (
        id                 TEXT PRIMARY KEY,
        project_id         TEXT NOT NULL REFERENCES projects(id),
        name               TEXT NOT NULL,
        prompt             TEXT NOT NULL,
        illustration_path  TEXT,
        status             TEXT NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','running','done','failed'))
      );
    `);
  })();

  console.log("[db] migrations complete");
}
