import React from 'react';
import { usePersona } from '../hooks/usePersona';
import { useNavigate } from 'react-router-dom';
import { Users, LogIn, LogOut } from 'lucide-react';

export const PersonaSwitcher: React.FC = () => {
  const { mode, agentId, setAgentPersona, setCustomerPersona, logout } = usePersona();
  const navigate = useNavigate();

  const handleAgentSelect = async (id: string) => {
    await setAgentPersona(id);
    navigate('/');
  };

  const handleCustomerSelect = async () => {
    await setCustomerPersona();
    navigate('/customer');
  };

  const personas = [
    { id: 'agent-meera', label: 'Meera (Lead)' },
    { id: 'agent-rahul', label: 'Rahul' },
    { id: 'agent-priya', label: 'Priya' },
  ];

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center bg-[var(--surface-subtle)] p-0.5 rounded-lg border border-[var(--border)]">
        {/* Agents */}
        <div className="flex items-center gap-0.5">
          {personas.map((p) => {
            const isActive = mode === 'agent' && agentId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleAgentSelect(p.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[var(--surface)] text-[var(--content)] font-semibold shadow-xs ring-1 ring-black/5'
                    : 'text-[var(--muted)] hover:text-[var(--content)] hover:bg-[var(--surface)]/50'
                }`}
                title={`Switch session to ${p.label}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-blue-600' : 'bg-transparent'}`} />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        <div className="w-[1px] h-3.5 bg-[var(--border)] mx-1" />

        {/* Customer Mode */}
        <button
          onClick={handleCustomerSelect}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
            mode === 'customer'
              ? 'bg-blue-600 text-white font-semibold shadow-xs'
              : 'text-[var(--muted)] hover:text-[var(--content)] hover:bg-[var(--surface)]/50'
          }`}
          title="Switch to customer portal (Vikram / ACME Corp)"
        >
          <Users className="w-3 h-3" />
          <span>Customer Portal</span>
        </button>
      </div>

      {/* Clean Single Sign Out Action */}
      <button
        onClick={async () => {
          await logout();
          navigate('/login');
        }}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-[var(--muted)] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/40 border border-[var(--border)] transition-all cursor-pointer shadow-xs"
        title="Sign out of Arvo Frontdesk"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Sign Out</span>
      </button>
    </div>
  );
};
