import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { requireAgentRole } from '../middleware/auth';

const router = Router();
router.use(requireAgentRole);

// ── GET /api/agents ───────────────────────────────────────────
router.get('/agents', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const agents = await prisma.agent.findMany({
      orderBy: { name: 'asc' },
    });

    const data = agents.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      role: a.role as 'lead' | 'agent',
      avatarColor: a.avatarColor,
      avatarInitials: a.avatarInitials,
    }));

    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/customers ────────────────────────────────────────
router.get('/customers', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { name: 'asc' },
    });

    const data = customers.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      company: c.company,
      avatarColor: c.avatarColor,
      avatarInitials: c.avatarInitials,
    }));

    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
