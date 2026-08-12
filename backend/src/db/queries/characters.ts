// src/db/queries/characters.ts — DB helpers for the characters table

import { db } from "../client.ts";
import type { CharacterRow, StepStatus } from "../schema.ts";

export function insertCharacter(
  id: string,
  projectId: string,
  name: string,
  prompt: string
): CharacterRow {
  db.run(
    `INSERT INTO characters (id, project_id, name, prompt) VALUES (?, ?, ?, ?)`,
    [id, projectId, name, prompt]
  );
  return { id, project_id: projectId, name, prompt, portrait_path: null, status: "pending" };
}

export function listCharactersByProject(projectId: string): CharacterRow[] {
  return db
    .query<CharacterRow, [string]>(
      "SELECT * FROM characters WHERE project_id = ? ORDER BY rowid"
    )
    .all(projectId);
}

export function updateCharacterPortrait(
  id: string,
  portraitPath: string
): void {
  db.run(
    "UPDATE characters SET portrait_path = ?, status = 'done' WHERE id = ?",
    [portraitPath, id]
  );
}

export function markCharacterFailed(id: string): void {
  db.run("UPDATE characters SET status = 'failed' WHERE id = ?", [id]);
}
