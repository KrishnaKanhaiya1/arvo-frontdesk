// ============================================================
// Arvo Frontdesk — Shared API Contracts & Type Definitions
// Single source of truth for frontend ↔ backend communication
// ============================================================

// ── Enums ────────────────────────────────────────────────────

export enum TicketPriority {
  CRITICAL = 'CRITICAL',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum TicketStatus {
  OPEN = 'OPEN',              // Created, not yet assigned
  ASSIGNED = 'ASSIGNED',      // Claimed by an agent
  WAITING_ON_CUSTOMER = 'WAITING_ON_CUSTOMER', // Agent asked question, SLA paused
  RESOLVED = 'RESOLVED',      // Agent marked as done (reopen window active)
  CLOSED = 'CLOSED',          // Auto-closed after customer inactivity or reopen window expired
}

export enum AuditAction {
  TICKET_CREATED = 'TICKET_CREATED',
  TICKET_CLAIMED = 'TICKET_CLAIMED',
  TICKET_RELEASED = 'TICKET_RELEASED',
  PRIORITY_CHANGED = 'PRIORITY_CHANGED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  FIRST_RESPONSE_SENT = 'FIRST_RESPONSE_SENT',
  PUBLIC_REPLY_SENT = 'PUBLIC_REPLY_SENT',
  INTERNAL_NOTE_ADDED = 'INTERNAL_NOTE_ADDED',
  CUSTOMER_REPLIED = 'CUSTOMER_REPLIED',
  SLA_RECALCULATED = 'SLA_RECALCULATED',
  TICKET_REOPENED = 'TICKET_REOPENED',
  TICKET_AUTO_CLOSED = 'TICKET_AUTO_CLOSED',
  LINKED_TICKET_CREATED = 'LINKED_TICKET_CREATED',
  ASSIGNED_TRANSFERRED = 'ASSIGNED_TRANSFERRED',
}

export enum MessageType {
  CUSTOMER = 'CUSTOMER',
  AGENT_PUBLIC = 'AGENT_PUBLIC',
  SYSTEM = 'SYSTEM',
}

// ── SLA Configuration ────────────────────────────────────────
// Business hours: Mon–Fri, 09:30–18:30 IST = 9 hours (540 min) per day
// Working week = 5 days × 540 min = 2700 min = 45 hours

export const BUSINESS_HOURS = {
  startHour: 9,
  startMinute: 30,
  endHour: 18,
  endMinute: 30,
  workingDays: [1, 2, 3, 4, 5] as number[], // Mon=1 through Fri=5
  timezone: 'Asia/Kolkata',
  dailyMinutes: 540,
  weeklyMinutes: 2700,
} as const;

export const SLA_TARGETS: Record<TicketPriority, { firstResponseMinutes: number; resolutionMinutes: number }> = {
  [TicketPriority.CRITICAL]: { firstResponseMinutes: 120, resolutionMinutes: 540 },     // 2h / 9h (1 working day)
  [TicketPriority.MEDIUM]:   { firstResponseMinutes: 270, resolutionMinutes: 1620 },    // 4.5h / 27h (3 working days)
  [TicketPriority.LOW]:      { firstResponseMinutes: 540, resolutionMinutes: 2700 },    // 9h / 45h (5 working days)
};

// Auto-close after 5 working days (2700 minutes) of waiting on customer
export const AUTO_CLOSE_MINUTES = 2700;

// Reopen window: 5 working days (2700 minutes) after resolution
export const REOPEN_WINDOW_MINUTES = 2700;

// ── Agent / Persona Types ────────────────────────────────────

export interface Agent {
  id: string;
  name: string;
  email: string;
  role: 'lead' | 'agent';
  avatarColor: string;
  avatarInitials: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  company: string;
  avatarColor: string;
  avatarInitials: string;
}

// ── SLA State ────────────────────────────────────────────────

export interface SLAState {
  firstResponse: {
    targetMinutes: number;
    elapsedBusinessMinutes: number;
    remainingBusinessMinutes: number;
    deadlineIST: string | null;      // ISO string in IST
    breached: boolean;
    met: boolean;                     // true if first response was sent
    metAt: string | null;
  };
  resolution: {
    targetMinutes: number;
    elapsedBusinessMinutes: number;
    remainingBusinessMinutes: number;
    deadlineIST: string | null;
    breached: boolean;
    met: boolean;
    metAt: string | null;
  };
  isPaused: boolean;
  pauseReason: string | null;        // 'waiting_on_customer' | 'off_hours' | null
  totalPausedMinutes: number;
  isBusinessHours: boolean;
}

// ── Ticket Types ─────────────────────────────────────────────

export interface TicketSummary {
  id: string;
  ticketKey: string;             // e.g. 'ARV-101'
  subject: string;
  priority: TicketPriority;
  status: TicketStatus;
  customerId: string;
  customerName: string;
  customerCompany: string;
  assigneeId: string | null;
  assigneeName: string | null;
  sla: SLAState;
  hasInternalNotes: boolean;     // count > 0 indicator only (never leak content)
  canReopen?: boolean;
  reopenWindowExpired?: boolean;
  remainingReopenMinutes?: number | null;
  createdAt: string;             // ISO
  updatedAt: string;
  version: number;               // Optimistic concurrency
}

export interface TicketDetail extends TicketSummary {
  description: string;
  messages: TicketMessage[];
  linkedFromTicketKey: string | null;   // If created from expired reopen
  linkedToTicketKey: string | null;     // If this was reopened as new ticket
  resolvedAt: string | null;
  closedAt: string | null;
  firstResponseAt: string | null;
  waitingOnCustomerSince: string | null;
}

// ── Messages ─────────────────────────────────────────────────
// IMPORTANT: Internal notes are NEVER included in TicketMessage.
// They use a completely separate type and endpoint.

export interface TicketMessage {
  id: string;
  ticketId: string;
  type: MessageType;
  content: string;
  senderName: string;
  senderId: string;
  createdAt: string;             // ISO with IST
}

// Internal notes — separate type, separate API, separate table
export interface InternalNote {
  id: string;
  ticketId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

// ── Audit Log ────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  ticketId: string;
  ticketKey: string;
  action: AuditAction;
  actorId: string;
  actorName: string;
  actorType: 'agent' | 'customer' | 'system';
  metadata: Record<string, unknown>;  // Before/after diffs, details
  createdAt: string;                  // Exact IST timestamp
}

// ── API Request Bodies ───────────────────────────────────────

export interface CreateTicketRequest {
  subject: string;
  description: string;
  priority: TicketPriority;
  customerId: string;
  linkedFromTicketId?: string;   // When creating follow-up from expired reopen
}

export interface ClaimTicketRequest {
  agentId: string;
  version: number;               // Must match current version for optimistic lock
  allowTakeover?: boolean;       // Set true when taking over ticket already assigned to another agent
}

export interface SendReplyRequest {
  agentId: string;
  content: string;
  newStatus?: 'WAITING_ON_CUSTOMER' | 'RESOLVED';  // Optional status change with reply
  version: number;
}

export interface AddInternalNoteRequest {
  agentId: string;
  content: string;
}

export interface CustomerReplyRequest {
  customerId: string;
  content: string;
}

export interface ChangePriorityRequest {
  agentId: string;
  newPriority: TicketPriority;
  version: number;
}

export interface ChangeStatusRequest {
  agentId: string;
  newStatus: TicketStatus;
  version: number;
}

export interface ReopenTicketRequest {
  customerId: string;
}

export interface ClockOverrideRequest {
  simulatedTime: string | null;  // ISO string or null to reset to live
}

// ── API Response Envelopes ───────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}

// Error codes
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',               // 401 — authentication required
  CONFLICT: 'CONFLICT',                       // 409 — ticket already claimed
  VERSION_MISMATCH: 'VERSION_MISMATCH',       // 409 — optimistic lock failure
  VALIDATION_ERROR: 'VALIDATION_ERROR',       // 422 — invalid input
  NOT_FOUND: 'NOT_FOUND',                     // 404
  FORBIDDEN: 'FORBIDDEN',                     // 403
  REOPEN_EXPIRED: 'REOPEN_EXPIRED',           // 422 — reopen window passed
  TICKET_NOT_ASSIGNED: 'TICKET_NOT_ASSIGNED', // 422 — must claim first
  RATE_LIMITED: 'RATE_LIMITED',               // 429 — too many attempts
  INTERNAL_ERROR: 'INTERNAL_ERROR',           // 500
} as const;

// ── Dashboard / Telemetry ────────────────────────────────────

export interface DashboardStats {
  breached: number;
  atRisk: number;
  waitingOnCustomer: number;
  unassigned: number;
  totalActive: number;
  resolvedToday: number;
  slaCompliancePercent: number;  // (non-breached / total resolved+active) × 100
}

// ── System Clock ─────────────────────────────────────────────

export interface SystemClock {
  currentTime: string;           // ISO string — real or simulated
  isSimulated: boolean;
  isBusinessHours: boolean;
  nextBusinessOpen: string | null;  // null if currently in business hours
  holidays: Holiday[];
}

export interface Holiday {
  id?: string;
  date: string;                  // YYYY-MM-DD
  name: string;
}

// ── API Endpoint Specification ───────────────────────────────
//
// AGENT ENDPOINTS (used by agent workspace):
//   GET    /api/tickets                    → ApiResponse<TicketSummary[]>
//   GET    /api/tickets/:key               → ApiResponse<TicketDetail>  (includes messages, NOT internal notes)
//   POST   /api/tickets                    → ApiResponse<TicketDetail>  (body: CreateTicketRequest)
//   POST   /api/tickets/:key/claim         → ApiResponse<TicketDetail>  (body: ClaimTicketRequest)
//   POST   /api/tickets/:key/reply         → ApiResponse<TicketDetail>  (body: SendReplyRequest)
//   PATCH  /api/tickets/:key/priority      → ApiResponse<TicketDetail>  (body: ChangePriorityRequest)
//   PATCH  /api/tickets/:key/status        → ApiResponse<TicketDetail>  (body: ChangeStatusRequest)
//
// INTERNAL NOTES (completely separate — NEVER accessible from customer endpoints):
//   GET    /api/tickets/:key/notes         → ApiResponse<InternalNote[]>
//   POST   /api/tickets/:key/notes         → ApiResponse<InternalNote>  (body: AddInternalNoteRequest)
//
// AUDIT LOG (append-only, no PUT/PATCH/DELETE):
//   GET    /api/tickets/:key/audit         → ApiResponse<AuditEntry[]>
//
// CUSTOMER ENDPOINTS (INC-0304 safe — NEVER queries internal_notes table):
//   GET    /api/customer/tickets           → ApiResponse<TicketSummary[]>  (filtered by customerId query param)
//   GET    /api/customer/tickets/:key      → ApiResponse<TicketDetail>     (NO internal notes, NO internal audit)
//   POST   /api/customer/tickets/:key/reply    → ApiResponse<TicketDetail> (body: CustomerReplyRequest)
//   POST   /api/customer/tickets/:key/reopen   → ApiResponse<TicketDetail> (body: ReopenTicketRequest)
//
// DASHBOARD:
//   GET    /api/dashboard                  → ApiResponse<DashboardStats>
//
// SYSTEM:
//   GET    /api/health                     → { status: 'ok', uptime: number }
//   GET    /api/system/clock               → ApiResponse<SystemClock>
//   POST   /api/system/clock               → ApiResponse<SystemClock>  (body: ClockOverrideRequest)
//   POST   /api/system/run-autoclose       → ApiResponse<{ closedCount: number; closedTickets: string[] }>
//   POST   /api/system/reset-demo          → ApiResponse<{ message: string }>
//
// REFERENCE DATA:
//   GET    /api/agents                     → ApiResponse<Agent[]>
//   GET    /api/customers                  → ApiResponse<Customer[]>
//
