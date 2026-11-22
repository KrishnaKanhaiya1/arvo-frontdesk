import { PrismaClient } from '@prisma/client';
import { installAuditImmutabilityTrigger } from '../utils/auditTrigger';

export async function resetToCanonicalSeed(prisma: PrismaClient) {
  // Allow cleanup setting for seed script
  await prisma.$executeRawUnsafe(`SET app.allow_audit_cleanup = 'on';`).catch(() => {});

  // Clear existing data
  await prisma.auditLog.deleteMany();
  await prisma.internalNote.deleteMany();
  await prisma.ticketMessage.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.systemConfig.deleteMany();
  await prisma.ticketCounter.deleteMany();

  // ── Agents ──────────────────────────────────────────────────
  await prisma.agent.create({
    data: {
      id: 'agent-meera',
      name: 'Meera Krishnan',
      email: 'meera@arvo.systems',
      role: 'lead',
      avatarColor: '#7C3AED',
      avatarInitials: 'MK',
    },
  });

  await prisma.agent.create({
    data: {
      id: 'agent-rahul',
      name: 'Rahul Sharma',
      email: 'rahul@arvo.systems',
      role: 'agent',
      avatarColor: '#2563EB',
      avatarInitials: 'RS',
    },
  });

  await prisma.agent.create({
    data: {
      id: 'agent-priya',
      name: 'Priya Nair',
      email: 'priya@arvo.systems',
      role: 'agent',
      avatarColor: '#059669',
      avatarInitials: 'PN',
    },
  });

  // ── Customers ───────────────────────────────────────────────
  await prisma.customer.create({
    data: {
      id: 'cust-acme',
      name: 'Vikram Patel',
      email: 'vikram@acmecorp.in',
      company: 'Acme Corp',
      avatarColor: '#DC2626',
      avatarInitials: 'VP',
    },
  });

  await prisma.customer.create({
    data: {
      id: 'cust-global',
      name: 'Anita Desai',
      email: 'anita@globaltech.in',
      company: 'GlobalTech Solutions',
      avatarColor: '#D97706',
      avatarInitials: 'AD',
    },
  });

  await prisma.customer.create({
    data: {
      id: 'cust-nova',
      name: 'Suresh Kumar',
      email: 'suresh@novaretail.in',
      company: 'Nova Retail Ltd',
      avatarColor: '#7C3AED',
      avatarInitials: 'SK',
    },
  });

  await prisma.customer.create({
    data: {
      id: 'cust-zenith',
      name: 'Kavitha Rajan',
      email: 'kavitha@zenithsystems.in',
      company: 'Zenith Systems',
      avatarColor: '#059669',
      avatarInitials: 'KR',
    },
  });

  // ── 2026 Indian Holidays (IST) ──────────────────────────────
  const holidays = [
    { date: new Date('2026-01-26T12:00:00Z'), name: 'Republic Day' },
    { date: new Date('2026-03-04T12:00:00Z'), name: 'Maha Shivratri' },
    { date: new Date('2026-03-20T12:00:00Z'), name: 'Holi' },
    { date: new Date('2026-03-21T12:00:00Z'), name: 'Id-ul-Fitr' },
    { date: new Date('2026-04-03T12:00:00Z'), name: 'Good Friday' },
    { date: new Date('2026-04-14T12:00:00Z'), name: 'Dr. Ambedkar Jayanti' },
    { date: new Date('2026-05-01T12:00:00Z'), name: 'Maharashtra Day / May Day' },
    { date: new Date('2026-05-27T12:00:00Z'), name: 'Bakrid / Id-ul-Zuha' },
    { date: new Date('2026-06-26T12:00:00Z'), name: 'Muharram' },
    { date: new Date('2026-08-15T12:00:00Z'), name: 'Independence Day' },
    { date: new Date('2026-08-27T12:00:00Z'), name: 'Milad-un-Nabi' },
    { date: new Date('2026-09-04T12:00:00Z'), name: 'Janmashtami' },
    { date: new Date('2026-09-15T12:00:00Z'), name: 'Ganesh Chaturthi' },
    { date: new Date('2026-10-02T12:00:00Z'), name: 'Mahatma Gandhi Jayanti' },
    { date: new Date('2026-10-20T12:00:00Z'), name: 'Dussehra' },
    { date: new Date('2026-11-08T12:00:00Z'), name: 'Diwali (Laxmi Pujan)' },
    { date: new Date('2026-11-10T12:00:00Z'), name: 'Diwali (Balipratipada)' },
    { date: new Date('2026-11-24T12:00:00Z'), name: 'Guru Nanak Jayanti' },
    { date: new Date('2026-12-25T12:00:00Z'), name: 'Christmas' },
  ];

  await prisma.holiday.createMany({ data: holidays });
  await prisma.ticketCounter.create({ data: { id: 'singleton', counter: 108 } });

  // ── Canonical Tickets ARV-101 .. ARV-108 ────────────────────
  const t1 = await prisma.ticket.create({
    data: {
      ticketKey: 'ARV-101',
      subject: 'Production database connection pool exhausted — all services down',
      description: 'Since 09:45 AM, our API services are receiving pool timeout exceptions. Users cannot log in.',
      priority: 'CRITICAL',
      status: 'ASSIGNED',
      customerId: 'cust-acme',
      assigneeId: 'agent-rahul',
      slaFirstResponseTarget: 120,
      slaResolutionTarget: 540,
      slaFirstResponseElapsed: 30,
      slaResolutionElapsed: 315,
      slaFirstResponseBreached: false,
      slaResolutionBreached: false,
      slaLastTickAt: new Date('2026-11-20T17:30:00+05:30'),
      firstResponseAt: new Date('2026-11-20T10:15:00+05:30'),
      createdAt: new Date('2026-11-20T09:45:00+05:30'),
      updatedAt: new Date('2026-11-20T17:30:00+05:30'),
      version: 1,
    },
  });

  await prisma.ticketMessage.createMany({
    data: [
      {
        ticketId: t1.id,
        senderName: 'Vikram Patel',
        customerId: 'cust-acme',
        type: 'CUSTOMER',
        content: 'Since 09:45 AM, our API services are receiving pool timeout exceptions. Users cannot log in. Please treat as P0.',
        createdAt: new Date('2026-11-20T09:45:00+05:30'),
      },
      {
        ticketId: t1.id,
        senderName: 'Rahul Sharma',
        agentId: 'agent-rahul',
        type: 'AGENT_PUBLIC',
        content: 'We are investigating the connection pool spike right now. It appears related to a long-running batch query.',
        createdAt: new Date('2026-11-20T10:15:00+05:30'),
      },
    ],
  });

  await prisma.internalNote.createMany({
    data: [
      {
        ticketId: t1.id,
        authorId: 'agent-rahul',
        authorName: 'Rahul Sharma',
        content: 'Root cause identified: unindexed analytical query running on primary instance instead of read replica. Kill pid 49219 to recover.',
        createdAt: new Date('2026-11-20T10:30:00+05:30'),
      },
      {
        ticketId: t1.id,
        authorId: 'agent-meera',
        authorName: 'Meera Krishnan',
        content: 'I have notified our DevOps on-call. DO NOT expose replica failure or internal DB hostnames to Acme in the customer portal.',
        createdAt: new Date('2026-11-20T11:00:00+05:30'),
      },
    ],
  });

  await prisma.ticket.create({
    data: {
      ticketKey: 'ARV-102',
      subject: 'Payment gateway returning intermittent 500 errors after deploy',
      description: 'Approximately 15% of checkout transactions fail with PGW_ERR_500.',
      priority: 'CRITICAL',
      status: 'OPEN',
      customerId: 'cust-global',
      slaFirstResponseTarget: 120,
      slaResolutionTarget: 540,
      slaFirstResponseElapsed: 25,
      slaResolutionElapsed: 25,
      slaLastTickAt: new Date('2026-11-21T10:00:00+05:30'),
      createdAt: new Date('2026-11-21T09:35:00+05:30'),
      updatedAt: new Date('2026-11-21T10:00:00+05:30'),
      version: 1,
    },
  });

  const t3 = await prisma.ticket.create({
    data: {
      ticketKey: 'ARV-103',
      subject: 'SSO SAML certificate rotation assistance required',
      description: 'Our Okta IdP certificate expires on Nov 25. We need assistance updating the ACS metadata.',
      priority: 'MEDIUM',
      status: 'WAITING_ON_CUSTOMER',
      customerId: 'cust-nova',
      assigneeId: 'agent-priya',
      slaFirstResponseTarget: 270,
      slaResolutionTarget: 1620,
      slaFirstResponseElapsed: 45,
      slaResolutionElapsed: 120,
      slaLastTickAt: new Date('2026-11-19T11:00:00+05:30'),
      firstResponseAt: new Date('2026-11-19T10:45:00+05:30'),
      waitingOnCustomerSince: new Date('2026-11-19T11:00:00+05:30'),
      createdAt: new Date('2026-11-19T10:00:00+05:30'),
      updatedAt: new Date('2026-11-19T11:00:00+05:30'),
      version: 1,
    },
  });

  await prisma.ticket.create({
    data: {
      ticketKey: 'ARV-104',
      subject: 'Email notification service crashed — customers not receiving alerts',
      description: 'Workers in the mail queue are terminating with OutOfMemory errors.',
      priority: 'CRITICAL',
      status: 'OPEN',
      customerId: 'cust-zenith',
      slaFirstResponseTarget: 120,
      slaResolutionTarget: 540,
      slaFirstResponseElapsed: 40,
      slaResolutionElapsed: 40,
      slaLastTickAt: new Date('2026-11-21T11:00:00+05:30'),
      createdAt: new Date('2026-11-21T10:20:00+05:30'),
      updatedAt: new Date('2026-11-21T11:00:00+05:30'),
      version: 1,
    },
  });

  const t5 = await prisma.ticket.create({
    data: {
      ticketKey: 'ARV-105',
      subject: 'Request for custom API rate limit increase',
      description: 'We are expanding our sync frequency and request increasing the default rate limit to 500 req/min.',
      priority: 'MEDIUM',
      status: 'ASSIGNED',
      customerId: 'cust-acme',
      assigneeId: 'agent-meera',
      slaFirstResponseTarget: 270,
      slaResolutionTarget: 1620,
      slaFirstResponseElapsed: 60,
      slaResolutionElapsed: 380,
      slaLastTickAt: new Date('2026-11-19T16:00:00+05:30'),
      firstResponseAt: new Date('2026-11-19T11:00:00+05:30'),
      createdAt: new Date('2026-11-19T10:00:00+05:30'),
      updatedAt: new Date('2026-11-19T16:00:00+05:30'),
      version: 1,
    },
  });

  await prisma.internalNote.create({
    data: {
      ticketId: t5.id,
      authorId: 'agent-meera',
      authorName: 'Meera Krishnan',
      content: 'Acme is an Enterprise tier client. Tier allows up to 1000 req/min with CTO approval. Routing to infra team.',
      createdAt: new Date('2026-11-19T11:15:00+05:30'),
    },
  });

  const t6 = await prisma.ticket.create({
    data: {
      ticketKey: 'ARV-106',
      subject: 'Data export job producing corrupted CSV files',
      description: 'Special unicode characters in customer notes are truncating output lines in weekly exports.',
      priority: 'CRITICAL',
      status: 'ASSIGNED',
      customerId: 'cust-global',
      assigneeId: 'agent-rahul',
      slaFirstResponseTarget: 120,
      slaResolutionTarget: 540,
      slaFirstResponseElapsed: 20,
      slaResolutionElapsed: 120,
      slaLastTickAt: new Date('2026-11-20T14:00:00+05:30'),
      firstResponseAt: new Date('2026-11-20T10:20:00+05:30'),
      createdAt: new Date('2026-11-20T10:00:00+05:30'),
      updatedAt: new Date('2026-11-20T14:00:00+05:30'),
      version: 1,
    },
  });

  await prisma.internalNote.create({
    data: {
      ticketId: t6.id,
      authorId: 'agent-rahul',
      authorName: 'Rahul Sharma',
      content: 'Fix submitted in PR #409: UTF-8 BOM byte marker was missing in streaming response writer.',
      createdAt: new Date('2026-11-20T13:45:00+05:30'),
    },
  });

  await prisma.ticket.create({
    data: {
      ticketKey: 'ARV-107',
      subject: 'Webhook endpoint failing HMAC verification on delivery',
      description: 'Signatures generated with SHA256 do not match the expected digest format.',
      priority: 'MEDIUM',
      status: 'RESOLVED',
      customerId: 'cust-acme',
      assigneeId: 'agent-priya',
      slaFirstResponseTarget: 270,
      slaResolutionTarget: 1620,
      slaFirstResponseElapsed: 30,
      slaResolutionElapsed: 180,
      slaLastTickAt: new Date('2026-11-21T12:00:00+05:30'),
      firstResponseAt: new Date('2026-11-21T10:00:00+05:30'),
      resolvedAt: new Date('2026-11-21T12:00:00+05:30'),
      createdAt: new Date('2026-11-21T09:30:00+05:30'),
      updatedAt: new Date('2026-11-21T12:00:00+05:30'),
      version: 1,
    },
  });

  await prisma.ticket.create({
    data: {
      ticketKey: 'ARV-108',
      subject: 'Billing invoice PDF missing GSTIN tax breakdown',
      description: 'The October billing cycle statement lacks the state-wise SGST/CGST breakdown.',
      priority: 'LOW',
      status: 'CLOSED',
      customerId: 'cust-nova',
      assigneeId: 'agent-meera',
      slaFirstResponseTarget: 540,
      slaResolutionTarget: 2700,
      slaFirstResponseElapsed: 90,
      slaResolutionElapsed: 480,
      slaLastTickAt: new Date('2026-11-05T17:00:00+05:30'),
      firstResponseAt: new Date('2026-11-04T11:00:00+05:30'),
      resolvedAt: new Date('2026-11-05T16:00:00+05:30'),
      closedAt: new Date('2026-11-12T18:00:00+05:30'),
      createdAt: new Date('2026-11-04T09:30:00+05:30'),
      updatedAt: new Date('2026-11-12T18:00:00+05:30'),
      version: 1,
    },
  });

  await prisma.auditLog.createMany({
    data: [
      {
        ticketId: t1.id,
        ticketKey: 'ARV-101',
        action: 'TICKET_CREATED',
        actorId: 'cust-acme',
        actorName: 'Vikram Patel',
        actorType: 'customer',
        metadata: { priority: 'CRITICAL', customer: 'Acme Corp' },
        createdAt: new Date('2026-11-20T09:45:00+05:30'),
      },
      {
        ticketId: t1.id,
        ticketKey: 'ARV-101',
        action: 'ASSIGNED',
        actorId: 'agent-rahul',
        actorName: 'Rahul Sharma',
        actorType: 'agent',
        metadata: { assignee: 'Rahul Sharma' },
        createdAt: new Date('2026-11-20T10:15:00+05:30'),
      },
      {
        ticketId: t1.id,
        ticketKey: 'ARV-101',
        action: 'INTERNAL_NOTE_ADDED',
        actorId: 'agent-rahul',
        actorName: 'Rahul Sharma',
        actorType: 'agent',
        metadata: { noteLength: 120 },
        createdAt: new Date('2026-11-20T10:30:00+05:30'),
      },
      {
        ticketId: t3.id,
        ticketKey: 'ARV-103',
        action: 'STATUS_CHANGED',
        actorId: 'agent-priya',
        actorName: 'Priya Nair',
        actorType: 'agent',
        metadata: { from: 'ASSIGNED', to: 'WAITING_ON_CUSTOMER', reason: 'Requested username list from customer' },
        createdAt: new Date('2026-11-19T11:00:00+05:30'),
      },
    ],
  });

  // Reinstall PostgreSQL immutable audit trigger after seed reset
  await installAuditImmutabilityTrigger(prisma).catch((err) => {
    console.warn('Could not install PostgreSQL audit immutability trigger during seed:', err);
  });
}
