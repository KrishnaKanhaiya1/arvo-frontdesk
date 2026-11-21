import React from 'react';
import { Lock } from 'lucide-react';
import type { TicketSummary } from '../types/contracts';
import { getPriorityColors, getStatusColors } from '../lib/utils';
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
      className={`py-3 px-3.5 cursor-pointer border-b border-[#E5E7EB] transition-colors ${
        isSelected
          ? 'bg-[#EFF6FF] border-l-[3px] border-l-[#2563EB] pl-[11px]'
          : 'hover:bg-gray-50'
      }`}
    >
      {/* Line 1: Key + Priority + SLA */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className="font-mono text-xs text-[#64748B] font-medium">{ticket.ticketKey}</span>
        <span className={`text-[10px] font-semibold px-1.5 py-0 rounded border ${getPriorityColors(ticket.priority)}`}>
          {ticket.priority}
        </span>
        <div className="ml-auto">
          <SLABadge sla={ticket.sla} size="sm" />
        </div>
      </div>

      {/* Line 2: Subject */}
      <div className="text-sm font-medium text-[#0F172A] truncate leading-snug mb-1">
        {ticket.subject}
      </div>

      {/* Line 3: Customer · Assignee */}
      <div className="flex items-center gap-1.5 text-[11px] text-[#475569]">
        <span className="truncate max-w-[100px]">{ticket.customerName}</span>
        <span className="text-[#CBD5E1]">·</span>
        {ticket.assigneeName ? (
          <div className="flex items-center gap-1">
            <Avatar name={ticket.assigneeName} size="sm" />
            <span className="truncate max-w-[80px]">{ticket.assigneeName}</span>
          </div>
        ) : (
          <span className="text-[#D97706] font-medium">Unassigned</span>
        )}
        {ticket.hasInternalNotes && (
          <span title="Has internal notes" className="ml-auto flex-shrink-0">
            <Lock className="w-3 h-3 text-[#94A3B8]" />
          </span>
        )}
      </div>
    </div>
  );
};
