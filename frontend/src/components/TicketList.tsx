import React from 'react';
import { Search } from 'lucide-react';
import type { TicketSummary } from '../types/contracts';
import { TicketListItem } from './TicketListItem';

interface TicketListProps {
  tickets: TicketSummary[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const TicketList: React.FC<TicketListProps> = ({
  tickets,
  selectedKey,
  onSelect,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <div className="w-[350px] flex-shrink-0 flex flex-col bg-white border-r border-[#E5E7EB] overflow-hidden">
      {/* Search */}
      <div className="p-3 border-b border-[#E5E7EB]">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search tickets…"
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#E5E7EB] rounded-md bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB]"
          />
        </div>
      </div>

      {/* Sort indicator + count */}
      <div className="px-3 py-1.5 flex items-center justify-between border-b border-[#E5E7EB] bg-[#F8FAFC]">
        <span className="text-[10px] text-[#94A3B8] font-medium">Sorted by SLA Urgency</span>
        <span className="text-[10px] font-mono text-[#94A3B8]">{tickets.length}</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto slim-scrollbar">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-xs text-[#94A3B8] gap-1">
            <span>No tickets found</span>
          </div>
        ) : (
          tickets.map(ticket => (
            <TicketListItem
              key={ticket.ticketKey}
              ticket={ticket}
              isSelected={ticket.ticketKey === selectedKey}
              onSelect={() => onSelect(ticket.ticketKey)}
            />
          ))
        )}
      </div>
    </div>
  );
};
