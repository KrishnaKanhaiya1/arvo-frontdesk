import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { getCurrentTime } from '../services/clock';
import { computeSLAState } from '../services/slaCompute';
import {
  addBusinessMinutes,
  calculateBusinessMinutesBetween,
  calculateInitialResolutionTarget,
} from '../services/sla';
import { AppError } from '../middleware/errorHandler';
import {
  SLA_TARGETS,
  TicketPriority,
  AuditAction,
  ERROR_CODES,
} from '../types/contracts';
import notesRouter from './notes';
import auditRouter from './audit';

const router = Router();

// Subroutes for notes and audit
router.use('/:key/notes', notesRouter);
router.use('/:key/audit', auditRouter);

// ── Helper: load holidays from DB ─────────────────────────────
async function loadHolidays(): Promise<Date[]> {
  const rows = await prisma.holiday.findMany();
  return rows.map((h) => h.date);
}

// ── Helper: format a full ticket response ─────────────────────
async function formatTicket(
  ticket: any,
  currentTime: Date,
  holidays: Date[],
  includeMessages = false,
) {
  const sla = computeSLAState(ticket, currentTime, holidays);
  const noteCount = await prisma.internalNote.count({ where: { ticketId: ticket.id } });

  const base = {
    id: ticket.id,
    ticketKey: ticket.ticketKey,
    subject: ticket.subject,
    priority: ticket.priority as TicketPriority,
    status: ticket.status,
    customerId: ticket.customerId,
    customerName: ticket.customer?.name ?? '',
    customerCompany: ticket.customer?.company ?? '',
    assigneeId: ticket.assigneeId ?? null,
    assigneeName: ticket.assignee?.name ?? null,
    sla,
    hasInternalNotes: noteCount > 0,
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

const ticketInclude = {
  customer: true,
  assignee: true,
  linkedFromTicket: { select: { ticketKey: true } },
  linkedToTickets: { select: { ticketKey: true } },
};

const ticketIncludeWithMessages = {
  ...ticketInclude,
  messages: { orderBy: { createdAt: 'asc' as const } },
};

// ── GET /api/tickets ──────────────────────────────────────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, priority, assigneeId, queue } = req.query as Record<string, string>;
    const [currentTime, holidays] = await Promise.all([getCurrentTime(), loadHolidays()]);

    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigneeId) where.assigneeId = assigneeId;
    if (queue === 'waiting') where.status = 'WAITING_ON_CUSTOMER';
    if (queue === 'unassigned') where.assigneeId = null;

    const tickets = await prisma.ticket.findMany({
      where,
      include: ticketInclude,
      orderBy: { createdAt: 'desc' },
    });

    let results = await Promise.all(
      tickets.map((t) => formatTicket(t, currentTime, holidays, false)),
    );

    // Queue filters that require SLA state computation
    if (queue === 'breached') {
      results = results.filter(
        (t: any) => t.sla.firstResponse.breached || t.sla.resolution.breached,
      );
    } else if (queue === 'at-risk') {
      results = results.filter((t: any) => {
        const fr = t.sla.firstResponse;
        const res = t.sla.resolution;
        const frAtRisk = !fr.met && !fr.breached && fr.remainingBusinessMinutes < fr.targetMinutes * 0.25;
        const resAtRisk = !res.met && !res.breached && res.remainingBusinessMinutes < res.targetMinutes * 0.25;
        return frAtRisk || resAtRisk;
      });
    }

    res.json({ success: true, data: results, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/tickets/:key ─────────────────────────────────────
router.get('/:key', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = String(req.params.key);
    const [currentTime, holidays] = await Promise.all([getCurrentTime(), loadHolidays()]);
    const ticket = await prisma.ticket.findUnique({
      where: { ticketKey: key },
      include: ticketIncludeWithMessages,
    });
    if (!ticket) throw new AppError(404, ERROR_CODES.NOT_FOUND, `Ticket ${key} not found`);

    const data = await formatTicket(ticket, currentTime, holidays, true);
    res.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/tickets ─────────────────────────────────────────
const CreateTicketSchema = z.object({
  subject: z.string().min(1),
  description: z.string().default(''),
  priority: z.nativeEnum(TicketPriority),
  customerId: z.string().min(1),
  linkedFromTicketId: z.string().optional(),
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = CreateTicketSchema.parse(req.body);
    const [currentTime, holidays] = await Promise.all([getCurrentTime(), loadHolidays()]);

    const customer = await prisma.customer.findUnique({ where: { id: body.customerId } });
    if (!customer) throw new AppError(404, ERROR_CODES.NOT_FOUND, 'Customer not found');

    const targets = SLA_TARGETS[body.priority];
    const resolutionTarget = calculateInitialResolutionTarget(currentTime, body.priority, holidays);

    const ticket = await prisma.$transaction(async (tx) => {
      // Auto-increment counter
      const counter = await tx.ticketCounter.update({
        where: { id: 'singleton' },
        data: { counter: { increment: 1 } },
      });
      const ticketKey = `ARV-${counter.counter}`;

      const newTicket = await tx.ticket.create({
        data: {
          ticketKey,
          subject: body.subject,
          description: body.description,
          priority: body.priority,
          status: 'OPEN',
          customerId: body.customerId,
          slaFirstResponseTarget: targets.firstResponseMinutes,
          slaResolutionTarget: resolutionTarget,
          slaLastTickAt: currentTime,
          createdAt: currentTime,
          ...(body.linkedFromTicketId ? { linkedFromTicketId: body.linkedFromTicketId } : {}),
        },
        include: ticketIncludeWithMessages,
      });

      // Initial customer message
      await tx.ticketMessage.create({
        data: {
          ticketId: newTicket.id,
          type: 'CUSTOMER',
          content: body.description || body.subject,
          customerId: body.customerId,
          senderName: customer.name,
          createdAt: currentTime,
        },
      });

      await tx.auditLog.create({
        data: {
          ticketId: newTicket.id,
          ticketKey,
          action: AuditAction.TICKET_CREATED,
          actorId: body.customerId,
          actorName: customer.name,
          actorType: 'customer',
          metadata: {
            priority: body.priority,
            subject: body.subject,
            slaTargets: targets,
          },
          createdAt: currentTime,
        },
      });

      return newTicket;
    });

    // Re-fetch with all includes
    const full = await prisma.ticket.findUnique({
      where: { id: ticket.id },
      include: ticketIncludeWithMessages,
    });
    const data = await formatTicket(full!, currentTime, holidays, true);
    res.status(201).json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'Validation failed', { issues: err.issues }));
    } else {
      next(err);
    }
  }
});

// ── POST /api/tickets/:key/claim ──────────────────────────────
const ClaimSchema = z.object({
  agentId: z.string().min(1),
  version: z.number().int(),
  allowTakeover: z.boolean().optional(),
});

router.post('/:key/claim', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = String(req.params.key);
    const body = ClaimSchema.parse(req.body);
    const [currentTime, holidays] = await Promise.all([getCurrentTime(), loadHolidays()]);

    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { ticketKey: key },
      });
      if (!ticket) throw new AppError(404, ERROR_CODES.NOT_FOUND, `Ticket ${key} not found`);

      // Version check (pre-check)
      if (ticket.version !== body.version) {
        throw new AppError(409, ERROR_CODES.VERSION_MISMATCH, 'Ticket was modified by another agent. Please refresh.');
      }

      // Check ownership
      const isTakeover = !!(ticket.assigneeId && ticket.assigneeId !== body.agentId);
      if (isTakeover && !body.allowTakeover) {
        throw new AppError(409, ERROR_CODES.CONFLICT, 'Ticket has already been claimed by another agent.');
      }

      const agent = await tx.agent.findUnique({ where: { id: body.agentId } });
      if (!agent) throw new AppError(404, ERROR_CODES.NOT_FOUND, 'Agent not found');

      // ATOMIC COMPARE-AND-SWAP CONDITIONAL UPDATE:
      // Prevents INC-0291 race condition at database level
      const condition: any = {
        id: ticket.id,
        version: body.version,
      };

      if (!isTakeover) {
        // Must be unassigned or already assigned to same agent
        condition.OR = [
          { assigneeId: null },
          { assigneeId: body.agentId },
        ];
      }

      const updateResult = await tx.ticket.updateMany({
        where: condition,
        data: {
          assigneeId: body.agentId,
          status: 'ASSIGNED',
          version: { increment: 1 },
        },
      });

      if (updateResult.count !== 1) {
        throw new AppError(
          409,
          ERROR_CODES.CONFLICT,
          'Race condition prevented: Ticket was claimed or updated by another agent simultaneously.'
        );
      }

      const updated = await tx.ticket.findUnique({
        where: { id: ticket.id },
        include: ticketIncludeWithMessages,
      });

      const auditAction = isTakeover ? AuditAction.ASSIGNED_TRANSFERRED : AuditAction.TICKET_CLAIMED;
      await tx.auditLog.create({
        data: {
          ticketId: ticket.id,
          ticketKey: ticket.ticketKey,
          action: auditAction,
          actorId: body.agentId,
          actorName: agent.name,
          actorType: 'agent',
          metadata: isTakeover ? { previousAssigneeId: ticket.assigneeId } : {},
          createdAt: currentTime,
        },
      });

      await tx.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          type: 'SYSTEM',
          content: isTakeover
            ? `Ticket ownership transferred to ${agent.name}`
            : `Ticket claimed by ${agent.name}`,
          senderName: 'System',
          createdAt: currentTime,
        },
      });

      return updated!;
    });

    const data = await formatTicket(result, currentTime, holidays, true);
    res.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'Validation failed', { issues: err.issues }));
    } else {
      next(err);
    }
  }
});

// ── POST /api/tickets/:key/reply ──────────────────────────────
const ReplySchema = z.object({
  agentId: z.string().min(1),
  content: z.string().min(1),
  newStatus: z.enum(['WAITING_ON_CUSTOMER', 'RESOLVED']).optional(),
  version: z.number().int(),
});

router.post('/:key/reply', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = String(req.params.key);
    const body = ReplySchema.parse(req.body);
    const [currentTime, holidays] = await Promise.all([getCurrentTime(), loadHolidays()]);

    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { ticketKey: key },
      });
      if (!ticket) throw new AppError(404, ERROR_CODES.NOT_FOUND, `Ticket ${key} not found`);
      if (ticket.version !== body.version) {
        throw new AppError(409, ERROR_CODES.VERSION_MISMATCH, 'Ticket was modified. Please refresh.');
      }
      if (ticket.assigneeId !== body.agentId) {
        throw new AppError(403, ERROR_CODES.FORBIDDEN, 'Only the assigned agent can reply.');
      }

      const agent = await tx.agent.findUnique({ where: { id: body.agentId } });
      if (!agent) throw new AppError(404, ERROR_CODES.NOT_FOUND, 'Agent not found');

      // Calculate elapsed since last tick
      const liveElapsed = ticket.isPaused
        ? 0
        : calculateBusinessMinutesBetween(ticket.slaLastTickAt, currentTime, holidays);

      const updateData: any = {
        slaFirstResponseElapsed: ticket.slaFirstResponseElapsed + (ticket.slaFirstResponseMet ? 0 : liveElapsed),
        slaResolutionElapsed: ticket.slaResolutionElapsed + liveElapsed,
        slaLastTickAt: currentTime,
        version: { increment: 1 },
      };

      const auditExtras: any[] = [];
      let auditAction = AuditAction.PUBLIC_REPLY_SENT;

      // First public reply → mark first response SLA
      if (!ticket.slaFirstResponseMet) {
        const frElapsed = ticket.slaFirstResponseElapsed + liveElapsed;
        updateData.slaFirstResponseMet = true;
        updateData.firstResponseAt = currentTime;
        updateData.slaFirstResponseMetAt = currentTime;
        updateData.slaFirstResponseBreached = frElapsed > ticket.slaFirstResponseTarget;
        auditAction = AuditAction.FIRST_RESPONSE_SENT;
        auditExtras.push({
          ticketId: ticket.id,
          ticketKey: ticket.ticketKey,
          action: AuditAction.FIRST_RESPONSE_SENT,
          actorId: body.agentId,
          actorName: agent.name,
          actorType: 'agent',
          metadata: {
            responseTimeMinutes: frElapsed,
            slaTarget: ticket.slaFirstResponseTarget,
            withinSLA: frElapsed <= ticket.slaFirstResponseTarget,
          },
          createdAt: currentTime,
        });
      }

      // Handle optional status change
      if (body.newStatus === 'WAITING_ON_CUSTOMER') {
        updateData.status = 'WAITING_ON_CUSTOMER';
        updateData.isPaused = true;
        updateData.pausedAt = currentTime;
        updateData.waitingOnCustomerSince = currentTime;
        auditExtras.push({
          ticketId: ticket.id,
          ticketKey: ticket.ticketKey,
          action: AuditAction.STATUS_CHANGED,
          actorId: body.agentId,
          actorName: agent.name,
          actorType: 'agent',
          metadata: { from: ticket.status, to: 'WAITING_ON_CUSTOMER', reason: 'SLA clock paused' },
          createdAt: currentTime,
        });
      } else if (body.newStatus === 'RESOLVED') {
        const resElapsed = ticket.slaResolutionElapsed + liveElapsed;
        updateData.status = 'RESOLVED';
        updateData.resolvedAt = currentTime;
        updateData.slaResolutionMet = true;
        updateData.slaResolutionMetAt = currentTime;
        updateData.slaResolutionBreached = resElapsed > ticket.slaResolutionTarget;
        auditExtras.push({
          ticketId: ticket.id,
          ticketKey: ticket.ticketKey,
          action: AuditAction.STATUS_CHANGED,
          actorId: body.agentId,
          actorName: agent.name,
          actorType: 'agent',
          metadata: { from: ticket.status, to: 'RESOLVED' },
          createdAt: currentTime,
        });
      }

      const updateRes = await tx.ticket.updateMany({
        where: {
          id: ticket.id,
          version: body.version,
        },
        data: updateData,
      });

      if (updateRes.count !== 1) {
        throw new AppError(
          409,
          ERROR_CODES.VERSION_MISMATCH,
          'Ticket was updated by another user simultaneously. State refreshed.'
        );
      }

      const updated = await tx.ticket.findUnique({
        where: { id: ticket.id },
        include: ticketIncludeWithMessages,
      });

      // Create the reply message
      await tx.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          type: 'AGENT_PUBLIC',
          content: body.content,
          agentId: body.agentId,
          senderName: agent.name,
          createdAt: currentTime,
        },
      });

      // Create status change message if applicable
      if (body.newStatus === 'WAITING_ON_CUSTOMER') {
        await tx.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            type: 'SYSTEM',
            content: 'Status changed to Waiting on Customer — SLA clock paused',
            senderName: 'System',
            createdAt: currentTime,
          },
        });
      } else if (body.newStatus === 'RESOLVED') {
        await tx.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            type: 'SYSTEM',
            content: `Ticket resolved by ${agent.name}`,
            senderName: 'System',
            createdAt: currentTime,
          },
        });
      }

      // Create audit entry for the reply
      await tx.auditLog.create({
        data: {
          ticketId: ticket.id,
          ticketKey: ticket.ticketKey,
          action: auditAction,
          actorId: body.agentId,
          actorName: agent.name,
          actorType: 'agent',
          metadata: { contentLength: body.content.length },
          createdAt: currentTime,
        },
      });

      // Create additional audit entries
      for (const extra of auditExtras) {
        await tx.auditLog.create({ data: extra });
      }

      return updated;
    });

    const data = await formatTicket(result, currentTime, holidays, true);
    res.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'Validation failed', { issues: err.issues }));
    } else {
      next(err);
    }
  }
});

// ── PATCH /api/tickets/:key/priority ─────────────────────────
const PrioritySchema = z.object({
  agentId: z.string().min(1),
  newPriority: z.nativeEnum(TicketPriority),
  version: z.number().int(),
});

router.patch('/:key/priority', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = String(req.params.key);
    const body = PrioritySchema.parse(req.body);
    const [currentTime, holidays] = await Promise.all([getCurrentTime(), loadHolidays()]);

    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({ where: { ticketKey: key } });
      if (!ticket) throw new AppError(404, ERROR_CODES.NOT_FOUND, `Ticket ${key} not found`);
      if (ticket.version !== body.version) {
        throw new AppError(409, ERROR_CODES.VERSION_MISMATCH, 'Ticket was modified. Please refresh.');
      }

      const agent = await tx.agent.findUnique({ where: { id: body.agentId } });
      if (!agent) throw new AppError(404, ERROR_CODES.NOT_FOUND, 'Agent not found');

      // Calculate current elapsed
      const liveElapsed = ticket.isPaused
        ? 0
        : calculateBusinessMinutesBetween(ticket.slaLastTickAt, currentTime, holidays);

      const currentFRElapsed = ticket.slaFirstResponseElapsed + (ticket.slaFirstResponseMet ? 0 : liveElapsed);
      const currentResElapsed = ticket.slaResolutionElapsed + liveElapsed;

      const newTargets = SLA_TARGETS[body.newPriority];
      const newResTarget = calculateInitialResolutionTarget(ticket.createdAt, body.newPriority, holidays);

      const beforeState = {
        priority: ticket.priority,
        firstResponseTarget: ticket.slaFirstResponseTarget,
        resolutionTarget: ticket.slaResolutionTarget,
      };
      const afterState = {
        priority: body.newPriority,
        firstResponseTarget: newTargets.firstResponseMinutes,
        resolutionTarget: newResTarget,
      };

      const updateRes = await tx.ticket.updateMany({
        where: {
          id: ticket.id,
          version: body.version,
        },
        data: {
          priority: body.newPriority,
          slaFirstResponseTarget: newTargets.firstResponseMinutes,
          slaResolutionTarget: newResTarget,
          // Preserve elapsed
          slaFirstResponseElapsed: currentFRElapsed,
          slaResolutionElapsed: currentResElapsed,
          slaLastTickAt: currentTime,
          version: { increment: 1 },
        },
      });

      if (updateRes.count !== 1) {
        throw new AppError(
          409,
          ERROR_CODES.VERSION_MISMATCH,
          'Ticket was updated by another user simultaneously. State refreshed.'
        );
      }

      const updated = await tx.ticket.findUnique({
        where: { id: ticket.id },
        include: ticketIncludeWithMessages,
      });

      await tx.auditLog.create({
        data: {
          ticketId: ticket.id,
          ticketKey: ticket.ticketKey,
          action: AuditAction.PRIORITY_CHANGED,
          actorId: body.agentId,
          actorName: agent.name,
          actorType: 'agent',
          metadata: {
            before: beforeState,
            after: afterState,
            elapsedAtChange: { firstResponse: currentFRElapsed, resolution: currentResElapsed },
            remainingAfterRecalc: {
              firstResponse: Math.max(0, newTargets.firstResponseMinutes - currentFRElapsed),
              resolution: Math.max(0, newTargets.resolutionMinutes - currentResElapsed),
            },
          },
          createdAt: currentTime,
        },
      });

      await tx.auditLog.create({
        data: {
          ticketId: ticket.id,
          ticketKey: ticket.ticketKey,
          action: AuditAction.SLA_RECALCULATED,
          actorId: body.agentId,
          actorName: agent.name,
          actorType: 'agent',
          metadata: {
            reason: `Priority changed from ${ticket.priority} to ${body.newPriority}`,
            newTargets: { firstResponse: newTargets.firstResponseMinutes, resolution: newTargets.resolutionMinutes },
            elapsedPreserved: { firstResponse: currentFRElapsed, resolution: currentResElapsed },
          },
          createdAt: currentTime,
        },
      });

      await tx.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          type: 'SYSTEM',
          content: `Priority changed from ${ticket.priority} to ${body.newPriority} — SLA targets recalculated`,
          senderName: 'System',
          createdAt: currentTime,
        },
      });

      return updated;
    });

    const data = await formatTicket(result, currentTime, holidays, true);
    res.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'Validation failed', { issues: err.issues }));
    } else {
      next(err);
    }
  }
});

// ── PATCH /api/tickets/:key/status ───────────────────────────
const StatusSchema = z.object({
  agentId: z.string().min(1),
  newStatus: z.enum(['OPEN', 'ASSIGNED', 'WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED']),
  version: z.number().int(),
});

router.patch('/:key/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = String(req.params.key);
    const body = StatusSchema.parse(req.body);
    const [currentTime, holidays] = await Promise.all([getCurrentTime(), loadHolidays()]);

    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({ where: { ticketKey: key } });
      if (!ticket) throw new AppError(404, ERROR_CODES.NOT_FOUND, `Ticket ${key} not found`);
      if (ticket.version !== body.version) {
        throw new AppError(409, ERROR_CODES.VERSION_MISMATCH, 'Ticket was modified. Please refresh.');
      }

      const agent = await tx.agent.findUnique({ where: { id: body.agentId } });
      if (!agent) throw new AppError(404, ERROR_CODES.NOT_FOUND, 'Agent not found');

      const liveElapsed = ticket.isPaused
        ? 0
        : calculateBusinessMinutesBetween(ticket.slaLastTickAt, currentTime, holidays);

      const updateData: any = {
        status: body.newStatus,
        slaLastTickAt: currentTime,
        slaFirstResponseElapsed: ticket.slaFirstResponseElapsed + (ticket.slaFirstResponseMet ? 0 : liveElapsed),
        slaResolutionElapsed: ticket.slaResolutionElapsed + liveElapsed,
        version: { increment: 1 },
      };

      if (body.newStatus === 'WAITING_ON_CUSTOMER') {
        updateData.isPaused = true;
        updateData.pausedAt = currentTime;
        updateData.waitingOnCustomerSince = currentTime;
      } else if (body.newStatus === 'ASSIGNED' && ticket.isPaused) {
        // Resume from pause
        const pausedMins = ticket.waitingOnCustomerSince
          ? calculateBusinessMinutesBetween(ticket.waitingOnCustomerSince, currentTime, holidays)
          : 0;
        updateData.isPaused = false;
        updateData.totalPausedMinutes = ticket.totalPausedMinutes + pausedMins;
        updateData.waitingOnCustomerSince = null;
      } else if (body.newStatus === 'RESOLVED') {
        const resElapsed = ticket.slaResolutionElapsed + liveElapsed;
        updateData.resolvedAt = currentTime;
        updateData.slaResolutionMet = true;
        updateData.slaResolutionMetAt = currentTime;
        updateData.slaResolutionBreached = resElapsed > ticket.slaResolutionTarget;
      }

      const updateRes = await tx.ticket.updateMany({
        where: {
          id: ticket.id,
          version: body.version,
        },
        data: updateData,
      });

      if (updateRes.count !== 1) {
        throw new AppError(
          409,
          ERROR_CODES.VERSION_MISMATCH,
          'Ticket was updated by another user simultaneously. State refreshed.'
        );
      }

      const updated = await tx.ticket.findUnique({
        where: { id: ticket.id },
        include: ticketIncludeWithMessages,
      });

      await tx.auditLog.create({
        data: {
          ticketId: ticket.id,
          ticketKey: ticket.ticketKey,
          action: AuditAction.STATUS_CHANGED,
          actorId: body.agentId,
          actorName: agent.name,
          actorType: 'agent',
          metadata: { from: ticket.status, to: body.newStatus },
          createdAt: currentTime,
        },
      });

      return updated;
    });

    const data = await formatTicket(result, currentTime, holidays, true);
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
