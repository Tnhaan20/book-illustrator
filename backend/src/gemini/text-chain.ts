// src/gemini/text-chain.ts
// Text pipeline: style → characters (cap 2) → chapters (cap 1)
// All calls use ai.interactions.create() with previous_interaction_id chaining.

import { ai, MODELS } from "./client.ts";

// ── Types returned to the caller ─────────────────────────────────────────────

export interface StyleResult {
  interactionId: string;
  styleText: string;
}

export interface CharacterResult {
  interactionId: string;
  characters: Array<{ name: string; prompt: string }>;
}

export interface ChapterResult {
  interactionId: string;
  chapters: Array<{ name: string; prompt: string }>;
}

// ── Step 1: style ─────────────────────────────────────────────────────────────

/**
 * Seed the text chain with the book content and ask Gemini for an art style.
 * The book text is passed inline — works identically whether it came from a
 * pasted text field or a .txt file upload (both are saved to disk first).
 *
 * @param bookText     Full book text content (not a path)
 * @param artStyleHint Optional user-supplied style hint (e.g. "watercolour")
 */
export async function runStyleStep(
  bookText: string,
  artStyleHint: string | null
): Promise<StyleResult> {
  const styleHint = artStyleHint
    ? ` The user requests a "${artStyleHint}" visual style.`
    : "";

  const response = await ai.interactions.create({
    model: MODELS.text,
    input:
      `BOOK TEXT:\n${bookText}\n\n---\n\n` +
      `You are an art director for a book illustration project.${styleHint} ` +
      `Based on the book text above, describe the ideal visual art style for its illustrations ` +
      `in 2–3 concise sentences. Focus on colour palette, line quality, and mood.`,
  });

  return {
    interactionId: response.id!,
    styleText: response.output_text ?? "",
  };
}

// ── Step 2: characters ────────────────────────────────────────────────────────

/**
 * Chain onto the style interaction to extract up to 2 main characters.
 * Returns raw parsed JSON, capped server-side.
 */
export async function runCharactersStep(
  textInteractionId: string
): Promise<CharacterResult> {
  const response = await ai.interactions.create({
    model: MODELS.text,
    previous_interaction_id: textInteractionId,
    input:
      `Based on the book text and art style, identify the 1–2 most important characters. ` +
      `Reply ONLY with a JSON array (no markdown fences): ` +
      `[{"name":"<name>","prompt":"<one-sentence visual description for portrait illustration>"}]. ` +
      `Maximum 2 entries.`,
  });

  let characters: Array<{ name: string; prompt: string }> = [];
  try {
    const raw = (response.output_text ?? "").trim();
    characters = JSON.parse(raw) as typeof characters;
  } catch {
    // Gemini occasionally wraps JSON in fences — strip them
    const cleaned = (response.output_text ?? "").replace(/```json|```/g, "").trim();
    characters = JSON.parse(cleaned) as typeof characters;
  }

  // Enforce cap of 2
  return {
    interactionId: response.id!,
    characters: characters.slice(0, 2),
  };
}

// ── Step 3: chapters ──────────────────────────────────────────────────────────

/**
 * Chain onto the characters interaction to identify 1 key chapter scene.
 * Cap is 1.
 */
export async function runChaptersStep(
  textInteractionId: string
): Promise<ChapterResult> {
  const response = await ai.interactions.create({
    model: MODELS.text,
    previous_interaction_id: textInteractionId,
    input:
      `Now identify the single most visually dramatic scene or chapter in the book. ` +
      `Reply ONLY with a JSON array with exactly 1 entry (no markdown fences): ` +
      `[{"name":"<chapter or scene name>","prompt":"<one-sentence description for a full-page illustration>"}].`,
  });

  let chapters: Array<{ name: string; prompt: string }> = [];
  try {
    const raw = (response.output_text ?? "").trim();
    chapters = JSON.parse(raw) as typeof chapters;
  } catch {
    const cleaned = (response.output_text ?? "").replace(/```json|```/g, "").trim();
    chapters = JSON.parse(cleaned) as typeof chapters;
  }

  // Enforce cap of 1
  return {
    interactionId: response.id!,
    chapters: chapters.slice(0, 1),
  };
}
