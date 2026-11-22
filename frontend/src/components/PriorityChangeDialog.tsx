import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useChangePriority } from '../hooks/useTickets';
import { usePersona } from '../hooks/usePersona';
import { TicketPriority, SLA_TARGETS } from '../types/contracts';
import type { TicketDetail } from '../types/contracts';
import { getPriorityColors, formatMinutes } from '../lib/utils';

interface PriorityChangeDialogProps {
  ticket: TicketDetail;
  onClose: () => void;
}

export const PriorityChangeDialog: React.FC<PriorityChangeDialogProps> = ({ ticket, onClose }) => {
  const { agentId } = usePersona();
  const changePriority = useChangePriority(ticket.ticketKey);
  const [selected, setSelected] = useState<TicketPriority>(ticket.priority);

  const priorities = [
    { value: TicketPriority.CRITICAL, label: 'Critical' },
    { value: TicketPriority.MEDIUM, label: 'Medium' },
    { value: TicketPriority.LOW, label: 'Low' },
  ];

  const currentTargets = SLA_TARGETS[ticket.priority];
  const newTargets = SLA_TARGETS[selected];
  const isChanged = selected !== ticket.priority;

  const handleConfirm = () => {
    if (!agentId || !isChanged) return;
    changePriority.mutate(
      { agentId, newPriority: selected, version: ticket.version },
      { onSuccess: onClose }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] rounded-xl shadow-2xl w-[480px] max-h-[90vh] overflow-y-auto p-6 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Change Priority</h2>
          <button onClick={onClose} className="p-1 hover:bg-[var(--surface-subtle)] rounded-md transition-colors text-[var(--muted)] hover:text-[var(--foreground)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SLA recalculation warning */}
        <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold mb-0.5">SLA will be recalculated</p>
            <p className="opacity-90">Elapsed business time is strictly preserved. New SLA targets apply deterministically going forward.</p>
          </div>
        </div>

        {/* Priority selection */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-[var(--muted)] mb-2">Select new priority:</div>
          <div className="flex gap-2">
            {priorities.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setSelected(value)}
                className={`flex-1 py-2.5 px-3 rounded-lg border-2 text-xs font-semibold transition-all ${
                  selected === value
                    ? `${getPriorityColors(value)} border-current`
                    : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--foreground)]'
                }`}
              >
                {label}
                {value === ticket.priority && (
                  <span className="block text-[9px] font-normal opacity-70 mt-0.5">current</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* SLA comparison */}
        {isChanged && (
          <div className="bg-[var(--surface-subtle)] border border-[var(--border)] rounded-lg p-3 mb-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)] mb-2">
              SLA Target Comparison
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-[var(--muted)] mb-1">Current ({ticket.priority})</div>
                <div className="font-mono text-[var(--foreground)]">
                  <div>FR: {formatMinutes(currentTargets.firstResponseMinutes)}</div>
                  <div>Res: {formatMinutes(currentTargets.resolutionMinutes)}</div>
                </div>
              </div>
              <div>
                <div className="text-blue-600 dark:text-blue-400 mb-1 font-medium">New ({selected})</div>
                <div className="font-mono text-blue-600 dark:text-blue-400 font-semibold">
                  <div>FR: {formatMinutes(newTargets.firstResponseMinutes)}</div>
                  <div>Res: {formatMinutes(newTargets.resolutionMinutes)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)] rounded-md hover:bg-[var(--surface-subtle)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isChanged || changePriority.isPending}
            className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-40"
          >
            {changePriority.isPending ? 'Updating…' : 'Confirm Change'}
          </button>
        </div>
      </div>
    </div>
  );
};
