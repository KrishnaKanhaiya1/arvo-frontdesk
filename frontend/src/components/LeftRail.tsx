import React from 'react';
import { RotateCcw, HelpCircle } from 'lucide-react';
import { useResetDemo } from '../hooks/useTickets';
import { usePersona } from '../hooks/usePersona';
import { TicketStatus, TicketPriority } from '../types/contracts';
import { getSLAOverallState } from '../lib/utils';
import type { TicketSummary } from '../types/contracts';
import type { QueueFilter } from '../pages/AgentWorkspace';

interface LeftRailProps {
  activeQueue: QueueFilter;
  onQueueChange: (q: QueueFilter) => void;
  priorityFilter: TicketPriority | null;
  onPriorityChange: (p: TicketPriority | null) => void;
  tickets: TicketSummary[];
  onShowShortcuts: () => void;
}

export const LeftRail: React.FC<LeftRailProps> = ({
  activeQueue,
  onQueueChange,
  priorityFilter,
  onPriorityChange,
  tickets,
  onShowShortcuts,
}) => {
  const { agentId } = usePersona();
  const resetDemo = useResetDemo();

  // Compute counts
  const activeTickets = tickets.filter(
    t => t.status !== TicketStatus.RESOLVED && t.status !== TicketStatus.CLOSED
  );

  const counts = {
    all: activeTickets.length,
    mine: tickets.filter(t => t.assigneeId === agentId && t.status !== TicketStatus.RESOLVED && t.status !== TicketStatus.CLOSED).length,
    unassigned: tickets.filter(t => !t.assigneeId && t.status !== TicketStatus.RESOLVED && t.status !== TicketStatus.CLOSED).length,
    breached: tickets.filter(t => getSLAOverallState(t.sla) === 'breached').length,
    waiting: tickets.filter(t => t.status === TicketStatus.WAITING_ON_CUSTOMER).length,
    resolved: tickets.filter(t => t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED).length,
  };

  const queues: { key: QueueFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All Active', count: counts.all },
    { key: 'mine', label: 'My Tickets', count: counts.mine },
    { key: 'unassigned', label: 'Unassigned', count: counts.unassigned },
    { key: 'breached', label: 'Breached SLA', count: counts.breached },
    { key: 'waiting', label: 'Waiting on Customer', count: counts.waiting },
    { key: 'resolved', label: 'Resolved & Closed', count: counts.resolved },
  ];

  const priorities = [
    { value: TicketPriority.CRITICAL, label: 'Critical', color: 'text-[#DC2626]' },
    { value: TicketPriority.MEDIUM, label: 'Medium', color: 'text-[#D97706]' },
    { value: TicketPriority.LOW, label: 'Low', color: 'text-[#059669]' },
  ];

  return (
    <aside className="w-[216px] flex-shrink-0 flex flex-col bg-white border-r border-[#E5E7EB] overflow-y-auto">
      {/* Smart Queues */}
      <div className="px-3 pt-4 pb-2">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-2 px-1">
          Queues
        </div>
        <nav className="flex flex-col gap-0.5">
          {queues.map(({ key, label, count }) => {
            const isActive = activeQueue === key;
            return (
              <button
                key={key}
                onClick={() => onQueueChange(key)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-all text-left ${
                  isActive
                    ? 'bg-[#EFF6FF] text-[#2563EB] border-l-[3px] border-[#2563EB] pl-[7px]'
                    : 'text-[#475569] hover:bg-slate-50 hover:text-[#0F172A]'
                }`}
              >
                <span className="truncate">{label}</span>
                {count > 0 && (
                  <span
                    className={`ml-1.5 flex-shrink-0 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-[#DBEAFE] text-[#2563EB]'
                        : key === 'breached' && count > 0
                        ? 'bg-[#FEF2F2] text-[#DC2626]'
                        : 'bg-[#F1F5F9] text-[#64748B]'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Divider */}
      <div className="mx-3 my-2 border-t border-[#E5E7EB]" />

      {/* Priority Filters */}
      <div className="px-3 pb-2">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-2 px-1">
          Priority
        </div>
        <div className="flex flex-col gap-0.5">
          {priorities.map(({ value, label, color }) => {
            const isActive = priorityFilter === value;
            return (
              <button
                key={value}
                onClick={() => onPriorityChange(isActive ? null : value)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all text-left ${
                  isActive
                    ? 'bg-[#EFF6FF] text-[#0F172A] ring-1 ring-[#2563EB]'
                    : 'text-[#475569] hover:bg-slate-50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  value === TicketPriority.CRITICAL ? 'bg-[#DC2626]' :
                  value === TicketPriority.MEDIUM ? 'bg-[#D97706]' :
                  'bg-[#059669]'
                }`} />
                <span className={color}>{label}</span>
                {isActive && (
                  <span className="ml-auto text-[9px] text-[#94A3B8]">×</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer */}
      <div className="px-3 py-3 border-t border-[#E5E7EB] flex flex-col gap-1.5">
        <button
          onClick={() => resetDemo.mutate()}
          disabled={resetDemo.isPending}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#475569] hover:bg-rose-50 hover:text-rose-600 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {resetDemo.isPending ? 'Resetting…' : 'Reset Demo Data'}
        </button>
        <button
          onClick={onShowShortcuts}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#475569] hover:bg-slate-50 transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Keyboard Shortcuts
          <span className="ml-auto font-mono bg-[#F1F5F9] border border-[#E5E7EB] rounded px-1 text-[10px]">?</span>
        </button>
      </div>
    </aside>
  );
};
