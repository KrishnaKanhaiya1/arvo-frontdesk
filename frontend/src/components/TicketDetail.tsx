import React, { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Lock, User, AlertCircle, Check, Save, Loader2 } from 'lucide-react';
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
  }, [ticket?.messages?.length, notes?.length]);

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
      <div className="flex-1 flex items-center justify-center bg-[#F8FAFC] text-[#94A3B8] text-sm">
        <div className="text-center">
          <div className="w-12 h-12 bg-[#E5E7EB] rounded-full flex items-center justify-center mx-auto mb-3">
            <User className="w-6 h-6 text-[#94A3B8]" />
          </div>
          <p className="font-medium">Select a ticket to view details</p>
          <p className="text-xs mt-1 text-[#CBD5E1]">Use J/K to navigate the list</p>
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
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[var(--content)] mb-1">Ticket Not Found or Access Restricted</h3>
          <p className="text-xs text-[var(--muted)] mb-5 leading-relaxed">
            The requested ticket <strong>{ticketKey}</strong> could not be loaded. It may not exist, or your session does not have authorization to view it.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
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
        },
        onError: (err: any) => {
          if (err?.status === 409 || err?.code === 'VERSION_MISMATCH' || err?.code === 'CONFLICT') {
            setShowConflictModal(true);
          }
        },
      }
    );
    setShowReplyDropdown(false);
  };

  const handleSaveNote = () => {
    if (!noteText.trim() || !agentId) return;
    addNote.mutate(
      { agentId, content: noteText.trim() },
      {
        onSuccess: () => {
          setNoteText('');
          if (ticketKey) localStorage.removeItem(`arvo_draft_note_${ticketKey}`);
        },
        onError: (err: any) => {
          if (err?.status === 409 || err?.code === 'VERSION_MISMATCH' || err?.code === 'CONFLICT') {
            setShowConflictModal(true);
          }
        },
      }
    );
  };

  const handleConflictRefresh = () => {
    qc.invalidateQueries({ queryKey: ['ticket', ticketKey] });
    qc.invalidateQueries({ queryKey: ['tickets'] });
    setShowConflictModal(false);
  };

  const handleConflictDiscard = () => {
    if (composerTab === 'reply') {
      setReplyText('');
      if (ticketKey) localStorage.removeItem(`arvo_draft_reply_${ticketKey}`);
    } else {
      setNoteText('');
      if (ticketKey) localStorage.removeItem(`arvo_draft_note_${ticketKey}`);
    }
    qc.invalidateQueries({ queryKey: ['ticket', ticketKey] });
    qc.invalidateQueries({ queryKey: ['tickets'] });
    setShowConflictModal(false);
  };

  const timeline = mergeTimeline(ticket.messages, notes);

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-white">
      {/* ── Header ── */}
      <div className="flex-shrink-0 px-5 py-3 border-b border-[#E5E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        {/* Row 1: Key + Status */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-mono text-xs font-semibold text-[#64748B]">{ticket.ticketKey}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getStatusColors(ticket.status)}`}>
            {getStatusLabel(ticket.status)}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <SLABreakdownPopover sla={ticket.sla} />
          </div>
        </div>

        {/* Row 2: Subject */}
        <h1 className="text-sm font-semibold text-[#0F172A] leading-snug mb-2">{ticket.subject}</h1>

        {/* Row 3: Meta */}
        <div className="flex items-center gap-3 text-xs text-[#475569]">
          {/* Priority (clickable) */}
          <button
            onClick={() => setShowPriorityDialog(true)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-semibold text-xs transition-opacity hover:opacity-80 ${getPriorityColors(ticket.priority)}`}
          >
            {ticket.priority}
            <ChevronDown className="w-3 h-3" />
          </button>

          {/* Assignee */}
          {ticket.assigneeName ? (
            <div className="flex items-center gap-1.5">
              <Avatar name={ticket.assigneeName} size="sm" />
              <span>{ticket.assigneeName}</span>
            </div>
          ) : (
            <span className="text-[#D97706] font-medium">Unassigned</span>
          )}

          <span className="text-[#E5E7EB]">·</span>
          <span className="text-[#94A3B8]">{ticket.customerName} · {ticket.customerCompany}</span>
          <span className="text-[#E5E7EB]">·</span>
          <span className="font-mono text-[#94A3B8] text-[10px]">{formatIST(ticket.createdAt)}</span>
        </div>
      </div>

      {/* ── Concurrency Guard Banners ── */}
      {isUnassigned && !isClosed && (
        <div className="flex-shrink-0 mx-5 mt-3 p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-[#2563EB] flex-shrink-0" />
          <span className="text-xs text-[#1D4ED8] font-medium flex-1">
            This ticket is unassigned. Claim it to reply.
          </span>
          <button
            onClick={handleClaim}
            disabled={claimTicket.isPending}
            className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-md transition-colors"
          >
            {claimTicket.isPending ? 'Claiming…' : 'Claim Ticket'}
          </button>
        </div>
      )}

      {isAssignedToOther && !isClosed && (
        <div className="flex-shrink-0 mx-5 mt-3 p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg flex items-center gap-3">
          <Lock className="w-4 h-4 text-[#D97706] flex-shrink-0" />
          <span className="text-xs text-[#92400E] font-medium flex-1">
            Owned by <strong>{ticket.assigneeName}</strong>
          </span>
          <button
            onClick={handleTakeOver}
            disabled={claimTicket.isPending}
            className="px-3 py-1.5 bg-white border border-[#FDE68A] hover:bg-[#FFFBEB] text-[#92400E] text-xs font-semibold rounded-md transition-colors"
          >
            Take Over
          </button>
        </div>
      )}

      {/* ── Timeline ── */}
      <div ref={timelineRef} className="flex-1 overflow-y-auto slim-scrollbar px-5 py-4 space-y-3">
        {timeline.map(entry => {
          if (entry.kind === 'note') {
            const note = entry.item;
            return (
              <div key={note.id} className="bg-[#FFFBEB] border border-[#F59E0B] rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Lock className="w-3 h-3 text-[#D97706]" />
                  <span className="text-[10px] font-bold tracking-widest text-[#92400E] uppercase">
                    Internal Team Note
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-[#B45309]">
                    {note.authorName} · {formatTimeAgo(note.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-[#78350F] whitespace-pre-wrap leading-relaxed">{note.content}</p>
              </div>
            );
          }

          const msg = entry.item;

          if (msg.type === MessageType.SYSTEM) {
            return (
              <div key={msg.id} className="flex items-center gap-2 my-1">
                <div className="flex-1 h-px bg-[#E5E7EB]" />
                <span className="text-[10px] text-[#94A3B8] font-mono px-2">{msg.content}</span>
                <div className="flex-1 h-px bg-[#E5E7EB]" />
              </div>
            );
          }

          if (msg.type === MessageType.CUSTOMER) {
            return (
              <div key={msg.id} className="bg-white border border-[#E5E7EB] rounded-lg p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="flex items-center gap-2 mb-1.5">
                  <Avatar name={msg.senderName} size="sm" />
                  <span className="text-xs font-semibold text-[#0F172A]">{msg.senderName}</span>
                  <span className="text-[10px] text-[#94A3B8]">· Customer</span>
                  <span className="ml-auto font-mono text-[10px] text-[#94A3B8]">
                    {formatTimeAgo(msg.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-[#0F172A] whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            );
          }

          // AGENT_PUBLIC
          return (
            <div key={msg.id} className="bg-[#F8FAFC] border border-[#E5E7EB] border-l-[3px] border-l-[#2563EB] rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Avatar name={msg.senderName} size="sm" />
                <span className="text-xs font-semibold text-[#0F172A]">{msg.senderName}</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#059669] bg-[#ECFDF5] px-1.5 py-0.5 rounded border border-[#A7F3D0]">
                  <Check className="w-2.5 h-2.5" />
                  Sent to Customer
                </span>
                <span className="ml-auto font-mono text-[10px] text-[#94A3B8]">
                  {formatTimeAgo(msg.createdAt)}
                </span>
              </div>
              <p className="text-sm text-[#0F172A] whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          );
        })}
      </div>

      {/* ── Composer ── */}
      {!isClosed && (
        <div className="flex-shrink-0 border-t border-[#E5E7EB]">
          {/* Tabs */}
          <div className="flex border-b border-[#E5E7EB] bg-[#F8FAFC]">
            <button
              onClick={() => setComposerTab('reply')}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                composerTab === 'reply'
                  ? 'border-[#2563EB] text-[#2563EB] bg-white'
                  : 'border-transparent text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              Public Reply
              <span className="ml-1 font-mono text-[10px] opacity-60">(R)</span>
            </button>
            <button
              onClick={() => setComposerTab('note')}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                composerTab === 'note'
                  ? 'border-[#F59E0B] text-[#D97706] bg-white'
                  : 'border-transparent text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              Internal Note
              <span className="ml-1 font-mono text-[10px] opacity-60">(N)</span>
            </button>
          </div>

          {composerTab === 'reply' ? (
            <div className="p-3 bg-white">
              <textarea
                value={replyText}
                onChange={e => handleReplyChange(e.target.value)}
                placeholder="Write a reply to the customer…"
                rows={3}
                className="w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 text-[#0F172A] placeholder-[#94A3B8] resize-none focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
              />
              <div className="flex items-center justify-between mt-2">
                <div>
                  {replyText.trim() && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <Save className="w-3 h-3" /> Draft saved
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isAssignedToMe && !isUnassigned && (
                    <span className="text-[10px] text-[#D97706] font-medium">
                      Claim ticket to reply
                    </span>
                  )}
                  <div className="relative" ref={dropdownRef}>
                    <div className="flex">
                      <button
                        onClick={() => handleSendReply('send')}
                        disabled={!replyText.trim() || !isAssignedToMe || sendReply.isPending}
                        className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 text-white text-xs font-semibold rounded-l-md transition-colors"
                      >
                        {sendReply.isPending ? 'Sending…' : 'Send to Customer'}
                      </button>
                      <button
                        onClick={() => setShowReplyDropdown(s => !s)}
                        disabled={!replyText.trim() || !isAssignedToMe || sendReply.isPending}
                        className="px-1.5 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 text-white rounded-r-md border-l border-[#1D4ED8] transition-colors"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {showReplyDropdown && (
                      <div className="absolute right-0 bottom-full mb-1 w-56 bg-white border border-[#E5E7EB] rounded-lg shadow-xl z-10">
                        <button
                          onClick={() => handleSendReply('send_wait')}
                          className="w-full text-left px-3 py-2 text-xs text-[#0F172A] hover:bg-slate-50 rounded-t-lg"
                        >
                          Send &amp; mark Waiting on Customer
                        </button>
                        <button
                          onClick={() => handleSendReply('send_resolve')}
                          className="w-full text-left px-3 py-2 text-xs text-[#0F172A] hover:bg-slate-50 rounded-b-lg border-t border-[#E5E7EB]"
                        >
                          Send &amp; Resolve
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-[#FFFBEB]">
              <div className="flex items-center gap-1.5 mb-2">
                <Lock className="w-3.5 h-3.5 text-[#D97706]" />
                <span className="text-[10px] font-bold tracking-widest text-[#92400E] uppercase">
                  Private · Not visible to customer
                </span>
              </div>
              <textarea
                value={noteText}
                onChange={e => handleNoteChange(e.target.value)}
                placeholder="Add a private internal note for your team…"
                rows={3}
                className="w-full text-sm border border-[#F59E0B] rounded-lg px-3 py-2 text-[#78350F] placeholder-[#B45309] bg-[#FFFBEB] resize-none focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
              />
              <div className="flex items-center justify-between mt-2">
                <div>
                  {noteText.trim() && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                      <Save className="w-3 h-3" /> Draft saved
                    </span>
                  )}
                </div>
                <button
                  onClick={handleSaveNote}
                  disabled={!noteText.trim() || addNote.isPending}
                  className="px-3 py-1.5 bg-[#D97706] hover:bg-[#B45309] disabled:opacity-40 text-white text-xs font-semibold rounded-md transition-colors"
                >
                  {addNote.isPending ? 'Saving…' : 'Save Private Note'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isClosed && (
        <div className="flex-shrink-0 px-5 py-3 border-t border-[#E5E7EB] bg-[#F8FAFC] text-center text-xs text-[#94A3B8]">
          This ticket is {ticket.status.toLowerCase()}. No further replies can be sent.
        </div>
      )}

      {showPriorityDialog && (
        <PriorityChangeDialog
          ticket={ticket}
          onClose={() => setShowPriorityDialog(false)}
        />
      )}

      {/* Concurrency Conflict Recovery Modal */}
      <ConflictModal
        isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
        onRefresh={handleConflictRefresh}
        onDiscard={handleConflictDiscard}
        ticketKey={ticket.ticketKey}
        cachedVersion={ticket.version}
        draftContent={composerTab === 'reply' ? replyText : noteText}
      />
    </div>
  );
};
