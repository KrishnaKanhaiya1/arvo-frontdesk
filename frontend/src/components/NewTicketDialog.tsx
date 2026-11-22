import React, { useState } from 'react';
import { X } from 'lucide-react';
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCustomerId = defaultCustomerId || customerId;
    if (!subject.trim() || !description.trim() || !finalCustomerId) return;
    createTicket.mutate(
      { subject: subject.trim(), description: description.trim(), priority, customerId: finalCustomerId },
      { 
        onSuccess: (data: any) => {
          onSuccess?.(data?.ticketKey || data?.ticket?.ticketKey || '');
          onClose();
        } 
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-[520px] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-sm font-semibold text-[#0F172A]">Create New Ticket</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-md transition-colors">
            <X className="w-4 h-4 text-[#475569]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-[#475569] mb-1.5">
              Subject <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Brief description of the issue…"
              required
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[#475569] mb-1.5">
              Description <span className="text-[#DC2626]">*</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detailed description of the issue…"
              rows={4}
              required
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg text-[#0F172A] placeholder-[#94A3B8] resize-none focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
            />
          </div>

          {/* Priority + Customer */}
          <div className={defaultCustomerId ? 'space-y-3' : 'grid grid-cols-2 gap-3'}>
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as TicketPriority)}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg text-[#0F172A] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
              >
                <option value={TicketPriority.CRITICAL}>Critical</option>
                <option value={TicketPriority.MEDIUM}>Medium</option>
                <option value={TicketPriority.LOW}>Low</option>
              </select>
            </div>

            {!defaultCustomerId && (
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5">
                  Customer <span className="text-[#DC2626]">*</span>
                </label>
                <select
                  value={customerId}
                  onChange={e => setCustomerId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg text-[#0F172A] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                >
                  <option value="">Select customer…</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.company})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#475569] hover:text-[#0F172A] border border-[#E5E7EB] rounded-md hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createTicket.isPending || !subject.trim() || !description.trim() || !customerId}
              className="px-4 py-2 text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-md transition-colors disabled:opacity-40"
            >
              {createTicket.isPending ? 'Creating…' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
