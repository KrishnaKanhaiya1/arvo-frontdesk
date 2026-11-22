import { Prisma } from '@prisma/client';

/**
 * Robust, collision-free Ticket Key generator.
 * Inspects all existing ticket keys in the database, extracts numeric suffixes,
 * and increments beyond both the max existing ticket key and the singleton counter.
 */
export async function generateNextTicketKey(tx: Prisma.TransactionClient): Promise<string> {
  const existingTickets = await tx.ticket.findMany({
    select: { ticketKey: true },
  });

  let maxNum = 100;
  for (const t of existingTickets) {
    const match = t.ticketKey.match(/^ARV-(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }

  const currentCounter = await tx.ticketCounter.findUnique({
    where: { id: 'singleton' },
  });

  const baseNum = Math.max(maxNum, currentCounter?.counter ?? 100);
  const nextNum = baseNum + 1;

  await tx.ticketCounter.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', counter: nextNum },
    update: { counter: nextNum },
  });

  return `ARV-${nextNum}`;
}
