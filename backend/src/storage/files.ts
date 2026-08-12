// src/storage/files.ts — disk helpers for book text and generated images

import fs from "node:fs/promises";
import path from "node:path";

/** Root of all user data: backend/data/ */
const DATA_ROOT = path.join(import.meta.dir, "..", "..", "data");

/** Returns and creates the directory for a given project. */
export async function ensureProjectDir(userId: string, projectId: string): Promise<string> {
  const dir = path.join(DATA_ROOT, userId, projectId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/** Save raw book text to disk; returns the relative path stored in DB. */
export async function saveBookText(
  userId: string,
  projectId: string,
  text: string
): Promise<string> {
  const dir = await ensureProjectDir(userId, projectId);
  const filePath = path.join(dir, "book.txt");
  await fs.writeFile(filePath, text, "utf8");
  // Store relative to DATA_ROOT so the path is portable
  return path.relative(DATA_ROOT, filePath);
}

/** Read book text back from disk. Returns null if the file is missing. */
export async function readBookText(relativePath: string): Promise<string | null> {
  try {
    return await fs.readFile(path.join(DATA_ROOT, relativePath), "utf8");
  } catch {
    return null;
  }
}

/** Save a base-64 image string to disk; returns the relative path. */
export async function saveImage(
  userId: string,
  projectId: string,
  filename: string,
  base64Data: string
): Promise<string> {
  const dir = await ensureProjectDir(userId, projectId);
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, Buffer.from(base64Data, "base64"));
  return path.relative(DATA_ROOT, filePath);
}

/** Absolute path from a relative path — used when serving files statically. */
export function absolutePath(relativePath: string): string {
  return path.join(DATA_ROOT, relativePath);
}
