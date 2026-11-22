import React from 'react';
import { Lock, User, Clock, ArrowRight } from 'lucide-react';
import type { TicketSummary } from '../types/contracts';
import { getPriorityColors, formatTimeAgo } from '../lib/utils';
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
      className={`py-3 px-3.5 cursor-pointer border-b border-[#E2E8F0] transition-all relative ${
        isSelected
          ? 'bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08)] z-10'
          : 'bg-[#FCFDFD] hover:bg-white hover:shadow-xs'
      }`}
    >
      {/* Active selection accent line */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#2563EB] rounded-r-sm" />
      )}

      {/* Row 1: Key + Priority + SLA Badge */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="font-mono text-[11px] font-bold text-[#475569] bg-[#F1F5F9] px-1.5 py-0.5 rounded border border-[#E2E8F0]">
          {ticket.ticketKey}
        </span>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${getPriorityColors(
            ticket.priority
          )}`}
        >
          {ticket.priority}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <SLABadge sla={ticket.sla} size="sm" />
        </div>
      </div>

      {/* Row 2: Subject */}
      <div className="text-[13px] font-semibold text-[#0F172A] truncate leading-tight mb-1.5">
        {ticket.subject}
      </div>

      {/* Row 3: Customer Details, Assignee, Internal Notes Lock */}
      <div className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
        <span className="truncate max-w-[110px] font-medium text-[#334155]" title={ticket.customerName}>
          {ticket.customerName}
        </span>
        <span className="text-[#CBD5E1]">·</span>
        <span className="truncate max-w-[90px] text-[#94A3B8]" title={ticket.customerCompany}>
          {ticket.customerCompany}
        </span>

        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          {ticket.hasInternalNotes && (
            <span
              title="Contains confidential internal team notes"
              className="p-0.5 rounded bg-amber-50 border border-amber-200 text-amber-600"
            >
              <Lock className="w-2.5 h-2.5" />
            </span>
          )}

          {ticket.assigneeName ? (
            <div className="flex items-center gap-1 bg-[#F8FAFC] px-1.5 py-0.5 rounded border border-[#E2E8F0]">
              <Avatar name={ticket.assigneeName} size="sm" />
              <span className="truncate max-w-[70px] text-[10px] font-medium text-[#334155]">
                {ticket.assigneeName.split(' ')[0]}
              </span>
            </div>
          ) : (
            <span className="text-[10px] font-semibold text-[#D97706] bg-[#FFFBEB] px-1.5 py-0.5 rounded border border-[#FDE68A]">
              Unassigned
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
