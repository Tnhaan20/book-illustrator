// src/routes/steps.ts — POST /projects/:id/steps/:step  &  POST /projects/:id/steps/:step/retry
//
// Every step handler follows the same pattern (D-003):
//   1. Verify the project exists
//   2. claimStep() inside a transaction (pending → running)
//      - already running → return current state (no Gemini call)
//      - done / failed   → return 409 with instruction
//   3. Call the appropriate Gemini function OUTSIDE the transaction
//   4. Persist result & markStepDone() on success
//   5. markStepFailed() on any error

import { Router } from "express";
import { findProjectById, updateProjectStatus } from "../db/queries/projects.ts";
import {
  getPipelineState,
  claimStep,
  claimStepForRetry,
  markStepDone,
  markStepFailed,
} from "../db/queries/pipeline.ts";
import {
  insertCharacter,
  listCharactersByProject,
  updateCharacterPortrait,
  markCharacterFailed,
} from "../db/queries/characters.ts";
import {
  insertChapter,
  listChaptersByProject,
  updateChapterIllustration,
  markChapterFailed,
} from "../db/queries/chapters.ts";
import { upsertStyleResult, getStyleResult } from "../db/queries/style.ts";
import { readBookText, saveImage } from "../storage/files.ts";
import {
  runStyleStep,
  runCharactersStep,
  runChaptersStep,
} from "../gemini/text-chain.ts";
import {
  runPortraitStep,
  runIllustrationStep,
} from "../gemini/image-chain.ts";

const router = Router({ mergeParams: true });

// ── Shared guard ─────────────────────────────────────────────────────────────

/** Returns the project or sends 404 and returns null. */
function requireProject(projectId: string, res: Parameters<typeof router.use>[1]) {
  const project = findProjectById(projectId);
  if (!project) {
    (res as import("express").Response).status(404).json({ error: "Project not found" });
    return null;
  }
  return project;
}

// ── STEP: style ───────────────────────────────────────────────────────────────

router.post("/style", async (req, res) => {
  const project = requireProject(req.params.id, res);
  if (!project) return;

  let claimed: boolean;
  try {
    claimed = claimStep(project.id, "step_style");
  } catch (err: unknown) {
    const e = err as { code?: string; message: string };
    res.status(409).json({ error: e.message, code: e.code });
    return;
  }

  const state = getPipelineState(project.id)!;
  if (!claimed) {
    res.json({ message: "Style step already running", pipeline_state: state });
    return;
  }

  try {
    // Read book text from disk — works for both paste and .txt file upload
    // since POST /projects always saves the content to book.txt (D-004)
    const bookText = await readBookText(project.book_text_path);
    if (!bookText) throw new Error("book.txt not found on disk");

    const artStyleHint = (req.body as { style?: string }).style ?? null;

    const { interactionId, styleText } = await runStyleStep(bookText, artStyleHint);
    upsertStyleResult(project.id, styleText);
    markStepDone(project.id, "step_style", "text_interaction_id", interactionId);
    updateProjectStatus(project.id, "in_progress");

    res.json({
      style_text: styleText,
      pipeline_state: getPipelineState(project.id),
    });
  } catch (err) {
    console.error("[step:style]", err);
    markStepFailed(project.id, "step_style");
    res.status(500).json({ error: "Style step failed", pipeline_state: getPipelineState(project.id) });
  }
});

// ── STEP: characters ──────────────────────────────────────────────────────────

router.post("/characters", async (req, res) => {
  const project = requireProject(req.params.id, res);
  if (!project) return;

  let claimed: boolean;
  try {
    claimed = claimStep(project.id, "step_characters");
  } catch (err: unknown) {
    const e = err as { code?: string; message: string };
    res.status(409).json({ error: e.message, code: e.code });
    return;
  }

  const state = getPipelineState(project.id)!;
  if (!claimed) {
    res.json({ message: "Characters step already running", pipeline_state: state });
    return;
  }

  if (state.step_style !== "done") {
    markStepFailed(project.id, "step_characters");
    res.status(409).json({ error: "Style step must complete before characters" });
    return;
  }

  try {
    const { interactionId, characters } = await runCharactersStep(state.text_interaction_id!);

    // Delete any stale characters before inserting fresh ones
    for (const c of characters) {
      insertCharacter(crypto.randomUUID(), project.id, c.name, c.prompt);
    }

    markStepDone(project.id, "step_characters", "text_interaction_id", interactionId);

    res.json({
      characters: listCharactersByProject(project.id),
      pipeline_state: getPipelineState(project.id),
    });
  } catch (err) {
    console.error("[step:characters]", err);
    markStepFailed(project.id, "step_characters");
    res.status(500).json({ error: "Characters step failed", pipeline_state: getPipelineState(project.id) });
  }
});

// ── STEP: portraits ───────────────────────────────────────────────────────────

router.post("/portraits", async (req, res) => {
  const project = requireProject(req.params.id, res);
  if (!project) return;

  let claimed: boolean;
  try {
    claimed = claimStep(project.id, "step_portraits");
  } catch (err: unknown) {
    const e = err as { code?: string; message: string };
    res.status(409).json({ error: e.message, code: e.code });
    return;
  }

  const state = getPipelineState(project.id)!;
  if (!claimed) {
    res.json({ message: "Portraits step already running", pipeline_state: state });
    return;
  }

  if (state.step_characters !== "done") {
    markStepFailed(project.id, "step_portraits");
    res.status(409).json({ error: "Characters step must complete before portraits" });
    return;
  }

  try {
    const styleResult = getStyleResult(project.id);
    if (!styleResult) throw new Error("Style result missing");

    const characters = listCharactersByProject(project.id);
    let lastInteractionId: string | null = state.image_interaction_id;
    let anyFailed = false;
    let lastErrorStatus = 500;
    let lastErrorMessage = "Some character portraits failed to generate";

    for (const character of characters) {
      if (character.status === "done") {
        continue;
      }
      try {
        const { interactionId, imageBase64, mimeType } = await runPortraitStep(
          styleResult.style_text,
          character.name,
          character.prompt,
          lastInteractionId
        );
        const ext = mimeType.includes("png") ? "png" : "jpg";
        const imgPath = await saveImage(
          project.user_id,
          project.id,
          `portrait-${character.id}.${ext}`,
          imageBase64
        );
        updateCharacterPortrait(character.id, imgPath);
        lastInteractionId = interactionId;
      } catch (err: any) {
        console.error(`[step:portraits] Failed for character ${character.name}`, err);
        markCharacterFailed(character.id);
        anyFailed = true;
        lastErrorStatus = err?.rawResponse?.status || err?.status || err?.response?.status || 500;
        lastErrorMessage = err?.error?.message || err?.message || "Failed to generate portrait";
      }
    }

    if (anyFailed) {
      markStepFailed(project.id, "step_portraits");
      res.status(lastErrorStatus === 429 ? 429 : 500).json({
        error: lastErrorStatus === 429 ? "Quota exceeded (429). Please check your billing." : lastErrorMessage,
        characters: listCharactersByProject(project.id),
        pipeline_state: getPipelineState(project.id),
      });
      return;
    }

    markStepDone(project.id, "step_portraits", "image_interaction_id", lastInteractionId ?? "");

    res.json({
      characters: listCharactersByProject(project.id),
      pipeline_state: getPipelineState(project.id),
    });
  } catch (err) {
    console.error("[step:portraits]", err);
    markStepFailed(project.id, "step_portraits");
    res.status(500).json({ error: "Portraits step failed", pipeline_state: getPipelineState(project.id) });
  }
});

// ── STEP: chapters ────────────────────────────────────────────────────────────

router.post("/chapters", async (req, res) => {
  const project = requireProject(req.params.id, res);
  if (!project) return;

  let claimed: boolean;
  try {
    claimed = claimStep(project.id, "step_chapters");
  } catch (err: unknown) {
    const e = err as { code?: string; message: string };
    res.status(409).json({ error: e.message, code: e.code });
    return;
  }

  const state = getPipelineState(project.id)!;
  if (!claimed) {
    res.json({ message: "Chapters step already running", pipeline_state: state });
    return;
  }

  if (state.step_portraits !== "done") {
    markStepFailed(project.id, "step_chapters");
    res.status(409).json({ error: "Portraits step must complete before chapters" });
    return;
  }

  try {
    const { interactionId, chapters } = await runChaptersStep(state.text_interaction_id!);

    for (const c of chapters) {
      insertChapter(crypto.randomUUID(), project.id, c.name, c.prompt);
    }

    markStepDone(project.id, "step_chapters", "text_interaction_id", interactionId);

    res.json({
      chapters: listChaptersByProject(project.id),
      pipeline_state: getPipelineState(project.id),
    });
  } catch (err) {
    console.error("[step:chapters]", err);
    markStepFailed(project.id, "step_chapters");
    res.status(500).json({ error: "Chapters step failed", pipeline_state: getPipelineState(project.id) });
  }
});

// ── STEP: illustrations ───────────────────────────────────────────────────────

router.post("/illustrations", async (req, res) => {
  const project = requireProject(req.params.id, res);
  if (!project) return;

  let claimed: boolean;
  try {
    claimed = claimStep(project.id, "step_illustrations");
  } catch (err: unknown) {
    const e = err as { code?: string; message: string };
    res.status(409).json({ error: e.message, code: e.code });
    return;
  }

  const state = getPipelineState(project.id)!;
  if (!claimed) {
    res.json({ message: "Illustrations step already running", pipeline_state: state });
    return;
  }

  if (state.step_chapters !== "done") {
    markStepFailed(project.id, "step_illustrations");
    res.status(409).json({ error: "Chapters step must complete before illustrations" });
    return;
  }

  try {
    const styleResult = getStyleResult(project.id);
    if (!styleResult) throw new Error("Style result missing");

    const chapters = listChaptersByProject(project.id);
    let lastInteractionId: string | null = state.image_interaction_id;
    let anyFailed = false;
    let lastErrorStatus = 500;
    let lastErrorMessage = "Some chapter illustrations failed to generate";

    for (const chapter of chapters) {
      if (chapter.status === "done") {
        continue;
      }
      try {
        const { interactionId, imageBase64, mimeType } = await runIllustrationStep(
          styleResult.style_text,
          chapter.name,
          chapter.prompt,
          lastInteractionId
        );
        const ext = mimeType.includes("png") ? "png" : "jpg";
        const imgPath = await saveImage(
          project.user_id,
          project.id,
          `illustration-${chapter.id}.${ext}`,
          imageBase64
        );
        updateChapterIllustration(chapter.id, imgPath);
        lastInteractionId = interactionId;
      } catch (err: any) {
        console.error(`[step:illustrations] Failed for chapter ${chapter.name}`, err);
        markChapterFailed(chapter.id);
        anyFailed = true;
        lastErrorStatus = err?.rawResponse?.status || err?.status || err?.response?.status || 500;
        lastErrorMessage = err?.error?.message || err?.message || "Failed to generate illustration";
      }
    }

    if (anyFailed) {
      markStepFailed(project.id, "step_illustrations");
      res.status(lastErrorStatus === 429 ? 429 : 500).json({
        error: lastErrorStatus === 429 ? "Quota exceeded (429). Please check your billing." : lastErrorMessage,
        chapters: listChaptersByProject(project.id),
        pipeline_state: getPipelineState(project.id),
      });
      return;
    }

    markStepDone(project.id, "step_illustrations", "image_interaction_id", lastInteractionId ?? "");
    updateProjectStatus(project.id, "done");

    res.json({
      chapters: listChaptersByProject(project.id),
      pipeline_state: getPipelineState(project.id),
    });
  } catch (err) {
    console.error("[step:illustrations]", err);
    markStepFailed(project.id, "step_illustrations");
    res.status(500).json({ error: "Illustrations step failed", pipeline_state: getPipelineState(project.id) });
  }
});

// ── RETRY ─────────────────────────────────────────────────────────────────────

const RETRYABLE_STEPS = [
  "style", "characters", "portraits", "chapters", "illustrations",
] as const;
type RetryableStep = (typeof RETRYABLE_STEPS)[number];
const STEP_FIELD_MAP: Record<RetryableStep, Parameters<typeof claimStepForRetry>[1]> = {
  style:          "step_style",
  characters:     "step_characters",
  portraits:      "step_portraits",
  chapters:       "step_chapters",
  illustrations:  "step_illustrations",
};

router.post("/:step/retry", (req, res) => {
  const project = requireProject(req.params.id, res);
  if (!project) return;

  const step = req.params.step as RetryableStep;
  if (!RETRYABLE_STEPS.includes(step)) {
    res.status(400).json({ error: `Unknown step: ${step}` });
    return;
  }

  try {
    claimStepForRetry(project.id, STEP_FIELD_MAP[step]);
    // Reset to pending so caller can re-POST the step endpoint
    res.json({
      message: `Step "${step}" reset to pending — re-POST /steps/${step} to retry`,
      pipeline_state: getPipelineState(project.id),
    });
  } catch (err: unknown) {
    const e = err as { code?: string; message: string };
    res.status(409).json({ error: e.message, code: e.code });
  }
});

export { router as stepsRouter };
