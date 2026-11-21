import React, { useState, useRef, useEffect } from 'react';
import type { SLAState } from '../types/contracts';
import { formatMinutes, formatIST } from '../lib/utils';
import { SLABadge } from './SLABadge';

interface SLABreakdownPopoverProps {
  sla: SLAState;
}

export const SLABreakdownPopover: React.FC<SLABreakdownPopoverProps> = ({ sla }) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <SLABadge sla={sla} size="md" onClick={() => setIsOpen(!isOpen)} />

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 bg-white border border-[#E5E7EB] rounded-lg shadow-xl z-50 p-4 text-xs text-[#0F172A] font-sans">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB] mb-3">
            <span className="font-semibold text-sm">SLA Calculation Breakdown</span>
            <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
              IST (9:30 - 18:30)
            </span>
          </div>

          {/* First Response Section */}
          <div className="mb-3 bg-slate-50 p-2.5 rounded border border-slate-200">
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-slate-700">First Response SLA</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  sla.firstResponse.met
                    ? 'bg-emerald-100 text-emerald-800'
                    : sla.firstResponse.breached
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {sla.firstResponse.met ? 'Met' : sla.firstResponse.breached ? 'Breached' : 'Active'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-slate-600 mt-1.5">
              <div>Target: {formatMinutes(sla.firstResponse.targetMinutes)}</div>
              <div>Elapsed: {formatMinutes(sla.firstResponse.elapsedBusinessMinutes)}</div>
              <div>Remaining: {formatMinutes(sla.firstResponse.remainingBusinessMinutes)}</div>
              <div>Deadline: {sla.firstResponse.deadlineIST ? formatIST(sla.firstResponse.deadlineIST).slice(0, 17) : '—'}</div>
            </div>
          </div>

          {/* Resolution Section */}
          <div className="mb-3 bg-slate-50 p-2.5 rounded border border-slate-200">
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-slate-700">Resolution SLA</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  sla.resolution.met
                    ? 'bg-emerald-100 text-emerald-800'
                    : sla.resolution.breached
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {sla.resolution.met ? 'Resolved' : sla.resolution.breached ? 'Breached' : 'Active'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-slate-600 mt-1.5">
              <div>Target: {formatMinutes(sla.resolution.targetMinutes)}</div>
              <div>Elapsed: {formatMinutes(sla.resolution.elapsedBusinessMinutes)}</div>
              <div>Remaining: {formatMinutes(sla.resolution.remainingBusinessMinutes)}</div>
              <div>Deadline: {sla.resolution.deadlineIST ? formatIST(sla.resolution.deadlineIST).slice(0, 17) : '—'}</div>
            </div>
          </div>

          {/* Pause Details */}
          <div className="text-[11px] text-slate-500 flex flex-col gap-1 border-t border-slate-100 pt-2">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="font-medium text-slate-700">
                {sla.isPaused ? `Paused (${sla.pauseReason})` : 'Running (Deterministic Business Hours)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total Paused Duration:</span>
              <span className="font-mono">{formatMinutes(sla.totalPausedMinutes)}</span>
            </div>
            <div className="flex justify-between">
              <span>Current Window:</span>
              <span className={sla.isBusinessHours ? 'text-emerald-600 font-medium' : 'text-slate-500'}>
                {sla.isBusinessHours ? 'Within Business Hours (Mon-Fri 09:30-18:30)' : 'Outside Business Hours / Weekend'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
