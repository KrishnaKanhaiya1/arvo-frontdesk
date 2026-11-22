import React from 'react';
import { Lock } from 'lucide-react';
import type { TicketSummary } from '../types/contracts';
import { getPriorityColors } from '../lib/utils';
import { SLABadge } from './SLABadge';
import { Avatar } from './Avatar';

interface TicketListItemProps {
  ticket: TicketSummary;
  isSelected: boolean;
  onSelect: () => void;
}

export const TicketListItem: React.FC<TicketListItemProps> = ({ ticket, isSelected, onSelect }) => {
  return (
    <div
      onClick={onSelect}
      className={`py-3 px-3.5 cursor-pointer border-b border-[var(--border)] transition-all relative ${
        isSelected
          ? 'bg-[var(--surface-subtle)] shadow-[0_2px_8px_-2px_rgba(15,23,42,0.15)] z-10'
          : 'bg-[var(--surface)] hover:bg-[var(--surface-subtle)]/70'
      }`}
    >
      {/* Active selection accent line */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-sm" />
      )}

      {/* Row 1: Key + Priority + SLA Badge */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="font-mono text-[11px] font-bold text-[var(--content)] bg-[var(--surface-subtle)] px-1.5 py-0.5 rounded border border-[var(--border)]">
          {ticket.ticketKey}
        </span>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${getPriorityColors(
            ticket.priority
          )}`}
        >
          {ticket.priority}
        </span>
        <div className="ml-auto flex items-center gap-1" title="FR: First Response Target · RES: Resolution Target">
          <SLABadge sla={ticket.sla} size="sm" />
        </div>
      </div>

      {/* Row 2: Subject */}
      <div className="text-[13px] font-semibold text-[var(--content)] truncate leading-tight mb-1.5">
        {ticket.subject}
      </div>

      {/* Row 3: Customer Details, Assignee, Internal Notes Lock */}
      <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
        <span className="truncate max-w-[110px] font-medium text-[var(--content)]" title={ticket.customerName}>
          {ticket.customerName}
        </span>
        <span className="text-[var(--border)]">·</span>
        <span className="truncate max-w-[90px] text-[var(--muted)]" title={ticket.customerCompany}>
          {ticket.customerCompany}
        </span>

        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          {ticket.hasInternalNotes && (
            <span
              title="Contains confidential internal team notes (Protected by INC-0304)"
              className="p-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400"
            >
              <Lock className="w-2.5 h-2.5" />
            </span>
          )}

          {ticket.assigneeName ? (
            <div className="flex items-center gap-1 bg-[var(--surface-subtle)] px-1.5 py-0.5 rounded border border-[var(--border)]">
              <Avatar name={ticket.assigneeName} size="sm" />
              <span className="truncate max-w-[70px] text-[10px] font-medium text-[var(--content)]">
                {ticket.assigneeName.split(' ')[0]}
              </span>
            </div>
          ) : (
            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
              Unassigned
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
