// src/hooks/useSteps.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { stepsService } from '../api/steps.service';
import type { StepName } from '../types/pipeline';

export function useRunStep(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ step, body }: { step: StepName; body?: Record<string, string> }) =>
      stepsService.run(projectId, step, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useRetryStep(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (step: StepName) => stepsService.retry(projectId, step),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}
