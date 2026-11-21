/**
 * Internal Notes Routes — INC-0304
 * COMPLETELY SEPARATE from customer endpoints.
 * Never imported by customer routes.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { getCurrentTime } from '../services/clock';
import { AppError } from '../middleware/errorHandler';
import { AuditAction, ERROR_CODES } from '../types/contracts';

const router = Router({ mergeParams: true });

// ── GET /api/tickets/:key/notes ───────────────────────────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = String(req.params.key);
    const ticket = await prisma.ticket.findUnique({ where: { ticketKey: key } });
    if (!ticket) throw new AppError(404, ERROR_CODES.NOT_FOUND, `Ticket ${key} not found`);

    const notes = await prisma.internalNote.findMany({
      where: { ticketId: ticket.id },
      orderBy: { createdAt: 'asc' },
    });

    const data = notes.map((n) => ({
      id: n.id,
      ticketId: n.ticketId,
      content: n.content,
      authorId: n.authorId,
      authorName: n.authorName,
      createdAt: n.createdAt.toISOString(),
    }));

    res.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/tickets/:key/notes ──────────────────────────────
const AddNoteSchema = z.object({
  agentId: z.string().min(1),
  content: z.string().min(1),
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = String(req.params.key);
    const body = AddNoteSchema.parse(req.body);
    const currentTime = await getCurrentTime();

    const ticket = await prisma.ticket.findUnique({ where: { ticketKey: key } });
    if (!ticket) throw new AppError(404, ERROR_CODES.NOT_FOUND, `Ticket ${key} not found`);

    const agent = await prisma.agent.findUnique({ where: { id: body.agentId } });
    if (!agent) throw new AppError(404, ERROR_CODES.NOT_FOUND, 'Agent not found');

    const note = await prisma.$transaction(async (tx) => {
      const created = await tx.internalNote.create({
        data: {
          ticketId: ticket.id,
          content: body.content,
          authorId: body.agentId,
          authorName: agent.name,
          createdAt: currentTime,
        },
      });

      await tx.auditLog.create({
        data: {
          ticketId: ticket.id,
          ticketKey: ticket.ticketKey,
          action: AuditAction.INTERNAL_NOTE_ADDED,
          actorId: body.agentId,
          actorName: agent.name,
          actorType: 'agent',
          metadata: { noteId: created.id },
          createdAt: currentTime,
        },
      });

      return created;
    });

    const data = {
      id: note.id,
      ticketId: note.ticketId,
      content: note.content,
      authorId: note.authorId,
      authorName: note.authorName,
      createdAt: note.createdAt.toISOString(),
    };

    res.status(201).json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'Validation failed', { issues: err.issues }));
    } else {
      next(err);
    }
  }
});

export default router;
