// backend/index.ts — server entry point

import express from "express";
import cors from "cors";
import path from "node:path";
import { runMigrations } from "./src/db/index.ts";
import { authRouter } from "./src/routes/auth.ts";
import { projectsRouter } from "./src/routes/projects.ts";
import { stepsRouter } from "./src/routes/steps.ts";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

// ── DB migrations ─────────────────────────────────────────────────────────────
runMigrations();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// ── Static file serving — generated images ────────────────────────────────────
// Images are stored under backend/data/ and served at /files/*
const DATA_DIR = path.join(import.meta.dir, "data");
app.use("/files", express.static(DATA_DIR));

// ── Real routers ──────────────────────────────────────────────────────────────
app.use("/auth", authRouter);
app.use("/projects", projectsRouter);
// Step routes are nested under /projects/:id/steps
app.use("/projects/:id/steps", stepsRouter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "Book Illustrator API is running",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV ?? "development",
    imageMode: process.env.GEMINI_IMAGE_MOCK === "true" ? "mock" : "real",
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[backend] listening on http://localhost:${PORT}`);
  console.log(`[backend] NODE_ENV=${process.env.NODE_ENV}`);
  console.log(`[backend] GEMINI_API_KEY present: ${!!process.env.GEMINI_API_KEY}`);
  console.log(`[backend] image mode: ${process.env.GEMINI_IMAGE_MOCK === "true" ? "MOCK" : "REAL (paid)"}`);
});