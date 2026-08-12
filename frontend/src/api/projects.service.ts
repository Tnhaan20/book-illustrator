// src/api/projects.service.ts
import api from './axios';
import type { ProjectSummary, ProjectDetail } from '../types/project';

export const projectsService = {
  list: () =>
    api.get<ProjectSummary[]>('/projects').then((r) => r.data),

  get: (id: string) =>
    api.get<ProjectDetail>(`/projects/${id}`).then((r) => r.data),

  /** Supports both JSON text body and multipart file upload. */
  create: (formData: FormData) =>
    api.post<ProjectDetail>('/projects', formData).then((r) => r.data),
};
