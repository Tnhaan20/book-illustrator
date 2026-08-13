// src/components/Header.tsx
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onGoHome: () => void;
}

export default function Header({ onGoHome }: HeaderProps) {
  const { logout, user } = useAuth();

  return (
    <header className="w-full bg-paper border-b border-ink/15 px-8 py-4 flex items-center justify-between">
      <button
        onClick={onGoHome}
        className="font-serif text-lg font-bold text-ink hover:text-ochre transition-colors focus:outline-none focus:ring-2 focus:ring-ochre rounded px-1 cursor-pointer"
      >
        Illustrator's Journal
      </button>

      <div className="flex items-center gap-4">
        {user && (
          <span className="font-sans text-xs text-ink/65 italic">
            Journal of "{user.name}"
          </span>
        )}
        <button
          onClick={logout}
          className="font-sans text-xs font-semibold text-ink/75 hover:text-rust transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-rust rounded px-1.5 py-1 cursor-pointer"
        >
          Sign Out
          <svg
            className="w-3.5 h-3.5 stroke-current fill-none stroke-[2]"
            viewBox="0 0 24 24"
          >
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </button>
      </div>
    </header>
  );
}
