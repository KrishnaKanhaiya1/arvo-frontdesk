import React, { useState, useRef, useEffect } from 'react';
import { 
  useSystemClock, 
  useSetClock, 
  useRunAutoClose, 
  useTickets, 
  useAddHoliday, 
  useDeleteHoliday 
} from '../hooks/useTickets';
import { usePersona } from '../hooks/usePersona';
import { formatIST } from '../lib/utils';
import { 
  Clock, 
  Calendar, 
  Zap, 
  AlertTriangle, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  X,
  Server
} from 'lucide-react';
import { TicketStatus } from '../types/contracts';

export const DemoClockPopover: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [holidayFilter, setHolidayFilter] = useState('');

  const popoverRef = useRef<HTMLDivElement>(null);
  const { data: clock, isLoading } = useSystemClock();
  const { data: tickets = [] } = useTickets();
  const { isLead } = usePersona();
  const setClock = useSetClock();
  const runAutoClose = useRunAutoClose();
  const addHoliday = useAddHoliday();
  const deleteHoliday = useDeleteHoliday();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSetPreset = (iso: string | null) => {
    setClock.mutate({ simulatedTime: iso });
  };

  const handleAdvanceWorkDays = (days: number) => {
    if (!clock?.currentTime) return;
    const current = new Date(clock.currentTime);
    const calendarDays = Math.ceil(days * (7 / 5));
    current.setDate(current.getDate() + calendarDays);
    setClock.mutate({ simulatedTime: current.toISOString() });
  };

  const handleAddHolidaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName.trim() || !newHolidayDate.trim()) return;
    addHoliday.mutate(
      { name: newHolidayName.trim(), date: newHolidayDate.trim() },
      {
        onSuccess: () => {
          setNewHolidayName('');
          setNewHolidayDate('');
          setShowAddHoliday(false);
        },
      }
    );
  };

  const isSimulated = clock?.isSimulated;
  const isBusinessHours = clock?.isBusinessHours;

  // Impact Preview Calculations
  const waitingTickets = tickets.filter(t => t.status === TicketStatus.WAITING_ON_CUSTOMER);
  const resolvedTickets = tickets.filter(t => t.status === TicketStatus.RESOLVED);

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1 text-xs font-mono font-medium rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--content)] hover:bg-[var(--surface-subtle)] transition-colors shadow-2xs whitespace-nowrap flex-shrink-0 cursor-pointer"
        title="Open Simulation Clock & Holiday Operations Console"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isBusinessHours ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
          }`}
        />
        <span>
          {isLoading || !clock?.currentTime ? 'Loading clock...' : formatIST(clock.currentTime)}
        </span>
        {isSimulated ? (
          <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold border border-amber-300 dark:border-amber-800">
            SIM
          </span>
        ) : (
          <span className="bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold border border-blue-200 dark:border-blue-800">
            LIVE
          </span>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl z-50 p-4 text-xs text-[var(--content)] animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border)] mb-3">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="font-bold text-sm text-[var(--content)] font-['Archivo',sans-serif]">
                Time Simulation Engine
              </span>
            </div>
            <span className="text-[10px] font-mono text-[var(--muted)] bg-[var(--surface-subtle)] px-2 py-0.5 rounded border border-[var(--border)]">
              Asia/Kolkata (IST)
            </span>
          </div>

          {/* Current Status */}
          <div className="mb-3 bg-[var(--surface-subtle)] p-3 rounded-xl border border-[var(--border)] space-y-1.5">
            <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)] font-mono">
              Active Simulation State
            </div>
            <div className="font-mono text-sm font-bold text-[var(--content)]">
              {clock?.currentTime ? formatIST(clock.currentTime) : '—'}
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-[var(--border)] text-[11px]">
              <span className="text-[var(--muted)]">Status:</span>
              <span className={`font-semibold font-mono ${isSimulated ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {isSimulated ? 'Simulated Override' : 'Live System Clock'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--muted)]">Business Window:</span>
              <span className={`font-semibold font-mono ${isBusinessHours ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                {isBusinessHours ? 'Open (09:30–18:30 IST)' : 'Paused (Off-Hours / Holiday)'}
              </span>
            </div>
          </div>

          {/* Impact Preview Section */}
          <div className="mb-3 p-2.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/40 text-[11px] space-y-1">
            <div className="font-bold text-blue-900 dark:text-blue-200 flex items-center justify-between">
              <span>SLA Impact Preview</span>
              <span className="text-[10px] font-mono bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 rounded text-blue-700 dark:text-blue-300">
                {isBusinessHours ? 'Clocks Counting Down' : 'SLA Clocks Paused'}
              </span>
            </div>
            <div className="text-[10px] text-blue-800 dark:text-blue-300">
              • <strong>{waitingTickets.length}</strong> ticket(s) currently waiting on customer.
            </div>
            <div className="text-[10px] text-blue-800 dark:text-blue-300">
              • <strong>{resolvedTickets.length}</strong> ticket(s) in 5-day reopen evaluation window.
            </div>
          </div>

          {/* Preset Buttons & Sweep Trigger (Lead Only) */}
          {isLead ? (
            <>
              <div className="mb-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2 font-mono flex items-center justify-between">
                  <span>Evaluation Clock Presets (Lead Only)</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleSetPreset(null)}
                    disabled={setClock.isPending}
                    className="px-2.5 py-2 border border-[var(--border)] rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-subtle)] text-[var(--content)] font-medium text-left transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-xs flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-500" /> Live Real Time
                    </div>
                    <div className="text-[10px] text-[var(--muted)] font-mono">Reset simulation</div>
                  </button>
                  <button
                    onClick={() => handleSetPreset('2026-11-20T04:45:00.000Z')}
                    disabled={setClock.isPending}
                    className="px-2.5 py-2 border border-[var(--border)] rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-subtle)] text-[var(--content)] font-medium text-left transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-xs">Fri 10:15 IST</div>
                    <div className="text-[10px] text-[var(--muted)] font-mono">Canonical start time</div>
                  </button>
                  <button
                    onClick={() => handleSetPreset('2026-11-20T12:00:00.000Z')}
                    disabled={setClock.isPending}
                    className="px-2.5 py-2 border border-[var(--border)] rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-subtle)] text-[var(--content)] font-medium text-left transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-xs">Fri 17:30 IST</div>
                    <div className="text-[10px] text-[var(--muted)] font-mono">Near business close</div>
                  </button>
                  <button
                    onClick={() => handleSetPreset('2026-11-22T04:30:00.000Z')}
                    disabled={setClock.isPending}
                    className="px-2.5 py-2 border border-[var(--border)] rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-subtle)] text-[var(--content)] font-medium text-left transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-xs">Sun 10:00 AM</div>
                    <div className="text-[10px] text-[var(--muted)] font-mono">Weekend zero-SLA proof</div>
                  </button>
                  <button
                    onClick={() => handleSetPreset('2026-11-23T04:30:00.000Z')}
                    disabled={setClock.isPending}
                    className="px-2.5 py-2 border border-[var(--border)] rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-subtle)] text-[var(--content)] font-medium text-left transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-xs">Mon 10:00 AM</div>
                    <div className="text-[10px] text-[var(--muted)] font-mono">Next workday arrival</div>
                  </button>
                  <button
                    onClick={() => handleAdvanceWorkDays(6)}
                    disabled={setClock.isPending}
                    className="px-2.5 py-2 border border-[var(--border)] rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-subtle)] text-[var(--content)] font-medium text-left transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-xs">⚡ +6 Work Days</div>
                    <div className="text-[10px] text-[var(--muted)] font-mono">Auto-close sweep target</div>
                  </button>
                </div>
              </div>

              {/* Run Auto-close trigger & Daemon Status */}
              <div className="mb-3 pt-2.5 border-t border-[var(--border)] space-y-2">
                <button
                  onClick={() => runAutoClose.mutate()}
                  disabled={runAutoClose.isPending}
                  className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 active:translate-y-px text-white font-semibold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>{runAutoClose.isPending ? 'Executing Auto-Close Sweep...' : 'Trigger Auto-Close Sweep'}</span>
                </button>
                <div className="flex items-center justify-between text-[10px] font-mono text-[var(--muted)] px-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-semibold text-[var(--content)]">Auto-Close Daemon: Active</span>
                  </span>
                  <span>cron */5 * * * *</span>
                </div>
              </div>
            </>
          ) : (
            <div className="mb-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-[var(--surface-subtle)] text-xs text-[var(--muted)] flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-[var(--content)] font-medium">Read-Only Telemetry (Agent Role)</strong>
                <span className="text-[11px] text-[var(--muted)] mt-0.5 block leading-relaxed">
                  Time travel presets and automated auto-close sweeps require <strong>Lead Specialist</strong> authorization (Meera Krishnan). Active session is Tier 1/2 Agent.
                </span>
              </div>
            </div>
          )}

          {/* Interactive Holiday Management Section */}
          <div className="border-t border-[var(--border)] pt-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] font-mono">
                Gazetted Holidays ({clock?.holidays?.length || 0}):
              </div>
              {isLead && (
                <button
                  onClick={() => setShowAddHoliday(!showAddHoliday)}
                  className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>{showAddHoliday ? 'Cancel' : 'Add Holiday'}</span>
                </button>
              )}
            </div>

            {/* Add Holiday Mini-Form */}
            {showAddHoliday && isLead && (
              <form onSubmit={handleAddHolidaySubmit} className="mb-2 p-2 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl space-y-1.5 animate-in fade-in duration-100">
                <input
                  type="text"
                  placeholder="Holiday Name (e.g. Diwali Festival)"
                  value={newHolidayName}
                  onChange={e => setNewHolidayName(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-[var(--border)] rounded-md bg-[var(--surface)] text-[var(--content)] placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="flex gap-1.5">
                  <input
                    type="date"
                    value={newHolidayDate}
                    onChange={e => setNewHolidayDate(e.target.value)}
                    className="flex-1 px-2 py-1 text-xs border border-[var(--border)] rounded-md bg-[var(--surface)] text-[var(--content)] focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={addHoliday.isPending || !newHolidayName.trim() || !newHolidayDate.trim()}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-md transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {addHoliday.isPending ? 'Adding…' : 'Save'}
                  </button>
                </div>
              </form>
            )}

            {/* Holiday Search & Filter */}
            {clock?.holidays && clock.holidays.length > 5 && !showAddHoliday && (
              <div className="mb-1.5">
                <input
                  type="text"
                  placeholder="Filter holidays by name or date…"
                  value={holidayFilter}
                  onChange={e => setHolidayFilter(e.target.value)}
                  className="w-full px-2 py-0.5 text-[10px] border border-[var(--border)] rounded-md bg-[var(--surface-subtle)] text-[var(--content)] placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
            )}

            {/* Holiday List */}
            {clock?.holidays && clock.holidays.length > 0 ? (
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 font-mono text-[10px] text-[var(--muted)] slim-scrollbar">
                {clock.holidays
                  .filter(h => !holidayFilter.trim() || h.name.toLowerCase().includes(holidayFilter.toLowerCase()) || h.date.includes(holidayFilter))
                  .map((h, i) => (
                  <div key={h.id || i} className="flex items-center justify-between py-0.5 border-b border-[var(--border)]/40 last:border-0 group hover:bg-[var(--surface-subtle)]/50 px-1 rounded transition-colors">
                    <span className="font-medium text-[var(--content)] truncate max-w-[170px]" title={h.name}>
                      {h.name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[var(--muted)]">{h.date}</span>
                      {isLead && h.id && (
                        <button
                          onClick={() => deleteHoliday.mutate(h.id!)}
                          disabled={deleteHoliday.isPending}
                          className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-0.5 transition-opacity cursor-pointer"
                          title="Remove holiday from calendar"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[10px] text-[var(--muted)] italic py-1">No custom holidays configured.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
