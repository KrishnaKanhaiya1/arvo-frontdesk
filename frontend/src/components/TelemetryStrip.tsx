import React from 'react';
import { useDashboard } from '../hooks/useTickets';
import type { QueueFilter } from '../pages/AgentWorkspace';
import { AlertCircle, AlertTriangle, Clock, UserX, Activity } from 'lucide-react';

interface TelemetryStripProps {
  onFilterChange: (queue: QueueFilter) => void;
  activeQueue: QueueFilter;
}

export const TelemetryStrip: React.FC<TelemetryStripProps> = ({ onFilterChange, activeQueue }) => {
  const { data: stats } = useDashboard();

  if (!stats) {
    return (
      <div className="h-[44px] flex-shrink-0 bg-[var(--surface)] border-b border-[var(--border)] flex items-center px-4 gap-2 transition-colors">
        <span className="text-xs text-[var(--muted)]">Loading operational telemetry…</span>
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
      activeClass: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 shadow-xs font-semibold',
      inactiveClass: 'bg-[var(--surface-subtle)] text-red-600 dark:text-red-400 border-[var(--border)] hover:bg-red-50/10',
    },
    {
      label: 'At Risk (<1h)',
      count: stats.atRisk,
      queue: 'all' as QueueFilter,
      icon: AlertTriangle,
      activeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 shadow-xs font-semibold',
      inactiveClass: 'bg-[var(--surface-subtle)] text-amber-600 dark:text-amber-400 border-[var(--border)] hover:bg-amber-50/10',
    },
    {
      label: 'Waiting Customer',
      count: stats.waitingOnCustomer,
      queue: 'waiting' as QueueFilter,
      icon: Clock,
      activeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 shadow-xs font-semibold',
      inactiveClass: 'bg-[var(--surface-subtle)] text-[var(--muted)] border-[var(--border)] hover:text-[var(--content)]',
    },
    {
      label: 'Unassigned',
      count: stats.unassigned,
      queue: 'unassigned' as QueueFilter,
      icon: UserX,
      activeClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 shadow-xs font-semibold',
      inactiveClass: 'bg-[var(--surface-subtle)] text-[var(--muted)] border-[var(--border)] hover:text-[var(--content)]',
    },
  ];

  return (
    <div className="h-[44px] flex-shrink-0 bg-[var(--surface)] border-b border-[var(--border)] flex items-center px-4 gap-3 justify-between transition-colors">
      {/* Metric Action Pills */}
      <div className="flex items-center gap-2">
        {telemetryBadges.map((badge) => {
          const isActive = activeQueue === badge.queue && badge.queue !== 'all';
          const Icon = badge.icon;
          return (
            <button
              key={badge.label}
              onClick={() => onFilterChange(badge.queue)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
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
          <Activity className="w-3.5 h-3.5 text-[var(--muted)]" />
          <span className="text-[11px] font-medium text-[var(--muted)]">SLA Compliance</span>
          <div className="w-24 h-2 bg-[var(--border)] rounded-full overflow-hidden flex">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                slaPercent >= 90
                  ? 'bg-emerald-500'
                  : slaPercent >= 75
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${slaPercent}%` }}
            />
          </div>
          <span
            className={`font-mono text-xs font-bold ${
              slaPercent >= 90
                ? 'text-emerald-600 dark:text-emerald-400'
                : slaPercent >= 75
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {slaPercent}%
          </span>
        </div>

        <div className="h-4 w-[1px] bg-[var(--border)]" />

        <div className="text-[11px] text-[var(--muted)] font-mono">
          <span className="text-[var(--content)] font-semibold">{stats.totalActive}</span> active ·{' '}
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{stats.resolvedToday}</span> resolved today
        </div>
      </div>
    </div>
  );
};
