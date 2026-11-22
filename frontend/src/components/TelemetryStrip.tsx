import React from 'react';
import { useDashboard } from '../hooks/useTickets';
import type { QueueFilter } from '../pages/AgentWorkspace';
import { AlertCircle, AlertTriangle, Clock, UserX, Activity, ArrowUpRight } from 'lucide-react';

interface TelemetryStripProps {
  onFilterChange: (queue: QueueFilter) => void;
  activeQueue: QueueFilter;
}

export const TelemetryStrip: React.FC<TelemetryStripProps> = ({ onFilterChange, activeQueue }) => {
  const { data: stats } = useDashboard();

  if (!stats) {
    return (
      <div className="h-[44px] flex-shrink-0 bg-white border-b border-[#E2E8F0] flex items-center px-4 gap-2">
        <span className="text-xs text-[#94A3B8]">Loading operational telemetry…</span>
      </div>
    );
  }

  const slaPercent = Math.round(stats.slaCompliancePercent);

  const telemetryBadges = [
    {
      label: 'Breached',
      count: stats.breached,
      queue: 'breached' as QueueFilter,
      icon: AlertCircle,
      activeClass: 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA] shadow-xs',
      inactiveClass: 'bg-[#FFF5F5] text-[#DC2626] border-[#FED7D7] hover:bg-[#FEE2E2]',
      dotColor: 'bg-[#DC2626]',
    },
    {
      label: 'At Risk (<1h)',
      count: stats.atRisk,
      queue: 'all' as QueueFilter,
      icon: AlertTriangle,
      activeClass: 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A] shadow-xs',
      inactiveClass: 'bg-[#FFFDF5] text-[#D97706] border-[#FEEBC8] hover:bg-[#FEF3C7]',
      dotColor: 'bg-[#D97706]',
    },
    {
      label: 'Waiting Customer',
      count: stats.waitingOnCustomer,
      queue: 'waiting' as QueueFilter,
      icon: Clock,
      activeClass: 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1] shadow-xs',
      inactiveClass: 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0] hover:bg-[#F1F5F9]',
      dotColor: 'bg-[#94A3B8]',
    },
    {
      label: 'Unassigned',
      count: stats.unassigned,
      queue: 'unassigned' as QueueFilter,
      icon: UserX,
      activeClass: 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE] shadow-xs',
      inactiveClass: 'bg-[#F0F7FF] text-[#2563EB] border-[#DBEAFE] hover:bg-[#E0EFFF]',
      dotColor: 'bg-[#2563EB]',
    },
  ];

  return (
    <div className="h-[44px] flex-shrink-0 bg-white border-b border-[#E2E8F0] flex items-center px-4 gap-3 justify-between">
      {/* Metric Action Pills */}
      <div className="flex items-center gap-2">
        {telemetryBadges.map((badge) => {
          const isActive = activeQueue === badge.queue && badge.queue !== 'all';
          const Icon = badge.icon;
          return (
            <button
              key={badge.label}
              onClick={() => onFilterChange(badge.queue)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer ${
                isActive ? badge.activeClass : badge.inactiveClass
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{badge.label}</span>
              <span className="font-mono font-bold ml-0.5">{badge.count}</span>
            </button>
          );
        })}
      </div>

      {/* SLA Compliance Progress Bar */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[#64748B]" />
          <span className="text-[11px] font-medium text-[#64748B]">SLA Compliance</span>
          <div className="w-24 h-2 bg-[#E2E8F0] rounded-full overflow-hidden flex">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                slaPercent >= 90
                  ? 'bg-[#10B981]'
                  : slaPercent >= 75
                  ? 'bg-[#F59E0B]'
                  : 'bg-[#EF4444]'
              }`}
              style={{ width: `${slaPercent}%` }}
            />
          </div>
          <span
            className={`font-mono text-xs font-bold ${
              slaPercent >= 90
                ? 'text-[#059669]'
                : slaPercent >= 75
                ? 'text-[#D97706]'
                : 'text-[#DC2626]'
            }`}
          >
            {slaPercent}%
          </span>
        </div>

        <div className="h-4 w-[1px] bg-[#E2E8F0]" />

        <div className="text-[11px] text-[#94A3B8] font-mono">
          <span className="text-[#0F172A] font-semibold">{stats.totalActive}</span> active ·{' '}
          <span className="text-[#059669] font-semibold">{stats.resolvedToday}</span> resolved today
        </div>
      </div>
    </div>
  );
};
