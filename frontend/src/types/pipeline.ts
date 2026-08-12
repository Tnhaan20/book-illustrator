// src/types/pipeline.ts
export type StepStatus = 'pending' | 'running' | 'done' | 'failed';
export type StepName = 'style' | 'characters' | 'portraits' | 'chapters' | 'illustrations';

export interface PipelineState {
  project_id: string;
  text_interaction_id: string | null;
  image_interaction_id: string | null;
  step_style: StepStatus;
  step_characters: StepStatus;
  step_portraits: StepStatus;
  step_chapters: StepStatus;
  step_illustrations: StepStatus;
  step_started_at: string | null;
}

export interface StepProgress {
  step_style: StepStatus;
  step_characters: StepStatus;
  step_portraits: StepStatus;
  step_chapters: StepStatus;
  step_illustrations: StepStatus;
}

export const STEP_ORDER: StepName[] = [
  'style', 'characters', 'portraits', 'chapters', 'illustrations',
];

/** Return the first step that is not 'done', or 'illustrations' if all done. */
export function currentStep(state: PipelineState): StepName {
  for (const s of STEP_ORDER) {
    if (state[`step_${s}` as keyof PipelineState] !== 'done') return s;
  }
  return 'illustrations';
}
