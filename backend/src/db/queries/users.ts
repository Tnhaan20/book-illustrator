// src/db/queries/users.ts — DB helpers for the users table

import { db } from "../client.ts";
import type { UserRow } from "../schema.ts";

/** Return the user with this email, or null if not found. */
export function findUserByEmail(email: string): UserRow | null {
  return db
    .query<UserRow, [string]>("SELECT * FROM users WHERE email = ?")
    .get(email);
}

/** Insert a new user row and return it. */
export function insertUser(id: string, email: string, name: string): UserRow {
  const now = new Date().toISOString();
  db.run(
    "INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)",
    [id, email, name, now]
  );
  return { id, email, name, created_at: now };
}
