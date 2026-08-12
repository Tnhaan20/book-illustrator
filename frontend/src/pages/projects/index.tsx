// src/pages/projects/index.tsx
import { useProjects } from '../../hooks/useProjects';
import type { StepProgress } from '../../types/pipeline';
import { STEP_ORDER } from '../../types/pipeline';

interface ProjectsListProps {
  onSelectProject: (id: string) => void;
  onCreateNew: () => void;
}

export default function ProjectsList({ onSelectProject, onCreateNew }: ProjectsListProps) {
  const { data: projects, isLoading, error } = useProjects();

  const getStepIndex = (progress: StepProgress | null): number => {
    if (!progress) return 0;
    let doneCount = 0;
    for (const key of STEP_ORDER) {
      if (progress[`step_${key}` as keyof StepProgress] === 'done') {
        doneCount++;
      } else {
        break;
      }
    }
    return doneCount;
  };

  const getStageLabel = (progress: StepProgress | null, overallStatus: string): string => {
    if (overallStatus === 'done') return 'Done';
    if (!progress) return 'Research';
    
    // Find first step that is not 'done'
    for (const key of STEP_ORDER) {
      const status = progress[`step_${key}` as keyof StepProgress];
      if (status !== 'done') {
        switch (key) {
          case 'style': return 'Research';
          case 'characters': return 'Drafting';
          case 'portraits': return 'Inking';
          case 'chapters': return 'Composition';
          case 'illustrations': return 'Rendering';
          default: return 'Research';
        }
      }
    }
    return 'Archived';
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const m = months[date.getMonth()];
      const d = String(date.getDate()).padStart(2, '0');
        
      const y = date.getFullYear();
      return `${m} ${d}, ${y}`;
    } catch {
      return 'Oct 12, 1894';
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 bg-paper px-12 py-16 flex items-center justify-center font-sans text-ink/60">
        Loading journal entries...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 bg-paper px-12 py-16 flex flex-col items-center justify-center font-sans">
        <p className="text-rust font-bold">Failed to load projects</p>
        <p className="text-xs text-ink/60 mt-1">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-paper px-12 py-10 flex flex-col gap-8 min-h-screen">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-4xl font-medium text-ink leading-tight">
            Active Projects
          </h2>
          <p className="font-sans text-sm text-ink/65 mt-1">
            A curated overview of ongoing botanical and narrative illustration works.
          </p>
        </div>

        <button
          onClick={onCreateNew}
          className="bg-ink hover:bg-ink/90 text-paper font-sans text-xs font-semibold px-5 py-2.5 rounded flex items-center gap-1.5 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ochre cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 stroke-current fill-none stroke-[2]" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Project
        </button>
      </div>

      {/* Grid */}
      {projects && projects.length === 0 ? (
        <div className="border border-dashed border-ink/15 rounded-lg p-16 flex flex-col items-center justify-center text-center bg-sage/10">
          <svg className="w-12 h-12 stroke-ink/30 fill-none stroke-[1.2] mb-3" viewBox="0 0 24 24">
            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="font-serif text-lg text-ink/70">No active field notebooks</p>
          <p className="font-sans text-xs text-ink/50 mt-1 mb-6">Create a project to start illustrating your manuscript.</p>
          <button
            onClick={onCreateNew}
            className="border border-ink/20 hover:border-ink hover:bg-ink/5 text-ink font-sans text-xs font-semibold px-4 py-2 rounded transition-colors"
          >
            Create First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects?.map((project) => {
            const stepIndex = getStepIndex(project.progress);
            const stageLabel = getStageLabel(project.progress, project.status);
            
            // Map statuses to styling
            const statusStyles = {
              draft: 'bg-sage/60 border-ink/10 text-ink/75',
              in_progress: 'bg-ochre/10 border-ochre/30 text-ochre',
              done: 'bg-moss/10 border-moss/30 text-moss',
            };

            return (
              <div
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className="bg-sage/35 border border-ink/10 hover:border-ink/25 rounded-lg p-6 flex flex-col justify-between h-[230px] cursor-pointer hover:bg-sage/45 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] group"
              >
                <div>
                  {/* Top Meta info */}
                  <div className="flex items-center justify-between mb-3.5">
                    <span className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-sm ${statusStyles[project.status] || statusStyles.draft}`}>
                      {project.status.replace('_', ' ')}
                    </span>
                    <span className="font-sans text-[10px] text-ink/40">
                      {formatDate(project.created_at)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-serif text-xl font-medium text-ink group-hover:text-ochre transition-colors line-clamp-2">
                    {project.title}
                  </h3>

                  {/* Dummy/Style description to fill space */}
                  <p className="font-sans text-xs text-ink/60 mt-2 line-clamp-3 leading-relaxed">
                    Notebook containing manuscript illustrations, character profiling, and stylistic studies.
                  </p>
                </div>

                {/* Bottom Step visualizer */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[10px] font-sans text-ink/50 mb-1.5 font-medium">
                    <span>Stage {stepIndex} of 5</span>
                    <span className="text-ochre font-semibold">{stageLabel}</span>
                  </div>

                  {/* 5-bar step indicators */}
                  <div className="flex gap-1.5 h-1.5 w-full">
                    {STEP_ORDER.map((stepKey, idx) => {
                      // Determine bar color:
                      // completed = moss
                      // active = ochre
                      // future = gray/sage
                      let barColor = 'bg-ink/10';
                      if (project.progress) {
                        const stepVal = project.progress[`step_${stepKey}` as keyof StepProgress];
                        if (stepVal === 'done') {
                          barColor = 'bg-moss';
                        } else if (stepVal === 'running') {
                          barColor = 'bg-ochre animate-pulse';
                        } else if (idx === stepIndex && project.status !== 'done') {
                          barColor = 'bg-ochre';
                        }
                      } else if (idx === 0 && project.status !== 'done') {
                        barColor = 'bg-ochre';
                      }

                      return (
                        <div
                          key={stepKey}
                          className={`flex-1 rounded-sm ${barColor} transition-colors`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
