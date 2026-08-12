// src/App.tsx
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import Login from './pages/login';
import ProjectsList from './pages/projects';
import NewProject from './pages/projects/new';
import ProjectDetail from './pages/projects/detail';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

type ViewState =
  | { name: 'list' }
  | { name: 'new-project' }
  | { name: 'detail'; projectId: string };

function MainAppContent() {
  const { user } = useAuth();
  const [view, setView] = useState<ViewState>({ name: 'list' });

  // If user is not logged in, force Login screen
  if (!user) {
    return <Login onSuccess={() => setView({ name: 'list' })} />;
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Shared Header */}
      <Header onGoHome={() => setView({ name: 'list' })} />

      {/* Main content routing switcher */}
      <div className="flex-1 flex flex-col">
        {view.name === 'list' && (
          <ProjectsList
            onSelectProject={(projectId) => setView({ name: 'detail', projectId })}
            onCreateNew={() => setView({ name: 'new-project' })}
          />
        )}

        {view.name === 'new-project' && (
          <NewProject
            onSuccess={(projectId) => setView({ name: 'detail', projectId })}
            onCancel={() => setView({ name: 'list' })}
          />
        )}

        {view.name === 'detail' && (
          <ProjectDetail
            projectId={view.projectId}
            onGoBack={() => setView({ name: 'list' })}
          />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}
