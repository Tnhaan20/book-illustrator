import React from 'react';
import type { StepStatus } from '../types/pipeline';

interface StepButtonProps {
  status: StepStatus;
  isMutating: boolean;
  disabled?: boolean;
  onRun: () => void;
  onRetry: () => void;
  runLabel: string;
  retryLabel?: string;
}

export function StepButton({
  status,
  isMutating,
  disabled = false,
  onRun,
  onRetry,
  runLabel,
  retryLabel = 'Retry Step',
}: StepButtonProps) {
  if (status === 'done') {
    return (
      <div className="flex items-center gap-1.5 text-moss font-sans text-xs font-semibold" data-testid="step-done-indicator">
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
        <span>Complete</span>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <button
        onClick={onRetry}
        disabled={isMutating}
        className="bg-rust hover:bg-rust/90 text-white font-sans text-xs font-bold px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
        data-testid="step-retry-button"
      >
        {isMutating ? (
          <>
            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
            Retrying...
          </>
        ) : (
          retryLabel
        )}
      </button>
    );
  }

  // running or pending status
  const isLoading = status === 'running' || isMutating;

  return (
    <button
      onClick={onRun}
      disabled={disabled || isLoading}
      className="w-fit bg-ink hover:bg-ink/90 text-paper font-sans text-xs font-bold px-5 py-2.5 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
      data-testid="step-run-button"
    >
      {isLoading ? (
        <>
          <div className="w-3 h-3 border border-paper border-t-transparent rounded-full animate-spin" />
          Processing...
        </>
      ) : (
        runLabel
      )}
    </button>
  );
}
