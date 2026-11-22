import React, { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  ChevronDown, 
  Lock, 
  User, 
  AlertCircle, 
  Check, 
  Save, 
  Loader2, 
  Send, 
  ShieldCheck, 
  UserCheck, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';
import {
  useTicket,
  useInternalNotes,
  useClaimTicket,
  useSendReply,
  useAddNote,
} from '../hooks/useTickets';
import { usePersona } from '../hooks/usePersona';
import {
  getStatusColors,
  getPriorityColors,
  getStatusLabel,
  formatIST,
  formatTimeAgo,
} from '../lib/utils';
import { MessageType, TicketStatus, TicketPriority } from '../types/contracts';
import type { TicketDetail as TicketDetailType, TicketMessage, InternalNote } from '../types/contracts';
import { Avatar } from './Avatar';
import { SLABreakdownPopover } from './SLABreakdownPopover';
import { PriorityChangeDialog } from './PriorityChangeDialog';
import { ConflictModal } from './ConflictModal';

interface TicketDetailProps {
  ticketKey: string | null;
}

type ComposerTab = 'reply' | 'note';
type ReplyAction = 'send' | 'send_wait' | 'send_resolve';

// Merge messages + notes into a unified timeline
type TimelineItem =
  | { kind: 'message'; item: TicketMessage }
  | { kind: 'note'; item: InternalNote };

function mergeTimeline(messages: TicketMessage[], notes: InternalNote[]): TimelineItem[] {
  const items: TimelineItem[] = [
    ...messages.map(m => ({ kind: 'message' as const, item: m })),
    ...notes.map(n => ({ kind: 'note' as const, item: n })),
  ];
  items.sort((a, b) => new Date(a.item.createdAt).getTime() - new Date(b.item.createdAt).getTime());
  return items;
}

export const TicketDetail: React.FC<TicketDetailProps> = ({ ticketKey }) => {
  const qc = useQueryClient();
  const { agentId, agentName } = usePersona();
  const { data: ticket, isLoading, isError } = useTicket(ticketKey);
  const { data: notes = [] } = useInternalNotes(ticketKey);
  const claimTicket = useClaimTicket(ticketKey || '');
  const sendReply = useSendReply(ticketKey || '');
  const addNote = useAddNote(ticketKey || '');

  const [composerTab, setComposerTab] = useState<ComposerTab>('reply');
  const [replyText, setReplyText] = useState('');
  const [noteText, setNoteText] = useState('');
  const [showReplyDropdown, setShowReplyDropdown] = useState(false);
  const [showPriorityDialog, setShowPriorityDialog] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Restore saved drafts when switching ticket
  useEffect(() => {
    if (ticketKey) {
      const savedReply = localStorage.getItem(`arvo_draft_reply_${ticketKey}`) || '';
      const savedNote = localStorage.getItem(`arvo_draft_note_${ticketKey}`) || '';
      setReplyText(savedReply);
      setNoteText(savedNote);
    }
  }, [ticketKey]);

  // Handle Draft Auto-save
  const handleReplyChange = (val: string) => {
    setReplyText(val);
    if (ticketKey) {
      if (val.trim()) {
        localStorage.setItem(`arvo_draft_reply_${ticketKey}`, val);
      } else {
        localStorage.removeItem(`arvo_draft_reply_${ticketKey}`);
      }
    }
  };

  const handleNoteChange = (val: string) => {
    setNoteText(val);
    if (ticketKey) {
      if (val.trim()) {
        localStorage.setItem(`arvo_draft_note_${ticketKey}`, val);
      } else {
        localStorage.removeItem(`arvo_draft_note_${ticketKey}`);
      }
    }
  };

  // Auto-scroll to bottom when messages load
  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  }, [ticket?.messages?.length, notes?.length, composerTab]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowReplyDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard shortcuts R/N to switch composer tabs
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      if (isTyping) return;
      if (e.key === 'r') setComposerTab('reply');
      if (e.key === 'n') setComposerTab('note');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!ticketKey) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--surface-subtle)] text-[var(--muted)] text-sm transition-colors">
        <div className="text-center p-6">
          <div className="w-12 h-12 bg-[var(--surface)] border border-[var(--border)] rounded-full flex items-center justify-center mx-auto mb-3 text-[var(--muted)]">
            <User className="w-6 h-6" />
          </div>
          <p className="font-semibold text-[var(--content)]">Select a ticket to view details</p>
          <p className="text-xs mt-1 text-[var(--muted)]">Use J / K to navigate tickets in the queue</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--surface)] text-[var(--muted)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-xs font-medium">Loading ticket details…</span>
        </div>
      </div>
    );
  }

  if (!ticket || isError) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--surface-subtle)] p-6">
        <div className="max-w-md w-full text-center bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-sm">
          <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-500">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[var(--content)] mb-1">Ticket Not Found or Access Restricted</h3>
          <p className="text-xs text-[var(--muted)] mb-5 leading-relaxed">
            The requested ticket <strong>{ticketKey}</strong> could not be loaded. It may not exist, or your session does not have authorization to view it.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
          >
            Return to Queue
          </a>
        </div>
      </div>
    );
  }

  const isUnassigned = !ticket.assigneeId;
  const isAssignedToMe = ticket.assigneeId === agentId;
  const isAssignedToOther = ticket.assigneeId && ticket.assigneeId !== agentId;
  const isClosed = ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED;

  const handleClaim = () => {
    if (!agentId) return;
    claimTicket.mutate(
      { agentId, version: ticket.version },
      {
        onError: (err: any) => {
          if (err?.status === 409 || err?.code === 'VERSION_MISMATCH' || err?.code === 'CONFLICT') {
            setShowConflictModal(true);
          }
        },
      }
    );
  };

  const handleTakeOver = () => {
    if (!agentId) return;
    claimTicket.mutate(
      { agentId, version: ticket.version, allowTakeover: true },
      {
        onError: (err: any) => {
          if (err?.status === 409 || err?.code === 'VERSION_MISMATCH' || err?.code === 'CONFLICT') {
            setShowConflictModal(true);
          }
        },
      }
    );
  };

  const handleSendReply = (action: ReplyAction) => {
    if (!replyText.trim() || !agentId) return;
    const newStatus =
      action === 'send_wait'
        ? ('WAITING_ON_CUSTOMER' as const)
        : action === 'send_resolve'
        ? ('RESOLVED' as const)
        : undefined;
    sendReply.mutate(
      { agentId, content: replyText.trim(), newStatus, version: ticket.version },
      {
        onSuccess: () => {
          setReplyText('');
          if (ticketKey) localStorage.removeItem(`arvo_draft_reply_${ticketKey}`);
          setShowReplyDropdown(false);
        },
        onError: (err: any) => {
          if (err?.status === 409 || err?.code === 'VERSION_MISMATCH') {
            setShowConflictModal(true);
          }
        },
      }
    );
  };

  const handleAddNote = () => {
    if (!noteText.trim() || !agentId) return;
    addNote.mutate(
      { agentId, content: noteText.trim() },
      {
        onSuccess: () => {
          setNoteText('');
          if (ticketKey) localStorage.removeItem(`arvo_draft_note_${ticketKey}`);
        },
      }
    );
  };

  const timeline = mergeTimeline(ticket.messages, notes);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--surface)] transition-colors">
      {/* ── Ticket Header ── */}
      <div className="px-5 py-3.5 border-b border-[var(--border)] bg-[var(--surface)] flex-shrink-0 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold text-[var(--content)] bg-[var(--surface-subtle)] px-2 py-0.5 rounded border border-[var(--border)]">
              {ticket.ticketKey}
            </span>
            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusColors(ticket.status)}`}>
              {getStatusLabel(ticket.status)}
            </span>
            <button
              onClick={() => setShowPriorityDialog(true)}
              className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border cursor-pointer hover:opacity-80 transition-opacity ${getPriorityColors(ticket.priority)}`}
              title="Click to modify priority (recalculates SLA while preserving elapsed time)"
            >
              {ticket.priority} ✎
            </button>
            {ticket.hasInternalNotes && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                <Lock className="w-3 h-3" /> {notes.length} Team Notes
              </span>
            )}
          </div>
          <h2 className="text-base font-bold text-[var(--content)] truncate leading-snug font-['Archivo',sans-serif]">
            {ticket.subject}
          </h2>
          <div className="flex items-center gap-2 text-xs text-[var(--muted)] mt-0.5">
            <span className="font-semibold text-[var(--content)]">{ticket.customerName}</span>
            <span>·</span>
            <span>{ticket.customerCompany}</span>
            <span>·</span>
            <span className="font-mono text-[11px]">{formatIST(ticket.createdAt)}</span>
          </div>
        </div>

        {/* Claim / Take Over Controls in Header */}
        <div className="flex items-center gap-2 shrink-0">
          {isUnassigned && !isClosed && (
            <button
              onClick={handleClaim}
              disabled={claimTicket.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{claimTicket.isPending ? 'Claiming…' : 'Claim Ticket'}</span>
            </button>
          )}

          {isAssignedToOther && !isClosed && (
            <button
              onClick={handleTakeOver}
              disabled={claimTicket.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-bold rounded-lg transition-all cursor-pointer"
              title={`Currently owned by ${ticket.assigneeName}. Click to reassign to yourself.`}
            >
              <span>Take Over Ticket</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Timeline (Conversation & Internal Notes) ── */}
      <div ref={timelineRef} className="flex-1 overflow-y-auto slim-scrollbar px-5 py-4 space-y-3.5 bg-[var(--surface-subtle)]/40">
        {timeline.map(entry => {
          if (entry.kind === 'note') {
            const note = entry.item;
            return (
              <div 
                key={note.id} 
                className="bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/40 rounded-xl p-3.5 shadow-xs"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center justify-center">
                    <Lock className="w-3 h-3 stroke-[2.5]" />
                  </div>
                  <span className="text-[11px] font-bold tracking-wider text-amber-800 dark:text-amber-200 uppercase font-mono">
                    Confidential Internal Note · Staff Only (INC-0304)
                  </span>
                  <span className="ml-auto font-mono text-[11px] text-amber-700/80 dark:text-amber-300/80" title={formatIST(note.createdAt)}>
                    {note.authorName} · {formatTimeAgo(note.createdAt)}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-amber-950 dark:text-amber-100 whitespace-pre-wrap leading-relaxed pl-7">
                  {note.content}
                </p>
              </div>
            );
          }

          const msg = entry.item;

          if (msg.type === MessageType.SYSTEM) {
            return (
              <div key={msg.id} className="flex items-center justify-center my-2">
                <span className="text-[11px] font-semibold text-[var(--content)] bg-[var(--surface)] border border-[var(--border)] shadow-xs rounded-full px-3 py-1 font-mono">
                  {msg.content}
                </span>
              </div>
            );
          }

          if (msg.type === MessageType.CUSTOMER) {
            return (
              <div 
                key={msg.id} 
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3.5 shadow-xs"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Avatar name={msg.senderName} size="sm" />
                  <span className="text-xs font-bold text-[var(--content)]">{msg.senderName}</span>
                  <span className="text-[10px] text-[var(--muted)] font-mono">· Client Request</span>
                  <span className="ml-auto font-mono text-[11px] text-[var(--muted)]" title={formatIST(msg.createdAt)}>
                    {formatTimeAgo(msg.createdAt)}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[var(--content)] whitespace-pre-wrap leading-relaxed pl-8">
                  {msg.content}
                </p>
              </div>
            );
          }

          // AGENT_PUBLIC
          return (
            <div 
              key={msg.id} 
              className="bg-[var(--surface)] border border-blue-500/30 border-l-4 border-l-blue-600 rounded-xl p-3.5 shadow-xs"
            >
              <div className="flex items-center gap-2 mb-2">
                <Avatar name={msg.senderName} size="sm" />
                <span className="text-xs font-bold text-[var(--content)]">{msg.senderName}</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  <Check className="w-2.5 h-2.5" /> Sent to Customer
                </span>
                <span className="ml-auto font-mono text-[11px] text-[var(--muted)]" title={formatIST(msg.createdAt)}>
                  {formatTimeAgo(msg.createdAt)}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--content)] whitespace-pre-wrap leading-relaxed pl-8">
                {msg.content}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Composer ── */}
      {!isClosed && (
        <div className="flex-shrink-0 border-t border-[var(--border)] bg-[var(--surface)]">
          {/* Tabs */}
          <div className="flex border-b border-[var(--border)] bg-[var(--surface-subtle)]">
            <button
              onClick={() => setComposerTab('reply')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                composerTab === 'reply'
                  ? 'border-blue-600 text-blue-600 bg-[var(--surface)]'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--content)]'
              }`}
            >
              Public Reply <span className="font-mono text-[10px] opacity-60">(R)</span>
            </button>
            <button
              onClick={() => setComposerTab('note')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                composerTab === 'note'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-[var(--surface)]'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--content)]'
              }`}
            >
              Internal Note <span className="font-mono text-[10px] opacity-60">(N)</span>
            </button>
          </div>

          {composerTab === 'reply' ? (
            <div className="p-3.5 bg-[var(--surface)]">
              {/* If not assigned to current agent, show clear disabled overlay banner */}
              {!isAssignedToMe ? (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-center flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200 text-left">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>
                      {isUnassigned ? (
                        <><strong>Ticket is unassigned.</strong> Claim ownership to compose and send public replies to the customer.</>
                      ) : (
                        <><strong>Assigned to {ticket.assigneeName}.</strong> Take over this ticket to send public customer replies.</>
                      )}
                    </span>
                  </div>
                  {isUnassigned ? (
                    <button
                      onClick={handleClaim}
                      disabled={claimTicket.isPending}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm shrink-0 cursor-pointer"
                    >
                      {claimTicket.isPending ? 'Claiming…' : 'Claim Ticket'}
                    </button>
                  ) : (
                    <button
                      onClick={handleTakeOver}
                      disabled={claimTicket.isPending}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm shrink-0 cursor-pointer"
                    >
                      {claimTicket.isPending ? 'Taking Over…' : 'Take Over Ticket'}
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <textarea
                    value={replyText}
                    onChange={e => handleReplyChange(e.target.value)}
                    placeholder="Write a clear, professional reply to the customer…"
                    rows={3}
                    className="w-full text-xs sm:text-sm border border-[var(--border)] rounded-xl px-3.5 py-2.5 bg-[var(--surface-subtle)] text-[var(--content)] placeholder-[var(--muted)] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-xs"
                  />
                  <div className="flex items-center justify-between mt-2.5">
                    <div>
                      {replyText.trim() && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          <Save className="w-3 h-3" /> Draft saved
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative" ref={dropdownRef}>
                        <div className="flex">
                          <button
                            onClick={() => handleSendReply('send')}
                            disabled={!replyText.trim() || sendReply.isPending}
                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold rounded-l-xl transition-all shadow-sm cursor-pointer"
                          >
                            {sendReply.isPending ? 'Sending…' : 'Send to Customer'}
                          </button>
                          <button
                            onClick={() => setShowReplyDropdown(s => !s)}
                            disabled={!replyText.trim() || sendReply.isPending}
                            className="px-2 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-r-xl border-l border-blue-500 transition-all cursor-pointer"
                            title="Additional send options"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {showReplyDropdown && (
                          <div className="absolute right-0 bottom-full mb-1.5 w-64 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl p-1 z-20 animate-in fade-in zoom-in-95 duration-100">
                            <button
                              onClick={() => handleSendReply('send_wait')}
                              className="w-full text-left px-3 py-2 text-xs text-[var(--content)] hover:bg-[var(--surface-subtle)] rounded-lg font-medium cursor-pointer"
                            >
                              Send &amp; Mark <strong>Waiting on Customer</strong>
                            </button>
                            <button
                              onClick={() => handleSendReply('send_resolve')}
                              className="w-full text-left px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-lg font-medium cursor-pointer border-t border-[var(--border)] mt-0.5"
                            >
                              Send &amp; Mark <strong>Resolved</strong>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="p-3.5 bg-amber-500/5 dark:bg-amber-950/20 border-t border-amber-500/30">
              <div className="flex items-center gap-2 mb-2 text-xs font-bold text-amber-800 dark:text-amber-200">
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span>Internal Team Note · 100% physically excluded from customer views (INC-0304)</span>
              </div>
              <textarea
                value={noteText}
                onChange={e => handleNoteChange(e.target.value)}
                placeholder="Log internal technical root cause, reproduction steps, or handover notes…"
                rows={3}
                className="w-full text-xs sm:text-sm border border-amber-500/40 rounded-xl px-3.5 py-2.5 bg-[var(--surface)] text-[var(--content)] placeholder-[var(--muted)] resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all shadow-xs"
              />
              <div className="flex items-center justify-between mt-2.5">
                <div>
                  {noteText.trim() && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <Save className="w-3 h-3" /> Draft saved
                    </span>
                  )}
                </div>
                <button
                  onClick={handleAddNote}
                  disabled={!noteText.trim() || addNote.isPending}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-700 text-white text-xs font-bold rounded-xl disabled:opacity-40 transition-all shadow-sm cursor-pointer"
                >
                  {addNote.isPending ? 'Saving…' : 'Save Internal Note'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showPriorityDialog && (
        <PriorityChangeDialog
          ticket={ticket}
          onClose={() => setShowPriorityDialog(false)}
        />
      )}

      <ConflictModal
        isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
        onRefresh={() => {
          qc.invalidateQueries({ queryKey: ['ticket', ticketKey] });
          setShowConflictModal(false);
        }}
        onDiscard={() => {
          setReplyText('');
          setShowConflictModal(false);
        }}
        ticketKey={ticket.ticketKey}
        cachedVersion={ticket.version}
        draftContent={replyText}
      />
    </div>
  );
};
