import express, { Request, Response } from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { errorHandler, requestLogger } from './middleware/errorHandler';
import ticketsRouter from './routes/tickets';
import notesRouter from './routes/notes';
import auditRouter from './routes/audit';
import customerRouter from './routes/customer';
import dashboardRouter from './routes/dashboard';
import systemRouter from './routes/system';
import agentsRouter from './routes/agents';
import { runAutoClose } from './services/autoclose';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ success: true, data: { status: 'ok', uptime: process.uptime() }, status: 'ok', uptime: process.uptime() });
});

// Mount Routes
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
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Arvo Frontdesk Backend running on http://localhost:${PORT}`);
  });
}

export default app;
