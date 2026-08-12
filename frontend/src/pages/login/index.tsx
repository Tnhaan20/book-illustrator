// src/pages/login/index.tsx
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../api/auth.service';

interface LoginProps {
  onSuccess: () => void;
}

export default function Login({ onSuccess }: LoginProps) {
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Please fill in both name and email.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const user = await authService.login({ name: name.trim(), email: email.trim() });
      login(user);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dot-grid flex items-center justify-center p-4">
      {/* Central Login Card */}
      <div className="w-full max-w-md bg-paper border border-ink/10 rounded-lg p-8 shadow-sm flex flex-col items-center">
        {/* Logo Icon */}
        <div className="text-ink mb-4">
          <svg
            className="w-10 h-10 stroke-current fill-none stroke-[1.5]"
            viewBox="0 0 24 24"
          >
            {/* Two crossed quill pens / brushes matching the logo in screenshot */}
            <path d="M4 20l6-6M20 4l-6 6" />
            <path d="M14 6l4 4M6 14l4 4" />
            <path d="M11.5 8.5c1-1 2.5-.5 3.5.5s1.5 2.5.5 3.5l-6.5 6.5-3.5 1 1-3.5 6.5-6.5z" />
          </svg>
        </div>

        {/* Heading */}
        <h1 className="font-serif text-3xl font-medium text-ink text-center leading-tight">
          Illustrator's Journal
        </h1>
        <p className="font-sans text-xs tracking-wider uppercase text-ink/60 mt-1 mb-8 text-center">
          Field Documentation Portal
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
          {error && (
            <div className="bg-rust/10 border border-rust text-rust text-xs p-3 rounded font-sans">
              {error}
            </div>
          )}

          {/* Name Field */}
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-xs font-semibold text-ink uppercase tracking-wide">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              disabled={loading}
              className="w-full px-3.5 py-2.5 bg-paper border border-ink/25 rounded font-sans text-sm placeholder:text-ink/40 text-ink focus:outline-none focus:border-ochre focus:ring-2 focus:ring-ochre/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Email Field */}
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-xs font-semibold text-ink uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              disabled={loading}
              className="w-full px-3.5 py-2.5 bg-paper border border-ink/25 rounded font-sans text-sm placeholder:text-ink/40 text-ink focus:outline-none focus:border-ochre focus:ring-2 focus:ring-ochre/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="mt-4 font-sans text-xs font-bold tracking-widest text-ink uppercase hover:text-ochre transition-colors flex items-center justify-center gap-2 py-2.5 focus:outline-none focus:ring-2 focus:ring-ochre rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-ink"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-ink/40 border-t-ink rounded-full animate-spin" />
                AUTHENTICATING...
              </>
            ) : 'LOGIN →'}
          </button>
        </form>

        {/* Bottom Small Text */}
        <div className="w-full border-t border-ink/10 mt-8 pt-4 text-center">
          <span className="font-sans text-[10px] text-ink/40 uppercase tracking-widest">
            Archival Access Request
          </span>
        </div>
      </div>
    </div>
  );
}
