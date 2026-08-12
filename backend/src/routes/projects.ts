// src/routes/projects.ts — GET /projects, POST /projects, GET /projects/:id

import { Router } from "express";
import multer from "multer";
import {
  findProjectById,
  insertProject,
  listProjectsByUser,
} from "../db/queries/projects.ts";
import { initPipelineState, getPipelineState } from "../db/queries/pipeline.ts";
import { listCharactersByProject } from "../db/queries/characters.ts";
import { listChaptersByProject } from "../db/queries/chapters.ts";
import { getStyleResult } from "../db/queries/style.ts";
import { saveBookText, readBookText } from "../storage/files.ts";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// ── GET /projects ─────────────────────────────────────────────────────────────
// Requires header: x-user-id

router.get("/", (req, res) => {
  const userId = req.headers["x-user-id"] as string | undefined;
  if (!userId) {
    res.status(401).json({ error: "x-user-id header is required" });
    return;
  }

  const projects = listProjectsByUser(userId);
  const results = projects.map((p) => {
    const ps = getPipelineState(p.id);
    return {
      id: p.id,
      title: p.title,
      status: p.status,
      created_at: p.created_at,
      progress: ps
        ? {
            step_style: ps.step_style,
            step_characters: ps.step_characters,
            step_portraits: ps.step_portraits,
            step_chapters: ps.step_chapters,
            step_illustrations: ps.step_illustrations,
          }
        : null,
    };
  });

  res.json(results);
});

// ── POST /projects ────────────────────────────────────────────────────────────
// Body: multipart (file) OR JSON { title, text, art_style? }
// Requires header: x-user-id

router.post(
  "/",
  upload.single("file"), // optional file upload; ignored if sending JSON
  async (req, res) => {
    const userId = req.headers["x-user-id"] as string | undefined;
    if (!userId) {
      res.status(401).json({ error: "x-user-id header is required" });
      return;
    }

    const title = (req.body as { title?: string }).title?.trim();
    if (!title) {
      res.status(400).json({ error: "title is required" });
      return;
    }

    // Resolve book text from either uploaded file or pasted text
    let bookText: string | null = null;
    if (req.file) {
      bookText = req.file.buffer.toString("utf8");
    } else if ((req.body as { text?: string }).text) {
      bookText = (req.body as { text: string }).text;
    }

    if (!bookText || bookText.trim().length === 0) {
      res.status(400).json({ error: "Book text is required (field: text or file upload)" });
      return;
    }

    const artStyle = (req.body as { art_style?: string }).art_style?.trim() ?? null;
    const projectId = crypto.randomUUID();

    try {
      const bookTextPath = await saveBookText(userId, projectId, bookText);
      const project = insertProject(projectId, userId, title, bookTextPath, artStyle);
      initPipelineState(projectId);

      res.status(201).json({
        ...project,
        pipeline_state: getPipelineState(projectId),
      });
    } catch (err) {
      console.error("[POST /projects]", err);
      res.status(500).json({ error: "Failed to create project" });
    }
  }
);

// ── GET /projects/:id ─────────────────────────────────────────────────────────

router.get("/:id", async (req, res) => {
  const project = findProjectById(req.params.id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [bookText, pipelineState, styleResult, characters, chapters] =
    await Promise.all([
      readBookText(project.book_text_path),
      getPipelineState(project.id),
      getStyleResult(project.id),
      listCharactersByProject(project.id),
      listChaptersByProject(project.id),
    ]);

  res.json({
    ...project,
    book_text: bookText,
    style: styleResult?.style_text ?? null,
    characters,
    chapters,
    pipeline_state: pipelineState,
  });
});

export { router as projectsRouter };
