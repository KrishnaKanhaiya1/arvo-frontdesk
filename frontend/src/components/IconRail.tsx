import React from 'react';
import { 
  Inbox, 
  UserCheck, 
  UserX, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  Keyboard, 
  Sun, 
  Moon, 
  RotateCcw,
  LogOut,
  Command
} from 'lucide-react';
import { usePersona } from '../hooks/usePersona';
import { useTheme } from '../hooks/useTheme';
import { useNavigate } from 'react-router-dom';

interface IconRailProps {
  activeQueue: string;
  onSelectQueue: (queue: string) => void;
  onOpenShortcuts: () => void;
  onOpenCommandPalette: () => void;
  onOpenResetModal: () => void;
}

export const IconRail: React.FC<IconRailProps> = ({
  activeQueue,
  onSelectQueue,
  onOpenShortcuts,
  onOpenCommandPalette,
  onOpenResetModal,
}) => {
  const { agentName, agentInitials, agentColor, isLead, logout } = usePersona();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const navItems = [
    { id: 'all_active', label: 'All Active Tickets', icon: <Inbox className="w-4 h-4" /> },
    { id: 'my_tickets', label: 'My Assigned Tickets', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'unassigned', label: 'Unassigned Queue', icon: <UserX className="w-4 h-4" /> },
    { id: 'breached', label: 'Breached SLA Alerts', icon: <AlertCircle className="w-4 h-4 text-red-500" /> },
    { id: 'waiting', label: 'Waiting on Customer', icon: <Clock className="w-4 h-4 text-amber-500" /> },
    { id: 'resolved', label: 'Resolved & Closed Archive', icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
  ];

  return (
    <aside className="w-16 flex-shrink-0 flex flex-col items-center py-3 bg-[var(--surface-subtle)] border-r border-[var(--border)] select-none z-20">
      {/* Brand Monogram */}
      <div 
        onClick={() => navigate('/')}
        className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center font-bold text-base cursor-pointer shadow-md shadow-blue-500/20 mb-4 transition-all"
        title="Arvo Frontdesk Home"
      >
        A
      </div>

      {/* Primary Queue Icons */}
      <div className="flex-1 flex flex-col items-center gap-1.5 w-full px-2">
        {navItems.map((item) => {
          const isActive = activeQueue === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectQueue(item.id)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--content)] hover:bg-[var(--surface)]'
              }`}
              title={item.label}
            >
              {item.icon}
              {/* Tooltip */}
              <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-[11px] rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                {item.label}
              </span>
            </button>
          );
        })}

        <div className="w-6 h-px bg-[var(--border)] my-2" />

        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--muted)] hover:text-blue-600 hover:bg-[var(--surface)] transition-all relative group"
          title="Command Palette (Ctrl+K)"
        >
          <Command className="w-4 h-4" />
          <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-[11px] rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
            Command Palette (⌘K)
          </span>
        </button>

        {/* Reset Canonical Demo Data (Lead Only) */}
        {isLead && (
          <button
            onClick={onOpenResetModal}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-all relative group cursor-pointer"
            title="Reset Demo Data"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-[11px] rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
              Reset Canonical Data
            </span>
          </button>
        )}
      </div>

      {/* Bottom Controls: Theme Toggle & User Avatar */}
      <div className="flex flex-col items-center gap-2 pt-2 border-t border-[var(--border)] w-full px-2">
        {/* Keyboard Shortcuts */}
        <button
          onClick={onOpenShortcuts}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--content)] hover:bg-[var(--surface)] transition-colors relative group"
          title="Keyboard shortcuts (?)"
        >
          <Keyboard className="w-4 h-4" />
          <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-[11px] rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
            Shortcuts (?)
          </span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--content)] hover:bg-[var(--surface)] transition-colors relative group cursor-pointer"
          title="Toggle light/dark theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-[11px] rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
            Toggle Theme
          </span>
        </button>

        {/* User Profile Avatar with Click-to-Sign-Out */}
        <div 
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
          className="w-9 h-9 rounded-full text-white font-bold text-xs flex items-center justify-center cursor-pointer shadow mt-1 relative group hover:ring-2 hover:ring-blue-500 transition-all"
          style={{ backgroundColor: agentColor || '#2563EB' }}
          title={`${agentName} (Click to Sign Out)`}
        >
          {agentInitials || 'AG'}
          <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-[11px] rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
            Sign Out ({agentName})
          </span>
        </div>
      </div>
    </aside>
  );
};
