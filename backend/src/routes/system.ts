import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { resetToCanonicalSeed } from '../services/seedService';
import { toZonedTime, format } from 'date-fns-tz';
import prisma from '../utils/prisma';
import { getCurrentTime, setSimulatedTime } from '../services/clock';
import { isBusinessHour, getNextBusinessOpen } from '../services/sla';
import { runAutoClose } from '../services/autoclose';
import { AppError } from '../middleware/errorHandler';
import { requireLeadRole } from '../middleware/auth';
import { ERROR_CODES, BUSINESS_HOURS } from '../types/contracts';

const router = Router();
const TZ = BUSINESS_HOURS.timezone;

async function loadHolidays(): Promise<Date[]> {
  const rows = await prisma.holiday.findMany();
  return rows.map((h) => h.date);
}

// ── GET /api/system/clock ─────────────────────────────────────
router.get('/clock', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const currentTime = await getCurrentTime();
    const holidays = await loadHolidays();

    const cfg = await prisma.systemConfig.findUnique({ where: { key: 'simulated_time' } });
    const isSimulated = !!(cfg && cfg.value && cfg.value.length > 0);

    const inBiz = isBusinessHour(currentTime, holidays);
    const nextOpen = inBiz ? null : getNextBusinessOpen(currentTime, holidays);

    // Format holidays as YYYY-MM-DD with ID
    const holidayRows = await prisma.holiday.findMany({ orderBy: { date: 'asc' } });
    const holidayList = holidayRows.map((h) => ({
      id: h.id,
      date: format(toZonedTime(h.date, TZ), 'yyyy-MM-dd', { timeZone: TZ }),
      name: h.name,
    }));

    const data = {
      currentTime: currentTime.toISOString(),
      isSimulated,
      isBusinessHours: inBiz,
      nextBusinessOpen: nextOpen ? nextOpen.toISOString() : null,
      holidays: holidayList,
      autoCloseDaemon: {
        status: 'ACTIVE',
        interval: 'Every 5 business minutes (cron */5 * * * *)',
        timezone: 'Asia/Kolkata',
      },
    };

    res.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/system/clock ────────────────────────────────────
const ClockSchema = z.object({
  simulatedTime: z.string().nullable(),
});

router.post('/clock', requireLeadRole, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = ClockSchema.parse(req.body);
    await setSimulatedTime(body.simulatedTime);

    const currentTime = await getCurrentTime();
    const holidays = await loadHolidays();
    const cfg = await prisma.systemConfig.findUnique({ where: { key: 'simulated_time' } });
    const isSimulated = !!(cfg && cfg.value && cfg.value.length > 0);
    const inBiz = isBusinessHour(currentTime, holidays);
    const nextOpen = inBiz ? null : getNextBusinessOpen(currentTime, holidays);

    const holidayRows = await prisma.holiday.findMany({ orderBy: { date: 'asc' } });
    const holidayList = holidayRows.map((h) => ({
      id: h.id,
      date: format(toZonedTime(h.date, TZ), 'yyyy-MM-dd', { timeZone: TZ }),
      name: h.name,
    }));

    const data = {
      currentTime: currentTime.toISOString(),
      isSimulated,
      isBusinessHours: inBiz,
      nextBusinessOpen: nextOpen ? nextOpen.toISOString() : null,
      holidays: holidayList,
      autoCloseDaemon: {
        status: 'ACTIVE',
        interval: 'Every 5 business minutes (cron */5 * * * *)',
        timezone: 'Asia/Kolkata',
      },
    };

    res.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'Validation failed', { issues: err.issues }));
    } else {
      next(err);
    }
  }
});

// ── POST /api/system/holidays ─────────────────────────────────
const CreateHolidaySchema = z.object({
  name: z.string().min(1, 'Holiday name is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted YYYY-MM-DD'),
});

router.post('/holidays', requireLeadRole, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = CreateHolidaySchema.parse(req.body);
    const dateObj = new Date(body.date + 'T00:00:00.000Z');

    const existing = await prisma.holiday.findFirst({
      where: { date: dateObj },
    });

    if (existing) {
      await prisma.holiday.update({
        where: { id: existing.id },
        data: { name: body.name },
      });
    } else {
      await prisma.holiday.create({
        data: {
          name: body.name,
          date: dateObj,
        },
      });
    }

    const holidayRows = await prisma.holiday.findMany({ orderBy: { date: 'asc' } });
    const holidayList = holidayRows.map((h) => ({
      id: h.id,
      date: format(toZonedTime(h.date, TZ), 'yyyy-MM-dd', { timeZone: TZ }),
      name: h.name,
    }));

    res.status(201).json({
      success: true,
      data: holidayList,
      message: `Holiday '${body.name}' on ${body.date} successfully registered.`,
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

// ── DELETE /api/system/holidays/:id ───────────────────────────
router.delete('/holidays/:id', requireLeadRole, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await prisma.holiday.delete({
      where: { id: String(id) },
    });

    const holidayRows = await prisma.holiday.findMany({ orderBy: { date: 'asc' } });
    const holidayList = holidayRows.map((h) => ({
      id: h.id,
      date: format(toZonedTime(h.date, TZ), 'yyyy-MM-dd', { timeZone: TZ }),
      name: h.name,
    }));

    res.json({
      success: true,
      data: holidayList,
      message: 'Holiday successfully removed from calendar.',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/system/run-autoclose ───────────────────────────
router.post('/run-autoclose', requireLeadRole, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await runAutoClose();
    res.json({
      success: true,
      data: { closedCount: result.closedCount, closedTickets: result.closedTickets },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/system/reset-demo ───────────────────────────────
router.post('/reset-demo', requireLeadRole, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await resetToCanonicalSeed(prisma);
    res.json({
      success: true,
      data: { message: 'Demo reset successfully. All canonical seed data restored safely in-process.' },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    next(new AppError(500, ERROR_CODES.INTERNAL_ERROR, `Reset failed: ${err.message}`));
  }
});

export default router;
