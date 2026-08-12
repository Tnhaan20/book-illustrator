// ─────────────────────────────────────────────────────────────────────────────
// src/db/index.ts  — public surface of the db module
// ─────────────────────────────────────────────────────────────────────────────

export { db } from "./client.ts";
export { runMigrations } from "./migrate.ts";
export type {
  StepStatus,
  ProjectStatus,
  UserRow,
  ProjectRow,
  PipelineStateRow,
  StyleResultRow,
  CharacterRow,
  ChapterRow,
} from "./schema.ts";
