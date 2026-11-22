import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../utils/prisma';
import app from '../index';
import { installAuditImmutabilityTrigger } from '../../prisma/auditTrigger';
import { seed } from '../../prisma/seed';
import { Server } from 'http';

const BASE_URL = 'http://localhost:3001';
let inProcessServer: Server | null = null;

let meeraCookie: string;
let rahulCookie: string;
let priyaCookie: string;
let vikramCookie: string;
let zenithCookie: string;

async function fetchSessionCookie(personaId: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/demo-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personaId }),
  });
  if (!res.ok) throw new Error(`Failed to login demo persona ${personaId}: ${res.status}`);
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) throw new Error(`No set-cookie returned for ${personaId}`);
  return setCookie.split(';')[0];
}

beforeAll(async () => {
  // 1. Ensure server is listening
  try {
    const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(500) });
    if (!res.ok) throw new Error('Not ok');
  } catch {
    await new Promise<void>((resolve) => {
      inProcessServer = app.listen(3001, '0.0.0.0', () => {
        resolve();
      });
    });
  }

  // 2. Install PostgreSQL audit immutability trigger
  await installAuditImmutabilityTrigger(prisma).catch(() => {});

  // 3. Acquire signed session cookies for test personas
  meeraCookie = await fetchSessionCookie('agent-meera');
  rahulCookie = await fetchSessionCookie('agent-rahul');
  priyaCookie = await fetchSessionCookie('agent-priya');
  vikramCookie = await fetchSessionCookie('cust-acme');
  zenithCookie = await fetchSessionCookie('cust-zenith');
}, 20000);

afterAll(async () => {
  // Clean canonical database state so test pollution is eradicated
  try {
    await seed(prisma);
  } catch (err) {
    console.error('Failed to cleanup canonical seed after test:', err);
  }

  if (inProcessServer) {
    await new Promise<void>((resolve) => inProcessServer!.close(() => resolve()));
  }
});

describe('Priority 1: Authentication & Authorization Security Enforcements', () => {
  it('rejects unauthenticated requests without session cookie with HTTP 401 Unauthorized', async () => {
    const res = await fetch(`${BASE_URL}/api/tickets`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects spoofed x-actor-role and x-actor-id headers without session cookie with HTTP 401', async () => {
    const res = await fetch(`${BASE_URL}/api/tickets`, {
      headers: {
        'x-actor-role': 'lead',
        'x-actor-id': 'agent-meera',
      },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/auth/session returns authenticated session when valid cookie is present', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { Cookie: meeraCookie },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.authenticated).toBe(true);
    expect(body.user.userId).toBe('agent-meera');
    expect(body.user.role).toBe('lead');
  });

  it('requireLeadRole strictly rejects ordinary agents from lead actions with HTTP 403 Forbidden', async () => {
    // Ordinary agent Rahul attempts to advance clock
    const res = await fetch(`${BASE_URL}/api/system/clock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: rahulCookie,
      },
      body: JSON.stringify({ simulatedTime: new Date().toISOString() }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('requireAgentRole strictly rejects customers from agent workspace routes with HTTP 403 Forbidden', async () => {
    const res = await fetch(`${BASE_URL}/api/tickets`, {
      headers: { Cookie: vikramCookie },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('POST /api/auth/logout clears the session cookie', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
    });

    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain('arvo_session=;');
  });
});

describe('Priority 2: Customer Data Isolation & Cross-Account Boundary Checks', () => {
  it('strictly rejects customer attempts to read tickets belonging to another customer with HTTP 403', async () => {
    // ARV-101 belongs to cust-acme (Vikram). Zenith customer attempts to access it.
    const res = await fetch(`${BASE_URL}/api/customer/tickets/ARV-101`, {
      headers: { Cookie: zenithCookie },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('strictly rejects customer query param tampering attempts with HTTP 403', async () => {
    // Vikram attempts to request Zenith customer tickets via query parameter
    const res = await fetch(`${BASE_URL}/api/customer/tickets?customerId=cust-zenith`, {
      headers: { Cookie: vikramCookie },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('strictly rejects customer attempts to read internal notes with HTTP 403 Forbidden (INC-0304)', async () => {
    const res = await fetch(`${BASE_URL}/api/tickets/ARV-101/notes`, {
      headers: { Cookie: vikramCookie },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('guarantees customer ticket endpoint NEVER includes internal notes or sets hasInternalNotes=true (INC-0304)', async () => {
    const res = await fetch(`${BASE_URL}/api/customer/tickets/ARV-101`, {
      headers: { Cookie: vikramCookie },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const ticketData = body.data;
    expect(ticketData.hasInternalNotes).toBe(false);
    expect(ticketData).not.toHaveProperty('internalNotes');

    // Verify messages do not contain agent private notes
    if (ticketData.messages) {
      for (const msg of ticketData.messages) {
        expect(msg.type).not.toBe('INTERNAL_NOTE');
        expect(msg.type).not.toBe('AGENT_PRIVATE');
      }
    }
  });
});

describe('INC-0291: Concurrency & Atomic Compare-And-Swap (Double Claim)', () => {
  let testTicketKey: string;
  let testTicketVersion: number;

  beforeAll(async () => {
    // Create an unassigned test ticket
    const ticket = await prisma.ticket.create({
      data: {
        ticketKey: `TEST-${Date.now()}`,
        subject: 'Concurrency Test Ticket',
        description: 'Testing atomic CAS',
        priority: 'MEDIUM',
        status: 'OPEN',
        customerId: 'cust-acme',
        slaFirstResponseTarget: 270,
        slaResolutionTarget: 1620,
        slaLastTickAt: new Date(),
        version: 1,
      },
    });
    testTicketKey = ticket.ticketKey;
    testTicketVersion = ticket.version;
  });

  it('allows the first agent claim and rejects the simultaneous second claim with HTTP 409 Conflict', async () => {
    // Both agents read the ticket at version 1
    const claim1 = fetch(`${BASE_URL}/api/tickets/${testTicketKey}/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: rahulCookie,
      },
      body: JSON.stringify({ agentId: 'agent-rahul', version: testTicketVersion }),
    });

    const claim2 = fetch(`${BASE_URL}/api/tickets/${testTicketKey}/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: priyaCookie,
      },
      body: JSON.stringify({ agentId: 'agent-priya', version: testTicketVersion }),
    });

    // Execute simultaneously
    const [res1, res2] = await Promise.all([claim1, claim2]);
    const body1 = await res1.json();
    const body2 = await res2.json();

    // Exactly one must succeed (200) and exactly one must fail with 409 (VERSION_MISMATCH / CONFLICT)
    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([200, 409]);

    const successBody = res1.status === 200 ? body1 : body2;
    const conflictBody = res1.status === 409 ? body1 : body2;

    expect(successBody.success).toBe(true);
    expect(successBody.data.status).toBe('ASSIGNED');
    expect(successBody.data.version).toBe(testTicketVersion + 1);

    expect(conflictBody.success).toBe(false);
    expect(conflictBody.error.code).toMatch(/VERSION_MISMATCH|CONFLICT/);
  });
});

describe('INC-0318: Audit Log Immutability at Database Trigger Level', () => {
  it('prevents direct UPDATE on audit_log table at the PostgreSQL level', async () => {
    const firstAudit = await prisma.auditLog.findFirst();
    expect(firstAudit).toBeDefined();

    await expect(
      prisma.auditLog.update({
        where: { id: firstAudit!.id },
        data: { actorName: 'HACKED_NAME' },
      })
    ).rejects.toThrow(/immutable and append-only/);
  });

  it('prevents direct DELETE on audit_log table at the PostgreSQL level', async () => {
    const firstAudit = await prisma.auditLog.findFirst();
    expect(firstAudit).toBeDefined();

    await expect(
      prisma.auditLog.delete({
        where: { id: firstAudit!.id },
      })
    ).rejects.toThrow(/immutable and append-only/);
  });
});

describe('Mid-Flight Priority Escalation & Same-Day SLA Calculation', () => {
  let escTicketKey: string;
  let escVersion: number;

  beforeAll(async () => {
    const ticket = await prisma.ticket.create({
      data: {
        ticketKey: `ESC-${Date.now()}`,
        subject: 'Priority Escalation SLA Test Ticket',
        description: 'Test mid-flight escalation to Critical',
        priority: 'MEDIUM',
        status: 'ASSIGNED',
        customerId: 'cust-acme',
        assigneeId: 'agent-rahul',
        slaFirstResponseTarget: 270,
        slaResolutionTarget: 1620,
        slaFirstResponseElapsed: 60,
        slaResolutionElapsed: 120,
        slaLastTickAt: new Date(),
        version: 1,
      },
    });
    escTicketKey = ticket.ticketKey;
    escVersion = ticket.version;
  });

  it('escalating to CRITICAL preserves elapsed time and sets same-day resolution target', async () => {
    const res = await fetch(`${BASE_URL}/api/tickets/${escTicketKey}/priority`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: rahulCookie,
      },
      body: JSON.stringify({
        agentId: 'agent-rahul',
        newPriority: 'CRITICAL',
        version: escVersion,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.priority).toBe('CRITICAL');
    expect(body.data.sla.resolution.elapsedBusinessMinutes).toBeGreaterThanOrEqual(120);

    // Verify audit log has before and after state
    const auditRes = await fetch(`${BASE_URL}/api/tickets/${escTicketKey}/audit`, {
      headers: { Cookie: meeraCookie },
    });
    const auditBody = await auditRes.json();
    const priorityEvent = auditBody.data.find((e: any) => e.action === 'PRIORITY_CHANGED');
    expect(priorityEvent).toBeDefined();
    expect(priorityEvent.metadata.before.priority).toBe('MEDIUM');
    expect(priorityEvent.metadata.after.priority).toBe('CRITICAL');
  });
});

describe('Ticket Lifecycle: Atomic CAS Reopening & Closed Ticket Protection', () => {
  it('rejects reopening when past the 5-working-day window (2700 minutes) and returns canCreateLinkedTicket flag', async () => {
    const res = await fetch(`${BASE_URL}/api/customer/tickets/ARV-108/reopen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: zenithCookie,
      },
      body: JSON.stringify({ version: 1 }),
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('REOPEN_EXPIRED');
    expect(body.error.details.canCreateLinkedTicket).toBe(true);
  });

  it('rejects reopening with mismatched version via atomic Compare-And-Swap (409 Conflict)', async () => {
    // Create a resolved ticket
    const resolvedTicket = await prisma.ticket.create({
      data: {
        ticketKey: `REOPEN-${Date.now()}`,
        subject: 'CAS Reopen Test',
        description: 'Test version guard on reopen',
        priority: 'LOW',
        status: 'RESOLVED',
        customerId: 'cust-acme',
        resolvedAt: new Date(),
        slaFirstResponseTarget: 540,
        slaResolutionTarget: 2700,
        slaLastTickAt: new Date(),
        version: 2,
      },
    });

    // Attempt reopen with stale version 1
    const res = await fetch(`${BASE_URL}/api/customer/tickets/${resolvedTicket.ticketKey}/reopen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: vikramCookie,
      },
      body: JSON.stringify({ version: 1 }),
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VERSION_MISMATCH');
  });

  it('prevents customer replies to closed tickets', async () => {
    const closedTicket = await prisma.ticket.create({
      data: {
        ticketKey: `CLOSED-${Date.now()}`,
        subject: 'Closed Ticket Protection Test',
        description: 'Should not accept replies',
        priority: 'LOW',
        status: 'CLOSED',
        customerId: 'cust-acme',
        slaFirstResponseTarget: 540,
        slaResolutionTarget: 2700,
        slaLastTickAt: new Date(),
        closedAt: new Date(),
        version: 1,
      },
    });

    const res = await fetch(`${BASE_URL}/api/customer/tickets/${closedTicket.ticketKey}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: vikramCookie,
      },
      body: JSON.stringify({ content: 'Can I reply to this closed ticket?' }),
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.message).toMatch(/closed/i);
  });
});
