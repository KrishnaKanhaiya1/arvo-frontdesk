import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, AlertTriangle, ExternalLink } from 'lucide-react';
import { useCustomerTickets, useCustomerTicket, useCustomerReply, useCustomerReopen } from '../hooks/useTickets';
import { usePersona } from '../hooks/usePersona';
import {
  getStatusColors,
  getStatusLabel,
  getPriorityColors,
  getSLAOverallState,
  formatIST,
  formatTimeAgo,
} from '../lib/utils';
import { TicketStatus, TicketPriority, MessageType } from '../types/contracts';
import type { TicketSummary } from '../types/contracts';
import { SLABadge } from './SLABadge';
import { Avatar } from './Avatar';

const CUSTOMER_ID = 'cust-acme';

export const CustomerView: React.FC = () => {
  const { ticketKey: urlTicketKey } = useParams<{ ticketKey: string }>();
  const navigate = useNavigate();
  const { customerId } = usePersona();

  const [selectedKey, setSelectedKey] = useState<string | null>(urlTicketKey || null);
  const [replyText, setReplyText] = useState('');
  const [showRawJson, setShowRawJson] = useState(false);

  const { data: tickets = [], isLoading: listLoading } = useCustomerTickets(CUSTOMER_ID);
  const { data: ticket, isLoading: detailLoading } = useCustomerTicket(selectedKey);
  const customerReply = useCustomerReply(selectedKey || '');
  const customerReopen = useCustomerReopen(selectedKey || '');

  const handleSelectTicket = (key: string) => {
    setSelectedKey(key);
    navigate(`/customer/tickets/${key}`);
    setReplyText('');
    setShowRawJson(false);
  };

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    customerReply.mutate(
      { customerId: CUSTOMER_ID, content: replyText.trim() },
      { onSuccess: () => setReplyText('') }
    );
  };

  const handleReopen = () => {
    customerReopen.mutate({ customerId: CUSTOMER_ID });
  };

  const isResolved = ticket?.status === TicketStatus.RESOLVED;
  const isClosed = ticket?.status === TicketStatus.CLOSED;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F6F7F9]">
      {/* Customer Header */}
      <header className="h-[52px] flex-shrink-0 flex items-center px-6 gap-3 bg-white border-b border-[#E5E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="w-7 h-7 bg-[#2563EB] rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 22 22 22" fill="none" />
            <line x1="7" y1="15" x2="17" y2="15" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-[#0F172A]">Arvo Customer Portal</span>
        <span className="text-xs text-[#94A3B8] font-mono ml-1">· ACME Corp</span>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
          <span className="bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] px-2 py-0.5 rounded-full text-[10px] font-semibold">
            Customer View
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Ticket List (left) */}
        <div className="w-[340px] flex-shrink-0 flex flex-col bg-white border-r border-[#E5E7EB] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5E7EB]">
            <h2 className="text-sm font-semibold text-[#0F172A]">My Support Tickets</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">ACME Corp · {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="flex-1 overflow-y-auto slim-scrollbar">
            {listLoading ? (
              <div className="p-4 text-xs text-[#94A3B8]">Loading…</div>
            ) : tickets.length === 0 ? (
              <div className="p-4 text-xs text-[#94A3B8] text-center">No tickets found</div>
            ) : (
              tickets.map(t => (
                <CustomerTicketRow
                  key={t.ticketKey}
                  ticket={t}
                  isSelected={t.ticketKey === selectedKey}
                  onSelect={() => handleSelectTicket(t.ticketKey)}
                />
              ))
            )}
          </div>
        </div>

        {/* Detail pane (right) */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {!selectedKey ? (
            <div className="flex-1 flex items-center justify-center text-xs text-[#94A3B8]">
              Select a ticket to view details
            </div>
          ) : detailLoading || !ticket ? (
            <div className="flex-1 flex items-center justify-center text-xs text-[#94A3B8]">
              Loading ticket…
            </div>
          ) : (
            <>
              {/* Detail header */}
              <div className="flex-shrink-0 px-6 py-4 border-b border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-mono text-xs font-semibold text-[#64748B]">{ticket.ticketKey}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getStatusColors(ticket.status)}`}>
                    {getStatusLabel(ticket.status)}
                  </span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${getPriorityColors(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                  <div className="ml-auto">
                    <SLABadge sla={ticket.sla} size="sm" />
                  </div>
                </div>
                <h1 className="text-sm font-semibold text-[#0F172A]">{ticket.subject}</h1>
                <p className="text-xs text-[#94A3B8] mt-1 font-mono">{formatIST(ticket.createdAt)}</p>
              </div>

              {/* Timeline */}
              <div className="flex-1 overflow-y-auto slim-scrollbar px-6 py-4 space-y-3 bg-[#F8FAFC]">
                {ticket.messages.map(msg => {
                  if (msg.type === MessageType.SYSTEM) {
                    return (
                      <div key={msg.id} className="flex items-center gap-2">
                        <div className="flex-1 h-px bg-[#E5E7EB]" />
                        <span className="text-[10px] text-[#94A3B8] font-mono px-2">{msg.content}</span>
                        <div className="flex-1 h-px bg-[#E5E7EB]" />
                      </div>
                    );
                  }
                  const isCustomer = msg.type === MessageType.CUSTOMER;
                  return (
                    <div
                      key={msg.id}
                      className={`rounded-lg p-3 border ${
                        isCustomer
                          ? 'bg-[#EFF6FF] border-[#BFDBFE] ml-8'
                          : 'bg-white border-[#E5E7EB] mr-8'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Avatar name={msg.senderName} size="sm" />
                        <span className="text-xs font-semibold text-[#0F172A]">{msg.senderName}</span>
                        {!isCustomer && (
                          <span className="text-[10px] text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.5 rounded">
                            Support Agent
                          </span>
                        )}
                        <span className="ml-auto font-mono text-[10px] text-[#94A3B8]">
                          {formatTimeAgo(msg.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-[#0F172A] whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                  );
                })}
              </div>

              {/* Reopen / Reply area */}
              <div className="flex-shrink-0 border-t border-[#E5E7EB] bg-white">
                {isClosed ? (
                  <div className="p-4">
                    <div className="flex items-start gap-3 p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg mb-3">
                      <AlertTriangle className="w-4 h-4 text-[#DC2626] flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-[#991B1B]">
                        <p className="font-semibold">Ticket Closed</p>
                        <p className="mt-0.5">The reopen window has expired. Please create a new ticket if you need further assistance.</p>
                      </div>
                    </div>
                  </div>
                ) : isResolved ? (
                  <div className="p-4">
                    <div className="flex items-start gap-3 p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg mb-3">
                      <div className="text-xs text-[#065F46]">
                        <p className="font-semibold">Ticket Resolved</p>
                        <p className="mt-0.5">Your issue has been marked as resolved. Reply here to reopen it within the reopen window.</p>
                      </div>
                    </div>
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Add your reply to reopen this ticket…"
                      rows={3}
                      className="w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 text-[#0F172A] placeholder-[#94A3B8] resize-none focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent mb-2"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => customerReopen.mutate({ customerId: CUSTOMER_ID })}
                        disabled={customerReopen.isPending}
                        className="px-3 py-1.5 text-xs font-semibold border border-[#E5E7EB] rounded-md text-[#475569] hover:bg-slate-50 transition-colors"
                      >
                        {customerReopen.isPending ? 'Reopening…' : 'Reopen Ticket'}
                      </button>
                      {replyText.trim() && (
                        <button
                          onClick={handleSendReply}
                          disabled={customerReply.isPending}
                          className="px-3 py-1.5 text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-md transition-colors"
                        >
                          {customerReply.isPending ? 'Sending…' : 'Reply & Reopen'}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Write a reply to the support team…"
                      rows={3}
                      className="w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 text-[#0F172A] placeholder-[#94A3B8] resize-none focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent mb-2"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handleSendReply}
                        disabled={!replyText.trim() || customerReply.isPending}
                        className="px-3 py-1.5 text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 text-white rounded-md transition-colors"
                      >
                        {customerReply.isPending ? 'Sending…' : 'Send Reply'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Raw JSON Drawer */}
                <div className="border-t border-[#E5E7EB]">
                  <button
                    onClick={() => setShowRawJson(s => !s)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-[#94A3B8] hover:text-[#475569] hover:bg-[#F8FAFC] transition-colors"
                  >
                    {showRawJson ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                    <ExternalLink className="w-3 h-3" />
                    <span>Inspect Customer API JSON</span>
                  </button>
                  {showRawJson && (
                    <pre className="p-4 text-[10px] font-mono bg-[#0F172A] text-[#94A3B8] overflow-auto max-h-48 leading-relaxed slim-scrollbar">
                      {JSON.stringify(ticket, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Customer Ticket Row ───────────────────────────────────────────────────────

const CustomerTicketRow: React.FC<{
  ticket: TicketSummary;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ ticket, isSelected, onSelect }) => {
  const slaState = getSLAOverallState(ticket.sla);
  return (
    <div
      onClick={onSelect}
      className={`py-3 px-4 cursor-pointer border-b border-[#E5E7EB] transition-colors ${
        isSelected ? 'bg-[#EFF6FF] border-l-[3px] border-l-[#2563EB] pl-[13px]' : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="font-mono text-xs text-[#64748B] font-medium">{ticket.ticketKey}</span>
        <span className={`text-[10px] font-medium px-1.5 py-0 rounded-full border ${getStatusColors(ticket.status)}`}>
          {getStatusLabel(ticket.status)}
        </span>
        <div className="ml-auto">
          <SLABadge sla={ticket.sla} size="sm" showLabel={false} />
        </div>
      </div>
      <div className="text-xs font-medium text-[#0F172A] truncate">{ticket.subject}</div>
      <div className="text-[10px] text-[#94A3B8] font-mono mt-0.5">{formatIST(ticket.createdAt)}</div>
    </div>
  );
};
