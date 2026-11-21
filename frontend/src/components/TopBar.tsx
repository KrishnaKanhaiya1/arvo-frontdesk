import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useSystemClock } from '../hooks/useTickets';
import { DemoClockPopover } from './DemoClockPopover';
import { PersonaSwitcher } from './PersonaSwitcher';
import { NewTicketDialog } from './NewTicketDialog';

export const TopBar: React.FC = () => {
  const { data: clock } = useSystemClock();
  const [showNewTicket, setShowNewTicket] = useState(false);

  const isBusinessHours = clock?.isBusinessHours;

  return (
    <>
      <header className="h-[52px] flex-shrink-0 flex items-center px-4 gap-3 bg-white border-b border-[#E5E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        {/* Logo + Brand */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 22 22 22" fill="none" />
              <line x1="7" y1="15" x2="17" y2="15" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-[#0F172A] tracking-tight">Arvo Frontdesk</span>
        </div>

        {/* Business Hours Pill */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
          isBusinessHours
            ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
            : 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
            isBusinessHours ? 'bg-[#059669] pulse-dot' : 'bg-[#94A3B8]'
          }`} />
          {isBusinessHours ? 'Business Hours Active' : 'Off-Hours · Clocks Paused'}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Center-right: Clock + New Ticket */}
        <div className="flex items-center gap-2">
          <DemoClockPopover />

          <button
            onClick={() => setShowNewTicket(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-md transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            New Ticket
          </button>
        </div>

        {/* Persona Switcher */}
        <PersonaSwitcher />
      </header>

      {showNewTicket && <NewTicketDialog onClose={() => setShowNewTicket(false)} />}
    </>
  );
};
