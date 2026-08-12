// src/db/queries/chapters.ts — DB helpers for the chapters table

import { db } from "../client.ts";
import type { ChapterRow } from "../schema.ts";

export function insertChapter(
  id: string,
  projectId: string,
  name: string,
  prompt: string
): ChapterRow {
  db.run(
    `INSERT INTO chapters (id, project_id, name, prompt) VALUES (?, ?, ?, ?)`,
    [id, projectId, name, prompt]
  );
  return { id, project_id: projectId, name, prompt, illustration_path: null, status: "pending" };
}

export function listChaptersByProject(projectId: string): ChapterRow[] {
  return db
    .query<ChapterRow, [string]>(
      "SELECT * FROM chapters WHERE project_id = ? ORDER BY rowid"
    )
    .all(projectId);
}

export function updateChapterIllustration(
  id: string,
  illustrationPath: string
): void {
  db.run(
    "UPDATE chapters SET illustration_path = ?, status = 'done' WHERE id = ?",
    [illustrationPath, id]
  );
}

export function markChapterFailed(id: string): void {
  db.run("UPDATE chapters SET status = 'failed' WHERE id = ?", [id]);
}
