import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home, Compass } from 'lucide-react';
import { usePersona } from '../hooks/usePersona';
import { useTheme } from '../hooks/useTheme';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, role } = usePersona();
  const { theme, toggleTheme } = useTheme();

  const handleReturn = () => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (role === 'customer') {
      navigate('/customer');
    } else {
      navigate('/tickets/ARV-101');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-subtle)] text-[var(--content)] flex flex-col justify-between p-6 transition-colors font-['Inter',sans-serif]">
      {/* Top Bar */}
      <header className="flex items-center justify-between max-w-5xl w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm font-bold text-sm">
            A
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-[13px] font-bold text-[var(--content)] tracking-tight font-['Archivo',sans-serif]">
                ARVO
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 font-mono">
                Frontdesk
              </span>
            </div>
            <span className="text-[10px] text-[var(--muted)] font-mono leading-none mt-1">
              Enterprise SLA Core
            </span>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)] text-[var(--muted)] hover:text-[var(--content)] transition-colors cursor-pointer"
          title="Toggle color theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      {/* Main 404 Card */}
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner">
            <Compass className="w-8 h-8 stroke-[1.75] animate-pulse" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>HTTP 404 · NOT FOUND</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--content)] font-['Archivo',sans-serif]">
              Destination Unreachable
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
              The requested route does not exist or requires authenticated credentials within the Arvo SLA workspace.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleReturn}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>{isAuthenticated ? 'Return to Workspace' : 'Sign In to Workspace'}</span>
            </button>
            <Link
              to="/customer"
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--surface-subtle)] hover:bg-[var(--border)] text-[var(--content)] border border-[var(--border)] text-xs font-semibold rounded-xl transition-all"
            >
              <span>Customer Portal</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] font-mono text-[var(--muted)]">
        Arvo Frontdesk · Deterministic Multi-Tenant SLA Operations · ISO 27001 Compliant
      </footer>
    </div>
  );
};
