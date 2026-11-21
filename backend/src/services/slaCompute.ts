/**
 * SLA Computation Helper
 * Computes real-time SLA state for a ticket combining stored elapsed + live elapsed.
 */

import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import {
  calculateBusinessMinutesBetween,
  addBusinessMinutes,
  isBusinessHour,
  getNextBusinessOpen,
} from './sla';
import { SLAState, BUSINESS_HOURS } from '../types/contracts';

const TZ = BUSINESS_HOURS.timezone;

export interface TicketForSLA {
  slaFirstResponseTarget: number;
  slaResolutionTarget: number;
  slaFirstResponseElapsed: number;
  slaResolutionElapsed: number;
  slaFirstResponseMet: boolean;
  slaFirstResponseMetAt: Date | null;
  slaResolutionMet: boolean;
  slaResolutionMetAt: Date | null;
  slaFirstResponseBreached: boolean;
  slaResolutionBreached: boolean;
  isPaused: boolean;
  pausedAt: Date | null;
  totalPausedMinutes: number;
  waitingOnCustomerSince: Date | null;
  slaLastTickAt: Date;
  createdAt: Date;
  status: string;
}

export function computeSLAState(
  ticket: TicketForSLA,
  currentTime: Date,
  holidays: Date[],
): SLAState {
  // Compute live elapsed for RESOLUTION (not met)
  let liveResElapsed = 0;
  let liveIsBusinessHours = isBusinessHour(currentTime, holidays);

  // Determine if SLA is effectively paused right now
  const isCurrentlyPaused = ticket.isPaused;

  // If not paused, calculate live elapsed since last tick
  if (!isCurrentlyPaused && !ticket.slaResolutionMet) {
    liveResElapsed = calculateBusinessMinutesBetween(
      ticket.slaLastTickAt,
      currentTime,
      holidays,
    );
  }

  // Live first response elapsed
  let liveFRElapsed = 0;
  if (!ticket.slaFirstResponseMet && !isCurrentlyPaused) {
    liveFRElapsed = calculateBusinessMinutesBetween(
      ticket.slaLastTickAt,
      currentTime,
      holidays,
    );
  }

  // Total elapsed
  const totalFRElapsed = ticket.slaFirstResponseElapsed + liveFRElapsed;
  const totalResElapsed = ticket.slaResolutionElapsed + liveResElapsed;

  // First response SLA
  const frTarget = ticket.slaFirstResponseTarget;
  const frRemaining = Math.max(0, frTarget - totalFRElapsed);
  const frBreached = ticket.slaFirstResponseBreached || (!ticket.slaFirstResponseMet && frRemaining === 0);

  // Resolution SLA
  const resTarget = ticket.slaResolutionTarget;
  const resRemaining = Math.max(0, resTarget - totalResElapsed);
  const resBreached = ticket.slaResolutionBreached || (!ticket.slaResolutionMet && resRemaining === 0);

  // Calculate deadlines from createdAt (SLA start)
  // For first response: deadline = createdAt + frTarget business minutes
  const frDeadline = addBusinessMinutes(ticket.createdAt, frTarget, holidays);
  // For resolution: deadline = createdAt + resTarget business minutes (this is the target from the SLA clock start)
  // Actually deadline = slaLastTickAt reference + remaining... but it's simpler to show the absolute deadline from start
  // We compute it as: the point when elapsed = target, ie addBusinessMinutes(createdAt, frTarget)
  const resDeadline = addBusinessMinutes(ticket.createdAt, resTarget, holidays);

  const nextOpen = isBusinessHour(currentTime, holidays)
    ? null
    : getNextBusinessOpen(currentTime, holidays);

  // Pause reason
  let pauseReason: string | null = null;
  if (ticket.isPaused) {
    pauseReason = 'waiting_on_customer';
  } else if (!liveIsBusinessHours) {
    pauseReason = 'off_hours';
  }

  return {
    firstResponse: {
      targetMinutes: frTarget,
      elapsedBusinessMinutes: totalFRElapsed,
      remainingBusinessMinutes: frRemaining,
      deadlineIST: formatIST(frDeadline),
      breached: frBreached,
      met: ticket.slaFirstResponseMet,
      metAt: ticket.slaFirstResponseMetAt ? formatIST(ticket.slaFirstResponseMetAt) : null,
    },
    resolution: {
      targetMinutes: resTarget,
      elapsedBusinessMinutes: totalResElapsed,
      remainingBusinessMinutes: resRemaining,
      deadlineIST: formatIST(resDeadline),
      breached: resBreached,
      met: ticket.slaResolutionMet,
      metAt: ticket.slaResolutionMetAt ? formatIST(ticket.slaResolutionMetAt) : null,
    },
    isPaused: isCurrentlyPaused,
    pauseReason,
    totalPausedMinutes: ticket.totalPausedMinutes,
    isBusinessHours: liveIsBusinessHours,
  };
}

function formatIST(d: Date): string {
  return toZonedTime(d, TZ).toISOString().replace('Z', '+05:30');
}
