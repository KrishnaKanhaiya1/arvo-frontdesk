/**
 * SLA Business Hours Engine
 *
 * Business hours: Mon–Fri, 09:30–18:30 IST (Asia/Kolkata) = 540 min/day (9 hours)
 * Excludes weekends (Saturday, Sunday) and Indian festival holidays.
 * All time calculations are strictly deterministic in Asia/Kolkata.
 */

import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import {
  startOfDay,
  getDay,
  addDays,
  addMinutes,
  differenceInMinutes,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  isAfter,
  isBefore,
  isEqual,
  format,
} from 'date-fns';
import { BUSINESS_HOURS } from '../types/contracts';

const TZ = BUSINESS_HOURS.timezone; // 'Asia/Kolkata'
const BH_START_H = BUSINESS_HOURS.startHour;    // 9
const BH_START_M = BUSINESS_HOURS.startMinute;  // 30
const BH_END_H = BUSINESS_HOURS.endHour;        // 18
const BH_END_M = BUSINESS_HOURS.endMinute;      // 30
const DAILY_MINUTES = BUSINESS_HOURS.dailyMinutes; // 540

export type HolidayInput = (Date | string)[];

/**
 * Normalizes holidays into a Set of 'yyyy-MM-dd' strings in IST.
 */
function normalizeHolidays(holidays: HolidayInput): Set<string> {
  const set = new Set<string>();
  for (const h of holidays) {
    if (typeof h === 'string') {
      // Could be '2026-01-26' or ISO string
      if (h.length === 10) {
        set.add(h);
      } else {
        const d = new Date(h);
        set.add(format(toZonedTime(d, TZ), 'yyyy-MM-dd'));
      }
    } else if (h instanceof Date) {
      set.add(format(toZonedTime(h, TZ), 'yyyy-MM-dd'));
    }
  }
  return set;
}

/**
 * Set a zoned Date to a specific hour:minute:second:ms.
 */
function setTime(d: Date, hour: number, minute: number): Date {
  return setMilliseconds(setSeconds(setMinutes(setHours(d, hour), minute), 0), 0);
}

/**
 * Get the business-day open time (09:30 IST) for a given IST-zoned Date.
 */
function dayOpenZoned(istDate: Date): Date {
  return setTime(startOfDay(istDate), BH_START_H, BH_START_M);
}

/**
 * Get the business-day close time (18:30 IST) for a given IST-zoned Date.
 */
function dayCloseZoned(istDate: Date): Date {
  return setTime(startOfDay(istDate), BH_END_H, BH_END_M);
}

/**
 * Check if the day is a working day (Mon–Fri and not a holiday).
 */
function isWorkingDay(istDate: Date, holidaySet: Set<string>): boolean {
  const dow = getDay(istDate); // 0 = Sun, 6 = Sat
  if (dow === 0 || dow === 6) return false;
  const dateStr = format(istDate, 'yyyy-MM-dd');
  return !holidaySet.has(dateStr);
}

/**
 * Checks whether a given UTC timestamp falls within IST business hours.
 */
export function isBusinessHour(time: Date, holidays: HolidayInput = []): boolean {
  const holidaySet = normalizeHolidays(holidays);
  const ist = toZonedTime(time, TZ);
  if (!isWorkingDay(ist, holidaySet)) return false;

  const open = dayOpenZoned(ist);
  const close = dayCloseZoned(ist);

  // Business hours: [09:30, 18:30)
  return (isAfter(ist, open) || isEqual(ist, open)) && isBefore(ist, close);
}

/**
 * Returns the next business open time (09:30 IST) as a UTC Date.
 * If currently within business hours, returns the input time unchanged.
 */
export function getNextBusinessOpen(from: Date, holidays: HolidayInput = []): Date {
  const holidaySet = normalizeHolidays(holidays);
  const ist = toZonedTime(from, TZ);

  // If already within business hours, return unchanged
  if (isBusinessHour(from, holidays)) {
    return from;
  }

  // If on a working day before 09:30 IST, opens today at 09:30
  if (isWorkingDay(ist, holidaySet)) {
    const open = dayOpenZoned(ist);
    if (isBefore(ist, open)) {
      return fromZonedTime(open, TZ);
    }
  }

  // Otherwise, scan forward day by day to find next working day
  let cursor = addDays(startOfDay(ist), 1);
  for (let i = 0; i < 366; i++) {
    if (isWorkingDay(cursor, holidaySet)) {
      return fromZonedTime(dayOpenZoned(cursor), TZ);
    }
    cursor = addDays(cursor, 1);
  }

  return fromZonedTime(dayOpenZoned(cursor), TZ);
}

/**
 * Clamp an IST zoned date to the earliest business-hours point.
 * If before open on a working day, clamps to open.
 * If at/after close or non-working day, advances to 09:30 on the next working day.
 */
function clampToBusinessStart(ist: Date, holidaySet: Set<string>): Date {
  if (!isWorkingDay(ist, holidaySet)) {
    let d = addDays(startOfDay(ist), 1);
    for (let i = 0; i < 366; i++) {
      if (isWorkingDay(d, holidaySet)) {
        return dayOpenZoned(d);
      }
      d = addDays(d, 1);
    }
    return ist;
  }

  const open = dayOpenZoned(ist);
  const close = dayCloseZoned(ist);

  if (isBefore(ist, open)) return open;
  if (isAfter(ist, close) || isEqual(ist, close)) {
    let d = addDays(startOfDay(ist), 1);
    for (let i = 0; i < 366; i++) {
      if (isWorkingDay(d, holidaySet)) {
        return dayOpenZoned(d);
      }
      d = addDays(d, 1);
    }
  }

  return ist;
}

/**
 * Calculate business minutes between start and end.
 * Both start and end are UTC Date instances.
 */
export function calculateBusinessMinutesBetween(
  start: Date,
  end: Date,
  holidays: HolidayInput = [],
): number {
  if (end <= start) return 0;

  const holidaySet = normalizeHolidays(holidays);
  const istStart = toZonedTime(start, TZ);
  const istEnd = toZonedTime(end, TZ);

  let cursor = clampToBusinessStart(istStart, holidaySet);
  if (isAfter(cursor, istEnd) || isEqual(cursor, istEnd)) {
    return 0;
  }

  let totalMinutes = 0;

  while (isBefore(cursor, istEnd)) {
    if (!isWorkingDay(cursor, holidaySet)) {
      cursor = addDays(startOfDay(cursor), 1);
      cursor = clampToBusinessStart(cursor, holidaySet);
      continue;
    }

    const open = dayOpenZoned(cursor);
    const close = dayCloseZoned(cursor);

    // Starting point for this day
    const dayStart = isBefore(cursor, open) ? open : cursor;

    // Ending point for this day
    const isSameDayEnd = format(cursor, 'yyyy-MM-dd') === format(istEnd, 'yyyy-MM-dd');
    let dayEnd = close;

    if (isSameDayEnd) {
      if (isBefore(istEnd, open)) {
        // End is before open today
        break;
      }
      dayEnd = isBefore(istEnd, close) ? istEnd : close;
    }

    if (isBefore(dayStart, dayEnd)) {
      totalMinutes += differenceInMinutes(dayEnd, dayStart);
    }

    if (isSameDayEnd) {
      break;
    }

    // Move to 09:30 on next day
    cursor = addDays(startOfDay(cursor), 1);
    cursor = clampToBusinessStart(cursor, holidaySet);
  }

  return totalMinutes;
}

/**
 * Add business minutes to a start time, respecting 09:30–18:30 IST, weekends, and holidays.
 * Returns the resulting UTC Date.
 */
export function addBusinessMinutes(
  start: Date,
  minutes: number,
  holidays: HolidayInput = [],
): Date {
  if (minutes <= 0) return start;

  const holidaySet = normalizeHolidays(holidays);
  let ist = toZonedTime(start, TZ);

  // Clamp start into valid business hours
  ist = clampToBusinessStart(ist, holidaySet);

  let remaining = minutes;

  while (remaining > 0) {
    if (!isWorkingDay(ist, holidaySet)) {
      ist = clampToBusinessStart(ist, holidaySet);
      continue;
    }

    const close = dayCloseZoned(ist);
    const availableToday = differenceInMinutes(close, ist);

    if (remaining <= availableToday) {
      ist = addMinutes(ist, remaining);
      remaining = 0;
    } else {
      remaining -= availableToday;
      // Advance to next business day
      let nextDay = addDays(startOfDay(ist), 1);
      for (let i = 0; i < 366; i++) {
        if (isWorkingDay(nextDay, holidaySet)) {
          ist = dayOpenZoned(nextDay);
          break;
        }
        nextDay = addDays(nextDay, 1);
      }
    }
  }

  return fromZonedTime(ist, TZ);
}

/**
 * Calculate the SLA deadline given a creation time and target minutes.
 */
export function calculateSLADeadline(
  createdAt: Date,
  targetMinutes: number,
  holidays: HolidayInput = [],
): Date {
  return addBusinessMinutes(createdAt, targetMinutes, holidays);
}
