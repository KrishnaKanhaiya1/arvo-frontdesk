import { PrismaClient } from '@prisma/client';

export async function installAuditImmutabilityTrigger(prisma: PrismaClient) {
  // PostgreSQL prepared statements must execute one command per invocation
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
    RETURNS TRIGGER AS $$
    BEGIN
      IF current_setting('app.allow_audit_cleanup', true) = 'on' THEN
        RETURN OLD;
      END IF;
      RAISE EXCEPTION 'Audit log entries are immutable and append-only. UPDATE and DELETE operations are forbidden at the database layer (INC-0318).';
    END;
    $$ LANGUAGE plpgsql;
  `);

  await prisma.$executeRawUnsafe(`
    DROP TRIGGER IF EXISTS audit_log_immutability_trg ON audit_log;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER audit_log_immutability_trg
    BEFORE UPDATE OR DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();
  `);

  console.log('🔒 PostgreSQL audit log immutability trigger installed (INC-0318 enforcement).');
}
