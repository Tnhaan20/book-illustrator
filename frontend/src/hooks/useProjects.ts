// src/hooks/useProjects.ts
import { useQuery } from '@tanstack/react-query';
import { projectsService } from '../api/projects.service';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: projectsService.list,
  });
}
