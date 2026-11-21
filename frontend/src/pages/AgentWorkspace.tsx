import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTickets } from '../hooks/useTickets';
import { usePersona } from '../hooks/usePersona';
import { TopBar } from '../components/TopBar';
import { TelemetryStrip } from '../components/TelemetryStrip';
import { LeftRail } from '../components/LeftRail';
import { TicketList } from '../components/TicketList';
import { TicketDetail } from '../components/TicketDetail';
import { InspectorPanel } from '../components/InspectorPanel';
import { KeyboardShortcutsLegend } from '../components/KeyboardShortcutsLegend';
import type { TicketSummary } from '../types/contracts';
import { TicketStatus, TicketPriority } from '../types/contracts';
import { getSLAOverallState } from '../lib/utils';

export type QueueFilter =
  | 'all'
  | 'mine'
  | 'unassigned'
  | 'breached'
  | 'waiting'
  | 'resolved';

function sortBySLAUrgency(tickets: TicketSummary[]): TicketSummary[] {
  return [...tickets].sort((a, b) => {
    const aState = getSLAOverallState(a.sla);
    const bState = getSLAOverallState(b.sla);

    // Priority order: breached > at-risk > healthy > paused
    const rank = { breached: 0, 'at-risk': 1, healthy: 2, paused: 3 };
    if (rank[aState] !== rank[bState]) return rank[aState] - rank[bState];

    // Within same state sort by remaining time (closest deadline first)
    if (aState !== 'paused') {
      const aRemaining = a.sla.resolution.remainingBusinessMinutes;
      const bRemaining = b.sla.resolution.remainingBusinessMinutes;
      return aRemaining - bRemaining;
    }

    return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
  });
}

export const AgentWorkspace: React.FC = () => {
  const { ticketKey: urlTicketKey } = useParams<{ ticketKey: string }>();
  const navigate = useNavigate();
  const { agentId } = usePersona();

  const [selectedTicketKey, setSelectedTicketKey] = useState<string | null>(urlTicketKey || null);
  const [activeQueue, setActiveQueue] = useState<QueueFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);

  const { data: allTickets = [] } = useTickets();

  // Sync URL → state
  useEffect(() => {
    if (urlTicketKey && urlTicketKey !== selectedTicketKey) {
      setSelectedTicketKey(urlTicketKey);
    }
  }, [urlTicketKey]);

  // Filter tickets
  const filteredTickets = React.useMemo(() => {
    let tickets = allTickets;

    // Queue filter
    switch (activeQueue) {
      case 'mine':
        tickets = tickets.filter(t => t.assigneeId === agentId);
        break;
      case 'unassigned':
        tickets = tickets.filter(t => !t.assigneeId);
        break;
      case 'breached':
        tickets = tickets.filter(t => getSLAOverallState(t.sla) === 'breached');
        break;
      case 'waiting':
        tickets = tickets.filter(t => t.status === TicketStatus.WAITING_ON_CUSTOMER);
        break;
      case 'resolved':
        tickets = tickets.filter(
          t => t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED
        );
        break;
      case 'all':
      default:
        tickets = tickets.filter(
          t => t.status !== TicketStatus.RESOLVED && t.status !== TicketStatus.CLOSED
        );
        break;
    }

    // Priority filter
    if (priorityFilter) {
      tickets = tickets.filter(t => t.priority === priorityFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      tickets = tickets.filter(
        t =>
          t.ticketKey.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.customerName.toLowerCase().includes(q)
      );
    }

    return sortBySLAUrgency(tickets);
  }, [allTickets, activeQueue, priorityFilter, searchQuery, agentId]);

  const handleSelectTicket = useCallback(
    (key: string) => {
      setSelectedTicketKey(key);
      navigate(`/tickets/${key}`);
    },
    [navigate]
  );

  // Keyboard navigation: J/K move through filtered list
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      if (isTyping) return;

      if (e.key === 'j' || e.key === 'k') {
        const idx = filteredTickets.findIndex(t => t.ticketKey === selectedTicketKey);
        let next = idx;
        if (e.key === 'j') next = Math.min(idx + 1, filteredTickets.length - 1);
        if (e.key === 'k') next = Math.max(idx - 1, 0);
        if (filteredTickets[next]) handleSelectTicket(filteredTickets[next].ticketKey);
      }
      if (e.key === '?') setShowShortcuts(s => !s);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [filteredTickets, selectedTicketKey, handleSelectTicket]);

  const handleQueueFilter = (queue: QueueFilter) => {
    setActiveQueue(queue);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F6F7F9]">
      {/* TopBar */}
      <TopBar />

      {/* Telemetry Strip */}
      <TelemetryStrip onFilterChange={handleQueueFilter} activeQueue={activeQueue} />

      {/* Main 3-pane layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Rail */}
        <LeftRail
          activeQueue={activeQueue}
          onQueueChange={handleQueueFilter}
          priorityFilter={priorityFilter}
          onPriorityChange={setPriorityFilter}
          tickets={allTickets}
          onShowShortcuts={() => setShowShortcuts(true)}
        />

        {/* Ticket List */}
        <TicketList
          tickets={filteredTickets}
          selectedKey={selectedTicketKey}
          onSelect={handleSelectTicket}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Right pane: TicketDetail + InspectorPanel */}
        <div className="flex flex-1 overflow-hidden min-w-0">
          <TicketDetail ticketKey={selectedTicketKey} />
          <InspectorPanel ticketKey={selectedTicketKey} />
        </div>
      </div>

      {showShortcuts && <KeyboardShortcutsLegend onClose={() => setShowShortcuts(false)} />}
    </div>
  );
};
