// src/hooks/useProject.ts
import { useQuery } from '@tanstack/react-query';
import { projectsService } from '../api/projects.service';

export function useProject(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsService.get(id),
    enabled: !!id,
    // Poll every 4s while a step is running so the UI updates automatically
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data?.pipeline_state) return false;
      const ps = data.pipeline_state;
      const isRunning = [
        ps.step_style, ps.step_characters, ps.step_portraits,
        ps.step_chapters, ps.step_illustrations,
      ].some((s) => s === 'running');
      return isRunning ? 4000 : false;
    },
  });
}
