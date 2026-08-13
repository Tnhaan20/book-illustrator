// src/pages/projects/new.tsx
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsService } from '../../api/projects.service';

interface NewProjectProps {
  onSuccess: (projectId: string) => void;
  onCancel: () => void;
}

type TabType = 'paste' | 'upload';

export default function NewProject({ onSuccess, onCancel }: NewProjectProps) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('paste');
  const [pasteText, setPasteText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (formData: FormData) => projectsService.create(formData),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['projects'] });
      onSuccess(data.id);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!title.trim()) {
      setValidationError('Project title is required.');
      return;
    }

    const formData = new FormData();
    formData.append('title', title.trim());

    if (activeTab === 'paste') {
      if (!pasteText.trim()) {
        setValidationError('Please paste your book text manuscript.');
        return;
      }
      formData.append('text', pasteText.trim());
    } else {
      if (!file) {
        setValidationError('Please upload a .txt file manuscript.');
        return;
      }
      formData.append('file', file);
    }

    mutation.mutate(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div className="flex-1 bg-paper flex justify-center min-h-screen px-4 py-10">
      <div className="w-full max-w-2xl flex flex-col">
      {/* Header */}
      <div className="mb-8">
        <h2 className="font-serif text-4xl font-medium text-ink leading-tight">
          New Project
        </h2>
        <p className="font-sans text-sm text-ink/65 mt-1">
          Initialize a new field notebook.
        </p>
      </div>

      {/* Main Form container */}
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
        {validationError && (
          <div className="bg-rust/10 border border-rust text-rust text-xs p-3 rounded font-sans">
            {validationError}
          </div>
        )}
        {mutation.error && (
          <div className="bg-rust/10 border border-rust text-rust text-xs p-3 rounded font-sans">
            {(mutation.error as any).response?.data?.error || 'Failed to initialize project.'}
          </div>
        )}

        {/* Title Input */}
        <div className="flex flex-col gap-1.5">
          <label className="font-sans text-xs font-semibold text-ink uppercase tracking-wide">
            Project Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Flora of the Pacific Northwest"
            className="w-full px-3.5 py-2.5 bg-paper border border-ink/25 rounded font-sans text-sm placeholder:text-ink/30 text-ink focus:outline-none focus:border-ochre focus:ring-2 focus:ring-ochre/25 transition-all"
            disabled={mutation.isPending}
          />
        </div>



        {/* Source Material Tab Bar */}
        <div className="flex flex-col gap-2.5 mt-2">
          <div className="flex items-center justify-between border-b border-ink/10 pb-1">
            <span className="font-sans text-xs font-semibold text-ink uppercase tracking-wide">
              Source Material
            </span>
            <div className="flex items-center gap-4 text-xs font-sans">
              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                className={`pb-1 cursor-pointer font-medium ${
                  activeTab === 'paste'
                    ? 'text-ochre border-b-2 border-ochre font-bold'
                    : 'text-ink/50 hover:text-ink'
                }`}
                disabled={mutation.isPending}
              >
                Paste Text
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`pb-1 cursor-pointer font-medium ${
                  activeTab === 'upload'
                    ? 'text-ochre border-b-2 border-ochre font-bold'
                    : 'text-ink/50 hover:text-ink'
                }`}
                disabled={mutation.isPending}
              >
                Upload .txt
              </button>
            </div>
          </div>

          {/* Paste Tab Content */}
          {activeTab === 'paste' ? (
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste your field notes or manuscript here..."
              rows={8}
              className="w-full px-3.5 py-3 bg-paper border border-ink/25 rounded font-sans text-sm placeholder:text-ink/30 text-ink focus:outline-none focus:border-ochre focus:ring-2 focus:ring-ochre/25 transition-all resize-y"
              disabled={mutation.isPending}
            />
          ) : (
            /* Upload Tab Content */
            <div className="border border-dashed border-ink/25 rounded-md p-8 flex flex-col items-center justify-center bg-sage/5 relative hover:bg-sage/10 transition-colors">
              <input
                type="file"
                accept=".txt"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={mutation.isPending}
              />
              <svg className="w-8 h-8 stroke-ink/35 fill-none stroke-[1.5] mb-2" viewBox="0 0 24 24">
                <path d="M12 10v9m0-9l-3 3m3-3l3 3M4 17a4 4 0 01-4-4V5a4 4 0 014-4h10l6 6v7a4 4 0 01-4 4h-2" />
              </svg>
              <p className="font-sans text-xs text-ink/75 font-semibold">
                {file ? file.name : 'Select or drag a .txt manuscript'}
              </p>
              <p className="font-sans text-[10px] text-ink/40 mt-1">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Plain text file up to 5MB'}
              </p>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 mt-6 border-t border-ink/10 pt-6">
          <button
            type="button"
            onClick={onCancel}
            className="border border-ink/15 hover:border-ink/30 text-ink/80 font-sans text-xs font-semibold px-5 py-2.5 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-ochre cursor-pointer"
            disabled={mutation.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-ink hover:bg-ink/95 text-paper font-sans text-xs font-bold px-6 py-2.5 rounded flex items-center gap-1.5 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ochre cursor-pointer"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Initializing...' : '+ Initialize Project'}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}
