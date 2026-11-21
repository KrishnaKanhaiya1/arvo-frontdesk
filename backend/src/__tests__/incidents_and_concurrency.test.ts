import { describe, it, expect, beforeAll } from 'vitest';
import prisma from '../utils/prisma';
import { installAuditImmutabilityTrigger } from '../../prisma/auditTrigger';

const BASE_URL = 'http://localhost:3001';

describe('INC-0291: Concurrency & Atomic Compare-And-Swap (Double Claim)', () => {
  let testTicketKey: string;
  let testTicketVersion: number;

  beforeAll(async () => {
    // Install PostgreSQL trigger if not yet active
    await installAuditImmutabilityTrigger(prisma).catch(() => {});

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
        'x-actor-role': 'agent',
        'x-actor-id': 'agent-rahul',
      },
      body: JSON.stringify({ agentId: 'agent-rahul', version: testTicketVersion }),
    });

    const claim2 = fetch(`${BASE_URL}/api/tickets/${testTicketKey}/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-actor-role': 'agent',
        'x-actor-id': 'agent-priya',
      },
      body: JSON.stringify({ agentId: 'agent-priya', version: testTicketVersion }),
    });

    // Execute simultaneously
    const [res1, res2] = await Promise.all([claim1, claim2]);
    const body1 = await res1.json();
    const body2 = await res2.json();

    const statuses = [res1.status, res2.status].sort();
    // Exactly one must succeed (200) and one must fail with 409 Conflict
    expect(statuses).toEqual([200, 409]);

    const conflictBody = res1.status === 409 ? body1 : body2;
    expect(conflictBody.success).toBe(false);
    expect(conflictBody.error.code).toMatch(/CONFLICT|VERSION_MISMATCH/);

    // Verify DB state has winning agent and version incremented to 2
    const finalTicket = await prisma.ticket.findUnique({
      where: { ticketKey: testTicketKey },
    });
    expect(finalTicket?.version).toBe(2);
    expect(finalTicket?.status).toBe('ASSIGNED');
    expect(['agent-rahul', 'agent-priya']).toContain(finalTicket?.assigneeId);
  });
});

describe('INC-0304: Internal Notes Security & API Isolation', () => {
  it('blocks customer actors from GET /api/tickets/:key/notes with 403 Forbidden', async () => {
    const res = await fetch(`${BASE_URL}/api/tickets/ARV-101/notes`, {
      headers: {
        'x-actor-role': 'customer',
        'x-actor-id': 'cust-acme',
      },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('blocks customer actors from POST /api/tickets/:key/notes with 403 Forbidden', async () => {
    const res = await fetch(`${BASE_URL}/api/tickets/ARV-101/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-actor-role': 'customer',
        'x-actor-id': 'cust-acme',
      },
      body: JSON.stringify({ agentId: 'cust-acme', content: 'Malicious injection attempt' }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('never exposes internal notes in customer ticket responses', async () => {
    const res = await fetch(`${BASE_URL}/api/customer/tickets/ARV-101`, {
      headers: {
        'x-actor-role': 'customer',
        'x-actor-id': 'cust-acme',
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    const data = body.data;
    expect(data.internalNotes).toBeUndefined();
    // Messages array must only contain public customer/agent messages
    for (const msg of data.messages) {
      expect(msg.type).not.toBe('INTERNAL_NOTE');
    }
  });

  it('blocks customers from manipulating the system demo clock', async () => {
    const res = await fetch(`${BASE_URL}/api/system/clock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-actor-role': 'customer',
        'x-actor-id': 'cust-acme',
      },
      body: JSON.stringify({ simulatedTime: '2026-11-25T10:00:00.000Z' }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});

describe('INC-0318: Database-Level Audit Immutability Trigger', () => {
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

describe('Ticket Lifecycle: Reopening & Closed Ticket Protection', () => {
  it('rejects reopening when past the 5-working-day window (2700 minutes) and returns canCreateLinkedTicket flag', async () => {
    // ARV-108 in seed data was resolved on 2026-11-06 (over 10 working days ago, owned by cust-zenith)
    const res = await fetch(`${BASE_URL}/api/customer/tickets/ARV-108/reopen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-actor-role': 'customer',
        'x-actor-id': 'cust-zenith',
      },
      body: JSON.stringify({ customerId: 'cust-zenith' }),
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('REOPEN_EXPIRED');
    expect(body.error.details.canCreateLinkedTicket).toBe(true);
  });

  it('prevents customer replies to closed tickets', async () => {
    // Create a closed ticket owned by cust-acme
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
        'x-actor-role': 'customer',
        'x-actor-id': 'cust-acme',
      },
      body: JSON.stringify({ customerId: 'cust-acme', content: 'Can I reply to this closed ticket?' }),
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.message).toMatch(/closed/i);
  });
});
