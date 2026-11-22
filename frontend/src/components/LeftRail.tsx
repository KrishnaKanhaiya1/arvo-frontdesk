import React from 'react';
import {
  Inbox,
  UserCheck,
  UserX,
  AlertOctagon,
  Clock,
  CheckCircle2,
  RotateCcw,
  HelpCircle,
  Flame,
  ArrowUp,
  ArrowDown,
  Layers,
} from 'lucide-react';
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
  onOpenResetModal?: () => void;
}

export const LeftRail: React.FC<LeftRailProps> = ({
  activeQueue,
  onQueueChange,
  priorityFilter,
  onPriorityChange,
  tickets,
  onShowShortcuts,
  onOpenResetModal,
}) => {
  const { agentId, isLead } = usePersona();
  const resetDemo = useResetDemo();

  const activeTickets = tickets.filter(
    (t) => t.status !== TicketStatus.RESOLVED && t.status !== TicketStatus.CLOSED
  );

  const counts = {
    all: activeTickets.length,
    mine: tickets.filter(
      (t) => t.assigneeId === agentId && t.status !== TicketStatus.RESOLVED && t.status !== TicketStatus.CLOSED
    ).length,
    unassigned: tickets.filter(
      (t) => !t.assigneeId && t.status !== TicketStatus.RESOLVED && t.status !== TicketStatus.CLOSED
    ).length,
    breached: tickets.filter((t) => getSLAOverallState(t.sla) === 'breached').length,
    waiting: tickets.filter((t) => t.status === TicketStatus.WAITING_ON_CUSTOMER).length,
    resolved: tickets.filter(
      (t) => t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED
    ).length,
  };

  const queues: { key: QueueFilter; label: string; count: number; icon: React.ElementType }[] = [
    { key: 'all', label: 'All Active', count: counts.all, icon: Inbox },
    { key: 'mine', label: 'My Tickets', count: counts.mine, icon: UserCheck },
    { key: 'unassigned', label: 'Unassigned', count: counts.unassigned, icon: UserX },
    { key: 'breached', label: 'Breached SLA', count: counts.breached, icon: AlertOctagon },
    { key: 'waiting', label: 'Waiting on Customer', count: counts.waiting, icon: Clock },
    { key: 'resolved', label: 'Resolved & Closed', count: counts.resolved, icon: CheckCircle2 },
  ];

  const priorities = [
    { value: TicketPriority.CRITICAL, label: 'Critical', dot: 'bg-[#EF4444]', icon: Flame },
    { value: TicketPriority.MEDIUM, label: 'Medium', dot: 'bg-[#F59E0B]', icon: ArrowUp },
    { value: TicketPriority.LOW, label: 'Low', dot: 'bg-[#10B981]', icon: ArrowDown },
  ];

  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col bg-[#F8FAFC] border-r border-[#E2E8F0] overflow-y-auto select-none">
      {/* Queues Section */}
      <div className="p-3">
        <div className="flex items-center gap-1.5 px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
          <Layers className="w-3 h-3" />
          <span>Operational Queues</span>
        </div>
        <nav className="flex flex-col gap-0.5">
          {queues.map(({ key, label, count, icon: Icon }) => {
            const isActive = activeQueue === key;
            return (
              <button
                key={key}
                onClick={() => onQueueChange(key)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left ${
                  isActive
                    ? 'bg-white text-[#2563EB] shadow-xs font-semibold border border-[#BFDBFE]'
                    : 'text-[#475569] hover:bg-slate-200/60 hover:text-[#0F172A]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? 'text-[#2563EB]' : 'text-[#64748B]'
                    }`}
                  />
                  <span className="truncate">{label}</span>
                </div>
                {count > 0 && (
                  <span
                    className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                      isActive
                        ? 'bg-[#EFF6FF] text-[#2563EB]'
                        : key === 'breached' && count > 0
                        ? 'bg-[#FEE2E2] text-[#DC2626]'
                        : 'bg-[#E2E8F0] text-[#64748B]'
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

      <div className="mx-3 border-t border-[#E2E8F0]" />

      {/* Priority Filters */}
      <div className="p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] mb-2 px-2">
          Severity Filter
        </div>
        <div className="flex flex-col gap-0.5">
          {priorities.map(({ value, label, dot, icon: Icon }) => {
            const isSelected = priorityFilter === value;
            return (
              <button
                key={value}
                onClick={() => onPriorityChange(isSelected ? null : value)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all text-left ${
                  isSelected
                    ? 'bg-white text-[#0F172A] font-semibold shadow-xs border border-[#CBD5E1]'
                    : 'text-[#475569] hover:bg-slate-200/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${dot}`} />
                  <span>{label}</span>
                </div>
                {isSelected && (
                  <span className="text-[10px] text-[#2563EB] font-mono font-bold">Active</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1" />

      {/* Rail Footer: Reset Demo (Lead Only) & Keyboard Shortcuts */}
      <div className="p-3 border-t border-[#E2E8F0] flex flex-col gap-1.5 bg-white">
        {isLead && (
          <button
            onClick={() => {
              if (onOpenResetModal) {
                onOpenResetModal();
              } else {
                resetDemo.mutate();
              }
            }}
            disabled={resetDemo.isPending}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-xs font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors border border-transparent hover:border-[#E2E8F0] cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetDemo.isPending ? 'animate-spin' : ''}`} />
            <span>{resetDemo.isPending ? 'Resetting…' : 'Reset Canonical Data'}</span>
          </button>
        )}

        <button
          onClick={onShowShortcuts}
          className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md text-xs font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors border border-transparent hover:border-[#E2E8F0]"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Shortcuts</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#F1F5F9] text-[#64748B] rounded border border-[#CBD5E1]">
            ?
          </kbd>
        </button>
      </div>
    </aside>
  );
};
