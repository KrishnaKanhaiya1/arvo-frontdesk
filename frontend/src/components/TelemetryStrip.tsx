import React from 'react';
import { useDashboard } from '../hooks/useTickets';
import type { QueueFilter } from '../pages/AgentWorkspace';

interface TelemetryStripProps {
  onFilterChange: (queue: QueueFilter) => void;
  activeQueue: QueueFilter;
}

export const TelemetryStrip: React.FC<TelemetryStripProps> = ({ onFilterChange, activeQueue }) => {
  const { data: stats } = useDashboard();

  if (!stats) {
    return (
      <div className="h-[40px] flex-shrink-0 bg-white border-b border-[#E5E7EB] flex items-center px-4 gap-2">
        <span className="text-xs text-[#94A3B8]">Loading stats…</span>
      </div>
    );
  }

  const slaPercent = Math.round(stats.slaCompliancePercent);

  const badges = [
    {
      label: 'Breached',
      count: stats.breached,
      queue: 'breached' as QueueFilter,
      activeClass: 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]',
      inactiveClass: 'bg-white text-[#DC2626] border-[#FECACA] hover:bg-[#FEF2F2]',
    },
    {
      label: 'At Risk',
      count: stats.atRisk,
      queue: 'all' as QueueFilter,
      activeClass: 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]',
      inactiveClass: 'bg-white text-[#D97706] border-[#FDE68A] hover:bg-[#FFFBEB]',
    },
    {
      label: 'Waiting',
      count: stats.waitingOnCustomer,
      queue: 'waiting' as QueueFilter,
      activeClass: 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]',
      inactiveClass: 'bg-white text-[#475569] border-[#CBD5E1] hover:bg-[#F1F5F9]',
    },
    {
      label: 'Unassigned',
      count: stats.unassigned,
      queue: 'unassigned' as QueueFilter,
      activeClass: 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]',
      inactiveClass: 'bg-white text-[#D97706] border-[#FDE68A] hover:bg-[#FFFBEB]',
    },
  ];

  return (
    <div className="h-[40px] flex-shrink-0 bg-white border-b border-[#E5E7EB] flex items-center px-4 gap-2">
      {badges.map((badge) => {
        const isActive = activeQueue === badge.queue && badge.queue !== 'all';
        return (
          <button
            key={badge.label}
            onClick={() => onFilterChange(badge.queue)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-medium transition-colors ${
              isActive ? badge.activeClass : badge.inactiveClass
            }`}
          >
            <span className="font-mono font-semibold">{badge.count}</span>
            <span>{badge.label}</span>
          </button>
        );
      })}

      <div className="w-px h-4 bg-[#E5E7EB] mx-1" />

      {/* SLA Compliance */}
      <div className="flex items-center gap-2 text-xs text-[#475569]">
        <span className="font-medium">SLA</span>
        <div className="w-16 h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              slaPercent >= 90 ? 'bg-[#059669]' : slaPercent >= 70 ? 'bg-[#D97706]' : 'bg-[#DC2626]'
            }`}
            style={{ width: `${slaPercent}%` }}
          />
        </div>
        <span className="font-mono font-semibold">{slaPercent}%</span>
      </div>

      <div className="flex-1" />

      <span className="text-[11px] text-[#94A3B8] font-mono">
        {stats.totalActive} active · {stats.resolvedToday} resolved today
      </span>
    </div>
  );
};
