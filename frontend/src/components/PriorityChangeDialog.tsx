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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-[480px] max-h-[90vh] overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#0F172A]">Change Priority</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-md transition-colors">
            <X className="w-4 h-4 text-[#475569]" />
          </button>
        </div>

        {/* SLA recalculation warning */}
        <div className="flex items-start gap-2 p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg mb-4">
          <AlertTriangle className="w-4 h-4 text-[#D97706] flex-shrink-0 mt-0.5" />
          <div className="text-xs text-[#92400E]">
            <p className="font-semibold mb-0.5">SLA will be recalculated</p>
            <p>Elapsed business time is preserved. New SLA targets will apply going forward.</p>
          </div>
        </div>

        {/* Priority selection */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-[#475569] mb-2">Select new priority:</div>
          <div className="flex gap-2">
            {priorities.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setSelected(value)}
                className={`flex-1 py-2.5 px-3 rounded-lg border-2 text-xs font-semibold transition-all ${
                  selected === value
                    ? `${getPriorityColors(value)} border-current`
                    : 'border-[#E5E7EB] text-[#475569] hover:border-[#CBD5E1]'
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
          <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg p-3 mb-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-2">
              SLA Target Comparison
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-[#94A3B8] mb-1">Current ({ticket.priority})</div>
                <div className="font-mono text-[#475569]">
                  <div>FR: {formatMinutes(currentTargets.firstResponseMinutes)}</div>
                  <div>Res: {formatMinutes(currentTargets.resolutionMinutes)}</div>
                </div>
              </div>
              <div>
                <div className="text-[#2563EB] mb-1">New ({selected})</div>
                <div className="font-mono text-[#2563EB] font-semibold">
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
            className="px-4 py-2 text-xs font-medium text-[#475569] hover:text-[#0F172A] border border-[#E5E7EB] rounded-md hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isChanged || changePriority.isPending}
            className="px-4 py-2 text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-md transition-colors disabled:opacity-40"
          >
            {changePriority.isPending ? 'Updating…' : 'Confirm Change'}
          </button>
        </div>
      </div>
    </div>
  );
};
