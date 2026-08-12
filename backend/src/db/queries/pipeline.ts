// src/db/queries/pipeline.ts — DB helpers for pipeline_state

import { db } from "../client.ts";
import type { PipelineStateRow, StepStatus } from "../schema.ts";

type StepField = keyof Pick<
  PipelineStateRow,
  "step_style" | "step_characters" | "step_portraits" | "step_chapters" | "step_illustrations"
>;

/** Insert the initial pipeline_state row (all steps = 'pending'). */
export function initPipelineState(projectId: string): void {
  db.run(
    `INSERT INTO pipeline_state (project_id) VALUES (?)
     ON CONFLICT(project_id) DO NOTHING`,
    [projectId]
  );
}

export function getPipelineState(projectId: string): PipelineStateRow | null {
  return db
    .query<PipelineStateRow, [string]>(
      "SELECT * FROM pipeline_state WHERE project_id = ?"
    )
    .get(projectId);
}

/**
 * Attempt to claim a step atomically.
 * Returns true if the claim succeeded (step was 'pending' → 'running').
 * Returns false if the step is already 'running' (caller should return current state).
 * Throws if the step is 'done' (cannot re-run) or 'failed' (use retry endpoint).
 */
export function claimStep(projectId: string, field: StepField): boolean {
  let claimed = false;
  db.transaction(() => {
    const row = db
      .query<Pick<PipelineStateRow, typeof field>, [string]>(
        `SELECT ${field} FROM pipeline_state WHERE project_id = ?`
      )
      .get(projectId);

    if (!row) throw new Error("pipeline_state row not found");

    const current = row[field] as StepStatus;

    if (current === "running") {
      claimed = false;
      return;
    }
    if (current === "done") {
      throw Object.assign(new Error("Step already done"), { code: "STEP_DONE" });
    }
    if (current === "failed") {
      throw Object.assign(new Error("Step failed — use the retry endpoint"), { code: "STEP_FAILED" });
    }

    // current === 'pending' — claim it
    db.run(
      `UPDATE pipeline_state SET ${field} = 'running', step_started_at = ? WHERE project_id = ?`,
      [new Date().toISOString(), projectId]
    );
    claimed = true;
  })();

  return claimed;
}

/**
 * Retry endpoint version: allows claiming from 'failed' or a stuck 'running'.
 * Stuck = running for more than STUCK_MS milliseconds.
 */
const STUCK_MS = 3 * 60 * 1000; // 3 minutes

export function claimStepForRetry(projectId: string, field: StepField): boolean {
  let claimed = false;
  db.transaction(() => {
    const row = db
      .query<Pick<PipelineStateRow, typeof field | "step_started_at">, [string]>(
        `SELECT ${field}, step_started_at FROM pipeline_state WHERE project_id = ?`
      )
      .get(projectId);

    if (!row) throw new Error("pipeline_state row not found");

    const current = row[field] as StepStatus;
    const startedAt = row.step_started_at;

    const isStuck =
      current === "running" &&
      startedAt != null &&
      Date.now() - new Date(startedAt).getTime() > STUCK_MS;

    if (current !== "failed" && !isStuck) {
      throw Object.assign(
        new Error("Step is not failed or stuck — cannot retry"),
        { code: "RETRY_NOT_ALLOWED" }
      );
    }

    db.run(
      `UPDATE pipeline_state SET ${field} = 'running', step_started_at = ? WHERE project_id = ?`,
      [new Date().toISOString(), projectId]
    );
    claimed = true;
  })();

  return claimed;
}

export function markStepDone(
  projectId: string,
  field: StepField,
  interactionIdField?: "text_interaction_id" | "image_interaction_id",
  interactionId?: string
): void {
  if (interactionIdField && interactionId) {
    db.run(
      `UPDATE pipeline_state SET ${field} = 'done', ${interactionIdField} = ? WHERE project_id = ?`,
      [interactionId, projectId]
    );
  } else {
    db.run(
      `UPDATE pipeline_state SET ${field} = 'done' WHERE project_id = ?`,
      [projectId]
    );
  }
}

export function markStepFailed(projectId: string, field: StepField): void {
  db.run(
    `UPDATE pipeline_state SET ${field} = 'failed' WHERE project_id = ?`,
    [projectId]
  );
}
