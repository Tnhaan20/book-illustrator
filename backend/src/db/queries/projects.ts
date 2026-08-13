// src/db/queries/projects.ts — DB helpers for the projects table

import { db } from "../client.ts";
import type { ProjectRow, ProjectStatus } from "../schema.ts";

export function findProjectById(id: string): ProjectRow | null {
  return db
    .query<ProjectRow, [string]>("SELECT * FROM projects WHERE id = ?")
    .get(id);
}

export function listProjectsByUser(userId: string): ProjectRow[] {
  return db
    .query<ProjectRow, [string]>(
      "SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC"
    )
    .all(userId);
}

export function insertProject(
  id: string,
  userId: string,
  title: string,
  bookTextPath: string
): ProjectRow {
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO projects (id, user_id, title, book_text_path, status, created_at)
     VALUES (?, ?, ?, ?, 'draft', ?)`,
    [id, userId, title, bookTextPath, now]
  );
  return { id, user_id: userId, title, book_text_path: bookTextPath, status: "draft", created_at: now };
}

export function updateProjectStatus(id: string, status: ProjectStatus): void {
  db.run("UPDATE projects SET status = ? WHERE id = ?", [status, id]);
}
