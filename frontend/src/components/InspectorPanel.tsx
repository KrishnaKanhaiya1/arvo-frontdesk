import React, { useState } from 'react';
import {
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  History,
  FileText,
  User,
  Calendar,
  Layers,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  PauseCircle,
  PlayCircle,
  Database,
  Link2
} from 'lucide-react';
import { useAuditLog, useChangeStatus, useTicket } from '../hooks/useTickets';
import { usePersona } from '../hooks/usePersona';
import { formatIST, formatMinutes, getStatusColors, getStatusLabel, getPriorityColors } from '../lib/utils';
import { TicketStatus } from '../types/contracts';

interface InspectorPanelProps {
  ticketKey: string | null;
}

type InspectorTab = 'overview' | 'sla' | 'audit';

function SLAProgressBar({
  elapsed,
  target,
  breached,
  met,
}: {
  elapsed: number;
  target: number;
  breached: boolean;
  met: boolean;
}) {
  const pct = target > 0 ? Math.min((elapsed / target) * 100, 100) : 0;
  return (
    <div className="w-full h-2 bg-[var(--border)] rounded-full overflow-hidden mt-1.5">
      <div
        className={`h-full rounded-full transition-all duration-300 ${
          met ? 'bg-emerald-500' : breached ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-blue-600'
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({ ticketKey }) => {
  const [activeTab, setActiveTab] = useState<InspectorTab>('overview');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { data: ticket } = useTicket(ticketKey);
  const { data: auditLog = [] } = useAuditLog(ticketKey);
  const { agentId } = usePersona();
  const changeStatus = useChangeStatus(ticketKey || '');

  if (!ticketKey || !ticket) {
    return (
      <aside className="hidden lg:flex w-[330px] flex-shrink-0 bg-[var(--surface-subtle)] border-l border-[var(--border)] flex-col items-center justify-center p-6 text-center text-[var(--muted)]">
        <Layers className="w-8 h-8 stroke-[1.5] mb-2 text-[var(--subtle)]" />
        <span className="text-xs font-medium">Select a ticket to inspect SLA metrics and immutable audit history.</span>
      </aside>
    );
  }

  const { sla } = ticket;

  const handleStatusChange = (status: TicketStatus) => {
    if (!agentId) return;
    changeStatus.mutate({ agentId, newStatus: status, version: ticket.version });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const isClosed = ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED;

  return (
    <aside className="w-full lg:w-[330px] flex-shrink-0 flex flex-col bg-[var(--surface)] border-l border-[var(--border)] overflow-hidden select-none">
      {/* 3-Tab Header Navigation */}
      <div className="flex border-b border-[var(--border)] bg-[var(--surface-subtle)] flex-shrink-0">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600 bg-[var(--surface)]'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--content)]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Overview</span>
        </button>
        <button
          onClick={() => setActiveTab('sla')}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'sla'
              ? 'border-blue-600 text-blue-600 bg-[var(--surface)]'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--content)]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>SLA Metrics</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'audit'
              ? 'border-blue-600 text-blue-600 bg-[var(--surface)]'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--content)]'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Audit ({auditLog.length})</span>
        </button>
      </div>

      {/* Tab 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 slim-scrollbar">
          {/* Ticket Header & Status */}
          <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs font-bold text-[var(--content)]">{ticket.ticketKey}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getStatusColors(ticket.status)}`}>
                {getStatusLabel(ticket.status)}
              </span>
            </div>
            <h4 className="text-xs font-semibold text-[var(--content)] line-clamp-2">{ticket.subject}</h4>
            <div className="mt-2.5 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--muted)] font-mono">
              <span>Priority:</span>
              <span className={`font-semibold px-1.5 py-0.2 rounded border ${getPriorityColors(ticket.priority)}`}>
                {ticket.priority}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--muted)] font-mono">
              <span>CAS Version:</span>
              <span className="font-semibold text-[var(--content)]">v{ticket.version}</span>
            </div>
          </div>

          {/* Customer & Company Details */}
          <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-2.5">
            <div className="text-[10px] uppercase font-bold text-[var(--muted)] font-mono tracking-wider">
              Requester Profile
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center">
                {ticket.customerName.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-[var(--content)] truncate">{ticket.customerName}</div>
                <div className="text-[11px] text-[var(--muted)] truncate">{ticket.customerCompany}</div>
              </div>
            </div>
            <div className="pt-2 border-t border-[var(--border)] text-[11px] text-[var(--muted)] space-y-1">
              <div className="flex justify-between">
                <span>Created:</span>
                <span className="font-mono text-[var(--content)]">{formatIST(ticket.createdAt)}</span>
              </div>
              {ticket.resolvedAt && (
                <div className="flex justify-between">
                  <span>Resolved:</span>
                  <span className="font-mono text-emerald-600">{formatIST(ticket.resolvedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Assignee Card */}
          <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-2">
            <div className="text-[10px] uppercase font-bold text-[var(--muted)] font-mono tracking-wider">
              Assigned Specialist
            </div>
            {ticket.assigneeName ? (
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center">
                  {ticket.assigneeName.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="text-xs font-semibold text-[var(--content)]">{ticket.assigneeName}</div>
              </div>
            ) : (
              <div className="text-xs text-amber-600 font-medium">Unassigned (Available to claim)</div>
            )}
          </div>

          {/* Quick Lifecycle Status Actions */}
          {!isClosed && (
            <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-2">
              <div className="text-[10px] uppercase font-bold text-[var(--muted)] font-mono tracking-wider">
                Status Transitions
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleStatusChange(TicketStatus.WAITING_ON_CUSTOMER)}
                  disabled={changeStatus.isPending || ticket.status === TicketStatus.WAITING_ON_CUSTOMER}
                  className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-subtle)] text-[var(--content)] text-xs font-medium transition-colors"
                >
                  Wait on Customer
                </button>
                <button
                  onClick={() => handleStatusChange(TicketStatus.RESOLVED)}
                  disabled={changeStatus.isPending}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow transition-colors"
                >
                  Resolve Ticket
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: SLA METRICS & BUSINESS HOURS */}
      {activeTab === 'sla' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 slim-scrollbar">
          {/* Business Hours Status Banner */}
          <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--content)]">SLA Business Window</span>
              <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                09:30–18:30 IST
              </span>
            </div>
            <p className="text-[11px] text-[var(--muted)] leading-relaxed">
              Timers advance strictly during business hours (Mon–Fri). Weekends and 21 gazetted Indian holidays are paused with zero elapsed minutes.
            </p>
            {sla.isPaused && (
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-1.5">
                <PauseCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="font-medium">Clock Paused: {sla.pauseReason?.replace(/_/g, ' ').toUpperCase()}</span>
              </div>
            )}
          </div>

          {/* First Response Meter */}
          <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--content)]">First Response SLA</span>
              <span className={`font-mono text-xs font-bold ${
                sla.firstResponse.met ? 'text-emerald-600' : sla.firstResponse.breached ? 'text-red-600' : 'text-blue-600'
              }`}>
                {sla.firstResponse.met ? 'MET' : sla.firstResponse.breached ? 'BREACHED' : `${sla.firstResponse.remainingBusinessMinutes}m remaining`}
              </span>
            </div>
            <SLAProgressBar
              elapsed={sla.firstResponse.elapsedBusinessMinutes}
              target={sla.firstResponse.targetMinutes}
              breached={sla.firstResponse.breached}
              met={sla.firstResponse.met}
            />
            <div className="flex justify-between text-[10px] font-mono text-[var(--muted)] pt-1">
              <span>Target: {formatMinutes(sla.firstResponse.targetMinutes)}</span>
              <span>Elapsed: {formatMinutes(sla.firstResponse.elapsedBusinessMinutes)}</span>
            </div>
            <div className="pt-2 border-t border-[var(--border)] text-[10px] font-mono text-[var(--muted)] flex justify-between">
              <span>Deadline (IST):</span>
              <span className="text-[var(--content)]">{sla.firstResponse.deadlineIST ? formatIST(sla.firstResponse.deadlineIST) : 'None'}</span>
            </div>
          </div>

          {/* Resolution SLA Meter */}
          <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--content)]">Resolution SLA</span>
              <span className={`font-mono text-xs font-bold ${
                sla.resolution.met ? 'text-emerald-600' : sla.resolution.breached ? 'text-red-600' : 'text-blue-600'
              }`}>
                {sla.resolution.met ? 'MET' : sla.resolution.breached ? 'BREACHED' : `${sla.resolution.remainingBusinessMinutes}m remaining`}
              </span>
            </div>
            <SLAProgressBar
              elapsed={sla.resolution.elapsedBusinessMinutes}
              target={sla.resolution.targetMinutes}
              breached={sla.resolution.breached}
              met={sla.resolution.met}
            />
            <div className="flex justify-between text-[10px] font-mono text-[var(--muted)] pt-1">
              <span>Target: {formatMinutes(sla.resolution.targetMinutes)}</span>
              <span>Elapsed: {formatMinutes(sla.resolution.elapsedBusinessMinutes)}</span>
            </div>
            <div className="pt-2 border-t border-[var(--border)] text-[10px] font-mono text-[var(--muted)] flex justify-between">
              <span>Deadline (IST):</span>
              <span className="text-[var(--content)]">{sla.resolution.deadlineIST ? formatIST(sla.resolution.deadlineIST) : 'None'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: STRUCTURED IMMUTABLE AUDIT LOG */}
      {activeTab === 'audit' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 slim-scrollbar">
          {/* Tamper-Proof Trigger Shield */}
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-xs flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <div>
              <strong className="block font-semibold">PostgreSQL Engine Immutability</strong>
              <span className="text-[10px] text-blue-600 dark:text-blue-400">Append-only ledger. UPDATE and DELETE statements are blocked.</span>
            </div>
          </div>

          {/* Audit Event Cards */}
          {auditLog.map((entry) => {
            const hasMetadata = entry.metadata && Object.keys(entry.metadata).length > 0;
            return (
              <div
                key={entry.id}
                className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    {entry.action.replace(/_/g, ' ')}
                  </span>
                  <button
                    onClick={() => copyToClipboard(entry.createdAt, `iso-${entry.id}`)}
                    className="flex items-center gap-1 text-[10px] text-[var(--muted)] hover:text-[var(--content)] font-mono"
                    title="Copy ISO Timestamp"
                  >
                    {copiedId === `iso-${entry.id}` ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{formatIST(entry.createdAt)}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-[var(--content)] font-medium">
                  <span>{entry.actorName}</span>
                  <span className="text-[10px] font-mono text-[var(--muted)] uppercase px-1.5 py-0.2 bg-[var(--surface-subtle)] rounded border border-[var(--border)]">
                    {entry.actorType}
                  </span>
                </div>

                {/* Structured Metadata */}
                {hasMetadata && (
                  <div className="mt-1.5 p-2 rounded bg-[var(--surface-subtle)] border border-[var(--border)] text-[10px] font-mono text-[var(--content-subtle)] overflow-x-auto">
                    {Object.entries(entry.metadata).map(([k, v]) => (
                      <div key={k} className="flex justify-between py-0.5">
                        <span className="text-[var(--muted)]">{k}:</span>
                        <span className="font-semibold text-right truncate max-w-[170px]">{JSON.stringify(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
};
