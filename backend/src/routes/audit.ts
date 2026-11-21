/**
 * Audit Log Routes — INC-0318
 * Append-only: NO update or delete routes exist.
 */

import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { ERROR_CODES } from '../types/contracts';

const router = Router({ mergeParams: true });

// ── GET /api/tickets/:key/audit ───────────────────────────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = String(req.params.key);
    const ticket = await prisma.ticket.findUnique({ where: { ticketKey: key } });
    if (!ticket) throw new AppError(404, ERROR_CODES.NOT_FOUND, `Ticket ${key} not found`);

    const entries = await prisma.auditLog.findMany({
      where: { ticketId: ticket.id },
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

export default router;
