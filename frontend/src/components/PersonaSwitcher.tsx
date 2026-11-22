import React, { useState, useRef, useEffect } from 'react';
import { usePersona } from '../hooks/usePersona';
import { useNavigate } from 'react-router-dom';
import { Users, LogOut, ChevronDown, UserCheck } from 'lucide-react';

export const PersonaSwitcher: React.FC = () => {
  const { mode, agentId, actorName, setAgentPersona, setCustomerPersona, logout } = usePersona();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAgentSelect = async (id: string) => {
    setIsOpen(false);
    await setAgentPersona(id);
    navigate('/tickets/ARV-101');
  };

  const handleCustomerSelect = async () => {
    setIsOpen(false);
    await setCustomerPersona();
    navigate('/customer');
  };

  const personas = [
    { id: 'agent-meera', label: 'Meera Krishnan', title: 'Support Lead', color: '#7C3AED' },
    { id: 'agent-rahul', label: 'Rahul Sharma', title: 'Support Agent', color: '#2563EB' },
    { id: 'agent-priya', label: 'Priya Nair', title: 'Support Agent', color: '#059669' },
  ];

  const currentLabel = mode === 'customer' 
    ? 'Vikram (Customer)' 
    : personas.find(p => p.id === agentId)?.label.split(' ')[0] || actorName || 'Meera';

  return (
    <div className="relative flex items-center gap-1.5" ref={dropdownRef}>
      {/* Compact Switcher Pill */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] hover:bg-[var(--surface)] text-xs font-semibold text-[var(--content)] transition-all cursor-pointer shadow-xs whitespace-nowrap"
        title="Demo: Switch Persona"
      >
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        <span className="text-[11px] font-mono text-[var(--muted)] hidden sm:inline">Demo:</span>
        <span className="truncate max-w-[110px]">{currentLabel}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[var(--muted)] shrink-0 transition-transform duration-150" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-60 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] font-mono border-b border-[var(--border)] mb-1">
            Demo Persona Switcher
          </div>

          <div className="space-y-0.5">
            <div className="px-2.5 py-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 font-mono">
              Support Staff (Internal)
            </div>
            {personas.map((p) => {
              const isActive = mode === 'agent' && agentId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleAgentSelect(p.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'text-[var(--content)] hover:bg-[var(--surface-subtle)]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <div className="truncate">
                      <div className="leading-tight">{p.label}</div>
                      <div className="text-[10px] text-[var(--muted)] font-mono">{p.title}</div>
                    </div>
                  </div>
                  {isActive && <span className="text-[10px] font-mono text-blue-600 font-bold shrink-0">Active</span>}
                </button>
              );
            })}

            <div className="px-2.5 pt-2 pb-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono border-t border-[var(--border)] mt-1">
              Client Portal (Tenant Isolation)
            </div>
            <button
              type="button"
              onClick={handleCustomerSelect}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                mode === 'customer'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold'
                  : 'text-[var(--content)] hover:bg-[var(--surface-subtle)]'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <div className="truncate">
                  <div className="leading-tight">Vikram Patel</div>
                  <div className="text-[10px] text-[var(--muted)] font-mono">Acme Corp Client</div>
                </div>
              </div>
              {mode === 'customer' && <span className="text-[10px] font-mono text-emerald-600 font-bold shrink-0">Active</span>}
            </button>
          </div>

          <div className="pt-1.5 mt-1 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={async () => {
                setIsOpen(false);
                await logout();
                navigate('/login');
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Standalone Sign Out Button */}
      <button
        type="button"
        onClick={async () => {
          await logout();
          navigate('/login');
        }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--muted)] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/40 border border-[var(--border)] transition-all cursor-pointer shadow-xs whitespace-nowrap"
        title="Sign out of Arvo Frontdesk"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Sign Out</span>
      </button>
    </div>
  );
};
