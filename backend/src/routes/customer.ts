/**
 * Customer Routes — INC-0304 PROOF
 * NEVER queries internal_notes table.
 * NEVER imports from notes.ts.
 * Filters out INTERNAL_NOTE_ADDED from audit.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { getCurrentTime } from '../services/clock';
import { computeSLAState } from '../services/slaCompute';
import { calculateBusinessMinutesBetween } from '../services/sla';
import { AppError } from '../middleware/errorHandler';
import {
  AuditAction,
  ERROR_CODES,
  REOPEN_WINDOW_MINUTES,
} from '../types/contracts';

const router = Router();

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
    hasInternalNotes: false, // NEVER expose to customers
    canReopen,
    reopenWindowExpired,
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

// ── GET /api/customer/tickets?customerId=X ────────────────────
router.get('/tickets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.query as Record<string, string>;
    if (!customerId) throw new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'customerId is required');

    const [currentTime, holidays] = await Promise.all([getCurrentTime(), loadHolidays()]);

    const tickets = await prisma.ticket.findMany({
      where: { customerId },
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
    const key = String(req.params.key);
    const [currentTime, holidays] = await Promise.all([getCurrentTime(), loadHolidays()]);

    const ticket = await prisma.ticket.findUnique({
      where: { ticketKey: key },
      include: customerTicketInclude,
    });
    if (!ticket) throw new AppError(404, ERROR_CODES.NOT_FOUND, `Ticket ${key} not found`);

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
    const key = String(req.params.key);
    const ticket = await prisma.ticket.findUnique({
      where: { ticketKey: key },
    });
    if (!ticket) throw new AppError(404, ERROR_CODES.NOT_FOUND, `Ticket ${key} not found`);

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
  customerId: z.string().min(1),
  content: z.string().min(1),
  reopen: z.boolean().optional(),
});

router.post('/tickets/:key/reply', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = String(req.params.key);
    const body = CustomerReplySchema.parse(req.body);
    const [currentTime, holidays] = await Promise.all([getCurrentTime(), loadHolidays()]);

    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({ where: { ticketKey: key } });
      if (!ticket) throw new AppError(404, ERROR_CODES.NOT_FOUND, `Ticket ${key} not found`);
      if (ticket.customerId !== body.customerId) {
        throw new AppError(403, ERROR_CODES.FORBIDDEN, 'Not your ticket.');
      }
      if (ticket.status === 'CLOSED') {
        throw new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'This ticket is closed. Please create a new ticket.');
      }

      const customer = await tx.customer.findUnique({ where: { id: body.customerId } });
      if (!customer) throw new AppError(404, ERROR_CODES.NOT_FOUND, 'Customer not found');

      const updateData: any = {
        version: { increment: 1 },
      };

      let isReopening = false;
      let bizMinsSinceResolved = 0;

      // Handle Reopening if resolved or requested
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
            'Reopen window has expired (5 working days). Please create a new ticket.',
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
        // If WAITING_ON_CUSTOMER → resume SLA
        const pausedMins = ticket.waitingOnCustomerSince
          ? calculateBusinessMinutesBetween(ticket.waitingOnCustomerSince, currentTime, holidays)
          : 0;
        updateData.status = 'ASSIGNED';
        updateData.isPaused = false;
        updateData.totalPausedMinutes = ticket.totalPausedMinutes + pausedMins;
        updateData.waitingOnCustomerSince = null;
        updateData.slaLastTickAt = currentTime;
      }

      // Atomic Compare-And-Swap update
      const updateRes = await tx.ticket.updateMany({
        where: {
          id: ticket.id,
          version: ticket.version,
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
          customerId: body.customerId,
          senderName: customer.name,
          createdAt: currentTime,
        },
      });

      await tx.auditLog.create({
        data: {
          ticketId: ticket.id,
          ticketKey: ticket.ticketKey,
          action: AuditAction.CUSTOMER_REPLIED,
          actorId: body.customerId,
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
            actorId: body.customerId,
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
      next(new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'Validation failed', { issues: err.issues }));
    } else {
      next(err);
    }
  }
});

// ── POST /api/customer/tickets/:key/reopen ────────────────────
const ReopenSchema = z.object({
  customerId: z.string().min(1),
});

router.post('/tickets/:key/reopen', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = String(req.params.key);
    const body = ReopenSchema.parse(req.body);
    const [currentTime, holidays] = await Promise.all([getCurrentTime(), loadHolidays()]);

    const ticket = await prisma.ticket.findUnique({
      where: { ticketKey: key },
      include: customerTicketInclude,
    });
    if (!ticket) throw new AppError(404, ERROR_CODES.NOT_FOUND, `Ticket ${key} not found`);
    if (ticket.customerId !== body.customerId) {
      throw new AppError(403, ERROR_CODES.FORBIDDEN, 'Not your ticket.');
    }
    if (ticket.status !== 'RESOLVED') {
      throw new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'Only resolved tickets can be reopened.');
    }

    if (!ticket.resolvedAt) {
      throw new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'Ticket has no resolution timestamp.');
    }

    // Check reopen window
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
          message: 'Reopen window has expired (5 working days). Please create a new ticket.',
          details: { canCreateLinkedTicket: true, originalTicketKey: ticket.ticketKey },
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const customer = await prisma.customer.findUnique({ where: { id: body.customerId } });

    const result = await prisma.$transaction(async (tx) => {
      const newStatus = ticket.assigneeId ? 'ASSIGNED' : 'OPEN';

      const updated = await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: newStatus,
          resolvedAt: null,
          slaResolutionMet: false,
          slaResolutionMetAt: null,
          slaLastTickAt: currentTime,
          version: { increment: 1 },
        },
        include: customerTicketInclude,
      });

      await tx.auditLog.create({
        data: {
          ticketId: ticket.id,
          ticketKey: ticket.ticketKey,
          action: AuditAction.TICKET_REOPENED,
          actorId: body.customerId,
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

export default router;
