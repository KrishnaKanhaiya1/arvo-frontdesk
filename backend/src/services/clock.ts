import prisma from '../utils/prisma';
import { toZonedTime } from 'date-fns-tz';

const TZ = 'Asia/Kolkata';

/**
 * Returns the current time (real or simulated) as a JS Date.
 * The returned Date is a standard UTC-based Date but represents
 * either real wall-clock time or the simulated override stored in DB.
 */
export async function getCurrentTime(): Promise<Date> {
  try {
    const cfg = await prisma.systemConfig.findUnique({
      where: { key: 'simulated_time' },
    });
    if (cfg && cfg.value && cfg.value.length > 0) {
      return new Date(cfg.value);
    }
  } catch {
    // DB not ready yet, fall through to real time
  }
  return new Date();
}

/**
 * Set or clear the simulated time override.
 * Pass an ISO string to set, or null to clear and return to real time.
 */
export async function setSimulatedTime(iso: string | null): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key: 'simulated_time' },
    update: { value: iso ?? '' },
    create: { key: 'simulated_time', value: iso ?? '' },
  });
}

/**
 * Convenience: return current time as a Date in IST-aware zonedTime.
 */
export async function getCurrentTimeIST(): Promise<Date> {
  const now = await getCurrentTime();
  return toZonedTime(now, TZ);
}
