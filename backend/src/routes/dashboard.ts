import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { getCurrentTime } from '../services/clock';
import { computeSLAState } from '../services/slaCompute';
import { requireAgentRole } from '../middleware/auth';

const router = Router();
router.use(requireAgentRole);

async function loadHolidays(): Promise<Date[]> {
  const rows = await prisma.holiday.findMany();
  return rows.map((h) => h.date);
}

// ── GET /api/dashboard ────────────────────────────────────────
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [currentTime, holidays] = await Promise.all([getCurrentTime(), loadHolidays()]);

    // Load all non-closed tickets
    const activeTickets = await prisma.ticket.findMany({
      where: { status: { not: 'CLOSED' } },
      include: { customer: true, assignee: true },
    });

    let breached = 0;
    let atRisk = 0;
    let waitingOnCustomer = 0;
    let unassigned = 0;
    let resolvedToday = 0;
    let totalActive = activeTickets.length;

    const today = currentTime;
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    for (const ticket of activeTickets) {
      const sla = computeSLAState(ticket, currentTime, holidays);

      if (sla.firstResponse.breached || sla.resolution.breached) {
        breached++;
      }

      // At-risk: < 25% remaining on either SLA (and not yet met)
      const frAtRisk = !sla.firstResponse.met && !sla.firstResponse.breached &&
        sla.firstResponse.targetMinutes > 0 &&
        sla.firstResponse.remainingBusinessMinutes < sla.firstResponse.targetMinutes * 0.25;
      const resAtRisk = !sla.resolution.met && !sla.resolution.breached &&
        sla.resolution.targetMinutes > 0 &&
        sla.resolution.remainingBusinessMinutes < sla.resolution.targetMinutes * 0.25;
      if (frAtRisk || resAtRisk) atRisk++;

      if (ticket.status === 'WAITING_ON_CUSTOMER') waitingOnCustomer++;
      if (!ticket.assigneeId) unassigned++;

      if (
        ticket.status === 'RESOLVED' &&
        ticket.resolvedAt &&
        ticket.resolvedAt >= todayStart
      ) {
        resolvedToday++;
      }
    }

    // SLA compliance: non-breached / total active × 100
    const slaCompliancePercent = totalActive > 0
      ? Math.round(((totalActive - breached) / totalActive) * 100)
      : 100;

    const data = {
      breached,
      atRisk,
      waitingOnCustomer,
      unassigned,
      totalActive,
      resolvedToday,
      slaCompliancePercent,
    };

    res.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

export default router;
