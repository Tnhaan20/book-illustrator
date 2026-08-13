// ─────────────────────────────────────────────────────────────────────────────
// src/db/schema.ts
//
// TypeScript types that mirror every SQLite table, column-for-column.
// These are the ONLY types the rest of the codebase uses when reading from /
// writing to the DB — no ad-hoc inline objects.
// ─────────────────────────────────────────────────────────────────────────────

// ── Shared primitives ─────────────────────────────────────────────────────────

/** Every step in the AI pipeline can be in one of these four states. */
export type StepStatus = "pending" | "running" | "done" | "failed";

/** Overall project lifecycle. */
export type ProjectStatus = "draft" | "in_progress" | "done";

// ── Table row types ───────────────────────────────────────────────────────────

export interface UserRow {
  id: string;
  email: string;
  name: string;
  created_at: string; // ISO-8601 stored as TEXT
}

export interface ProjectRow {
  id: string;
  user_id: string;
  title: string;
  /** Relative path under backend/data/{userId}/{projectId}/book.txt */
  book_text_path: string;
  status: ProjectStatus;
  created_at: string;
}

/**
 * One row per project — tracks which pipeline step is active and the
 * last Gemini interaction IDs so the chain can be resumed.
 *
 * Step field semantics (see DECISIONS.md D-003):
 *   pending  → not started yet
 *   running  → Gemini call in-flight; a duplicate request returns early
 *   done     → result saved; step is final
 *   failed   → Gemini returned an error; safe to retry
 *
 * step_started_at is set when any step transitions to "running".
 * If it is older than STUCK_STEP_TIMEOUT_MS the retry endpoint may
 * override it back to "pending".
 */
export interface PipelineStateRow {
  project_id: string;

  // Gemini interaction IDs — NULL until the first call in that chain succeeds.
  text_interaction_id: string | null;
  image_interaction_id: string | null;

  // Per-step statuses
  step_style: StepStatus;
  step_characters: StepStatus;
  step_portraits: StepStatus;
  step_chapters: StepStatus;
  step_illustrations: StepStatus;

  /** ISO-8601 timestamp of the most recent transition to "running". */
  step_started_at: string | null;
}

export interface StyleResultRow {
  project_id: string;
  style_text: string;
}

export interface CharacterRow {
  id: string;
  project_id: string;
  name: string;
  /** The descriptive prompt sent to Gemini for portrait generation */
  prompt: string;
  /** Relative path under backend/data/... , NULL until portrait is generated */
  portrait_path: string | null;
  status: StepStatus;
}

export interface ChapterRow {
  id: string;
  project_id: string;
  name: string;
  /** The descriptive prompt sent to Gemini for illustration generation */
  prompt: string;
  /** Relative path under backend/data/..., NULL until illustration is generated */
  illustration_path: string | null;
  status: StepStatus;
}
