import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProjectsList from '../src/pages/projects';
import { useProjects } from '../src/hooks/useProjects';

// Mock the useProjects hook
vi.mock('../src/hooks/useProjects', () => ({
  useProjects: vi.fn(),
}));

describe('ProjectsList Component', () => {
  it('renders an empty state with a "New project" call-to-action when given an empty projects array', () => {
    // Mock the hook to return an empty array
    vi.mocked(useProjects).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    const handleSelectProject = vi.fn();
    const handleCreateNew = vi.fn();

    render(
      <ProjectsList
        onSelectProject={handleSelectProject}
        onCreateNew={handleCreateNew}
      />
    );

    // Verify empty state text
    expect(screen.getByText('No active field notebooks')).toBeInTheDocument();
    expect(screen.getByText('Create a project to start illustrating your manuscript.')).toBeInTheDocument();

    // Verify the "Create First Project" call-to-action button is present
    const ctaButton = screen.getByRole('button', { name: 'Create First Project' });
    expect(ctaButton).toBeInTheDocument();

    // Click it and check callback
    fireEvent.click(ctaButton);
    expect(handleCreateNew).toHaveBeenCalledTimes(1);
  });
});
