import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { TicketPriority, TicketStatus, type SLAState } from '../types/contracts';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const IST_TZ = 'Asia/Kolkata';

export function formatIST(isoString: string): string {
  try {
    const date = new Date(isoString);
    const ist = toZonedTime(date, IST_TZ);
    return format(ist, 'dd MMM yyyy, hh:mm a');
  } catch {
    return isoString;
  }
}

export function formatISTShort(isoString: string): string {
  try {
    const date = new Date(isoString);
    const ist = toZonedTime(date, IST_TZ);
    return format(ist, 'hh:mm a, dd MMM');
  } catch {
    return isoString;
  }
}

export function formatTimeAgo(isoString: string): string {
  try {
    const d = new Date(isoString);
    const diffMs = Date.now() - d.getTime();
    // If within 60 seconds (or slight clock skew), display "Just now"
    if (diffMs > -60000 && diffMs < 60000) {
      return 'Just now';
    }
    // If future by > 1 min (e.g. simulation clock set ahead or test seed), show exact IST timestamp
    if (diffMs <= -60000) {
      return formatISTShort(isoString);
    }
    // If in the past by > 1 min, format distance (e.g., "5 minutes ago", "2 hours ago")
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return isoString;
  }
}

export function formatMinutes(minutes: number): string {
  if (minutes < 0) minutes = 0;
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function getSLAOverallState(sla: SLAState): 'breached' | 'at-risk' | 'paused' | 'healthy' {
  if (sla.isPaused) return 'paused';
  if (sla.resolution.breached || sla.firstResponse.breached) return 'breached';
  // At risk if < 20% remaining
  const resRemaining = sla.resolution.remainingBusinessMinutes;
  const resTarget = sla.resolution.targetMinutes;
  if (!sla.resolution.met && resRemaining < resTarget * 0.2) return 'at-risk';
  const frRemaining = sla.firstResponse.remainingBusinessMinutes;
  const frTarget = sla.firstResponse.targetMinutes;
  if (!sla.firstResponse.met && frRemaining < frTarget * 0.2) return 'at-risk';
  return 'healthy';
}

export function getSLAColors(state: 'breached' | 'at-risk' | 'paused' | 'healthy') {
  switch (state) {
    case 'breached':
      return {
        text: 'text-[#DC2626]',
        bg: 'bg-[#FEF2F2]',
        border: 'border-[#FECACA]',
      };
    case 'at-risk':
      return {
        text: 'text-[#D97706]',
        bg: 'bg-[#FFFBEB]',
        border: 'border-[#FDE68A]',
      };
    case 'paused':
      return {
        text: 'text-[#475569]',
        bg: 'bg-[#F1F5F9]',
        border: 'border-[#CBD5E1]',
      };
    case 'healthy':
      return {
        text: 'text-[#059669]',
        bg: 'bg-[#ECFDF5]',
        border: 'border-[#A7F3D0]',
      };
  }
}

export function getPriorityColors(priority: TicketPriority) {
  switch (priority) {
    case TicketPriority.CRITICAL:
      return 'text-[#DC2626] bg-[#FEF2F2] border-[#FECACA]';
    case TicketPriority.MEDIUM:
      return 'text-[#D97706] bg-[#FFFBEB] border-[#FDE68A]';
    case TicketPriority.LOW:
      return 'text-[#059669] bg-[#ECFDF5] border-[#A7F3D0]';
  }
}

export function getStatusLabel(status: TicketStatus): string {
  switch (status) {
    case TicketStatus.OPEN: return 'Open';
    case TicketStatus.ASSIGNED: return 'Assigned';
    case TicketStatus.WAITING_ON_CUSTOMER: return 'Waiting on Customer';
    case TicketStatus.RESOLVED: return 'Resolved';
    case TicketStatus.CLOSED: return 'Closed';
  }
}

export function getStatusColors(status: TicketStatus) {
  switch (status) {
    case TicketStatus.OPEN:
      return 'text-[#2563EB] bg-[#EFF6FF] border-[#BFDBFE]';
    case TicketStatus.ASSIGNED:
      return 'text-[#059669] bg-[#ECFDF5] border-[#A7F3D0]';
    case TicketStatus.WAITING_ON_CUSTOMER:
      return 'text-[#D97706] bg-[#FFFBEB] border-[#FDE68A]';
    case TicketStatus.RESOLVED:
      return 'text-[#475569] bg-[#F1F5F9] border-[#CBD5E1]';
    case TicketStatus.CLOSED:
      return 'text-[#94A3B8] bg-[#F8FAFC] border-[#E2E8F0]';
  }
}

// Generate pastel color from string
export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h}, 60%, 70%)`;
}
