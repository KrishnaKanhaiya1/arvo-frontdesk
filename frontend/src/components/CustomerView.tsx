import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronDown, 
  ChevronRight, 
  AlertTriangle, 
  ExternalLink, 
  Link2, 
  X, 
  ShieldCheck, 
  Lock, 
  Send, 
  RotateCcw, 
  Sun, 
  Moon, 
  ArrowLeft,
  CheckCircle2,
  Building2,
  Clock,
  LogOut,
  Save,
  CheckCircle,
  Database,
  ShieldAlert,
  Loader2,
  Plus
} from 'lucide-react';
import { useCustomerTickets, useCustomerTicket, useCustomerReply, useCustomerReopen, useCreateTicket } from '../hooks/useTickets';
import { usePersona } from '../hooks/usePersona';
import { useTheme } from '../hooks/useTheme';
import { NewTicketDialog } from './NewTicketDialog';
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

export const CustomerView: React.FC = () => {
  const { ticketKey: urlTicketKey } = useParams<{ ticketKey: string }>();
  const navigate = useNavigate();
  const { 
    customerId: currentCustomerId, 
    customerName, 
    customerCompany, 
    customerInitials, 
    customerColor, 
    role, 
    logout 
  } = usePersona();
  const { theme, toggleTheme } = useTheme();

  // Protect customer portal: route staff users to agent workspace
  React.useEffect(() => {
    if (role && role !== 'customer') {
      navigate('/tickets');
    }
  }, [role, navigate]);

  // Use the session customerId (empty string falls back gracefully to session-derived customer on server)
  const activeCustomerId = currentCustomerId || '';

  const [selectedKey, setSelectedKey] = useState<string | null>(urlTicketKey || null);
  const [replyText, setReplyText] = useState('');
      const [showNewTicketModal, setShowNewTicketModal] = useState(false);

  // Linked Follow-up Ticket Dialog state
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpSubject, setFollowUpSubject] = useState('');
  const [followUpDescription, setFollowUpDescription] = useState('');
  const [followUpPriority, setFollowUpPriority] = useState<TicketPriority>(TicketPriority.MEDIUM);

  const { data: tickets = [], isLoading: listLoading } = useCustomerTickets(activeCustomerId);
  const { data: ticket, isLoading: detailLoading, isError: detailError } = useCustomerTicket(selectedKey);
  const customerReply = useCustomerReply(selectedKey || '');
  const customerReopen = useCustomerReopen(selectedKey || '');
  const createTicket = useCreateTicket();

  // Auto-select first ticket if none selected to avoid wasted empty space
  React.useEffect(() => {
    if (!selectedKey && tickets.length > 0) {
      setSelectedKey(tickets[0].ticketKey);
      navigate(`/customer/tickets/${tickets[0].ticketKey}`, { replace: true });
    }
  }, [tickets, selectedKey, navigate]);

  // Dynamic document title
  React.useEffect(() => {
    document.title = selectedKey ? `${selectedKey} – Customer Portal` : 'Customer Portal – Arvo Frontdesk';
  }, [selectedKey]);

  // Restore saved drafts when switching ticket
  React.useEffect(() => {
    if (selectedKey) {
      const saved = localStorage.getItem(`arvo_cust_draft_${selectedKey}`) || '';
      setReplyText(saved);
    }
  }, [selectedKey]);

  const handleReplyChange = (val: string) => {
    setReplyText(val);
    if (selectedKey) {
      if (val.trim()) {
        localStorage.setItem(`arvo_cust_draft_${selectedKey}`, val);
      } else {
        localStorage.removeItem(`arvo_cust_draft_${selectedKey}`);
      }
    }
  };

  const handleSelectTicket = (key: string) => {
    setSelectedKey(key);
    navigate(`/customer/tickets/${key}`);
  };

  const isResolved = ticket?.status === TicketStatus.RESOLVED;
  const isClosed = ticket?.status === TicketStatus.CLOSED;

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    customerReply.mutate(
      { customerId: activeCustomerId, content: replyText.trim(), reopen: isResolved },
      { 
        onSuccess: () => {
          setReplyText('');
          if (selectedKey) localStorage.removeItem(`arvo_cust_draft_${selectedKey}`);
        } 
      }
    );
  };

  const handleCreateFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpSubject.trim() || !ticket) return;

    createTicket.mutate(
      {
        customerId: activeCustomerId,
        subject: followUpSubject.trim(),
        description: followUpDescription.trim() || `Follow-up to previous ticket ${ticket.ticketKey}`,
        priority: followUpPriority,
        linkedFromTicketId: ticket.id,
      },
      {
        onSuccess: (newTicket: any) => {
          setShowFollowUpModal(false);
          setFollowUpSubject('');
          setFollowUpDescription('');
          handleSelectTicket(newTicket.ticketKey);
        },
      }
    );
  };

  const handleReopen = () => {
    customerReopen.mutate({ customerId: activeCustomerId });
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg-app)] text-[var(--content)] transition-colors duration-200">
      {/* ── Customer Portal Header ── */}
      <header className="h-[54px] flex-shrink-0 flex items-center px-4 sm:px-6 gap-3 bg-[var(--surface)] border-b border-[var(--border)] shadow-[var(--card-shadow)] z-20">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm font-bold text-sm">
          A
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[var(--content)] font-['Archivo',sans-serif]">
              {customerCompany || 'Arvo Customer Care'}
            </span>
            <span className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono hidden sm:inline">
              Verified Client Portal
            </span>
          </div>
          <span className="text-[10px] text-[var(--muted)] font-mono truncate max-w-[140px] sm:max-w-none">
            {customerName || 'Client'} · Enterprise Tier SLA
          </span>
        </div>

        <div className="flex-1" />

        {/* Right Header Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* New Ticket CTA */}
          <button
            onClick={() => setShowNewTicketModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">New Ticket</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-subtle)] text-[var(--muted)] transition-colors cursor-pointer"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Client Sign Out */}
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--muted)] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/40 border border-[var(--border)] transition-all cursor-pointer shadow-xs whitespace-nowrap"
            title="Sign out of Client Portal"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>

          {/* Customer Avatar */}
          <div
            className="w-8 h-8 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs"
            style={{ backgroundColor: customerColor || '#DC2626' }}
            title={`${customerName} (${customerCompany || 'Client'})`}
          >
            {customerInitials || 'CU'}
          </div>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Ticket List (left) - Hidden on mobile if a ticket is selected */}
        <div className={`w-full sm:w-[340px] flex-shrink-0 flex-col bg-[var(--surface)] border-r border-[var(--border)] overflow-hidden ${
          selectedKey ? 'hidden sm:flex' : 'flex'
        }`}>
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-subtle)]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--content)] font-mono">
              My Support Requests
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'} on record
            </p>
          </div>

          <div className="flex-1 overflow-y-auto slim-scrollbar">
            {listLoading ? (
              <div className="p-4 text-xs text-[var(--muted)]">Loading your tickets…</div>
            ) : tickets.length === 0 ? (
              <div className="p-6 text-xs text-[var(--muted)] text-center flex flex-col items-center gap-2.5">
                <Building2 className="w-8 h-8 text-[var(--subtle)] stroke-[1.5]" />
                <span className="font-semibold text-[var(--content)]">No support requests yet</span>
                <span className="text-[11px] text-[var(--muted)] leading-relaxed">Submit a ticket to start receiving SLA-tracked enterprise support.</span>
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(true)}
                  className="mt-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Create First Ticket
                </button>
              </div>
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

        {/* Detail pane (right) - Shown on mobile when a ticket is selected */}
        <div className={`flex-1 flex-col overflow-hidden min-w-0 bg-[var(--bg-app)] ${
          selectedKey ? 'flex' : 'hidden sm:flex'
        }`}>
          {!selectedKey ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[var(--muted)]">
              <Building2 className="w-10 h-10 stroke-[1.2] mb-3 text-[var(--subtle)]" />
              <p className="text-xs font-medium max-w-sm mb-3">
                {tickets.length === 0 
                  ? "Welcome to your Customer Portal. Submit your first support request to track real-time SLA countdowns." 
                  : "Select a support ticket from the list to view conversation history and resolution progress."}
              </p>
              {tickets.length === 0 && (
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Create First Support Ticket
                </button>
              )}
            </div>
          ) : detailLoading ? (
            <div className="flex-1 flex items-center justify-center text-xs text-[var(--muted)]">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <span>Loading ticket details…</span>
              </div>
            </div>
          ) : detailError || !ticket ? (
            <div className="flex-1 flex items-center justify-center p-6 text-[var(--muted)]">
              <div className="max-w-md w-full text-center bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-sm">
                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600 dark:text-amber-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-[var(--content)] mb-1">Ticket Unavailable</h3>
                <p className="text-xs text-[var(--muted)] mb-5 leading-relaxed">
                  Ticket <strong>{selectedKey}</strong> does not exist or belongs to another organization. Customer access is strictly restricted to your organization's tickets.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedKey(null);
                    navigate('/customer');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Return to My Tickets
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Detail header */}
              <div className="flex-shrink-0 px-4 sm:px-6 py-3.5 border-b border-[var(--border)] bg-[var(--surface)] shadow-[var(--card-shadow)]">
                {/* Mobile Back Button */}
                <div className="sm:hidden mb-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedKey(null);
                      navigate('/customer');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)] text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-[var(--surface)] transition-colors cursor-pointer shadow-2xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>← All Tickets</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-[var(--content)]">{ticket.ticketKey}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getStatusColors(ticket.status)}`}>
                    {getStatusLabel(ticket.status)}
                  </span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${getPriorityColors(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                  {ticket.linkedFromTicketKey && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-blue-600 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded font-mono">
                      <Link2 className="w-2.5 h-2.5" />
                      Follow-up from {ticket.linkedFromTicketKey}
                    </span>
                  )}
                  {ticket.linkedToTicketKey && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded font-mono">
                      <Link2 className="w-2.5 h-2.5" />
                      Follow-up: {ticket.linkedToTicketKey}
                    </span>
                  )}
                  <div className="ml-auto">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getPriorityColors(ticket.priority)}`}>{ticket.priority} Priority</span>
                  </div>
                </div>
                <h1 className="text-base font-bold text-[var(--content)] font-['Archivo',sans-serif]">{ticket.subject}</h1>
                <p className="text-xs text-[var(--muted)] mt-1 font-mono">Created {formatIST(ticket.createdAt)}</p>
              </div>

              {/* Timeline */}
              <div className="flex-1 overflow-y-auto slim-scrollbar px-6 py-4 space-y-3">
                {ticket.messages.map(msg => {
                  if (msg.type === MessageType.SYSTEM) {
                    return (
                      <div key={msg.id} className="flex items-center justify-center my-3">
                        <div className="flex-1 h-px bg-[var(--border)]" />
                        <span className="text-[10px] font-mono text-[var(--muted)] px-3 py-0.5 rounded-full bg-[var(--surface-subtle)] border border-[var(--border)] mx-2 shadow-2xs">
                          {msg.content} · {formatIST(msg.createdAt)}
                        </span>
                        <div className="flex-1 h-px bg-[var(--border)]" />
                      </div>
                    );
                  }
                  const isCustomer = msg.type === MessageType.CUSTOMER;
                  return isCustomer ? (
                    <div key={msg.id} className="flex justify-end mb-3">
                      <div className="max-w-[85%] sm:max-w-[70%] bg-blue-600 text-white rounded-2xl rounded-tr-xs p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3 mb-1 text-[11px] text-blue-100 font-mono">
                          <span className="font-semibold">{msg.senderName} (You)</span>
                          <span>{formatTimeAgo(msg.createdAt)}</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed text-white font-sans">{msg.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div key={msg.id} className="flex justify-start mb-3">
                      <div className="max-w-[85%] sm:max-w-[70%] bg-[var(--surface)] border border-[var(--border)] text-[var(--content)] rounded-2xl rounded-tl-xs p-4 shadow-xs">
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar name={msg.senderName} size="sm" />
                          <span className="text-xs font-bold text-[var(--content)]">{msg.senderName}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 font-mono">
                            Arvo Specialist
                          </span>
                          <span className="ml-auto font-mono text-[10px] text-[var(--muted)]">
                            {formatTimeAgo(msg.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed text-[var(--content)] font-sans">{msg.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reopen / Reply area */}
              <div className="flex-shrink-0 border-t border-[var(--border)] bg-[var(--surface)] p-4">
                {isClosed || ticket.reopenWindowExpired ? (
                  <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-red-900 dark:text-red-200">
                        <p className="font-bold text-sm font-['Archivo',sans-serif]">Resolution Window Concluded (Reopen Expired)</p>
                        <p className="mt-1 leading-relaxed text-red-700 dark:text-red-300">
                          This ticket is closed and cannot be reopened directly because the 5-working-day window (2,700 business minutes) has elapsed. You can open a linked follow-up ticket to preserve all historical context.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setFollowUpSubject(`[Follow-up to ${ticket.ticketKey}] ${ticket.subject}`);
                        setFollowUpDescription('');
                        setShowFollowUpModal(true);
                      }}
                      className="px-4 py-2.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors flex-shrink-0 shadow cursor-pointer whitespace-nowrap"
                    >
                      Create Linked Follow-Up Ticket
                    </button>
                  </div>
                ) : isResolved ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-emerald-800 dark:text-emerald-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <span>
                          Ticket marked as resolved. Reopen window active:{' '}
                          <strong className="font-mono">
                            {ticket.remainingReopenMinutes !== undefined && ticket.remainingReopenMinutes !== null
                              ? `${Math.floor(ticket.remainingReopenMinutes / 540)}d ${Math.floor((ticket.remainingReopenMinutes % 540) / 60)}h remaining`
                              : '5 working days remaining'}
                          </strong>.
                        </span>
                      </div>
                      <button
                        onClick={handleReopen}
                        disabled={customerReopen.isPending}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow transition-colors cursor-pointer"
                      >
                        {customerReopen.isPending ? 'Reopening…' : 'Reopen Ticket'}
                      </button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <textarea
                          value={replyText}
                          onChange={e => handleReplyChange(e.target.value)}
                          placeholder="Add your reply to reopen and continue this ticket…"
                          rows={2}
                          className="flex-1 p-3 text-xs rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--content)] placeholder-[var(--subtle)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={handleSendReply}
                          disabled={customerReply.isPending || !replyText.trim()}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Reply &amp; Reopen</span>
                        </button>
                      </div>
                      {replyText.trim() && (
                        <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                          <Save className="w-3 h-3" /> Draft saved
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <textarea
                        value={replyText}
                        onChange={e => handleReplyChange(e.target.value)}
                        placeholder="Type a message to the support specialist…"
                        rows={2}
                        className="flex-1 p-3 text-xs rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--content)] placeholder-[var(--subtle)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleSendReply}
                        disabled={customerReply.isPending || !replyText.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{customerReply.isPending ? 'Sending…' : 'Send'}</span>
                      </button>
                    </div>
                    {replyText.trim() && (
                      <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                        <Save className="w-3 h-3" /> Draft saved
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Linked Follow-up Ticket Dialog ── */}
      {showFollowUpModal && ticket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-100">
          <div 
            className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-4">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-[var(--content)] font-['Archivo',sans-serif]">
                  Create Linked Follow-Up Ticket
                </h3>
              </div>
              <button
                onClick={() => setShowFollowUpModal(false)}
                className="p-1 rounded text-[var(--muted)] hover:text-[var(--content)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFollowUp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--content)] mb-1">Subject</label>
                <input
                  type="text"
                  value={followUpSubject}
                  onChange={e => setFollowUpSubject(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--content)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--content)] mb-1">Description / Context</label>
                <textarea
                  value={followUpDescription}
                  onChange={e => setFollowUpDescription(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 text-xs rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--content)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe what additional help or recurring issue you are experiencing..."
                  required
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowFollowUpModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-subtle)] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTicket.isPending || !followUpSubject.trim() || !followUpDescription.trim()}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow transition-colors disabled:opacity-40"
                >
                  {createTicket.isPending ? 'Submitting…' : 'Submit Follow-Up Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Customer Support Ticket Dialog */}
      {showNewTicketModal && (
        <NewTicketDialog
          defaultCustomerId={activeCustomerId || undefined}
          onClose={() => setShowNewTicketModal(false)}
          onSuccess={(ticketKey) => {
            if (ticketKey) handleSelectTicket(ticketKey);
          }}
        />
      )}
    </div>
  );
};

// ── Customer Ticket Row ───────────────────────────────────────────────────────

const CustomerTicketRow: React.FC<{
  ticket: TicketSummary;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ ticket, isSelected, onSelect }) => {
  return (
    <div
      onClick={onSelect}
      className={`py-3 px-4 cursor-pointer border-b border-[var(--border)] transition-colors ${
        isSelected 
          ? 'bg-blue-50/60 dark:bg-blue-950/40 border-l-[3px] border-l-blue-600 pl-[13px]' 
          : 'hover:bg-[var(--surface-subtle)]'
      }`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="font-mono text-xs font-bold text-[var(--muted)]">{ticket.ticketKey}</span>
        <span className={`text-[10px] font-semibold px-1.5 py-0 rounded-full border ${getStatusColors(ticket.status)}`}>
          {getStatusLabel(ticket.status)}
        </span>
        <div className="ml-auto">
          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded border ${getPriorityColors(ticket.priority)}`}>{ticket.priority}</span>
        </div>
      </div>
      <div className="text-xs font-semibold text-[var(--content)] truncate">{ticket.subject}</div>
      <div className="text-[10px] text-[var(--muted)] font-mono mt-0.5">{formatIST(ticket.createdAt)}</div>
    </div>
  );
};
