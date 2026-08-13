import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StepButton } from '../src/components/StepButton';

describe('StepButton Component', () => {
  it('renders with run label and is enabled when status is pending', () => {
    const handleRun = vi.fn();
    const handleRetry = vi.fn();

    render(
      <StepButton
        status="pending"
        isMutating={false}
        onRun={handleRun}
        onRetry={handleRetry}
        runLabel="Process Style"
      />
    );

    const button = screen.getByTestId('step-run-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Process Style');
    expect(button).not.toBeDisabled();

    fireEvent.click(button);
    expect(handleRun).toHaveBeenCalledTimes(1);
  });

  it('renders disabled/loading state when status is running and is not clickable', () => {
    const handleRun = vi.fn();
    const handleRetry = vi.fn();

    render(
      <StepButton
        status="running"
        isMutating={false}
        onRun={handleRun}
        onRetry={handleRetry}
        runLabel="Process Style"
      />
    );

    const button = screen.getByTestId('step-run-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Processing...');
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(handleRun).not.toHaveBeenCalled();
  });

  it('renders disabled/loading state when isMutating is true and is not clickable', () => {
    const handleRun = vi.fn();
    const handleRetry = vi.fn();

    render(
      <StepButton
        status="pending"
        isMutating={true}
        onRun={handleRun}
        onRetry={handleRetry}
        runLabel="Process Style"
      />
    );

    const button = screen.getByTestId('step-run-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Processing...');
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(handleRun).not.toHaveBeenCalled();
  });

  it('is shown as a completed indicator when status is done', () => {
    const handleRun = vi.fn();
    const handleRetry = vi.fn();

    render(
      <StepButton
        status="done"
        isMutating={false}
        onRun={handleRun}
        onRetry={handleRetry}
        runLabel="Process Style"
      />
    );

    const indicator = screen.getByTestId('step-done-indicator');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveTextContent('Complete');
    expect(screen.queryByTestId('step-run-button')).toBeNull();
  });

  it('renders Retry and is enabled when status is failed', () => {
    const handleRun = vi.fn();
    const handleRetry = vi.fn();

    render(
      <StepButton
        status="failed"
        isMutating={false}
        onRun={handleRun}
        onRetry={handleRetry}
        runLabel="Process Style"
        retryLabel="Retry Style"
      />
    );

    const button = screen.getByTestId('step-retry-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Retry Style');
    expect(button).not.toBeDisabled();

    fireEvent.click(button);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
