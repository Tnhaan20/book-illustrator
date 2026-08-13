
import { ai, MODELS } from "./client.ts";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ImageResult {
  interactionId: string;
  /** Raw base-64 encoded PNG/JPEG bytes */
  imageBase64: string;
  mimeType: string;
}

// ── Real SDK helpers ──────────────────────────────────────────────────────────

/** Extract the first image part from a Gemini response. */
function extractImage(response: Awaited<ReturnType<typeof ai.interactions.create>>): {
  base64: string;
  mimeType: string;
} {
  for (const part of response.output ?? []) {
    if (part.inlineData?.data && part.inlineData.mimeType) {
      return { base64: part.inlineData.data, mimeType: part.inlineData.mimeType };
    }
  }
  throw new Error("Gemini returned no image in response");
}

// ── Step 4a: portrait for a single character ──────────────────────────────────

/**
 * Generate a portrait for one character.
 *
 * @param styleText         The art style description from the style step
 * @param characterName     Character's name
 * @param characterPrompt   Visual description prompt
 * @param prevInteractionId Previous image-chain interaction ID (null for first)
 */
export async function runPortraitStep(
  styleText: string,
  characterName: string,
  characterPrompt: string,
  prevInteractionId: string | null
): Promise<ImageResult> {
  const prompt =
    `Art style: ${styleText}\n\n` +
    `Generate a character portrait of "${characterName}": ${characterPrompt}. ` +
    `Portrait orientation, full body or bust shot.`;

  const response = await ai.interactions.create({
    model: MODELS.image,
    ...(prevInteractionId ? { previous_interaction_id: prevInteractionId } : {}),
    input: prompt,
    response_modalities: ["image"],
  } as any);

  const { base64, mimeType } = extractImage(response);
  return { interactionId: response.id!, imageBase64: base64, mimeType };
}

// ── Step 4b: illustration for a chapter scene ─────────────────────────────────

/**
 * Generate a full-page illustration for a chapter.
 * Always chained onto the image interaction (after portraits).
 */
export async function runIllustrationStep(
  styleText: string,
  chapterName: string,
  chapterPrompt: string,
  prevInteractionId: string | null
): Promise<ImageResult> {
  const prompt =
    `Art style: ${styleText}\n\n` +
    `Generate a full-page book illustration for the scene "${chapterName}": ${chapterPrompt}. ` +
    `Landscape orientation, cinematic composition.`;

  const response = await ai.interactions.create({
    model: MODELS.image,
    ...(prevInteractionId ? { previous_interaction_id: prevInteractionId } : {}),
    input: prompt,
    response_modalities: ["image"],
  } as any);

  const { base64, mimeType } = extractImage(response);
  return { interactionId: response.id!, imageBase64: base64, mimeType };
}
