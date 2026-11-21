/**
 * Auto-close Service
 * Finds tickets in WAITING_ON_CUSTOMER status and auto-closes them
 * if they've been waiting for >= 2700 business minutes (5 working days).
 */

import prisma from '../utils/prisma';
import { getCurrentTime } from './clock';
import { calculateBusinessMinutesBetween } from './sla';
import { AUTO_CLOSE_MINUTES, AuditAction } from '../types/contracts';

export async function runAutoClose(): Promise<{ closedCount: number; closedTickets: string[] }> {
  const now = await getCurrentTime();

  // Load holidays
  const holidayRows = await prisma.holiday.findMany();
  const holidays = holidayRows.map((h) => h.date);

  // Find all WAITING_ON_CUSTOMER tickets
  const waitingTickets = await prisma.ticket.findMany({
    where: {
      status: 'WAITING_ON_CUSTOMER',
      waitingOnCustomerSince: { not: null },
    },
  });

  const closedKeys: string[] = [];

  for (const ticket of waitingTickets) {
    if (!ticket.waitingOnCustomerSince) continue;

    const bizMinsWaiting = calculateBusinessMinutesBetween(
      ticket.waitingOnCustomerSince,
      now,
      holidays,
    );

    if (bizMinsWaiting >= AUTO_CLOSE_MINUTES) {
      await prisma.$transaction(async (tx) => {
        // Atomic Compare-And-Swap: ticket must still be in WAITING_ON_CUSTOMER at the exact same version
        // Prevents racing with customer replies that resumed the ticket
        const updateRes = await tx.ticket.updateMany({
          where: {
            id: ticket.id,
            status: 'WAITING_ON_CUSTOMER',
            version: ticket.version,
            waitingOnCustomerSince: ticket.waitingOnCustomerSince,
          },
          data: {
            status: 'CLOSED',
            closedAt: now,
            isPaused: false,
            version: { increment: 1 },
          },
        });

        if (updateRes.count === 1) {
          await tx.auditLog.create({
            data: {
              ticketId: ticket.id,
              ticketKey: ticket.ticketKey,
              action: AuditAction.TICKET_AUTO_CLOSED,
              actorId: 'system',
              actorName: 'System',
              actorType: 'system',
              metadata: {
                reason: 'Waiting on customer for 5+ working days',
                waitingMinutes: bizMinsWaiting,
                threshold: AUTO_CLOSE_MINUTES,
              },
              createdAt: now,
            },
          });

          // Add system message
          await tx.ticketMessage.create({
            data: {
              ticketId: ticket.id,
              type: 'SYSTEM',
              content: 'Ticket automatically closed after 5 working days with no customer response.',
              senderName: 'System',
              createdAt: now,
            },
          });

          closedKeys.push(ticket.ticketKey);
        }
      });
    }
  }

  return { closedCount: closedKeys.length, closedTickets: closedKeys };
}
