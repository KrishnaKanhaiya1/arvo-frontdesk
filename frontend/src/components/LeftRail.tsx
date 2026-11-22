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
  X
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
    mine: activeTickets.filter((t) => t.assigneeId === agentId).length,
    unassigned: activeTickets.filter((t) => !t.assigneeId).length,
    // Consistent with active breached telemetry (excludes archived closed tickets)
    breached: activeTickets.filter((t) => getSLAOverallState(t.sla) === 'breached').length,
    waiting: activeTickets.filter((t) => t.status === TicketStatus.WAITING_ON_CUSTOMER).length,
    resolved: tickets.filter(
      (t) => t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED
    ).length,
  };

  const priorityCounts = {
    [TicketPriority.CRITICAL]: activeTickets.filter(t => t.priority === TicketPriority.CRITICAL).length,
    [TicketPriority.MEDIUM]: activeTickets.filter(t => t.priority === TicketPriority.MEDIUM).length,
    [TicketPriority.LOW]: activeTickets.filter(t => t.priority === TicketPriority.LOW).length,
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
    { value: TicketPriority.CRITICAL, label: 'Critical', count: priorityCounts[TicketPriority.CRITICAL], dot: 'bg-red-500', icon: Flame },
    { value: TicketPriority.MEDIUM, label: 'Medium', count: priorityCounts[TicketPriority.MEDIUM], dot: 'bg-amber-500', icon: ArrowUp },
    { value: TicketPriority.LOW, label: 'Low', count: priorityCounts[TicketPriority.LOW], dot: 'bg-emerald-500', icon: ArrowDown },
  ];

  return (
    <aside className="w-full flex-shrink-0 flex flex-col bg-[var(--surface-subtle)] border-r border-[var(--border)] overflow-y-auto select-none transition-colors">
      {/* Queues Section */}
      <div className="p-3">
        <div className="flex items-center gap-1.5 px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] font-mono">
          <Layers className="w-3 h-3" />
          <span>Operational Queues</span>
        </div>
        <nav className="flex flex-col gap-0.5">
          {queues.map(({ key, label, count, icon: Icon }) => {
            const isActive = activeQueue === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onQueueChange(key)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-[var(--surface)] text-blue-600 dark:text-blue-400 shadow-xs font-semibold border border-[var(--border)]'
                    : 'text-[var(--content)] hover:bg-[var(--surface)]/60'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      key === 'breached'
                        ? 'text-red-500'
                        : key === 'waiting'
                        ? 'text-amber-500'
                        : key === 'resolved'
                        ? 'text-emerald-500'
                        : isActive
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-[var(--muted)]'
                    }`}
                  />
                  <span className="truncate">{label}</span>
                </div>
                <span
                  className={`font-mono text-[11px] px-1.5 py-0.2 rounded ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold'
                      : 'text-[var(--muted)]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Severity Tiers Section */}
      <div className="px-3 pt-2 pb-3 border-t border-[var(--border)]">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] font-mono">
            SLA Severity Tiers
          </span>
          {priorityFilter && (
            <button
              type="button"
              onClick={() => onPriorityChange(null)}
              className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer font-mono"
            >
              <X className="w-2.5 h-2.5" /> Clear
            </button>
          )}
        </div>

        <div className="flex flex-col gap-0.5">
          {priorities.map(({ value, label, count, dot, icon: Icon }) => {
            const isSelected = priorityFilter === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onPriorityChange(isSelected ? null : value)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all text-left cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--surface)] font-semibold text-[var(--content)] border border-[var(--border)] shadow-xs'
                    : 'text-[var(--muted)] hover:text-[var(--content)] hover:bg-[var(--surface)]/50'
                }`}
                title={`Filter by ${label} priority (${label === 'Critical' ? '120m FR / 540m RES' : label === 'Medium' ? '270m FR / 1620m RES' : '540m FR / 2700m RES'})`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${dot}`} />
                  <span>{label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[11px] text-[var(--muted)]">{count}</span>
                  {isSelected && (
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-bold">Active</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-2 px-2 text-[10px] text-[var(--muted)] font-mono leading-tight">
          3-tier deterministic policy (Critical, Medium, Low).
        </div>
      </div>

      <div className="flex-1" />

      {/* Rail Footer: Reset Demo (Lead Only) & Keyboard Shortcuts */}
      <div className="p-3 border-t border-[var(--border)] flex flex-col gap-1.5 bg-[var(--surface)]">
        {isLead && (
          <button
            type="button"
            onClick={() => {
              if (onOpenResetModal) {
                onOpenResetModal();
              } else {
                resetDemo.mutate();
              }
            }}
            disabled={resetDemo.isPending}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-900 cursor-pointer"
            title="Reset canonical demo data (Meera Krishnan - Lead)"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetDemo.isPending ? 'animate-spin' : ''}`} />
            <span>{resetDemo.isPending ? 'Resetting…' : 'Reset Canonical Data'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onShowShortcuts}
          className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md text-xs font-medium text-[var(--muted)] hover:text-[var(--content)] hover:bg-[var(--surface-subtle)] transition-colors border border-transparent hover:border-[var(--border)] cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Shortcuts</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[var(--surface-subtle)] text-[var(--muted)] rounded border border-[var(--border)]">
            ?
          </kbd>
        </button>
      </div>
    </aside>
  );
};
