import { Prisma } from '@prisma/client';

/**
 * Concurrency-safe, atomic monotonic Ticket Key generator.
 * Employs row-level locking via PostgreSQL `UPDATE ... RETURNING` on the singleton counter table,
 * ensuring parallel ticket creations never collide or produce duplicate keys (ADR-006).
 */
export async function generateNextTicketKey(tx: Prisma.TransactionClient): Promise<string> {
  // Ensure the singleton row exists
  await tx.$executeRawUnsafe(`
    INSERT INTO "ticket_counter" (id, counter)
    VALUES ('singleton', (SELECT COALESCE(MAX(CAST(SUBSTRING("ticketKey" FROM 5) AS INTEGER)), 100) FROM "ticket"))
    ON CONFLICT (id) DO NOTHING;
  `);

  // Atomic row lock & increment in one statement
  const rows: any = await tx.$queryRawUnsafe(`
    UPDATE "ticket_counter"
    SET counter = GREATEST(counter, (SELECT COALESCE(MAX(CAST(SUBSTRING("ticketKey" FROM 5) AS INTEGER)), 100) FROM "ticket")) + 1
    WHERE id = 'singleton'
    RETURNING counter;
  `);

  const counterVal = rows?.[0]?.counter ?? 101;
  return `ARV-${counterVal}`;
}
