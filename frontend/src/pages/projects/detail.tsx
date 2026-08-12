// src/pages/projects/detail.tsx
import { useState } from 'react';
import { useProject } from '../../hooks/useProject';
import { useRunStep, useRetryStep } from '../../hooks/useSteps';
import type { StepName, StepStatus, PipelineState } from '../../types/pipeline';
import { STEP_ORDER } from '../../types/pipeline';

interface ProjectDetailProps {
  projectId: string;
  onGoBack: () => void;
}

export default function ProjectDetail({ projectId, onGoBack }: ProjectDetailProps) {
  const { data: project, isLoading, error } = useProject(projectId);
  const runStepMutation = useRunStep(projectId);
  const retryStepMutation = useRetryStep(projectId);
  // True while any mutation is in-flight — blocks double-fire on any button
  const isMutating = runStepMutation.isPending || retryStepMutation.isPending;
  
  // UI states
  const [activeStepTab, setActiveStepTab] = useState<StepName>('style');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showContextModal, setShowContextModal] = useState(false);
  const [customStyleText, setCustomStyleText] = useState('');

  if (isLoading) {
    return (
      <div className="flex-1 bg-paper px-12 py-16 flex items-center justify-center font-sans text-ink/60">
        Opening ledger...
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex-1 bg-paper px-12 py-16 flex flex-col items-center justify-center font-sans">
        <p className="text-rust font-bold">Failed to load project details</p>
        <p className="text-xs text-ink/60 mt-1">{(error as Error)?.message || 'Project not found'}</p>
        <button
          onClick={onGoBack}
          className="mt-6 border border-ink/20 hover:bg-ink/5 text-ink font-sans text-xs font-semibold px-4 py-2 rounded"
        >
          Return to Projects
        </button>
      </div>
    );
  }

  const pipeline = project.pipeline_state;

  const getStepStatus = (step: StepName): StepStatus => {
    if (!pipeline) return 'pending';
    return pipeline[`step_${step}` as keyof PipelineState] as StepStatus;
  };

  const getStepLabel = (step: StepName): string => {
    switch (step) {
      case 'style': return 'Style';
      case 'characters': return 'Characters';
      case 'portraits': return 'Portraits';
      case 'chapters': return 'Chapters';
      case 'illustrations': return 'Illustrations';
    }
  };

  const getStepDescription = (step: StepName): string => {
    switch (step) {
      case 'style': return 'Define the visual direction, color palette, and mood of the book.';
      case 'characters': return 'Analyze the manuscript to extract primary subjects and their visual descriptions.';
      case 'portraits': return 'Translate defined character traits into visual archetypes using the established style.';
      case 'chapters': return 'Identify the most visually dramatic chapter scene for full-page illustration.';
      case 'illustrations': return 'Generate final thematic landscape illustrations based on the chosen scenes.';
    }
  };

  const handleRunStep = (step: StepName) => {
    const body = step === 'style' && customStyleText.trim() ? { style: customStyleText.trim() } : undefined;
    runStepMutation.mutate({ step, body });
  };

  const handleRetryStep = (step: StepName) => {
    retryStepMutation.mutate(step);
  };

  // Determine current active pipeline step
  const currentPipelineStep = (): StepName => {
    if (!pipeline) return 'style';
    for (const step of STEP_ORDER) {
      if (getStepStatus(step) !== 'done') return step;
    }
    return 'illustrations';
  };

  const isStepDisabled = (step: StepName): boolean => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx === 0) return false;
    // Disabled if previous step is not 'done'
    const prevStep = STEP_ORDER[idx - 1];
    return getStepStatus(prevStep) !== 'done';
  };

  const renderStepContent = (step: StepName) => {
    const status = getStepStatus(step);

    if (status === 'running') {
      return (
        <div className="flex flex-col items-center justify-center p-16 border border-ink/10 rounded-lg bg-sage/10 text-center">
          <div className="w-8 h-8 border-2 border-ochre border-t-transparent rounded-full animate-spin mb-4" />
          <h4 className="font-serif text-lg font-medium text-ink">Analyzing manuscript...</h4>
          <p className="font-sans text-xs text-ink/50 mt-1">This may take a few moments as the AI reads the page.</p>
        </div>
      );
    }

    if (status === 'failed') {
      return (
        <div className="p-8 border border-rust/30 bg-rust/5 rounded-lg flex flex-col items-start gap-4">
          <div>
            <h4 className="font-serif text-lg font-medium text-rust">Step Execution Failed</h4>
            <p className="font-sans text-xs text-ink/60 mt-1">
              The AI generation pipeline encountered a minor setback. You can attempt to retry the step.
            </p>
          </div>
          <button
            onClick={() => handleRetryStep(step)}
            disabled={isMutating}
            className="bg-rust hover:bg-rust/90 text-white font-sans text-xs font-bold px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isMutating ? (
              <><div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> Retrying...</>
            ) : 'Retry Step'}
          </button>
        </div>
      );
    }

    // Done or Pending view based on step
    switch (step) {
      case 'style':
        return (
          <div className="flex flex-col gap-6">
            {status === 'done' ? (
              <div className="bg-sage/20 border border-ink/10 p-6 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 stroke-moss fill-none stroke-[2]" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <h4 className="font-serif text-lg font-medium text-ink">Art Director's Guide</h4>
                </div>
                <p className="font-serif text-base italic text-ink/80 leading-relaxed">
                  "{project.style}"
                </p>
              </div>
            ) : status === 'pending' ? (
              <div className="border border-ink/10 p-6 rounded-lg bg-sage/5 flex flex-col gap-4">
                <p className="font-sans text-sm text-ink/65">
                  Let Gemini analyze the text and outline a visual direction. You can optionally suggest a hint below.
                </p>
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-xs font-semibold text-ink uppercase tracking-wide">
                    Style Preference Hint (Optional)
                  </label>
                  <input
                    type="text"
                    value={customStyleText}
                    onChange={(e) => setCustomStyleText(e.target.value)}
                    placeholder="e.g., watercolor, woodcut print, monochrome pencil drawing"
                    disabled={isMutating}
                    className="px-3 py-2 bg-paper border border-ink/20 rounded font-sans text-sm placeholder:text-ink/30 text-ink focus:outline-none focus:border-ochre disabled:opacity-50"
                  />
                </div>
                <button
                  onClick={() => handleRunStep('style')}
                  disabled={isStepDisabled('style') || isMutating}
                  className="w-fit bg-ink hover:bg-ink/90 text-paper font-sans text-xs font-bold px-5 py-2.5 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isMutating ? <><div className="w-3 h-3 border border-paper border-t-transparent rounded-full animate-spin" /> Processing...</> : 'Process Style'}
                </button>
              </div>
            ) : null}
          </div>
        );

      case 'characters':
        return (
          <div className="flex flex-col gap-6">
            {status === 'done' ? (
              project.characters.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {project.characters.map((char) => (
                    <div key={char.id} className="bg-sage/20 border border-ink/10 p-6 rounded-lg flex flex-col gap-2">
                      <span className="font-sans text-[10px] uppercase font-bold tracking-widest text-ochre">Subject Profile</span>
                      <h4 className="font-serif text-xl font-medium text-ink">{char.name}</h4>
                      <p className="font-sans text-xs text-ink/65 leading-relaxed">{char.prompt}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 border border-moss/20 bg-moss/5 rounded-lg font-sans text-sm text-ink/60">
                  Step completed — no character profiles were identified in the manuscript.
                </div>
              )
            ) : status === 'pending' ? (
              <div className="border border-ink/10 p-6 rounded-lg bg-sage/5 flex flex-col gap-4">
                <p className="font-sans text-sm text-ink/65">Identify and define the key subjects from the manuscript.</p>
                <button
                  onClick={() => handleRunStep('characters')}
                  disabled={isStepDisabled('characters') || isMutating}
                  className="w-fit bg-ink hover:bg-ink/90 text-paper font-sans text-xs font-bold px-5 py-2.5 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isMutating ? <><div className="w-3 h-3 border border-paper border-t-transparent rounded-full animate-spin" /> Processing...</> : 'Identify Characters'}
                </button>
              </div>
            ) : null}
          </div>
        );

      case 'portraits':
        return (
          <div className="flex flex-col gap-6">
            {status === 'done' && project.characters.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {project.characters.map((char) => {
                  const isCharDone = char.status === 'done' && char.portrait_path;
                  return (
                    <div key={char.id} className="bg-sage/20 border border-ink/10 p-5 rounded-lg flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-serif text-lg font-medium text-ink">{char.name}</h4>
                          <span className="font-sans text-[10px] text-ink/50 uppercase tracking-wide">Character Subject</span>
                        </div>
                        <span className={`font-sans text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-sm ${
                          isCharDone ? 'bg-moss/10 border-moss/30 text-moss' : 'bg-ochre/10 border-ochre/30 text-ochre'
                        }`}>
                          {isCharDone ? 'Render Complete' : 'Pending Render'}
                        </span>
                      </div>

                      {/* Portrait Container */}
                      <div className="aspect-square w-full border border-ink/10 rounded bg-paper/60 flex items-center justify-center overflow-hidden">
                        {isCharDone ? (
                          <img
                            src={`/${char.portrait_path}`}
                            alt={char.name}
                            className="w-full h-full object-cover select-none"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center p-6 text-ink/35">
                            <svg className="w-8 h-8 stroke-current fill-none stroke-[1.2] mb-1.5" viewBox="0 0 24 24">
                              <circle cx="12" cy="10" r="4" />
                              <path d="M6 21v-1a4 4 0 014-4h4a4 4 0 014 4v1" />
                            </svg>
                            <span className="font-sans text-xs">Awaiting Rendering</span>
                          </div>
                        )}
                      </div>

                      <p className="font-sans text-xs text-ink/60 line-clamp-2 italic">
                        "{char.prompt}"
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : status === 'pending' ? (
              <div className="border border-ink/10 p-6 rounded-lg bg-sage/5 flex flex-col gap-4">
                <p className="font-sans text-sm text-ink/65">Generate portrait sketches from the identified character profiles.</p>
                <button
                  onClick={() => handleRunStep('portraits')}
                  disabled={isStepDisabled('portraits') || isMutating}
                  className="w-fit bg-ink hover:bg-ink/90 text-paper font-sans text-xs font-bold px-5 py-2.5 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isMutating ? <><div className="w-3 h-3 border border-paper border-t-transparent rounded-full animate-spin" /> Processing...</> : 'Process Portraits'}
                </button>
              </div>
            ) : null}
          </div>
        );

      case 'chapters':
        return (
          <div className="flex flex-col gap-6">
            {status === 'done' ? (
              project.chapters.length > 0 ? (
                <div className="bg-sage/20 border border-ink/10 p-6 rounded-lg flex flex-col gap-2">
                  <span className="font-sans text-[10px] uppercase font-bold tracking-widest text-ochre">Thematic Chapter Scene</span>
                  <h4 className="font-serif text-xl font-medium text-ink">{project.chapters[0].name}</h4>
                  <p className="font-sans text-xs text-ink/65 leading-relaxed">{project.chapters[0].prompt}</p>
                </div>
              ) : (
                <div className="p-6 border border-moss/20 bg-moss/5 rounded-lg font-sans text-sm text-ink/60">
                  Step completed — no chapter scenes were identified.
                </div>
              )
            ) : status === 'pending' ? (
              <div className="border border-ink/10 p-6 rounded-lg bg-sage/5 flex flex-col gap-4">
                <p className="font-sans text-sm text-ink/65">Identify the most visually dramatic chapter scene for illustration.</p>
                <button
                  onClick={() => handleRunStep('chapters')}
                  disabled={isStepDisabled('chapters') || isMutating}
                  className="w-fit bg-ink hover:bg-ink/90 text-paper font-sans text-xs font-bold px-5 py-2.5 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isMutating ? <><div className="w-3 h-3 border border-paper border-t-transparent rounded-full animate-spin" /> Processing...</> : 'Identify Chapter Scene'}
                </button>
              </div>
            ) : null}
          </div>
        );

      case 'illustrations':
        return (
          <div className="flex flex-col gap-6">
            {status === 'done' && project.chapters.length > 0 ? (
              <div className="grid grid-cols-1 gap-6">
                {project.chapters.map((ch) => {
                  const isChDone = ch.status === 'done' && ch.illustration_path;
                  return (
                    <div key={ch.id} className="bg-sage/20 border border-ink/10 p-5 rounded-lg flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-serif text-lg font-medium text-ink">{ch.name}</h4>
                          <span className="font-sans text-[10px] text-ink/50 uppercase tracking-wide">Scene Specimen</span>
                        </div>
                        <span className={`font-sans text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-sm ${
                          isChDone ? 'bg-moss/10 border-moss/30 text-moss' : 'bg-ochre/10 border-ochre/30 text-ochre'
                        }`}>
                          {isChDone ? 'Render Complete' : 'Pending Render'}
                        </span>
                      </div>

                      {/* Illustration image container */}
                      <div className="aspect-video w-full border border-ink/10 rounded bg-paper/60 flex items-center justify-center overflow-hidden">
                        {isChDone ? (
                          <img
                            src={`/${ch.illustration_path}`}
                            alt={ch.name}
                            className="w-full h-full object-cover select-none"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center p-6 text-ink/35">
                            <svg className="w-8 h-8 stroke-current fill-none stroke-[1.2] mb-1.5" viewBox="0 0 24 24">
                              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="font-sans text-xs">Awaiting Illustration Rendering</span>
                          </div>
                        )}
                      </div>

                      <p className="font-sans text-xs text-ink/60 line-clamp-2 italic">
                        "{ch.prompt}"
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : status === 'pending' ? (
              <div className="border border-ink/10 p-6 rounded-lg bg-sage/5 flex flex-col gap-4">
                <p className="font-sans text-sm text-ink/65">Generate landscape art for the selected chapter scene.</p>
                <button
                  onClick={() => handleRunStep('illustrations')}
                  disabled={isStepDisabled('illustrations') || isMutating}
                  className="w-fit bg-ink hover:bg-ink/90 text-paper font-sans text-xs font-bold px-5 py-2.5 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isMutating ? <><div className="w-3 h-3 border border-paper border-t-transparent rounded-full animate-spin" /> Processing...</> : 'Generate Illustrations'}
                </button>
              </div>
            ) : null}
          </div>
        );
    }
  };

  return (
    <div className="flex-1 bg-paper min-h-screen flex flex-col">
      {/* Detail Header Subbar */}
      <div className="px-8 py-3.5 border-b border-ink/10 flex items-center justify-between bg-sage/10 text-xs font-sans">
        <div className="flex items-center gap-2">
          <button
            onClick={onGoBack}
            className="text-ink/60 hover:text-ink flex items-center gap-1 focus:outline-none"
          >
            ← Notebooks
          </button>
          <span className="text-ink/20">/</span>
          <span className="text-ink font-semibold truncate max-w-[200px]">{project.title}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Layout Toggle */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="border border-ink/15 hover:bg-ink/5 px-2.5 py-1 rounded text-ink/80 transition-colors cursor-pointer"
          >
            {showSidebar ? 'Hide Sidebar' : 'Show Sidebar'}
          </button>

          {/* Context Modal Trigger */}
          <button
            onClick={() => setShowContextModal(true)}
            className="border border-ink/15 hover:bg-ink/5 px-2.5 py-1 rounded text-ink/80 transition-colors cursor-pointer flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5 stroke-current fill-none stroke-[2]" viewBox="0 0 24 24">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Context
          </button>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* SIDEBAR LAYOUT */}
        {showSidebar && (
          <aside className="w-full md:w-64 border-r border-ink/10 bg-sage/5 p-6 flex flex-col gap-6">
            <div>
              <h3 className="font-serif text-lg font-bold text-ink">Project Progress</h3>
              <p className="font-sans text-[10px] text-ink/50 uppercase tracking-widest">Field Documentation</p>
            </div>

            <nav className="flex flex-col gap-2.5">
              {STEP_ORDER.map((step) => {
                const status = getStepStatus(step);
                const isActive = activeStepTab === step;
                
                // Color configuration:
                // done = Moss, current active = Ochre, future = Sage/gray
                let badgeStyle = 'bg-ink/5 text-ink/40';
                if (status === 'done') {
                  badgeStyle = 'bg-moss/10 text-moss font-semibold';
                } else if (status === 'running' || step === currentPipelineStep()) {
                  badgeStyle = 'bg-ochre/15 text-ochre font-bold';
                }

                return (
                  <button
                    key={step}
                    onClick={() => setActiveStepTab(step)}
                    className={`w-full text-left p-3 rounded border transition-all text-xs font-sans cursor-pointer flex items-center justify-between ${
                      isActive
                        ? 'border-ochre bg-ochre/10 shadow-sm'
                        : 'border-ink/5 hover:border-ink/15 hover:bg-ink/5'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className={`font-semibold ${isActive ? 'text-ink' : 'text-ink/80'}`}>
                        {getStepLabel(step)}
                      </span>
                      {status === 'running' && (
                        <span className="text-[9px] text-ochre font-medium animate-pulse mt-0.5">
                          Generating visuals
                        </span>
                      )}
                    </div>

                    {/* Badge Indicator */}
                    <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded-sm font-semibold ${badgeStyle}`}>
                      {status}
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>
        )}

        {/* WORKSPACE CONTENT PANEL */}
        <main className="flex-1 p-8 md:p-12 flex flex-col gap-6 bg-paper">
          
          {/* HORIZONTAL STEPPER LAYOUT (If sidebar is hidden) */}
          {!showSidebar && (
            <div className="border border-ink/10 rounded-lg p-5 bg-sage/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
              <div>
                <h4 className="font-serif text-lg font-bold text-ink">Project Progress</h4>
                <p className="font-sans text-[10px] text-ink/50 uppercase tracking-widest">Pipeline Stepper</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {STEP_ORDER.map((step) => {
                  const status = getStepStatus(step);
                  const isCurrent = step === currentPipelineStep();
                  const isTabActive = activeStepTab === step;
                  
                  let stepStyle = 'border-ink/10 text-ink/50 bg-paper/50';
                  if (status === 'done') {
                    stepStyle = 'border-moss/45 bg-moss/5 text-moss font-semibold';
                  } else if (isCurrent) {
                    stepStyle = 'border-ochre bg-ochre/5 text-ochre font-bold';
                  }

                  return (
                    <button
                      key={step}
                      onClick={() => setActiveStepTab(step)}
                      className={`text-xs font-sans px-3.5 py-2 border rounded-md transition-all cursor-pointer ${stepStyle} ${
                        isTabActive ? 'ring-2 ring-ochre' : ''
                      }`}
                    >
                      {getStepLabel(step)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Heading Area */}
          <div>
            <h3 className="font-serif text-3xl font-medium text-ink leading-tight">
              {getStepLabel(activeStepTab)} Generation
            </h3>
            <p className="font-sans text-sm text-ink/65 mt-1 leading-relaxed max-w-2xl">
              {getStepDescription(activeStepTab)}
            </p>
          </div>

          {/* Render Step Action/Result UI */}
          <div className="mt-2">
            {renderStepContent(activeStepTab)}
          </div>
        </main>
      </div>

      {/* Manuscript Context Modal */}
      {showContextModal && (
        <div className="fixed inset-0 bg-ink/40 z-50 flex items-center justify-center p-4">
          <div className="bg-paper border border-ink/15 rounded-lg max-w-2xl w-full flex flex-col max-h-[85vh] shadow-lg animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between bg-sage/5">
              <div>
                <h3 className="font-serif text-xl font-bold text-ink">Manuscript Log</h3>
                <p className="font-sans text-[10px] text-ink/50 uppercase tracking-widest">Original Source Text</p>
              </div>
              <button
                onClick={() => setShowContextModal(false)}
                className="text-ink/60 hover:text-ink font-sans text-xs font-semibold focus:outline-none cursor-pointer"
              >
                Close
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 font-serif text-base text-ink/85 leading-relaxed whitespace-pre-wrap">
              {project.book_text || 'No manuscript content available.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
