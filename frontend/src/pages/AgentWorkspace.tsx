import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTickets, useResetDemo, useSystemClock, useSetClock } from '../hooks/useTickets';
import { usePersona } from '../hooks/usePersona';
import { IconRail } from '../components/IconRail';
import { TopBar } from '../components/TopBar';
import { TelemetryStrip } from '../components/TelemetryStrip';
import { LeftRail } from '../components/LeftRail';
import { TicketList } from '../components/TicketList';
import { TicketDetail } from '../components/TicketDetail';
import { InspectorPanel } from '../components/InspectorPanel';
import { CommandPalette } from '../components/CommandPalette';
import { EvaluatorGuideModal } from '../components/EvaluatorGuideModal';
import { ResetConfirmModal } from '../components/ResetConfirmModal';
import { DemoClockPopover } from '../components/DemoClockPopover';
import { KeyboardShortcutsLegend } from '../components/KeyboardShortcutsLegend';
import type { TicketSummary } from '../types/contracts';
import { TicketStatus, TicketPriority } from '../types/contracts';
import { getSLAOverallState, formatIST } from '../lib/utils';
import { List, MessageSquare, Info, Menu, Clock } from 'lucide-react';

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
  
  // Modals & Panels State
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showEvaluatorGuide, setShowEvaluatorGuide] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showClock, setShowClock] = useState(false);

  // Mobile navigation view state
  const [mobileTab, setMobileTab] = useState<'queue' | 'detail' | 'inspector'>('queue');

  const { data: allTickets = [] } = useTickets();
  const resetDemo = useResetDemo();
  const { data: clock } = useSystemClock();
  const setClock = useSetClock();

  // Sync URL → state
  useEffect(() => {
    if (urlTicketKey && urlTicketKey !== selectedTicketKey) {
      setSelectedTicketKey(urlTicketKey);
      setMobileTab('detail');
    }
  }, [urlTicketKey]);

  // Global Command Palette Shortcut (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
          t.customerName.toLowerCase().includes(q) ||
          t.customerCompany.toLowerCase().includes(q)
      );
    }

    return sortBySLAUrgency(tickets);
  }, [allTickets, activeQueue, priorityFilter, searchQuery, agentId]);

  const handleSelectTicket = useCallback(
    (key: string) => {
      setSelectedTicketKey(key);
      navigate(`/tickets/${key}`);
      setMobileTab('detail');
    },
    [navigate]
  );

  // Keyboard navigation: J/K move through filtered list
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
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

  const handleConfirmReset = () => {
    resetDemo.mutate(undefined, {
      onSuccess: () => {
        setShowResetModal(false);
      },
    });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-app)] text-[var(--content)] transition-colors duration-200">
      {/* ── Zone 1: 64px Icon Rail (Desktop only) ── */}
      <div className="hidden md:flex">
        <IconRail
          activeQueue={activeQueue}
          onSelectQueue={(q) => handleQueueFilter(q as QueueFilter)}
          onOpenEvaluatorGuide={() => setShowEvaluatorGuide(true)}
          onOpenShortcuts={() => setShowShortcuts(true)}
          onOpenCommandPalette={() => setShowCommandPalette(true)}
          onOpenResetModal={() => setShowResetModal(true)}
        />
      </div>

      {/* ── Main Workspace Body (TopBar + Content) ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TopBar */}
        <TopBar onOpenEvaluatorGuide={() => setShowEvaluatorGuide(true)} />

        {/* Simulation Clock Override Banner */}
        {clock?.isSimulated && (
          <div className="bg-amber-500/10 dark:bg-amber-950/50 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200 z-10 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 animate-pulse text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Simulated Time Active:</strong> Engine is evaluating SLA against simulated clock (
                {formatIST(clock.currentTime)}).
              </span>
            </div>
            <button
              type="button"
              onClick={() => setClock.mutate({ simulatedTime: null })}
              disabled={setClock.isPending}
              className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-medium text-[11px] transition-colors cursor-pointer shrink-0"
            >
              Return to Live Clock
            </button>
          </div>
        )}

        {/* Telemetry Strip */}
        <TelemetryStrip onFilterChange={handleQueueFilter} activeQueue={activeQueue} />

        {/* Mobile View Switcher (Only visible on screens < 768px) */}
        <div className="flex md:hidden border-b border-[var(--border)] bg-[var(--surface)] text-xs font-medium">
          <button
            onClick={() => setMobileTab('queue')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 ${
              mobileTab === 'queue' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-[var(--muted)]'
            }`}
          >
            <List className="w-4 h-4" /> Queue ({filteredTickets.length})
          </button>
          <button
            onClick={() => setMobileTab('detail')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 ${
              mobileTab === 'detail' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-[var(--muted)]'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Detail
          </button>
          <button
            onClick={() => setMobileTab('inspector')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 ${
              mobileTab === 'inspector' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-[var(--muted)]'
            }`}
          >
            <Info className="w-4 h-4" /> SLA
          </button>
        </div>

        {/* ── Zone 2, 3, 4: Rails & Panels ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Zone 2: 260px Operational Queue Navigation Rail */}
          <div className="hidden lg:flex w-[260px] flex-shrink-0">
            <LeftRail
              activeQueue={activeQueue}
              onQueueChange={handleQueueFilter}
              priorityFilter={priorityFilter}
              onPriorityChange={setPriorityFilter}
              tickets={allTickets}
              onShowShortcuts={() => setShowShortcuts(true)}
              onOpenResetModal={() => setShowResetModal(true)}
            />
          </div>

          {/* Ticket Queue List (Desktop always visible, Mobile conditionally) */}
          <div className={`w-full md:w-[340px] flex-shrink-0 ${mobileTab === 'queue' ? 'flex' : 'hidden md:flex'}`}>
            <TicketList
              tickets={filteredTickets}
              selectedKey={selectedTicketKey}
              onSelect={handleSelectTicket}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>

          {/* Zone 3: Flexible Ticket Detail Pane */}
          <div className={`flex-1 overflow-hidden min-w-0 ${mobileTab === 'detail' ? 'flex' : 'hidden md:flex'}`}>
            <TicketDetail ticketKey={selectedTicketKey} />
          </div>

          {/* Zone 4: 330px Intelligence Inspector Panel */}
          <div className={`w-full lg:w-[330px] flex-shrink-0 ${mobileTab === 'inspector' ? 'flex' : 'hidden xl:flex'}`}>
            <InspectorPanel ticketKey={selectedTicketKey} />
          </div>
        </div>
      </div>

      {/* ── Dialogs & Modals ── */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onOpenEvaluatorGuide={() => setShowEvaluatorGuide(true)}
        onOpenClock={() => setShowClock(true)}
        onOpenReset={() => setShowResetModal(true)}
      />

      <EvaluatorGuideModal
        isOpen={showEvaluatorGuide}
        onClose={() => setShowEvaluatorGuide(false)}
        onOpenClock={() => setShowClock(true)}
        onOpenReset={() => setShowResetModal(true)}
      />

      <ResetConfirmModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleConfirmReset}
        isPending={resetDemo.isPending}
      />

      {showShortcuts && <KeyboardShortcutsLegend onClose={() => setShowShortcuts(false)} />}
    </div>
  );
};
