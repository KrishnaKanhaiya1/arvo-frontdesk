import React, { useState } from 'react';
import { Shield, Clock } from 'lucide-react';
import { useAuditLog, useChangeStatus } from '../hooks/useTickets';
import { usePersona } from '../hooks/usePersona';
import { formatIST, formatMinutes, getStatusColors, getStatusLabel } from '../lib/utils';
import { TicketStatus } from '../types/contracts';
import type { TicketDetail } from '../types/contracts';
import { useTicket } from '../hooks/useTickets';

interface InspectorPanelProps {
  ticketKey: string | null;
}

function SLAProgressBar({ elapsed, target, breached, met }: {
  elapsed: number;
  target: number;
  breached: boolean;
  met: boolean;
}) {
  const pct = target > 0 ? Math.min((elapsed / target) * 100, 100) : 0;
  return (
    <div className="w-full h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${
          met ? 'bg-[#059669]' : breached ? 'bg-[#DC2626]' : pct > 80 ? 'bg-[#D97706]' : 'bg-[#2563EB]'
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({ ticketKey }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'audit'>('details');
  const { data: ticket } = useTicket(ticketKey);
  const { data: auditLog = [] } = useAuditLog(ticketKey);
  const { agentId } = usePersona();
  const changeStatus = useChangeStatus(ticketKey || '');

  if (!ticketKey || !ticket) {
    return (
      <div className="w-[300px] flex-shrink-0 bg-[#F8FAFC] border-l border-[#E5E7EB]" />
    );
  }

  const { sla } = ticket;

  const handleStatusChange = (status: TicketStatus) => {
    if (!agentId) return;
    changeStatus.mutate({ agentId, newStatus: status, version: ticket.version });
  };

  const isClosed = ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED;

  return (
    <div className="w-[300px] flex-shrink-0 flex flex-col bg-[#F8FAFC] border-l border-[#E5E7EB] overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-[#E5E7EB] bg-white flex-shrink-0">
        <button
          onClick={() => setActiveTab('details')}
          className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'details'
              ? 'border-[#2563EB] text-[#2563EB] bg-white'
              : 'border-transparent text-[#475569] hover:text-[#0F172A]'
          }`}
        >
          Details &amp; SLA
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'audit'
              ? 'border-[#2563EB] text-[#2563EB] bg-white'
              : 'border-transparent text-[#475569] hover:text-[#0F172A]'
          }`}
        >
          Audit Log
        </button>
      </div>

      {activeTab === 'details' ? (
        <div className="flex-1 overflow-y-auto slim-scrollbar p-4 space-y-4">
          {/* SLA Section */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-3">
              SLA Tracking
            </div>

            {/* First Response */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5 text-xs">
                <span className="font-medium text-[#475569]">First Response</span>
                <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                  sla.firstResponse.met
                    ? 'bg-[#ECFDF5] text-[#059669]'
                    : sla.firstResponse.breached
                    ? 'bg-[#FEF2F2] text-[#DC2626]'
                    : 'bg-[#EFF6FF] text-[#2563EB]'
                }`}>
                  {sla.firstResponse.met ? '✓ Met' : sla.firstResponse.breached ? 'Breached' : 'Active'}
                </span>
              </div>
              <SLAProgressBar
                elapsed={sla.firstResponse.elapsedBusinessMinutes}
                target={sla.firstResponse.targetMinutes}
                breached={sla.firstResponse.breached}
                met={sla.firstResponse.met}
              />
              <div className="flex justify-between mt-1 text-[10px] font-mono text-[#94A3B8]">
                <span>{formatMinutes(sla.firstResponse.elapsedBusinessMinutes)} elapsed</span>
                <span>/ {formatMinutes(sla.firstResponse.targetMinutes)} target</span>
              </div>
            </div>

            {/* Resolution */}
            <div>
              <div className="flex items-center justify-between mb-1.5 text-xs">
                <span className="font-medium text-[#475569]">Resolution</span>
                <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                  sla.resolution.met
                    ? 'bg-[#ECFDF5] text-[#059669]'
                    : sla.resolution.breached
                    ? 'bg-[#FEF2F2] text-[#DC2626]'
                    : 'bg-[#EFF6FF] text-[#2563EB]'
                }`}>
                  {sla.resolution.met ? '✓ Met' : sla.resolution.breached ? 'Breached' : 'Active'}
                </span>
              </div>
              <SLAProgressBar
                elapsed={sla.resolution.elapsedBusinessMinutes}
                target={sla.resolution.targetMinutes}
                breached={sla.resolution.breached}
                met={sla.resolution.met}
              />
              <div className="flex justify-between mt-1 text-[10px] font-mono text-[#94A3B8]">
                <span>{formatMinutes(sla.resolution.elapsedBusinessMinutes)} elapsed</span>
                <span>/ {formatMinutes(sla.resolution.targetMinutes)} target</span>
              </div>
            </div>

            {sla.isPaused && (
              <div className="mt-3 p-2 bg-[#FFFBEB] border border-[#FDE68A] rounded text-[11px] text-[#92400E]">
                ⏸ SLA paused · {sla.pauseReason === 'waiting_on_customer' ? 'Waiting on customer' : 'Off-hours'}
              </div>
            )}
          </div>

          {/* Status Actions */}
          {!isClosed && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-2">
                Status Actions
              </div>
              <div className="flex flex-col gap-1.5">
                {ticket.status !== TicketStatus.WAITING_ON_CUSTOMER && (
                  <button
                    onClick={() => handleStatusChange(TicketStatus.WAITING_ON_CUSTOMER)}
                    disabled={changeStatus.isPending}
                    className="px-3 py-2 text-xs font-medium text-left rounded-md border border-[#FDE68A] bg-[#FFFBEB] text-[#92400E] hover:bg-[#FEF9C3] transition-colors disabled:opacity-50"
                  >
                    Mark Waiting on Customer
                  </button>
                )}
                {ticket.status === TicketStatus.WAITING_ON_CUSTOMER && (
                  <button
                    onClick={() => handleStatusChange(TicketStatus.ASSIGNED)}
                    disabled={changeStatus.isPending}
                    className="px-3 py-2 text-xs font-medium text-left rounded-md border border-[#A7F3D0] bg-[#ECFDF5] text-[#065F46] hover:bg-[#D1FAE5] transition-colors disabled:opacity-50"
                  >
                    Resume (Back to Assigned)
                  </button>
                )}
                <button
                  onClick={() => handleStatusChange(TicketStatus.RESOLVED)}
                  disabled={changeStatus.isPending}
                  className="px-3 py-2 text-xs font-medium text-left rounded-md border border-[#CBD5E1] bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0] transition-colors disabled:opacity-50"
                >
                  Resolve Ticket
                </button>
              </div>
            </div>
          )}

          {/* Ticket Meta */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-2">
              Details
            </div>
            <dl className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-[#94A3B8]">Customer</dt>
                <dd className="font-medium text-[#0F172A]">{ticket.customerName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#94A3B8]">Company</dt>
                <dd className="font-medium text-[#0F172A]">{ticket.customerCompany}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#94A3B8]">Created</dt>
                <dd className="font-mono text-[10px] text-[#475569]">{formatIST(ticket.createdAt)}</dd>
              </div>
              {ticket.firstResponseAt && (
                <div className="flex justify-between">
                  <dt className="text-[#94A3B8]">First Reply</dt>
                  <dd className="font-mono text-[10px] text-[#475569]">{formatIST(ticket.firstResponseAt)}</dd>
                </div>
              )}
              {ticket.resolvedAt && (
                <div className="flex justify-between">
                  <dt className="text-[#94A3B8]">Resolved</dt>
                  <dd className="font-mono text-[10px] text-[#475569]">{formatIST(ticket.resolvedAt)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-[#94A3B8]">Version</dt>
                <dd className="font-mono text-[10px] text-[#94A3B8]">v{ticket.version}</dd>
              </div>
            </dl>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto slim-scrollbar">
          {/* Audit header */}
          <div className="px-4 py-2.5 border-b border-[#E5E7EB] bg-white flex-shrink-0 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#2563EB]" />
            <span className="text-[10px] font-semibold text-[#2563EB] tracking-wide">
              Immutable · Append-Only
            </span>
          </div>
          <div className="p-3 space-y-2">
            {auditLog.length === 0 ? (
              <div className="text-xs text-[#94A3B8] text-center py-4">No audit entries yet</div>
            ) : (
              [...auditLog].reverse().map(entry => (
                <div
                  key={entry.id}
                  className="bg-white border border-[#E5E7EB] rounded-md p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-semibold text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.5 rounded">
                      {entry.action.replace(/_/g, ' ')}
                    </span>
                    <span className="font-mono text-[9px] text-[#94A3B8]">
                      {formatIST(entry.createdAt)}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#475569]">
                    <span className="font-medium">{entry.actorName}</span>
                    <span className="text-[#94A3B8]"> · {entry.actorType}</span>
                  </div>
                  {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                    <div className="mt-1 font-mono text-[9px] text-[#94A3B8] bg-[#F8FAFC] rounded p-1 overflow-hidden">
                      {Object.entries(entry.metadata).map(([k, v]) => (
                        <div key={k} className="truncate">
                          <span className="text-[#64748B]">{k}:</span> {JSON.stringify(v)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
