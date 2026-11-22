import { PrismaClient } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import { installAuditImmutabilityTrigger } from './auditTrigger';

const prisma = new PrismaClient();

export async function seed(prisma: PrismaClient) {
  console.log('🌱 Seeding Arvo Frontdesk database...');

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
  const meera = await prisma.agent.create({
    data: {
      id: 'agent-meera',
      name: 'Meera Krishnan',
      email: 'meera@arvo.systems',
      role: 'lead',
      avatarColor: '#7C3AED',
      avatarInitials: 'MK',
    },
  });

  const rahul = await prisma.agent.create({
    data: {
      id: 'agent-rahul',
      name: 'Rahul Sharma',
      email: 'rahul@arvo.systems',
      role: 'agent',
      avatarColor: '#2563EB',
      avatarInitials: 'RS',
    },
  });

  const priya = await prisma.agent.create({
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
  const custAcme = await prisma.customer.create({
    data: {
      id: 'cust-acme',
      name: 'Vikram Patel',
      email: 'vikram@acmecorp.in',
      company: 'Acme Corp',
      avatarColor: '#DC2626',
      avatarInitials: 'VP',
    },
  });

  const custGlobal = await prisma.customer.create({
    data: {
      id: 'cust-global',
      name: 'Anita Desai',
      email: 'anita@globaltech.in',
      company: 'GlobalTech Solutions',
      avatarColor: '#D97706',
      avatarInitials: 'AD',
    },
  });

  const custNova = await prisma.customer.create({
    data: {
      id: 'cust-nova',
      name: 'Suresh Kumar',
      email: 'suresh@novaindustries.in',
      company: 'Nova Industries',
      avatarColor: '#7C3AED',
      avatarInitials: 'SK',
    },
  });

  const custZenith = await prisma.customer.create({
    data: {
      id: 'cust-zenith',
      name: 'Kavitha Rajan',
      email: 'kavitha@zenithsys.in',
      company: 'Zenith Systems',
      avatarColor: '#0891B2',
      avatarInitials: 'KR',
    },
  });

  // ── 2026 Indian Festival Holidays ──────────────────────────
  const holidays = [
    { date: new Date('2026-01-26'), name: 'Republic Day' },
    { date: new Date('2026-03-10'), name: 'Maha Shivaratri' },
    { date: new Date('2026-03-17'), name: 'Holi' },
    { date: new Date('2026-03-31'), name: 'Id-ul-Fitr (Eid)' },
    { date: new Date('2026-04-02'), name: 'Ram Navami' },
    { date: new Date('2026-04-06'), name: 'Mahavir Jayanti' },
    { date: new Date('2026-04-14'), name: 'Dr. Ambedkar Jayanti' },
    { date: new Date('2026-04-18'), name: 'Good Friday' },
    { date: new Date('2026-05-01'), name: 'May Day' },
    { date: new Date('2026-05-25'), name: 'Buddha Purnima' },
    { date: new Date('2026-06-07'), name: 'Eid ul-Adha (Bakrid)' },
    { date: new Date('2026-07-06'), name: 'Muharram' },
    { date: new Date('2026-08-15'), name: 'Independence Day' },
    { date: new Date('2026-08-21'), name: 'Janmashtami' },
    { date: new Date('2026-09-05'), name: 'Milad-un-Nabi' },
    { date: new Date('2026-10-02'), name: 'Gandhi Jayanti' },
    { date: new Date('2026-10-20'), name: 'Dussehra' },
    { date: new Date('2026-11-08'), name: 'Diwali' },
    { date: new Date('2026-11-09'), name: 'Diwali (Day 2)' },
    { date: new Date('2026-11-24'), name: 'Guru Nanak Jayanti' },
    { date: new Date('2026-12-25'), name: 'Christmas' },
  ];

  for (const h of holidays) {
    await prisma.holiday.create({ data: h });
  }

  // ── System Config ──────────────────────────────────────────
  await prisma.systemConfig.create({
    data: { key: 'simulated_time', value: '' },
  });

  // ── Ticket Counter ─────────────────────────────────────────
  await prisma.ticketCounter.create({
    data: { id: 'singleton', counter: 108 },
  });

  // ── Helper: create a ticket with full state ────────────────
  const now = new Date();

  // We'll use relative business dates. For seeding, we set absolute timestamps
  // that the SLA engine will interpret correctly.

  // ARV-101: Critical · Breached (assigned to Rahul)
  const t101 = await prisma.ticket.create({
    data: {
      id: 'ticket-101',
      ticketKey: 'ARV-101',
      subject: 'Production database connection pool exhausted — all services down',
      description: 'Our entire production environment is unresponsive. Database connection pools are maxed out across all 3 replicas. Customer-facing APIs returning 503. Approximately 2000 users affected.',
      priority: 'CRITICAL',
      status: 'ASSIGNED',
      customerId: 'cust-acme',
      assigneeId: 'agent-rahul',
      slaFirstResponseTarget: 120,
      slaResolutionTarget: 540,
      slaFirstResponseElapsed: 150,  // Breached
      slaResolutionElapsed: 480,
      slaFirstResponseMet: true,
      slaFirstResponseMetAt: new Date('2026-11-20T12:30:00+05:30'),
      slaFirstResponseBreached: true,
      slaResolutionMet: false,
      slaResolutionBreached: false,
      isPaused: false,
      totalPausedMinutes: 0,
      slaLastTickAt: new Date('2026-11-21T09:30:00+05:30'),
      createdAt: new Date('2026-11-20T10:00:00+05:30'),
      firstResponseAt: new Date('2026-11-20T12:30:00+05:30'),
      version: 3,
    },
  });

  // ARV-102: Critical · Created Friday 18:00 (weekend proof)
  const t102 = await prisma.ticket.create({
    data: {
      id: 'ticket-102',
      ticketKey: 'ARV-102',
      subject: 'Payment gateway returning intermittent 500 errors after deploy',
      description: 'After Friday evening deploy v3.4.2, Razorpay integration throwing 500 errors for ~30% of transactions. Rollback attempted but config cache not clearing.',
      priority: 'CRITICAL',
      status: 'OPEN',
      customerId: 'cust-global',
      assigneeId: null,
      slaFirstResponseTarget: 120,
      slaResolutionTarget: 540,
      slaFirstResponseElapsed: 0,
      slaResolutionElapsed: 0,
      slaFirstResponseMet: false,
      slaFirstResponseBreached: false,
      slaResolutionMet: false,
      slaResolutionBreached: false,
      isPaused: false,
      totalPausedMinutes: 0,
      slaLastTickAt: new Date('2026-11-20T18:00:00+05:30'),
      createdAt: new Date('2026-11-20T18:00:00+05:30'),  // Friday 6 PM
      version: 1,
    },
  });

  // ARV-103: Medium · Waiting on Customer (paused 2 days)
  const t103 = await prisma.ticket.create({
    data: {
      id: 'ticket-103',
      ticketKey: 'ARV-103',
      subject: 'SSO integration failing for LDAP users with special characters',
      description: 'Users with apostrophes or hyphens in their usernames cannot authenticate through SSO. Affects approximately 15 users in the LDAP directory.',
      priority: 'MEDIUM',
      status: 'WAITING_ON_CUSTOMER',
      customerId: 'cust-nova',
      assigneeId: 'agent-priya',
      slaFirstResponseTarget: 270,
      slaResolutionTarget: 1620,
      slaFirstResponseElapsed: 180,
      slaResolutionElapsed: 360,
      slaFirstResponseMet: true,
      slaFirstResponseMetAt: new Date('2026-11-18T13:00:00+05:30'),
      slaFirstResponseBreached: false,
      slaResolutionMet: false,
      slaResolutionBreached: false,
      isPaused: true,
      pausedAt: new Date('2026-11-19T11:00:00+05:30'),
      totalPausedMinutes: 0,
      waitingOnCustomerSince: new Date('2026-11-19T11:00:00+05:30'),
      slaLastTickAt: new Date('2026-11-19T11:00:00+05:30'),
      createdAt: new Date('2026-11-18T10:00:00+05:30'),
      firstResponseAt: new Date('2026-11-18T13:00:00+05:30'),
      version: 4,
    },
  });

  // ARV-104: Critical · Unassigned (ready for claim/conflict testing)
  const t104 = await prisma.ticket.create({
    data: {
      id: 'ticket-104',
      ticketKey: 'ARV-104',
      subject: 'Email notification service crashed — customers not receiving alerts',
      description: 'The email notification microservice has been down since 10 AM. No transactional emails (password resets, order confirmations, invoice receipts) are being delivered.',
      priority: 'CRITICAL',
      status: 'OPEN',
      customerId: 'cust-zenith',
      assigneeId: null,
      slaFirstResponseTarget: 120,
      slaResolutionTarget: 540,
      slaFirstResponseElapsed: 60,
      slaResolutionElapsed: 60,
      slaFirstResponseMet: false,
      slaFirstResponseBreached: false,
      slaResolutionMet: false,
      slaResolutionBreached: false,
      isPaused: false,
      totalPausedMinutes: 0,
      slaLastTickAt: new Date('2026-11-21T10:30:00+05:30'),
      createdAt: new Date('2026-11-21T09:30:00+05:30'),
      version: 1,
    },
  });

  // ARV-105: Medium · Contains sensitive internal notes (INC-0304 proof)
  const t105 = await prisma.ticket.create({
    data: {
      id: 'ticket-105',
      ticketKey: 'ARV-105',
      subject: 'Request for custom API rate limit increase',
      description: 'We need our API rate limit increased from 100 req/min to 500 req/min for our data import pipeline. Current limit is causing failures during peak hours.',
      priority: 'MEDIUM',
      status: 'ASSIGNED',
      customerId: 'cust-acme',
      assigneeId: 'agent-meera',
      slaFirstResponseTarget: 270,
      slaResolutionTarget: 1620,
      slaFirstResponseElapsed: 120,
      slaResolutionElapsed: 540,
      slaFirstResponseMet: true,
      slaFirstResponseMetAt: new Date('2026-11-19T12:00:00+05:30'),
      slaFirstResponseBreached: false,
      slaResolutionMet: false,
      slaResolutionBreached: false,
      isPaused: false,
      totalPausedMinutes: 0,
      slaLastTickAt: new Date('2026-11-21T09:30:00+05:30'),
      createdAt: new Date('2026-11-19T10:00:00+05:30'),
      firstResponseAt: new Date('2026-11-19T12:00:00+05:30'),
      version: 3,
    },
  });

  // ARV-106: Critical · Escalated mid-flight (Medium → Critical, SLA recalc proof)
  const t106 = await prisma.ticket.create({
    data: {
      id: 'ticket-106',
      ticketKey: 'ARV-106',
      subject: 'Data export job producing corrupted CSV files',
      description: 'Weekly data export scheduled job producing CSV files with malformed UTF-8 encoding. Finance team unable to import into their reporting tools. Originally reported as medium but customer escalated.',
      priority: 'CRITICAL',
      status: 'ASSIGNED',
      customerId: 'cust-global',
      assigneeId: 'agent-rahul',
      slaFirstResponseTarget: 120,  // Was 270, recalculated on escalation
      slaResolutionTarget: 540,     // Was 1620, recalculated on escalation
      slaFirstResponseElapsed: 90,
      slaResolutionElapsed: 300,
      slaFirstResponseMet: true,
      slaFirstResponseMetAt: new Date('2026-11-20T11:30:00+05:30'),
      slaFirstResponseBreached: false,
      slaResolutionMet: false,
      slaResolutionBreached: false,
      isPaused: false,
      totalPausedMinutes: 0,
      slaLastTickAt: new Date('2026-11-21T09:30:00+05:30'),
      createdAt: new Date('2026-11-20T10:00:00+05:30'),
      firstResponseAt: new Date('2026-11-20T11:30:00+05:30'),
      version: 5,
    },
  });

  // ARV-107: Resolved 2 working days ago (reopen window active)
  const t107 = await prisma.ticket.create({
    data: {
      id: 'ticket-107',
      ticketKey: 'ARV-107',
      subject: 'Dashboard widget not loading for Chrome 120+ users',
      description: 'Analytics dashboard widget shows blank white space for users on Chrome 120 and above. Works fine on Firefox and Safari. Traced to deprecated API usage.',
      priority: 'LOW',
      status: 'RESOLVED',
      customerId: 'cust-nova',
      assigneeId: 'agent-priya',
      slaFirstResponseTarget: 540,
      slaResolutionTarget: 2700,
      slaFirstResponseElapsed: 300,
      slaResolutionElapsed: 1800,
      slaFirstResponseMet: true,
      slaFirstResponseMetAt: new Date('2026-11-14T15:00:00+05:30'),
      slaFirstResponseBreached: false,
      slaResolutionMet: true,
      slaResolutionMetAt: new Date('2026-11-19T14:00:00+05:30'),
      slaResolutionBreached: false,
      isPaused: false,
      totalPausedMinutes: 120,
      slaLastTickAt: new Date('2026-11-19T14:00:00+05:30'),
      createdAt: new Date('2026-11-14T10:00:00+05:30'),
      firstResponseAt: new Date('2026-11-14T15:00:00+05:30'),
      resolvedAt: new Date('2026-11-19T14:00:00+05:30'),
      version: 8,
    },
  });

  // ARV-108: Resolved 7+ working days ago (reopen window expired)
  const t108 = await prisma.ticket.create({
    data: {
      id: 'ticket-108',
      ticketKey: 'ARV-108',
      subject: 'Mobile app crash on iOS 18 during file upload',
      description: 'iOS 18 users experiencing app crashes when uploading files larger than 5MB through the mobile app. Stack trace points to memory allocation in the image compression module.',
      priority: 'MEDIUM',
      status: 'RESOLVED',
      customerId: 'cust-zenith',
      assigneeId: 'agent-meera',
      slaFirstResponseTarget: 270,
      slaResolutionTarget: 1620,
      slaFirstResponseElapsed: 200,
      slaResolutionElapsed: 1200,
      slaFirstResponseMet: true,
      slaFirstResponseMetAt: new Date('2026-11-04T13:00:00+05:30'),
      slaFirstResponseBreached: false,
      slaResolutionMet: true,
      slaResolutionMetAt: new Date('2026-11-07T16:00:00+05:30'),
      slaResolutionBreached: false,
      isPaused: false,
      totalPausedMinutes: 60,
      slaLastTickAt: new Date('2026-11-07T16:00:00+05:30'),
      createdAt: new Date('2026-11-04T10:00:00+05:30'),
      firstResponseAt: new Date('2026-11-04T13:00:00+05:30'),
      resolvedAt: new Date('2026-11-07T16:00:00+05:30'),
      version: 6,
    },
  });

  // ── Ticket Messages ────────────────────────────────────────

  // ARV-101 messages
  await prisma.ticketMessage.createMany({
    data: [
      {
        ticketId: 'ticket-101',
        type: 'CUSTOMER',
        content: 'All our production services are down. Database connections are maxed out on all replicas. This is affecting 2000+ users. Need immediate assistance.',
        customerId: 'cust-acme',
        senderName: 'Vikram Patel',
        createdAt: new Date('2026-11-20T10:00:00+05:30'),
      },
      {
        ticketId: 'ticket-101',
        type: 'SYSTEM',
        content: 'Ticket claimed by Rahul Sharma',
        senderName: 'System',
        createdAt: new Date('2026-11-20T10:05:00+05:30'),
      },
      {
        ticketId: 'ticket-101',
        type: 'AGENT_PUBLIC',
        content: 'Hi Vikram, I\'m looking into this right now. Can you confirm which database cluster this is — the primary Mumbai region or the DR site in Hyderabad? Also, have there been any recent deployments or config changes in the last 24 hours?',
        agentId: 'agent-rahul',
        senderName: 'Rahul Sharma',
        createdAt: new Date('2026-11-20T12:30:00+05:30'),
      },
      {
        ticketId: 'ticket-101',
        type: 'CUSTOMER',
        content: 'It\'s the primary Mumbai cluster. We deployed v3.8.1 yesterday evening but it passed all staging tests. The connection pool was fine until about 9:45 AM today.',
        customerId: 'cust-acme',
        senderName: 'Vikram Patel',
        createdAt: new Date('2026-11-20T13:00:00+05:30'),
      },
      {
        ticketId: 'ticket-101',
        type: 'AGENT_PUBLIC',
        content: 'Thanks Vikram. I can see the connection leak in the v3.8.1 connection pooling config. The max_idle_connections was set to unlimited instead of 50. I\'m applying the fix now and will restart the services in a rolling fashion to avoid further downtime.',
        agentId: 'agent-rahul',
        senderName: 'Rahul Sharma',
        createdAt: new Date('2026-11-20T14:30:00+05:30'),
      },
    ],
  });

  // ARV-103 messages
  await prisma.ticketMessage.createMany({
    data: [
      {
        ticketId: 'ticket-103',
        type: 'CUSTOMER',
        content: 'Several of our LDAP users with special characters in their names (like O\'Brien and Singh-Patel) are unable to authenticate through SSO. Getting 400 Bad Request errors.',
        customerId: 'cust-nova',
        senderName: 'Suresh Kumar',
        createdAt: new Date('2026-11-18T10:00:00+05:30'),
      },
      {
        ticketId: 'ticket-103',
        type: 'SYSTEM',
        content: 'Ticket claimed by Priya Nair',
        senderName: 'System',
        createdAt: new Date('2026-11-18T10:15:00+05:30'),
      },
      {
        ticketId: 'ticket-103',
        type: 'AGENT_PUBLIC',
        content: 'Hi Suresh, thanks for reporting this. I can reproduce the issue. It looks like the SAML assertion parser isn\'t properly escaping special characters. Could you send me the full list of affected usernames so I can test all edge cases?',
        agentId: 'agent-priya',
        senderName: 'Priya Nair',
        createdAt: new Date('2026-11-18T13:00:00+05:30'),
      },
      {
        ticketId: 'ticket-103',
        type: 'SYSTEM',
        content: 'Status changed to Waiting on Customer — SLA clock paused',
        senderName: 'System',
        createdAt: new Date('2026-11-19T11:00:00+05:30'),
      },
    ],
  });

  // ARV-105 messages
  await prisma.ticketMessage.createMany({
    data: [
      {
        ticketId: 'ticket-105',
        type: 'CUSTOMER',
        content: 'We need our API rate limit increased from 100 req/min to 500 req/min. Our data import pipeline is failing during peak hours because we hit the rate limit consistently between 2-4 PM.',
        customerId: 'cust-acme',
        senderName: 'Vikram Patel',
        createdAt: new Date('2026-11-19T10:00:00+05:30'),
      },
      {
        ticketId: 'ticket-105',
        type: 'SYSTEM',
        content: 'Ticket claimed by Meera Krishnan',
        senderName: 'System',
        createdAt: new Date('2026-11-19T10:30:00+05:30'),
      },
      {
        ticketId: 'ticket-105',
        type: 'AGENT_PUBLIC',
        content: 'Hi Vikram, I\'ve reviewed your current usage patterns and the 500 req/min request. Let me discuss this with our infrastructure team to ensure we can accommodate this without impacting other tenants. I\'ll get back to you within a day.',
        agentId: 'agent-meera',
        senderName: 'Meera Krishnan',
        createdAt: new Date('2026-11-19T12:00:00+05:30'),
      },
    ],
  });

  // ARV-106 messages
  await prisma.ticketMessage.createMany({
    data: [
      {
        ticketId: 'ticket-106',
        type: 'CUSTOMER',
        content: 'Our weekly data export is producing corrupted CSV files. The UTF-8 encoding is broken — special characters in customer names are showing as garbled text. Finance team can\'t import these into their reporting tools.',
        customerId: 'cust-global',
        senderName: 'Anita Desai',
        createdAt: new Date('2026-11-20T10:00:00+05:30'),
      },
      {
        ticketId: 'ticket-106',
        type: 'SYSTEM',
        content: 'Ticket claimed by Rahul Sharma',
        senderName: 'System',
        createdAt: new Date('2026-11-20T10:15:00+05:30'),
      },
      {
        ticketId: 'ticket-106',
        type: 'AGENT_PUBLIC',
        content: 'Hi Anita, I\'ve reproduced the issue. The export job is using Latin-1 encoding instead of UTF-8. I\'m working on the fix now. Can you confirm the exact characters that are affected?',
        agentId: 'agent-rahul',
        senderName: 'Rahul Sharma',
        createdAt: new Date('2026-11-20T11:30:00+05:30'),
      },
      {
        ticketId: 'ticket-106',
        type: 'SYSTEM',
        content: 'Priority changed from Medium to Critical — SLA targets recalculated',
        senderName: 'System',
        createdAt: new Date('2026-11-20T15:00:00+05:30'),
      },
    ],
  });

  // ARV-107 messages
  await prisma.ticketMessage.createMany({
    data: [
      {
        ticketId: 'ticket-107',
        type: 'CUSTOMER',
        content: 'The analytics dashboard widget is showing a blank white space for all our Chrome 120+ users. Works fine on Firefox. Can you investigate?',
        customerId: 'cust-nova',
        senderName: 'Suresh Kumar',
        createdAt: new Date('2026-11-14T10:00:00+05:30'),
      },
      {
        ticketId: 'ticket-107',
        type: 'AGENT_PUBLIC',
        content: 'Hi Suresh, we\'ve identified the issue — it\'s a deprecated API that Chrome 120 no longer supports. The fix has been deployed. Please clear your browser cache and confirm it\'s working.',
        agentId: 'agent-priya',
        senderName: 'Priya Nair',
        createdAt: new Date('2026-11-19T14:00:00+05:30'),
      },
      {
        ticketId: 'ticket-107',
        type: 'SYSTEM',
        content: 'Ticket resolved by Priya Nair',
        senderName: 'System',
        createdAt: new Date('2026-11-19T14:00:00+05:30'),
      },
    ],
  });

  // ARV-108 messages
  await prisma.ticketMessage.createMany({
    data: [
      {
        ticketId: 'ticket-108',
        type: 'CUSTOMER',
        content: 'Our iOS 18 users are experiencing crashes when uploading files larger than 5MB through the mobile app.',
        customerId: 'cust-zenith',
        senderName: 'Kavitha Rajan',
        createdAt: new Date('2026-11-04T10:00:00+05:30'),
      },
      {
        ticketId: 'ticket-108',
        type: 'AGENT_PUBLIC',
        content: 'Hi Kavitha, we\'ve fixed the memory allocation issue in the image compression module. Version 2.5.1 of the iOS app is now available on TestFlight. Please have your users update and confirm the fix.',
        agentId: 'agent-meera',
        senderName: 'Meera Krishnan',
        createdAt: new Date('2026-11-07T16:00:00+05:30'),
      },
      {
        ticketId: 'ticket-108',
        type: 'SYSTEM',
        content: 'Ticket resolved by Meera Krishnan',
        senderName: 'System',
        createdAt: new Date('2026-11-07T16:00:00+05:30'),
      },
    ],
  });

  // ── Internal Notes (INC-0304 proof) ────────────────────────
  // These should NEVER appear in customer-facing views

  await prisma.internalNote.createMany({
    data: [
      {
        ticketId: 'ticket-105',
        content: 'Handle carefully — Acme Corp escalated to VP last quarter over billing dispute. Confirm with Meera before approving any rate limit increase above 300 req/min. They are on a legacy pricing tier that doesn\'t include premium API access.',
        authorId: 'agent-rahul',
        authorName: 'Rahul Sharma',
        createdAt: new Date('2026-11-19T11:00:00+05:30'),
      },
      {
        ticketId: 'ticket-105',
        content: 'Discussed with infra team. We can do 300 req/min without additional cost. Anything above requires them to upgrade to Business tier. Let\'s offer 300 and see if that resolves their peak-hour issues before bringing up the upgrade conversation.',
        authorId: 'agent-meera',
        authorName: 'Meera Krishnan',
        createdAt: new Date('2026-11-19T14:00:00+05:30'),
      },
      {
        ticketId: 'ticket-101',
        content: 'This is the third connection pool issue from Acme this quarter. We should consider setting up proactive monitoring alerts for their cluster. Flag for quarterly review.',
        authorId: 'agent-rahul',
        authorName: 'Rahul Sharma',
        createdAt: new Date('2026-11-20T13:30:00+05:30'),
      },
      {
        ticketId: 'ticket-106',
        content: 'Anita might push back on timeline — she was unhappy about the last release delay. Prioritize this fix and keep response times short.',
        authorId: 'agent-rahul',
        authorName: 'Rahul Sharma',
        createdAt: new Date('2026-11-20T11:00:00+05:30'),
      },
    ],
  });

  // ── Audit Log Entries ──────────────────────────────────────
  // Sample entries for ARV-106 (escalation proof)
  await prisma.auditLog.createMany({
    data: [
      {
        ticketId: 'ticket-106',
        ticketKey: 'ARV-106',
        action: 'TICKET_CREATED',
        actorId: 'cust-global',
        actorName: 'Anita Desai',
        actorType: 'customer',
        metadata: { priority: 'MEDIUM', subject: 'Data export job producing corrupted CSV files' },
        createdAt: new Date('2026-11-20T10:00:00+05:30'),
      },
      {
        ticketId: 'ticket-106',
        ticketKey: 'ARV-106',
        action: 'TICKET_CLAIMED',
        actorId: 'agent-rahul',
        actorName: 'Rahul Sharma',
        actorType: 'agent',
        metadata: {},
        createdAt: new Date('2026-11-20T10:15:00+05:30'),
      },
      {
        ticketId: 'ticket-106',
        ticketKey: 'ARV-106',
        action: 'FIRST_RESPONSE_SENT',
        actorId: 'agent-rahul',
        actorName: 'Rahul Sharma',
        actorType: 'agent',
        metadata: { responseTimeMinutes: 90, slaTarget: 270, withinSLA: true },
        createdAt: new Date('2026-11-20T11:30:00+05:30'),
      },
      {
        ticketId: 'ticket-106',
        ticketKey: 'ARV-106',
        action: 'PRIORITY_CHANGED',
        actorId: 'agent-rahul',
        actorName: 'Rahul Sharma',
        actorType: 'agent',
        metadata: {
          before: { priority: 'MEDIUM', firstResponseTarget: 270, resolutionTarget: 1620 },
          after: { priority: 'CRITICAL', firstResponseTarget: 120, resolutionTarget: 540 },
          elapsedAtChange: { firstResponse: 90, resolution: 300 },
          reason: 'Customer escalation — finance team blocked',
        },
        createdAt: new Date('2026-11-20T15:00:00+05:30'),
      },
      {
        ticketId: 'ticket-106',
        ticketKey: 'ARV-106',
        action: 'SLA_RECALCULATED',
        actorId: 'agent-rahul',
        actorName: 'Rahul Sharma',
        actorType: 'agent',
        metadata: {
          reason: 'Priority escalated from MEDIUM to CRITICAL',
          newTargets: { firstResponse: 120, resolution: 540 },
          elapsedPreserved: { firstResponse: 90, resolution: 300 },
          remainingAfterRecalc: { firstResponse: 30, resolution: 240 },
        },
        createdAt: new Date('2026-11-20T15:00:00+05:30'),
      },
    ],
  });

  // Audit entries for other tickets
  await prisma.auditLog.createMany({
    data: [
      {
        ticketId: 'ticket-101',
        ticketKey: 'ARV-101',
        action: 'TICKET_CREATED',
        actorId: 'cust-acme',
        actorName: 'Vikram Patel',
        actorType: 'customer',
        metadata: { priority: 'CRITICAL' },
        createdAt: new Date('2026-11-20T10:00:00+05:30'),
      },
      {
        ticketId: 'ticket-101',
        ticketKey: 'ARV-101',
        action: 'TICKET_CLAIMED',
        actorId: 'agent-rahul',
        actorName: 'Rahul Sharma',
        actorType: 'agent',
        metadata: {},
        createdAt: new Date('2026-11-20T10:05:00+05:30'),
      },
      {
        ticketId: 'ticket-101',
        ticketKey: 'ARV-101',
        action: 'FIRST_RESPONSE_SENT',
        actorId: 'agent-rahul',
        actorName: 'Rahul Sharma',
        actorType: 'agent',
        metadata: { responseTimeMinutes: 150, slaTarget: 120, withinSLA: false, breached: true },
        createdAt: new Date('2026-11-20T12:30:00+05:30'),
      },
      {
        ticketId: 'ticket-103',
        ticketKey: 'ARV-103',
        action: 'TICKET_CREATED',
        actorId: 'cust-nova',
        actorName: 'Suresh Kumar',
        actorType: 'customer',
        metadata: { priority: 'MEDIUM' },
        createdAt: new Date('2026-11-18T10:00:00+05:30'),
      },
      {
        ticketId: 'ticket-103',
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

  // Enforce DB-level immutability of audit trail (INC-0318)
  await installAuditImmutabilityTrigger(prisma);

  console.log('✅ Seed complete!');
  console.log('   Agents: Meera (lead), Rahul, Priya');
  console.log('   Customers: Vikram/Acme, Anita/GlobalTech, Suresh/Nova, Kavitha/Zenith');
  console.log('   Tickets: ARV-101 through ARV-108');
  console.log('   Holidays: 21 Indian festival holidays for 2026');
  console.log('   Internal Notes: 4 (on ARV-101, ARV-105, ARV-106)');
}

if (process.argv[1]?.includes('seed.ts')) {
  seed(prisma)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
