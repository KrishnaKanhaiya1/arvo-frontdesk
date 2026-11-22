import React from 'react';
import { AlertCircle, RefreshCw, Trash2, X, ShieldAlert, History } from 'lucide-react';

interface ConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onDiscard: () => void;
  ticketKey: string;
  cachedVersion?: number;
  draftContent: string;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  isOpen,
  onClose,
  onRefresh,
  onDiscard,
  ticketKey,
  cachedVersion,
  draftContent,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-[var(--surface)] border border-amber-300 dark:border-amber-700/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800/80 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200 font-['Archivo',sans-serif]">
                Concurrency Conflict Detected (HTTP 409)
              </h3>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-mono">
                Optimistic Locking Guard · Ticket {ticketKey}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="text-xs text-[var(--content)] leading-relaxed">
            Another specialist or customer updated this record concurrently while you were composing your message.
            To guarantee transactional integrity, the server rejected this update because the ticket version has changed 
            {cachedVersion !== undefined && (
              <span className="font-mono font-semibold ml-1 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded text-amber-900 dark:text-amber-300">
                (Local v{cachedVersion} &lt; Server v{cachedVersion + 1})
              </span>
            )}.
          </div>

          {/* Draft Preservation Notice */}
          <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 font-mono flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" /> Your Unsent Draft is Preserved
              </span>
              <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-full">
                Safe &amp; Intact
              </span>
            </div>
            {draftContent ? (
              <p className="text-xs text-blue-950 dark:text-blue-100 font-sans italic line-clamp-3 bg-white/70 dark:bg-slate-900/70 p-2.5 rounded-lg border border-blue-200/60 dark:border-blue-800/60">
                "{draftContent}"
              </p>
            ) : (
              <p className="text-xs text-blue-600 dark:text-blue-400 italic">No message text was in the buffer.</p>
            )}
          </div>

          <div className="text-xs text-[var(--muted)]">
            Click <strong>Refresh &amp; Review</strong> to load the newest messages and version from the server while keeping your draft in the composer ready to send.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-[var(--surface-subtle)] border-t border-[var(--border)] px-6 py-3.5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onDiscard}
            className="px-3.5 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Discard Draft
          </button>
          
          <button
            type="button"
            onClick={onRefresh}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:translate-y-px rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh &amp; Review Latest Changes
          </button>
        </div>
      </div>
    </div>
  );
};
