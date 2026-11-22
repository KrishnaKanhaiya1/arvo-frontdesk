import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import cron from 'node-cron';
import { errorHandler, requestLogger } from './middleware/errorHandler';
import { authenticate } from './middleware/auth';
import authRouter from './routes/auth';
import ticketsRouter from './routes/tickets';
import notesRouter from './routes/notes';
import auditRouter from './routes/audit';
import customerRouter from './routes/customer';
import dashboardRouter from './routes/dashboard';
import systemRouter from './routes/system';
import agentsRouter from './routes/agents';
import { runAutoClose } from './services/autoclose';
import prisma from './utils/prisma';
import { resetToCanonicalSeed } from './services/seedService';

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

// Middlewares
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.endsWith('.vercel.app') ||
        (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) ||
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for untrusted origin: ${origin}`));
    },
    credentials: true,
  })
);

// Mutation Origin Validation (CSRF Protection for cookie-authenticated state modifications)
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.headers.origin;
    if (origin) {
      const isAllowed =
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.endsWith('.vercel.app') ||
        (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) ||
        allowedOrigins.includes(origin);
      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cross-site mutation origin rejected (CSRF protection).' }
        });
      }
    }
  }
  next();
});
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);
app.use(authenticate);

// Health check endpoint
app.get('/api/health', async (_req: Request, res: Response) => {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (e: any) {
    dbStatus = `error: ${e.message}`;
  }

  res.json({
    success: true,
    data: {
      status: 'ok',
      database: dbStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    },
    status: 'ok',
    database: dbStatus,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/tickets/:key/notes', notesRouter);
app.use('/api/tickets/:key/audit', auditRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/customer', customerRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/system', systemRouter);
app.use('/api', agentsRouter);

// Global Error Handler
app.use(errorHandler);

// Background Cron: Auto-close sweep every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    const result = await runAutoClose();
    if (result.closedCount > 0) {
      console.log(`[Auto-Close Cron] Auto-closed ${result.closedCount} ticket(s): ${result.closedTickets.join(', ')}`);
    }
  } catch (err) {
    console.error('[Auto-Close Cron] Error running auto-close sweep:', err);
  }
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Arvo Frontdesk Backend running on http://localhost:${PORT}`);
    try {
      const agentCount = await prisma.agent.count().catch(() => 0);
      if (agentCount === 0) {
        console.log('🌱 Empty database detected on startup. Auto-seeding canonical data...');
        await resetToCanonicalSeed(prisma);
        console.log('✅ Canonical database seeded successfully.');
      }
    } catch (err) {
      console.warn('Startup database bootstrap check warning:', err);
    }
  });
}

export default app;
