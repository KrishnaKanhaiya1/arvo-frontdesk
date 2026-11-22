import { describe, it, expect } from 'vitest';
import {
  isBusinessHour,
  calculateBusinessMinutesBetween,
  addBusinessMinutes,
  getNextBusinessOpen,
  calculateSLADeadline,
  calculateResolutionDeadline,
  calculateInitialResolutionTarget,
} from '../services/sla';
import { SLA_TARGETS, TicketPriority, AUTO_CLOSE_MINUTES, REOPEN_WINDOW_MINUTES } from '../types/contracts';

// 2026 Indian festival holidays for test
const testHolidays = [
  '2026-01-26', // Republic Day (Monday)
  '2026-08-15', // Independence Day (Saturday)
  '2026-10-02', // Gandhi Jayanti (Friday)
  '2026-11-08', // Diwali (Sunday)
  '2026-11-09', // Diwali Day 2 (Monday)
  '2026-12-25', // Christmas (Friday)
];

describe('SLA Business Hours Engine', () => {
  describe('isBusinessHour', () => {
    it('returns true on Tuesday at 11:00 AM IST', () => {
      // 2026-11-17 is Tuesday
      const tuesdayInHours = new Date('2026-11-17T05:30:00Z'); // 11:00 IST
      expect(isBusinessHour(tuesdayInHours, testHolidays)).toBe(true);
    });

    it('returns false on Saturday at 11:00 AM IST (weekend)', () => {
      // 2026-11-21 is Saturday
      const saturday = new Date('2026-11-21T05:30:00Z'); // 11:00 IST
      expect(isBusinessHour(saturday, testHolidays)).toBe(false);
    });

    it('returns false on Sunday morning at 10:00 AM IST (weekend)', () => {
      // 2026-11-22 is Sunday
      const sunday = new Date('2026-11-22T04:30:00Z'); // 10:00 IST
      expect(isBusinessHour(sunday, testHolidays)).toBe(false);
    });

    it('returns false on Tuesday at 08:30 AM IST (before 09:30 open)', () => {
      const earlyMorning = new Date('2026-11-17T03:00:00Z'); // 08:30 IST
      expect(isBusinessHour(earlyMorning, testHolidays)).toBe(false);
    });

    it('returns false on Tuesday at 19:00 IST (after 18:30 close)', () => {
      const evening = new Date('2026-11-17T13:30:00Z'); // 19:00 IST
      expect(isBusinessHour(evening, testHolidays)).toBe(false);
    });

    it('returns false on Gandhi Jayanti (Friday holiday 2026-10-02 at 11:00 AM IST)', () => {
      const gandhiJayanti = new Date('2026-10-02T05:30:00Z'); // Friday 11:00 IST
      expect(isBusinessHour(gandhiJayanti, testHolidays)).toBe(false);
    });

    it('returns false on Diwali Day 2 (Monday holiday 2026-11-09 at 11:00 AM IST)', () => {
      const diwaliMonday = new Date('2026-11-09T05:30:00Z'); // Monday 11:00 IST
      expect(isBusinessHour(diwaliMonday, testHolidays)).toBe(false);
    });
  });

  describe('Meera Meeting Rule: Friday 6 PM -> Sunday morning (Zero weekend business minutes)', () => {
    it('calculates exactly 0 business minutes between Friday 18:30 close and Sunday 10:00 IST', () => {
      // Friday 2026-11-20 18:30 IST (close of business)
      const friClose = new Date('2026-11-20T13:00:00Z');
      // Sunday 2026-11-22 10:00 IST
      const sun10am = new Date('2026-11-22T04:30:00Z');

      const minutes = calculateBusinessMinutesBetween(friClose, sun10am, testHolidays);
      expect(minutes).toBe(0);
    });

    it('ticket created at Friday 18:00 IST has only 30 business minutes elapsed on Sunday morning (NOT late/breached under Critical 120m SLA)', () => {
      // Friday 2026-11-20 18:00 IST
      const fri6pm = new Date('2026-11-20T12:30:00Z');
      // Sunday 2026-11-22 10:00 IST
      const sun10am = new Date('2026-11-22T04:30:00Z');

      const minutes = calculateBusinessMinutesBetween(fri6pm, sun10am, testHolidays);
      // Only 30 minutes from Friday 18:00 to 18:30. Zero on Saturday and Sunday.
      expect(minutes).toBe(30);

      // Critical SLA target is 120 minutes. 30 < 120 -> 90 minutes remaining!
      const criticalTarget = SLA_TARGETS[TicketPriority.CRITICAL].firstResponseMinutes;
      expect(minutes < criticalTarget).toBe(true);
      expect(criticalTarget - minutes).toBe(90);
    });

    it('ticket created at Friday 18:00 has 30 business minutes elapsed on Monday 10:00 IST', () => {
      // Friday 2026-11-20 18:00 IST (only 30 min left in Friday 09:30-18:30 day)
      const fri6pm = new Date('2026-11-20T12:30:00Z');
      // Monday 2026-11-23 10:00 IST (30 min into Monday morning: 09:30-10:00)
      const mon10am = new Date('2026-11-23T04:30:00Z');

      const minutes = calculateBusinessMinutesBetween(fri6pm, mon10am, testHolidays);
      // Friday 18:00 to 18:30 = 30 minutes. Saturday/Sunday = 0. Monday 09:30 to 10:00 = 30 minutes.
      // Total = 60 minutes
      expect(minutes).toBe(60);
    });

    it('Critical resolution on Friday 18:00 sets deadline to next working day close (Monday 18:30 IST) and is NOT breached on Sunday', () => {
      const fri6pm = new Date('2026-11-20T12:30:00Z'); // Friday 18:00 IST
      const sun10am = new Date('2026-11-22T04:30:00Z'); // Sunday 10:00 IST

      const deadline = calculateResolutionDeadline(fri6pm, 'CRITICAL', 540, testHolidays);
      
      // Expected deadline is Monday 2026-11-23 18:30 IST = 13:00:00Z
      expect(deadline.toISOString()).toBe('2026-11-23T13:00:00.000Z');

      const target = calculateInitialResolutionTarget(fri6pm, 'CRITICAL', testHolidays);
      // Friday 18:00-18:30 (30m) + Monday full day (540m) = 570m
      expect(target).toBe(570);

      // On Sunday morning, only 30 minutes have elapsed, remaining = 540m, NOT breached!
      const elapsedOnSunday = calculateBusinessMinutesBetween(fri6pm, sun10am, testHolidays);
      expect(elapsedOnSunday).toBe(30);
      expect(elapsedOnSunday < target).toBe(true);
    });

    it('Critical resolution on Tuesday 17:00 (<120m left in day) sets deadline to Wednesday 18:30 IST', () => {
      const tue5pm = new Date('2026-11-17T11:30:00Z'); // Tuesday 17:00 IST
      const deadline = calculateResolutionDeadline(tue5pm, 'CRITICAL', 540, testHolidays);
      
      // Expected deadline is Wednesday 2026-11-18 18:30 IST = 13:00:00Z
      expect(deadline.toISOString()).toBe('2026-11-18T13:00:00.000Z');
      const target = calculateInitialResolutionTarget(tue5pm, 'CRITICAL', testHolidays);
      // Tuesday 17:00-18:30 (90m) + Wednesday full day (540m) = 630m
      expect(target).toBe(630);
    });

    it('Critical resolution on Monday 10:00 (>=120m left in day) sets deadline to same day close (Monday 18:30 IST)', () => {
      const mon10am = new Date('2026-11-16T04:30:00Z'); // Monday 10:00 IST
      const deadline = calculateResolutionDeadline(mon10am, 'CRITICAL', 540, testHolidays);
      
      // Expected deadline is Monday 2026-11-16 18:30 IST = 13:00:00Z
      expect(deadline.toISOString()).toBe('2026-11-16T13:00:00.000Z');
      const target = calculateInitialResolutionTarget(mon10am, 'CRITICAL', testHolidays);
      // Monday 10:00-18:30 = 510m
      expect(target).toBe(510);
    });
  });

  describe('Full Working Day & Working Week Math (9 hours = 540 min/day, 45h/week)', () => {
    it('calculates exactly 540 business minutes for a full working day (09:30 to 18:30 IST)', () => {
      // Tuesday 2026-11-17 09:30 IST to 18:30 IST
      const start = new Date('2026-11-17T04:00:00Z'); // 09:30 IST
      const end = new Date('2026-11-17T13:00:00Z');   // 18:30 IST

      const minutes = calculateBusinessMinutesBetween(start, end, testHolidays);
      expect(minutes).toBe(540); // 9 hours * 60 min = 540
    });

    it('calculates 1080 business minutes across two consecutive working days', () => {
      // Tuesday 09:30 to Wednesday 18:30 IST
      const start = new Date('2026-11-17T04:00:00Z');
      const end = new Date('2026-11-18T13:00:00Z');

      const minutes = calculateBusinessMinutesBetween(start, end, testHolidays);
      expect(minutes).toBe(1080); // 2 * 540
    });

    it('skips a holiday in between working days', () => {
      // Thursday 2026-10-01 18:30 to Monday 2026-10-05 09:30
      // Friday 2026-10-02 is Gandhi Jayanti (holiday)
      // Sat/Sun are weekends
      // Total elapsed business minutes should be 0
      const thuClose = new Date('2026-10-01T13:00:00Z'); // Thu 18:30 IST
      const monOpen = new Date('2026-10-05T04:00:00Z');  // Mon 09:30 IST

      const minutes = calculateBusinessMinutesBetween(thuClose, monOpen, testHolidays);
      expect(minutes).toBe(0);
    });
  });

  describe('addBusinessMinutes and SLA Deadlines', () => {
    it('Critical SLA: 2h (120m) first response deadline from Tuesday 10:00 is Tuesday 12:00', () => {
      const tue10am = new Date('2026-11-17T04:30:00Z'); // 10:00 IST
      const deadline = addBusinessMinutes(tue10am, 120, testHolidays);

      // Should be 12:00 IST on same day
      const expected = new Date('2026-11-17T06:30:00Z'); // 12:00 IST
      expect(deadline.toISOString()).toBe(expected.toISOString());
    });

    it('Critical SLA: 9h (540m) resolution deadline spans to next working day when created mid-day', () => {
      // Tuesday 14:00 IST (4.5h left today until 18:30)
      const tue2pm = new Date('2026-11-17T08:30:00Z');
      // Remaining 4.5h (270m) finishes Wednesday at 09:30 + 4.5h = 14:00 IST
      const deadline = addBusinessMinutes(tue2pm, 540, testHolidays);

      const expectedWed2pm = new Date('2026-11-18T08:30:00Z'); // Wed 14:00 IST
      expect(deadline.toISOString()).toBe(expectedWed2pm.toISOString());
    });

    it('Friday 17:00 IST + 120 minutes wraps around weekend to Monday 11:00 IST', () => {
      // Friday 17:00 IST has 1.5h (90 min) until close at 18:30
      // 30 min left rolls over to Monday morning: 09:30 + 30 min = 10:00 IST
      const fri5pm = new Date('2026-11-20T11:30:00Z');
      const deadline = addBusinessMinutes(fri5pm, 120, testHolidays);

      const expectedMon10am = new Date('2026-11-23T04:30:00Z'); // Mon 10:00 IST
      expect(deadline.toISOString()).toBe(expectedMon10am.toISOString());
    });
  });

  describe('getNextBusinessOpen', () => {
    it('returns same time if already within business hours', () => {
      const tue11am = new Date('2026-11-17T05:30:00Z');
      expect(getNextBusinessOpen(tue11am, testHolidays).toISOString()).toBe(tue11am.toISOString());
    });

    it('returns Monday 09:30 IST when called on Saturday', () => {
      const saturday = new Date('2026-11-21T05:30:00Z');
      const nextOpen = getNextBusinessOpen(saturday, testHolidays);
      const expectedMonOpen = new Date('2026-11-23T04:00:00Z'); // 09:30 IST
      expect(nextOpen.toISOString()).toBe(expectedMonOpen.toISOString());
    });
  });

  describe('SLA Policy Constants Match Specification', () => {
    it('Critical targets: 120m (2h) first response, 540m (9h / 1 working day) resolution', () => {
      expect(SLA_TARGETS[TicketPriority.CRITICAL].firstResponseMinutes).toBe(120);
      expect(SLA_TARGETS[TicketPriority.CRITICAL].resolutionMinutes).toBe(540);
    });

    it('Medium targets: 270m (4.5h) first response, 1620m (27h / 3 working days) resolution', () => {
      expect(SLA_TARGETS[TicketPriority.MEDIUM].firstResponseMinutes).toBe(270);
      expect(SLA_TARGETS[TicketPriority.MEDIUM].resolutionMinutes).toBe(1620);
    });

    it('Low targets: 540m (9h / 1 working day) first response, 2700m (45h / 5 working days) resolution', () => {
      expect(SLA_TARGETS[TicketPriority.LOW].firstResponseMinutes).toBe(540);
      expect(SLA_TARGETS[TicketPriority.LOW].resolutionMinutes).toBe(2700);
    });

    it('Auto-close threshold: 2700 working minutes (5 working days / 1 working week)', () => {
      expect(AUTO_CLOSE_MINUTES).toBe(2700);
    });

    it('Reopen window: 2700 working minutes (5 working days / 1 working week)', () => {
      expect(REOPEN_WINDOW_MINUTES).toBe(2700);
    });
  });
});
