import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useCreateTicket, useCustomers } from '../hooks/useTickets';
import { TicketPriority } from '../types/contracts';

interface NewTicketDialogProps {
  onClose: () => void;
  defaultCustomerId?: string;
  onSuccess?: (ticketKey: string) => void;
}

export const NewTicketDialog: React.FC<NewTicketDialogProps> = ({ onClose, defaultCustomerId, onSuccess }) => {
  const { data: customers = [] } = useCustomers();
  const createTicket = useCreateTicket();

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>(TicketPriority.MEDIUM);
  const [customerId, setCustomerId] = useState(defaultCustomerId || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCustomerId = defaultCustomerId || customerId;
    if (!subject.trim() || !description.trim() || !finalCustomerId) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }
    setErrorMsg(null);
    createTicket.mutate(
      { subject: subject.trim(), description: description.trim(), priority, customerId: finalCustomerId },
      { 
        onSuccess: (data: any) => {
          onSuccess?.(data?.ticketKey || data?.ticket?.ticketKey || '');
          onClose();
        },
        onError: (err: any) => {
          setErrorMsg(err?.response?.data?.error?.message || err?.message || 'Failed to create ticket. Please try again.');
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-[var(--surface)] text-[var(--content)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div>
            <h2 className="text-sm font-bold text-[var(--content)]">Create Support Ticket</h2>
            <p className="text-[11px] text-[var(--muted)]">Initiate a tracked support request under deterministic SLA policy</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--surface-subtle)] text-[var(--muted)] hover:text-[var(--content)] rounded-lg transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-[var(--content)] mb-1.5 font-mono">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Brief description of the operational issue…"
              required
              className="w-full px-3.5 py-2 text-sm border border-[var(--border)] rounded-xl bg-[var(--surface-subtle)] text-[var(--content)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-xs"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[var(--content)] mb-1.5 font-mono">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detailed description, symptoms, steps to reproduce, or incident timeline…"
              rows={4}
              required
              className="w-full px-3.5 py-2 text-sm border border-[var(--border)] rounded-xl bg-[var(--surface-subtle)] text-[var(--content)] placeholder-[var(--muted)] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-xs"
            />
          </div>

          {/* Priority + Customer */}
          <div className={defaultCustomerId ? 'space-y-3' : 'grid grid-cols-2 gap-3'}>
            <div>
              <label className="block text-xs font-semibold text-[var(--content)] mb-1.5 font-mono">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as TicketPriority)}
                className="w-full px-3.5 py-2 text-sm border border-[var(--border)] rounded-xl bg-[var(--surface-subtle)] text-[var(--content)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-xs"
              >
                <option value={TicketPriority.CRITICAL} className="bg-[var(--surface)] text-[var(--content)]">Critical (FR ≤ 2h, RES same day)</option>
                <option value={TicketPriority.MEDIUM} className="bg-[var(--surface)] text-[var(--content)]">Medium (FR ≤ 4.5h, RES ≤ 3d)</option>
                <option value={TicketPriority.LOW} className="bg-[var(--surface)] text-[var(--content)]">Low (FR ≤ 9h, RES ≤ 5d)</option>
              </select>
            </div>

            {!defaultCustomerId && (
              <div>
                <label className="block text-xs font-semibold text-[var(--content)] mb-1.5 font-mono">
                  Customer <span className="text-red-500">*</span>
                </label>
                <select
                  value={customerId}
                  onChange={e => setCustomerId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-sm border border-[var(--border)] rounded-xl bg-[var(--surface-subtle)] text-[var(--content)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-xs"
                >
                  <option value="" className="bg-[var(--surface)] text-[var(--content)]">Select customer organization…</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id} className="bg-[var(--surface)] text-[var(--content)]">
                      {c.name} ({c.company})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[var(--muted)] hover:text-[var(--content)] border border-[var(--border)] rounded-xl hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createTicket.isPending || !subject.trim() || !description.trim() || (!defaultCustomerId && !customerId)}
              className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors disabled:opacity-40 cursor-pointer"
            >
              {createTicket.isPending ? 'Creating Ticket…' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
