import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Command, 
  ArrowRight, 
  Clock, 
  RotateCcw, 
  Sun, 
  Moon, 
  User, 
  HelpCircle, 
  FileText,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '../hooks/useTickets';
import { usePersona } from '../hooks/usePersona';
import { useTheme } from '../hooks/useTheme';
import { TicketPriority } from '../types/contracts';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenClock: () => void;
  onOpenReset: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpenClock,
  onOpenReset,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { data: tickets = [] } = useTickets();
  const { setAgentPersona, isLead } = usePersona();
  const { theme, toggleTheme } = useTheme();

  // Close on Escape, toggle on Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // handled by parent or opened
        }
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter items
  const cleanQ = query.trim().toLowerCase();

  const ticketMatches = tickets
    .filter(
      (t) =>
        t.ticketKey.toLowerCase().includes(cleanQ) ||
        t.subject.toLowerCase().includes(cleanQ) ||
        t.customerName.toLowerCase().includes(cleanQ) ||
        t.customerCompany.toLowerCase().includes(cleanQ)
    )
    .slice(0, 5);

  const actionItems = [
    ...(isLead ? [
      {
        id: 'demo-clock',
        label: 'Open Simulated Time Travel & Clock Popover',
        category: 'Simulation (Lead Only)',
        icon: <Clock className="w-4 h-4 text-blue-500" />,
        run: () => {
          onClose();
          onOpenClock();
        },
      },
      {
        id: 'reset-demo',
        label: 'Reset Canonical Demo Data (Restore ARV-101 .. ARV-108)',
        category: 'Simulation (Lead Only)',
        icon: <RotateCcw className="w-4 h-4 text-purple-500" />,
        run: () => {
          onClose();
          onOpenReset();
        },
      },
    ] : []),
    {
      id: 'toggle-theme',
      label: `Switch Theme to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      category: 'Preferences',
      icon: theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-500" />,
      run: () => {
        toggleTheme();
        onClose();
      },
    },
    {
      id: 'switch-meera',
      label: 'Switch Persona to Meera Krishnan (Team Lead)',
      category: 'Persona',
      icon: <User className="w-4 h-4 text-purple-500" />,
      run: async () => {
        await setAgentPersona('agent-meera');
        onClose();
      },
    },
    {
      id: 'switch-rahul',
      label: 'Switch Persona to Rahul Sharma (Agent)',
      category: 'Persona',
      icon: <User className="w-4 h-4 text-blue-500" />,
      run: async () => {
        await setAgentPersona('agent-rahul');
        onClose();
      },
    },
  ].filter((a) => a.label.toLowerCase().includes(cleanQ) || a.category.toLowerCase().includes(cleanQ));

  const allItems = [
    ...ticketMatches.map((t) => ({
      id: `ticket-${t.ticketKey}`,
      type: 'ticket' as const,
      ticket: t,
      run: () => {
        navigate(`/tickets/${t.ticketKey}`);
        onClose();
      },
    })),
    ...actionItems.map((a) => ({
      id: a.id,
      type: 'action' as const,
      action: a,
      run: a.run,
    })),
  ];

  const handleKeyDownNav = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (allItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + (allItems.length || 1)) % (allItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].run();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm animate-in fade-in duration-100">
      <div 
        className="w-full max-w-xl mx-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[var(--border)] gap-3 bg-[var(--surface-subtle)]">
          <Search className="w-5 h-5 text-[var(--muted)] flex-shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDownNav}
            placeholder="Type a command or search tickets (e.g. ARV-101, Meera, SLA)..."
            className="flex-1 bg-transparent text-sm text-[var(--content)] placeholder-[var(--subtle)] focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)] rounded">
            ESC to close
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto slim-scrollbar p-2 space-y-1">
          {allItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--muted)]">
              No matching tickets or commands found for "{query}"
            </div>
          ) : (
            allItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              if (item.type === 'ticket') {
                const t = item.ticket;
                return (
                  <div
                    key={item.id}
                    onClick={item.run}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-xs transition-colors ${
                      isSelected 
                        ? 'bg-blue-600 text-white' 
                        : 'text-[var(--content)] hover:bg-[var(--surface-subtle)]'
                    }`}
                  >
                    <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                      isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-[var(--muted)]'
                    }`}>
                      {t.ticketKey}
                    </span>
                    <span className="truncate flex-1 font-medium">{t.subject}</span>
                    <span className={`font-mono text-[10px] ${isSelected ? 'text-blue-200' : 'text-[var(--muted)]'}`}>
                      {t.customerCompany}
                    </span>
                  </div>
                );
              }

              const a = item.action;
              return (
                <div
                  key={item.id}
                  onClick={item.run}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-xs transition-colors ${
                    isSelected 
                      ? 'bg-blue-600 text-white' 
                      : 'text-[var(--content)] hover:bg-[var(--surface-subtle)]'
                  }`}
                >
                  <div className={`p-1 rounded ${isSelected ? 'bg-blue-700 text-white' : 'bg-[var(--surface-subtle)]'}`}>
                    {a.icon}
                  </div>
                  <span className="flex-1 font-medium">{a.label}</span>
                  <span className={`text-[10px] uppercase font-mono tracking-wider ${
                    isSelected ? 'text-blue-200' : 'text-[var(--muted)]'
                  }`}>
                    {a.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--surface-subtle)] flex items-center justify-between text-[11px] text-[var(--muted)] font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
          <span>ARVO Quick Commands</span>
        </div>
      </div>
    </div>
  );
};
