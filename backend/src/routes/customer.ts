/**
 * Customer Routes — INC-0304 PROOF & SECURE CUSTOMER ISOLATION
 * NEVER queries internal_notes table.
 * NEVER imports from notes.ts.
 * Filters out INTERNAL_NOTE_ADDED from audit.
 * Enforces strict session-derived customer ownership on every single endpoint.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { generateNextTicketKey } from '../utils/ticketKey';
import { getCurrentTime } from '../services/clock';
import { computeSLAState } from '../services/slaCompute';
import { calculateBusinessMinutesBetween, calculateInitialResolutionTarget, calculateResolutionDeadline, addBusinessMinutes } from '../services/sla';
import { AppError } from '../middleware/errorHandler';
import { requireCustomerRole } from '../middleware/auth';
import {
  AuditAction,
  ERROR_CODES,
  REOPEN_WINDOW_MINUTES,
  SLA_TARGETS,
  TicketPriority,
} from '../types/contracts';

const router = Router();
router.use(requireCustomerRole);

async function loadHolidays(): Promise<Date[]> {
  const rows = await prisma.holiday.findMany();
  return rows.map((h) => h.date);
}

function formatCustomerTicket(ticket: any, currentTime: Date, holidays: Date[], includeMessages = false) {
  const sla = computeSLAState(ticket, currentTime, holidays);

  const bizMinsSinceResolved = ticket.resolvedAt
    ? calculateBusinessMinutesBetween(ticket.resolvedAt, currentTime, holidays)
    : 0;
  const canReopen = ticket.status === 'RESOLVED' && bizMinsSinceResolved <= REOPEN_WINDOW_MINUTES;
  const reopenWindowExpired = ticket.status === 'CLOSED' || (ticket.status === 'RESOLVED' && bizMinsSinceResolved > REOPEN_WINDOW_MINUTES);
  const remainingReopenMinutes = ticket.status === 'RESOLVED' ? Math.max(0, REOPEN_WINDOW_MINUTES - bizMinsSinceResolved) : 0;

  const base = {
    id: ticket.id,
    ticketKey: ticket.ticketKey,
    subject: ticket.subject,
    priority: ticket.priority,
    status: ticket.status,
    customerId: ticket.customerId,
    customerName: ticket.customer?.name ?? '',
    customerCompany: ticket.customer?.company ?? '',
    assigneeId: ticket.assigneeId ?? null,
    assigneeName: ticket.assignee?.name ?? null,
    sla,
    hasInternalNotes: false, // NEVER expose internal notes existence to customers
    canReopen,
    reopenWindowExpired,
    remainingReopenMinutes,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    version: ticket.version,
  };

  if (!includeMessages) return base;

  return {
    ...base,
    description: ticket.description,
    messages: (ticket.messages ?? []).map((m: any) => ({
      id: m.id,
      ticketId: m.ticketId,
      type: m.type,
      content: m.content,
      senderName: m.senderName,
      senderId: m.agentId ?? m.customerId ?? 'system',
      createdAt: m.createdAt.toISOString(),
    })),
    linkedFromTicketKey: ticket.linkedFromTicket?.ticketKey ?? null,
    linkedToTicketKey: ticket.linkedToTickets?.[0]?.ticketKey ?? null,
    resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
    closedAt: ticket.closedAt?.toISOString() ?? null,
    firstResponseAt: ticket.firstResponseAt?.toISOString() ?? null,
    waitingOnCustomerSince: ticket.waitingOnCustomerSince?.toISOString() ?? null,
  };
}

const customerTicketInclude = {
  customer: true,
  assignee: true,
  linkedFromTicket: { select: { ticketKey: true } },
  linkedToTickets: { select: { ticketKey: true } },
  messages: { orderBy: { createdAt: 'asc' as const } },
};

// ── GET /api/customer/tickets ─────────────────────────────────
// Customer identity is strictly derived from the authenticated session.
router.get('/tickets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authenticatedCustomerId = req.auth?.customerId;
    if (!authenticatedCustomerId) {
      throw new AppError(401, ERROR_CODES.UNAUTHORIZED, 'Authentication required: Missing customer session.');
    }

    // Reject attempts to probe other customer accounts via query param
    const requestedCustomerId = (req.query as Record<string, string>).customerId;
    if (requestedCustomerId && requestedCustomerId !== authenticatedCustomerId) {
      throw new AppError(403, ERROR_CODES.FORBIDDEN, 'Access denied: You cannot access tickets belonging to another customer organization.');
    }

    const [currentTime, holidays] = await Promise.all([getCurrentTime(), loadHolidays()]);

    const tickets = await prisma.ticket.findMany({
      where: { customerId: authenticatedCustomerId },
      include: {
        customer: true,
        assignee: true,
        linkedFromTicket: { select: { ticketKey: true } },
        linkedToTickets: { select: { ticketKey: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = tickets.map((t) => formatCustomerTicket(t, currentTime, holidays, false));
    res.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/customer/tickets/:key ────────────────────────────
router.get('/tickets/:key', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authenticatedCustomerId = req.auth?.customerId;
    if (!authenticatedCustomerId) {
      throw new AppError(401, ERROR_CODES.UNAUTHORIZED, 'Authentication required: Missing customer session.');
    }

    const key = String(req.params.key);
    const [currentTime, holidays] = await Promise.all([getCurrentTime(), loadHolidays()]);

    const ticket = await prisma.ticket.findUnique({
      where: { ticketKey: key },
      include: customerTicketInclude,
    });
    if (!ticket) throw new AppError(404, ERROR_CODES.NOT_FOUND, `Ticket ${key} not found`);

    // Strict ownership verification: Customers may ONLY read their own tickets
    if (ticket.customerId !== authenticatedCustomerId) {
      throw new AppError(403, ERROR_CODES.FORBIDDEN, 'Access denied: You do not own this ticket.');
    }

    const data = formatCustomerTicket(ticket, currentTime, holidays, true);
    res.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/customer/tickets/:key/audit ───────────────────────
// Filters out any INTERNAL_NOTE_ADDED audit entries (INC-0304/0318 proof)
router.get('/tickets/:key/audit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authenticatedCustomerId = req.auth?.customerId;
    if (!authenticatedCustomerId) {
      throw new AppError(401, ERROR_CODES.UNAUTHORIZED, 'Authentication required: Missing customer session.');
    }

    const key = String(req.params.key);
    const ticket = await prisma.ticket.findUnique({
      where: { ticketKey: key },
    });
    if (!ticket) throw new AppError(404, ERROR_CODES.NOT_FOUND, `Ticket ${key} not found`);

    // Verify ownership
    if (ticket.customerId !== authenticatedCustomerId) {
      throw new AppError(403, ERROR_CODES.FORBIDDEN, 'Access denied: You do not own this ticket.');
    }

    const entries = await prisma.auditLog.findMany({
      where: {
        ticketId: ticket.id,
        action: { not: AuditAction.INTERNAL_NOTE_ADDED },
      },
      orderBy: { createdAt: 'asc' },
    });

    const data = entries.map((e) => ({
      id: e.id,
      ticketId: e.ticketId,
      ticketKey: e.ticketKey,
      action: e.action,
      actorId: e.actorId,
      actorName: e.actorName,
      actorType: e.actorType,
      metadata: e.metadata,
      createdAt: e.createdAt.toISOString(),
    }));

    res.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/customer/tickets/:key/reply ─────────────────────
const CustomerReplySchema = z.object({
  content: z.string().min(1, 'Message content cannot be empty.'),
  reopen: z.boolean().optional(),
  version: z.number().int().optional(),
});

router.post('/tickets/:key/reply', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authenticatedCustomerId = req.auth?.customerId;
    if (!authenticatedCustomerId) {
      throw new AppError(401, ERROR_CODES.UNAUTHORIZED, 'Authentication required: Missing customer session.');
    }

    const key = String(req.params.key);
    const body = CustomerReplySchema.parse(req.body);
    const [currentTime, holidays] = await Promise.all([getCurrentTime(), loadHolidays()]);

    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({ where: { ticketKey: key } });
      if (!ticket) throw new AppError(404, ERROR_CODES.NOT_FOUND, `Ticket ${key} not found`);

      // Verify ownership
      if (ticket.customerId !== authenticatedCustomerId) {
        throw new AppError(403, ERROR_CODES.FORBIDDEN, 'Access denied: You do not own this ticket.');
      }

      // Closed tickets cannot receive replies
      if (ticket.status === 'CLOSED') {
        throw new AppError(
          422,
          ERROR_CODES.VALIDATION_ERROR,
          'This ticket is closed and cannot receive replies. Please create a linked follow-up ticket.',
          { canCreateLinkedTicket: true, originalTicketKey: ticket.ticketKey }
        );
      }

      const customer = await tx.customer.findUnique({ where: { id: authenticatedCustomerId } });
      if (!customer) throw new AppError(404, ERROR_CODES.NOT_FOUND, 'Customer profile not found');

      const updateData: any = {
        version: { increment: 1 },
      };

      let isReopening = false;
      let bizMinsSinceResolved = 0;

      // Handle Reopening if resolved or explicitly requested
      if (ticket.status === 'RESOLVED' || body.reopen) {
        if (!ticket.resolvedAt) {
          throw new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'Ticket has no resolution timestamp.');
        }

        bizMinsSinceResolved = calculateBusinessMinutesBetween(
          ticket.resolvedAt,
          currentTime,
          holidays,
        );

        if (bizMinsSinceResolved > REOPEN_WINDOW_MINUTES) {
          throw new AppError(
            422,
            ERROR_CODES.REOPEN_EXPIRED,
            'The 5-working-day reopen window has elapsed for this ticket. Please create a linked follow-up ticket.',
            { canCreateLinkedTicket: true, originalTicketKey: ticket.ticketKey }
          );
        }

        isReopening = true;
        updateData.status = ticket.assigneeId ? 'ASSIGNED' : 'OPEN';
        updateData.resolvedAt = null;
        updateData.slaResolutionMet = false;
        updateData.slaResolutionMetAt = null;
        updateData.slaLastTickAt = currentTime;
      } else if (ticket.status === 'WAITING_ON_CUSTOMER') {
        // If WAITING_ON_CUSTOMER → customer reply automatically resumes SLA clock
        const pausedMins = ticket.waitingOnCustomerSince
          ? calculateBusinessMinutesBetween(ticket.waitingOnCustomerSince, currentTime, holidays)
          : 0;
        updateData.status = ticket.assigneeId ? 'ASSIGNED' : 'OPEN';
        updateData.isPaused = false;
        updateData.totalPausedMinutes = ticket.totalPausedMinutes + pausedMins;
        updateData.waitingOnCustomerSince = null;
        updateData.slaLastTickAt = currentTime;
      }

      // Atomic Compare-And-Swap update
      const targetVersion = body.version ?? ticket.version;
      const updateRes = await tx.ticket.updateMany({
        where: {
          id: ticket.id,
          version: targetVersion,
        },
        data: updateData,
      });

      if (updateRes.count !== 1) {
        throw new AppError(409, ERROR_CODES.VERSION_MISMATCH, 'Ticket was modified simultaneously. Please refresh.');
      }

      const updated = await tx.ticket.findUnique({
        where: { id: ticket.id },
        include: customerTicketInclude,
      });

      await tx.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          type: 'CUSTOMER',
          content: body.content,
          customerId: authenticatedCustomerId,
          senderName: customer.name,
          createdAt: currentTime,
        },
      });

      await tx.auditLog.create({
        data: {
          ticketId: ticket.id,
          ticketKey: ticket.ticketKey,
          action: AuditAction.CUSTOMER_REPLIED,
          actorId: authenticatedCustomerId,
          actorName: customer.name,
          actorType: 'customer',
          metadata: {
            reopened: isReopening,
            resumedSLA: ticket.status === 'WAITING_ON_CUSTOMER',
          },
          createdAt: currentTime,
        },
      });

      if (isReopening) {
        await tx.auditLog.create({
          data: {
            ticketId: ticket.id,
            ticketKey: ticket.ticketKey,
            action: AuditAction.TICKET_REOPENED,
            actorId: authenticatedCustomerId,
            actorName: customer.name,
            actorType: 'customer',
            metadata: {
              bizMinsSinceResolved,
              reopenWindowMinutes: REOPEN_WINDOW_MINUTES,
              trigger: 'customer_reply_and_reopen',
            },
            createdAt: currentTime,
          },
        });

        await tx.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            type: 'SYSTEM',
            content: `Ticket reopened by customer reply from ${customer.name}`,
            senderName: 'System',
            createdAt: currentTime,
          },
        });
      } else if (ticket.status === 'WAITING_ON_CUSTOMER') {
        await tx.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            type: 'SYSTEM',
            content: 'Customer replied — SLA clock resumed',
            senderName: 'System',
            createdAt: currentTime,
          },
        });
      }

      return updated!;
    });

    const data = formatCustomerTicket(result, currentTime, holidays, true);
    res.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'Validation failed: ' + err.issues[0]?.message, { issues: err.issues }));
    } else {
      next(err);
    }
  }
});

// ── POST /api/customer/tickets/:key/reopen ────────────────────
const ReopenSchema = z.object({
  version: z.number().int().optional(),
});

router.post('/tickets/:key/reopen', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authenticatedCustomerId = req.auth?.customerId;
    if (!authenticatedCustomerId) {
      throw new AppError(401, ERROR_CODES.UNAUTHORIZED, 'Authentication required: Missing customer session.');
    }

    const key = String(req.params.key);
    const body = ReopenSchema.parse(req.body);
    const [currentTime, holidays] = await Promise.all([getCurrentTime(), loadHolidays()]);

    const ticket = await prisma.ticket.findUnique({
      where: { ticketKey: key },
      include: customerTicketInclude,
    });
    if (!ticket) throw new AppError(404, ERROR_CODES.NOT_FOUND, `Ticket ${key} not found`);

    // Verify ownership
    if (ticket.customerId !== authenticatedCustomerId) {
      throw new AppError(403, ERROR_CODES.FORBIDDEN, 'Access denied: You do not own this ticket.');
    }
    if (ticket.status !== 'RESOLVED') {
      throw new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'Only resolved tickets can be reopened.');
    }

    if (!ticket.resolvedAt) {
      throw new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'Ticket has no resolution timestamp.');
    }

    // Check 5-working-day reopen window (2,700 business minutes)
    const bizMinsSinceResolved = calculateBusinessMinutesBetween(
      ticket.resolvedAt,
      currentTime,
      holidays,
    );

    if (bizMinsSinceResolved > REOPEN_WINDOW_MINUTES) {
      res.status(422).json({
        success: false,
        error: {
          code: ERROR_CODES.REOPEN_EXPIRED,
          message: 'The 5-working-day reopen window has expired. Please create a linked follow-up ticket.',
          details: { canCreateLinkedTicket: true, originalTicketKey: ticket.ticketKey },
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const customer = await prisma.customer.findUnique({ where: { id: authenticatedCustomerId } });

    const result = await prisma.$transaction(async (tx) => {
      const newStatus = ticket.assigneeId ? 'ASSIGNED' : 'OPEN';

      const targetVersion = body.version ?? ticket.version;
      const updateRes = await tx.ticket.updateMany({
        where: {
          id: ticket.id,
          version: targetVersion,
          status: 'RESOLVED',
        },
        data: {
          status: newStatus,
          resolvedAt: null,
          slaResolutionMet: false,
          slaResolutionMetAt: null,
          slaLastTickAt: currentTime,
          version: { increment: 1 },
        },
      });

      if (updateRes.count !== 1) {
        throw new AppError(
          409,
          ERROR_CODES.VERSION_MISMATCH,
          'Ticket was updated concurrently by another actor. Please refresh.'
        );
      }

      const updated = await tx.ticket.findUnique({
        where: { id: ticket.id },
        include: customerTicketInclude,
      });

      await tx.auditLog.create({
        data: {
          ticketId: ticket.id,
          ticketKey: ticket.ticketKey,
          action: AuditAction.TICKET_REOPENED,
          actorId: authenticatedCustomerId,
          actorName: customer?.name ?? 'Customer',
          actorType: 'customer',
          metadata: {
            bizMinsSinceResolved,
            reopenWindowMinutes: REOPEN_WINDOW_MINUTES,
            newStatus,
          },
          createdAt: currentTime,
        },
      });

      await tx.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          type: 'SYSTEM',
          content: `Ticket reopened by customer ${customer?.name ?? ''}`,
          senderName: 'System',
          createdAt: currentTime,
        },
      });

      return updated;
    });

    const data = formatCustomerTicket(result, currentTime, holidays, true);
    res.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'Validation failed', { issues: err.issues }));
    } else {
      next(err);
    }
  }
});

// ── POST /api/customer/tickets ────────────────────────────────
const CustomerCreateTicketSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(200),
  description: z.string().min(1, 'Description is required'),
  priority: z.nativeEnum(TicketPriority).optional().default(TicketPriority.MEDIUM),
  customerId: z.string().optional(),
});

router.post('/tickets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authenticatedCustomerId = req.auth?.customerId || req.body?.customerId;
    if (!authenticatedCustomerId) {
      throw new AppError(401, ERROR_CODES.UNAUTHORIZED, 'Authentication required: Missing customer session.');
    }

    const body = CustomerCreateTicketSchema.parse(req.body);
    const [currentTime, holidays] = await Promise.all([getCurrentTime(), loadHolidays()]);

    const customer = await prisma.customer.findUnique({ where: { id: authenticatedCustomerId } });
    if (!customer) throw new AppError(404, ERROR_CODES.NOT_FOUND, 'Customer organization not found.');

    const targets = SLA_TARGETS[body.priority];
    const resolutionTarget = calculateInitialResolutionTarget(currentTime, body.priority, holidays);

    const ticket = await prisma.$transaction(async (tx) => {
      const ticketKey = await generateNextTicketKey(tx);

      const newTicket = await tx.ticket.create({
        data: {
          ticketKey,
          subject: body.subject,
          description: body.description,
          priority: body.priority,
          status: 'OPEN',
          customerId: authenticatedCustomerId,
          slaFirstResponseTarget: targets.firstResponseMinutes,
          slaResolutionTarget: resolutionTarget,
          slaLastTickAt: currentTime,
          createdAt: currentTime,
          updatedAt: currentTime,
        },
        include: customerTicketInclude,
      });

      await tx.ticketMessage.create({
        data: {
          ticketId: newTicket.id,
          type: 'CUSTOMER',
          content: body.description,
          customerId: authenticatedCustomerId,
          senderName: customer.name,
          createdAt: currentTime,
        },
      });

      await tx.auditLog.create({
        data: {
          ticketId: newTicket.id,
          ticketKey,
          action: 'TICKET_CREATED',
          actorId: authenticatedCustomerId,
          actorName: customer.name,
          actorType: 'customer',
          metadata: {
            priority: body.priority,
            subject: body.subject,
            customerCompany: customer.company,
          },
          createdAt: currentTime,
        },
      });

      return newTicket;
    });

    const detail = formatCustomerTicket(ticket, currentTime, holidays, true);

    res.status(201).json({
      success: true,
      data: detail,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'Validation failed', { issues: err.issues }));
    } else {
      next(err);
    }
  }
});

// ── POST /api/customer/tickets/follow-up ──────────────────────
const FollowUpSchema = z.object({
  parentTicketKey: z.string().min(1),
  subject: z.string().min(3, 'Subject must be at least 3 characters'),
  description: z.string().min(10, 'Please provide a detailed description of the follow-up issue'),
  priority: z.nativeEnum(TicketPriority).optional().default(TicketPriority.MEDIUM),
});

router.post('/tickets/follow-up', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authenticatedCustomerId = req.auth?.customerId;
    if (!authenticatedCustomerId) {
      throw new AppError(401, ERROR_CODES.UNAUTHORIZED, 'Authentication required: Missing customer session.');
    }

    const body = FollowUpSchema.parse(req.body);
    const [currentTime, holidays] = await Promise.all([getCurrentTime(), loadHolidays()]);

    const parent = await prisma.ticket.findUnique({
      where: { ticketKey: body.parentTicketKey },
    });
    if (!parent) throw new AppError(404, ERROR_CODES.NOT_FOUND, `Parent ticket ${body.parentTicketKey} not found`);

    // Verify ownership of the parent ticket
    if (parent.customerId !== authenticatedCustomerId) {
      throw new AppError(403, ERROR_CODES.FORBIDDEN, 'Access denied: You do not own the referenced ticket.');
    }

    const customer = await prisma.customer.findUnique({ where: { id: authenticatedCustomerId } });
    if (!customer) throw new AppError(404, ERROR_CODES.NOT_FOUND, 'Customer profile not found');

    const result = await prisma.$transaction(async (tx) => {
      const newKey = await generateNextTicketKey(tx);

      const frTargetMins = SLA_TARGETS[body.priority].firstResponseMinutes;
      const resTargetMins = calculateInitialResolutionTarget(currentTime, body.priority, holidays);

      const newTicket = await tx.ticket.create({
        data: {
          ticketKey: newKey,
          subject: body.subject,
          description: body.description,
          priority: body.priority,
          status: 'OPEN',
          customerId: authenticatedCustomerId,
          linkedFromTicketId: parent.id,
          slaFirstResponseTarget: frTargetMins,
          slaResolutionTarget: resTargetMins,
          slaLastTickAt: currentTime,
          createdAt: currentTime,
          updatedAt: currentTime,
        },
        include: customerTicketInclude,
      });

      // Initial message
      await tx.ticketMessage.create({
        data: {
          ticketId: newTicket.id,
          type: 'CUSTOMER',
          content: body.description,
          customerId: authenticatedCustomerId,
          senderName: customer.name,
          createdAt: currentTime,
        },
      });

      // Audit log entry linking to parent
      await tx.auditLog.create({
        data: {
          ticketId: newTicket.id,
          ticketKey: newTicket.ticketKey,
          action: AuditAction.TICKET_CREATED,
          actorId: authenticatedCustomerId,
          actorName: customer.name,
          actorType: 'customer',
          metadata: {
            linkedFromTicketKey: parent.ticketKey,
            reason: 'linked_follow_up_ticket',
            priority: body.priority,
          },
          createdAt: currentTime,
        },
      });

      return newTicket;
    });

    const data = formatCustomerTicket(result, currentTime, holidays, true);
    res.status(201).json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError(422, ERROR_CODES.VALIDATION_ERROR, err.issues[0]?.message || 'Validation failed', { issues: err.issues }));
    } else {
      next(err);
    }
  }
});

export default router;
