// src/api/steps.service.ts
import api from './axios';
import type { StepName } from '../types/pipeline';

export const stepsService = {
  run: (projectId: string, step: StepName, body?: Record<string, string>) =>
    api.post(`/projects/${projectId}/steps/${step}`, body ?? {}).then((r) => r.data),

  retry: (projectId: string, step: StepName) =>
    api.post(`/projects/${projectId}/steps/${step}/retry`).then((r) => r.data),
};
