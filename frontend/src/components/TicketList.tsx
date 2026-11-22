import React from 'react';
import { Search, ArrowUpDown, Info, Download } from 'lucide-react';
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
  const handleExportCSV = () => {
    if (tickets.length === 0) return;
    const headers = [
      'Ticket Key',
      'Subject',
      'Priority',
      'Status',
      'Customer Name',
      'Customer Company',
      'Assignee',
      'Created At',
      'First Response Breached',
      'First Response Deadline',
      'Resolution Breached',
      'Resolution Deadline',
    ];
    const rows = tickets.map(t => [
      `"${t.ticketKey}"`,
      `"${(t.customerName ? t.subject : t.subject || '').replace(/"/g, '""')}"`,
      t.priority,
      t.status,
      `"${(t.customerName || '').replace(/"/g, '""')}"`,
      `"${(t.customerCompany || '').replace(/"/g, '""')}"`,
      `"${(t.assigneeName || 'Unassigned').replace(/"/g, '""')}"`,
      `"${t.createdAt}"`,
      t.sla?.firstResponse?.breached ? 'YES' : 'NO',
      `"${t.sla?.firstResponse?.deadlineIST || ''}"`,
      t.sla?.resolution?.breached ? 'YES' : 'NO',
      `"${t.sla?.resolution?.deadlineIST || ''}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `arvo_queue_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full flex-shrink-0 flex flex-col bg-[var(--surface)] border-r border-[var(--border)] overflow-hidden transition-colors">
      {/* Search */}
      <div className="p-3 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search tickets, customers, keys…"
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-[var(--border)] rounded-lg bg-[var(--surface-subtle)] text-[var(--content)] placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Sort indicator + count + Export CSV */}
      <div className="px-3 py-1.5 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-subtle)]">
        <div 
          className="flex items-center gap-1.5 text-[10px] text-[var(--muted)] font-medium"
          title="Tickets are ranked deterministically: Breached first, followed by earliest active pending deadline (First Response if unresponded, else Resolution)"
        >
          <ArrowUpDown className="w-3 h-3 text-blue-500" />
          <span>Sorted by SLA Urgency</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[var(--muted)] font-semibold">{tickets.length} tickets</span>
          <button
            onClick={handleExportCSV}
            title="Export current queue to CSV spreadsheet"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)] text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors cursor-pointer"
          >
            <Download className="w-2.5 h-2.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto slim-scrollbar bg-[var(--surface)]">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-xs text-[var(--muted)] gap-2 p-4 text-center">
            <Info className="w-6 h-6 text-[var(--muted)] opacity-60" />
            <span>No tickets match the current queue and filter criteria.</span>
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
