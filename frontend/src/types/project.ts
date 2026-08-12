// src/types/project.ts
import type { PipelineState, StepProgress } from './pipeline';

export type ProjectStatus = 'draft' | 'in_progress' | 'done';

export interface Character {
  id: string;
  project_id: string;
  name: string;
  prompt: string;
  portrait_path: string | null;
  status: string;
}

export interface Chapter {
  id: string;
  project_id: string;
  name: string;
  prompt: string;
  illustration_path: string | null;
  status: string;
}

/** Lightweight project returned by GET /projects */
export interface ProjectSummary {
  id: string;
  title: string;
  status: ProjectStatus;
  created_at: string;
  progress: StepProgress | null;
}

/** Full project returned by GET /projects/:id */
export interface ProjectDetail extends ProjectSummary {
  user_id: string;
  book_text: string | null;
  book_text_path: string;
  art_style: string | null;
  style: string | null;
  characters: Character[];
  chapters: Chapter[];
  pipeline_state: PipelineState | null;
}

export interface CreateProjectPayload {
  title: string;
  text?: string;
  art_style?: string;
}
