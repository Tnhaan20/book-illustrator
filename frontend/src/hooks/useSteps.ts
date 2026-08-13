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
    // Step 1: reset the step to 'pending' via the retry endpoint
    mutationFn: (step: StepName) => stepsService.retry(projectId, step),
    onSuccess: (_data, step) => {
      // Step 2: immediately fire the run endpoint so it auto-advances.
      // We don't await this — the polling in useProject will pick up the new state.
      void stepsService.run(projectId, step).then(() => {
        void qc.invalidateQueries({ queryKey: ['project', projectId] });
      });
      void qc.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

