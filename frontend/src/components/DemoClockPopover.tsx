import React, { useState, useRef, useEffect } from 'react';
import { useSystemClock, useSetClock, useRunAutoClose } from '../hooks/useTickets';
import { formatIST } from '../lib/utils';

export const DemoClockPopover: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { data: clock, isLoading } = useSystemClock();
  const setClock = useSetClock();
  const runAutoClose = useRunAutoClose();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSetPreset = (iso: string | null) => {
    setClock.mutate({ simulatedTime: iso });
  };

  const handleAdvance6Days = () => {
    if (!clock?.currentTime) return;
    const current = new Date(clock.currentTime);
    // Advance 6 calendar days or ~8.5 calendar days for 6 working days
    current.setDate(current.getDate() + 8);
    setClock.mutate({ simulatedTime: current.toISOString() });
  };

  const isSimulated = clock?.isSimulated;
  const isBusinessHours = clock?.isBusinessHours;

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1 text-xs font-mono font-medium rounded-md border border-[#E5E7EB] bg-white hover:bg-slate-50 transition-colors shadow-sm"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isBusinessHours ? 'bg-emerald-500 pulse-dot' : 'bg-slate-400'
          }`}
        />
        <span>
          {isLoading || !clock?.currentTime ? 'Loading clock...' : formatIST(clock.currentTime)}
        </span>
        {isSimulated && (
          <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded font-sans font-medium">
            SIM
          </span>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-84 bg-white border border-[#E5E7EB] rounded-lg shadow-xl z-50 p-4 text-xs text-[#0F172A]">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB] mb-3">
            <span className="font-semibold text-sm">Demo Simulation Clock</span>
            <span className="text-[10px] font-mono text-slate-500">Asia/Kolkata (IST)</span>
          </div>

          {/* Current Status */}
          <div className="mb-3 bg-slate-50 p-2.5 rounded border border-slate-200">
            <div className="text-[11px] text-slate-500 mb-1">Current Active System Time:</div>
            <div className="font-mono text-xs font-semibold text-slate-800">
              {clock?.currentTime ? formatIST(clock.currentTime) : '—'}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-slate-600">Mode:</span>
              <span className={`font-semibold ${isSimulated ? 'text-amber-600' : 'text-emerald-600'}`}>
                {isSimulated ? 'Simulated Override' : 'Live System Clock'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-600">Business Window:</span>
              <span className={isBusinessHours ? 'text-emerald-600 font-medium' : 'text-slate-500'}>
                {isBusinessHours ? 'Open (09:30–18:30 IST)' : 'Closed / Off-Hours'}
              </span>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="mb-3">
            <div className="text-[11px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Clock Presets
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleSetPreset(null)}
                disabled={setClock.isPending}
                className="px-2 py-1.5 border border-slate-200 rounded bg-white hover:bg-slate-50 text-slate-700 font-medium text-left"
              >
                🔴 Live IST
              </button>
              <button
                onClick={() => handleSetPreset('2026-11-23T10:00:00+05:30')}
                disabled={setClock.isPending}
                className="px-2 py-1.5 border border-slate-200 rounded bg-white hover:bg-slate-50 text-slate-700 font-medium text-left"
              >
                📅 Mon 10:00 AM
              </button>
              <button
                onClick={() => handleSetPreset('2026-11-22T10:00:00+05:30')}
                disabled={setClock.isPending}
                className="px-2 py-1.5 border border-slate-200 rounded bg-white hover:bg-slate-50 text-slate-700 font-medium text-left"
              >
                🏖️ Sun 10:00 AM
              </button>
              <button
                onClick={handleAdvance6Days}
                disabled={setClock.isPending}
                className="px-2 py-1.5 border border-slate-200 rounded bg-white hover:bg-slate-50 text-slate-700 font-medium text-left"
              >
                ⏩ +6 Work Days
              </button>
            </div>
          </div>

          {/* Run Auto-close trigger */}
          <div className="mb-3 pt-2 border-t border-slate-100">
            <button
              onClick={() => runAutoClose.mutate()}
              disabled={runAutoClose.isPending}
              className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded text-xs transition-colors"
            >
              {runAutoClose.isPending ? 'Sweeping...' : '⚡ Trigger Auto-Close Sweep'}
            </button>
          </div>

          {/* Holiday List */}
          {clock?.holidays && clock.holidays.length > 0 && (
            <div className="border-t border-slate-100 pt-2">
              <div className="text-[11px] font-semibold text-slate-500 mb-1">
                2026 Indian Holidays (Non-working):
              </div>
              <div className="max-h-24 overflow-y-auto space-y-1 pr-1 font-mono text-[10px] text-slate-600">
                {clock.holidays.map((h, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{h.name}</span>
                    <span className="text-slate-400">{h.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
