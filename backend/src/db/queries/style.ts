// src/db/queries/style.ts — DB helpers for the style_result table

import { db } from "../client.ts";
import type { StyleResultRow } from "../schema.ts";

export function upsertStyleResult(projectId: string, styleText: string): void {
  db.run(
    `INSERT INTO style_result (project_id, style_text) VALUES (?, ?)
     ON CONFLICT(project_id) DO UPDATE SET style_text = excluded.style_text`,
    [projectId, styleText]
  );
}

export function getStyleResult(projectId: string): StyleResultRow | null {
  return db
    .query<StyleResultRow, [string]>(
      "SELECT * FROM style_result WHERE project_id = ?"
    )
    .get(projectId);
}
