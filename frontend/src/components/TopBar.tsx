import React, { useState } from 'react';
import { Plus, Sun, Moon } from 'lucide-react';
import { useSystemClock } from '../hooks/useTickets';
import { DemoClockPopover } from './DemoClockPopover';
import { PersonaSwitcher } from './PersonaSwitcher';
import { NewTicketDialog } from './NewTicketDialog';
import { useTheme } from '../hooks/useTheme';

export const TopBar: React.FC = () => {
  const { data: clock } = useSystemClock();
  const { theme, toggleTheme } = useTheme();
  const [showNewTicket, setShowNewTicket] = useState(false);

  const isBusinessHours = clock?.isBusinessHours;

  return (
    <>
      <header className="h-[54px] flex-shrink-0 flex items-center px-4 gap-3 bg-[var(--surface)] border-b border-[var(--border)] shadow-[var(--card-shadow)] z-20 transition-colors">
        {/* Brand Logo + Badge */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm font-bold text-sm">
            A
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-[13px] font-bold text-[var(--content)] tracking-tight font-['Archivo',sans-serif]">ARVO</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 font-mono">
                Frontdesk
              </span>
            </div>
            <span className="text-[10px] text-[var(--muted)] font-mono leading-none mt-1 hidden sm:inline">Enterprise SLA Core</span>
          </div>
        </div>

        {/* Vertical divider */}
        <div className="h-5 w-[1px] bg-[var(--border)] mx-1 hidden sm:block" />

        {/* Business Hours Status Indicator */}
        <div
          className={`hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium border transition-colors whitespace-nowrap flex-shrink-0 ${
            isBusinessHours
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-[var(--surface-subtle)] text-[var(--muted)] border-[var(--border)]'
          }`}
          title={isBusinessHours ? 'Business Hours Active (09:30–18:30 IST)' : 'Outside Business Hours · Clocks Paused'}
        >
          <span className="relative flex h-2 w-2">
            {isBusinessHours && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isBusinessHours ? 'bg-emerald-600' : 'bg-slate-400'
              }`}
            ></span>
          </span>
          <span className="font-medium whitespace-nowrap hidden lg:inline">
            {isBusinessHours ? 'IST Business Hours Active' : 'Off-Hours · Clocks Paused'}
          </span>
          <span className="font-medium whitespace-nowrap lg:hidden">
            {isBusinessHours ? '09:30–18:30 IST' : 'Clocks Paused'}
          </span>
          <span className="text-[10px] text-[var(--muted)] font-mono hidden xl:inline whitespace-nowrap">09:30–18:30 IST</span>
        </div>

        {/* Center space */}
        <div className="flex-1 min-w-[8px]" />

        {/* Simulation Clock Controls + New Ticket CTA */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <DemoClockPopover />

          <button
            onClick={() => setShowNewTicket(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all whitespace-nowrap flex-shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">New Ticket</span>
          </button>
        </div>

        {/* Persona Switcher Pill */}
        <div className="pl-1 border-l border-[var(--border)] flex-shrink-0">
          <PersonaSwitcher />
        </div>
      </header>

      {showNewTicket && <NewTicketDialog onClose={() => setShowNewTicket(false)} />}
    </>
  );
};
