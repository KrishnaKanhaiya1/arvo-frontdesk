import React from 'react';
import type { SLAState } from '../types/contracts';
import { getSLAOverallState, getSLAColors, formatMinutes } from '../lib/utils';

interface SLABadgeProps {
  sla: SLAState;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
  onClick?: () => void;
}

export const SLABadge: React.FC<SLABadgeProps> = ({
  sla,
  size = 'sm',
  showLabel = true,
  className = '',
  onClick,
}) => {
  const overallState = getSLAOverallState(sla);
  const colors = getSLAColors(overallState);

  // Determine which SLA is primary active
  // If first response is not met, that's primary. Once met, resolution is primary.
  const isFirstResponseActive = !sla.firstResponse.met;
  const activeSla = isFirstResponseActive ? sla.firstResponse : sla.resolution;
  const labelPrefix = isFirstResponseActive ? 'FR' : 'RES';

  let text = '';
  if (overallState === 'breached') {
    text = activeSla.breached ? `${labelPrefix} Breached` : 'Breached';
  } else if (overallState === 'paused') {
    text = sla.pauseReason === 'waiting_on_customer' ? 'Paused (Customer)' : 'Paused (Off-Hours)';
  } else if (sla.resolution.met) {
    text = 'SLA Met';
  } else {
    text = `${labelPrefix} ${formatMinutes(activeSla.remainingBusinessMinutes)}`;
  }

  const isPulsing = !sla.isPaused && !sla.resolution.met && (overallState === 'at-risk' || overallState === 'healthy' || overallState === 'breached');

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 font-mono border rounded px-1.5 py-0.5 select-none transition-all ${
        size === 'sm' ? 'text-[11px] leading-tight font-medium' : 'text-xs px-2.5 py-1 font-semibold'
      } ${colors.bg} ${colors.text} ${colors.border} ${onClick ? 'cursor-pointer hover:opacity-85' : ''} ${className}`}
    >
      {isPulsing && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            overallState === 'breached' ? 'bg-[#DC2626]' : overallState === 'at-risk' ? 'bg-[#D97706]' : 'bg-[#059669]'
          } pulse-dot flex-shrink-0`}
        />
      )}
      {sla.isPaused && (
        <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8] flex-shrink-0" />
      )}
      <span>{text}</span>
    </div>
  );
};
