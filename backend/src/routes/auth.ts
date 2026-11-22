import { Router, Request, Response, NextFunction, CookieOptions } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { ERROR_CODES } from '../types/contracts';
import { signCookie, verifySignedCookie, checkLoginRateLimit, DEMO_PASSWORD, hashPassword, verifyPassword } from '../utils/security';

const router = Router();

export const COOKIE_NAME = 'arvo_session';

const getCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
});

export interface SessionPayload {
  userId: string;
  role: 'lead' | 'agent' | 'customer';
  name: string;
  email: string;
  avatarColor: string;
  avatarInitials: string;
  company?: string;
}

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const DemoLoginSchema = z.object({
  personaId: z.string().min(1),
});

/**
 * GET /api/auth/demo-personas
 * Returns publicly available evaluator quick-access demo accounts.
 */
router.get('/demo-personas', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [agents, customers] = await Promise.all([
      prisma.agent.findMany({ orderBy: { name: 'asc' } }),
      prisma.customer.findMany({ orderBy: { name: 'asc' } }),
    ]);

    const demoProfiles = [
      ...agents.map((a) => ({
        id: a.id,
        role: a.role as 'lead' | 'agent',
        name: a.name,
        email: a.email,
        company: 'Arvo Systems Core Support',
        avatarColor: a.avatarColor,
        avatarInitials: a.avatarInitials,
      })),
      ...customers.map((c) => ({
        id: c.id,
        role: 'customer' as const,
        name: c.name,
        email: c.email,
        company: c.company,
        avatarColor: c.avatarColor,
        avatarInitials: c.avatarInitials,
      })),
    ];

    res.json({
      success: true,
      demoPassword: DEMO_PASSWORD,
      data: demoProfiles,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Real credentials authentication for Agents & Customers
 * Protected with sliding-window IP rate limiting (10 req/min).
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Rate limiting check
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const rateCheck = checkLoginRateLimit(clientIp);
    if (!rateCheck.allowed) {
      res.setHeader('Retry-After', String(rateCheck.retryAfterSec || 60));
      throw new AppError(
        429,
        ERROR_CODES.RATE_LIMITED || 'TOO_MANY_REQUESTS',
        `Too many login attempts. Please wait ${rateCheck.retryAfterSec || 60} seconds before retrying.`
      );
    }

    const { email, password } = LoginSchema.parse(req.body);
    const cleanEmail = email.trim().toLowerCase();

    // 2. Search Agent
    const agent = await prisma.agent.findUnique({ where: { email: cleanEmail } });
    if (agent) {
      const isDemoPass = password === DEMO_PASSWORD;
      const isCustomPass = agent.passwordHash ? verifyPassword(password, agent.passwordHash) : false;
      if (!isDemoPass && !isCustomPass) {
        throw new AppError(401, ERROR_CODES.UNAUTHORIZED, 'Invalid email or password.');
      }

      const user: SessionPayload = {
        userId: agent.id,
        role: agent.role as 'lead' | 'agent',
        name: agent.name,
        email: agent.email,
        avatarColor: agent.avatarColor,
        avatarInitials: agent.avatarInitials,
        company: 'Arvo Support Operations',
      };

      const serialized = JSON.stringify(user);
      const signed = signCookie(serialized);

      res.cookie(COOKIE_NAME, signed, getCookieOptions());

      return res.json({
        success: true,
        user,
        timestamp: new Date().toISOString(),
      });
    }

    // 3. Search Customer
    const customer = await prisma.customer.findUnique({ where: { email: cleanEmail } });
    if (customer) {
      const isDemoPass = password === DEMO_PASSWORD;
      const isCustomPass = customer.passwordHash ? verifyPassword(password, customer.passwordHash) : false;
      if (!isDemoPass && !isCustomPass) {
        throw new AppError(401, ERROR_CODES.UNAUTHORIZED, 'Invalid email or password.');
      }

      const user: SessionPayload = {
        userId: customer.id,
        role: 'customer',
        name: customer.name,
        email: customer.email,
        avatarColor: customer.avatarColor,
        avatarInitials: customer.avatarInitials,
        company: customer.company,
      };

      const serialized = JSON.stringify(user);
      const signed = signCookie(serialized);

      res.cookie(COOKIE_NAME, signed, getCookieOptions());

      return res.json({
        success: true,
        user,
        timestamp: new Date().toISOString(),
      });
    }

    // Generic error to prevent account enumeration
    throw new AppError(401, ERROR_CODES.UNAUTHORIZED, 'Invalid email or password.');
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'Please enter a valid email address and password.', { issues: err.issues }));
    } else {
      next(err);
    }
  }
});

/**
 * POST /api/auth/demo-login
 * Issues an HTTP-only, SameSite session cookie for pre-provisioned demo personas.
 */
router.post('/demo-login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const rateCheck = checkLoginRateLimit(clientIp);
    if (!rateCheck.allowed) {
      res.setHeader('Retry-After', String(rateCheck.retryAfterSec || 60));
      throw new AppError(
        429,
        ERROR_CODES.RATE_LIMITED || 'TOO_MANY_REQUESTS',
        `Rate limit exceeded. Please wait ${rateCheck.retryAfterSec || 60} seconds.`
      );
    }

    const { personaId } = DemoLoginSchema.parse(req.body);

    // 1. Check if agent
    const agent = await prisma.agent.findUnique({ where: { id: personaId } });
    if (agent) {
      const user: SessionPayload = {
        userId: agent.id,
        role: agent.role as 'lead' | 'agent',
        name: agent.name,
        email: agent.email,
        avatarColor: agent.avatarColor,
        avatarInitials: agent.avatarInitials,
        company: 'Arvo Support Operations',
      };

      const serialized = JSON.stringify(user);
      const signed = signCookie(serialized);

      res.cookie(COOKIE_NAME, signed, getCookieOptions());

      return res.json({
        success: true,
        user,
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Check if customer
    const customer = await prisma.customer.findUnique({ where: { id: personaId } });
    if (customer) {
      const user: SessionPayload = {
        userId: customer.id,
        role: 'customer',
        name: customer.name,
        email: customer.email,
        avatarColor: customer.avatarColor,
        avatarInitials: customer.avatarInitials,
        company: customer.company,
      };

      const serialized = JSON.stringify(user);
      const signed = signCookie(serialized);

      res.cookie(COOKIE_NAME, signed, getCookieOptions());

      return res.json({
        success: true,
        user,
        timestamp: new Date().toISOString(),
      });
    }

    throw new AppError(404, ERROR_CODES.NOT_FOUND, `Demo persona '${personaId}' not found.`);
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'Validation failed', { issues: err.issues }));
    } else {
      next(err);
    }
  }
});

/**
 * POST /api/auth/register
 * Self-service registration for new Customer Portal accounts.
 * Note: Support Agent accounts are strictly provisioned by internal IT directory.
 */
const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid work email'),
  company: z.string().min(2, 'Company / Organization name is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, company, password } = RegisterSchema.parse(req.body);
    const cleanEmail = email.trim().toLowerCase();

    // Check if customer or agent with that email already exists
    const [existingCustomer, existingAgent] = await Promise.all([
      prisma.customer.findUnique({ where: { email: cleanEmail } }),
      prisma.agent.findUnique({ where: { email: cleanEmail } }),
    ]);

    if (existingCustomer || existingAgent) {
      throw new AppError(409, ERROR_CODES.CONFLICT || 'CONFLICT', 'An account with this email address already exists.');
    }

    // Generate avatar initials and color
    const parts = name.trim().split(/\s+/);
    const avatarInitials = parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();

    const colors = ['#059669', '#2563EB', '#7C3AED', '#D97706', '#0891B2', '#DC2626'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        company: company.trim(),
        passwordHash: hashPassword(password),
        avatarColor,
        avatarInitials,
      },
    });

    const user: SessionPayload = {
      userId: customer.id,
      role: 'customer',
      name: customer.name,
      email: customer.email,
      avatarColor: customer.avatarColor,
      avatarInitials: customer.avatarInitials,
      company: customer.company,
    };

    const serialized = JSON.stringify(user);
    const signed = signCookie(serialized);

    res.cookie(COOKIE_NAME, signed, getCookieOptions());

    res.status(201).json({
      success: true,
      user,
      message: 'Customer account created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'Validation failed', { issues: err.issues }));
    } else {
      next(err);
    }
  }
});

/**
 * GET /api/auth/session
 * Returns the active session payload from the HTTP-only cookie, verified against database.
 * Automatically refreshes cookie expiration.
 */
router.get('/session', async (req: Request, res: Response) => {
  const cookieVal = req.cookies?.[COOKIE_NAME];
  if (!cookieVal) {
    return res.json({ authenticated: false, user: null });
  }

  try {
    const rawPayload = typeof cookieVal === 'string' ? verifySignedCookie(cookieVal) : null;
    if (!rawPayload) {
      res.clearCookie(COOKIE_NAME, { path: '/' });
      return res.json({ authenticated: false, user: null });
    }
    const user: SessionPayload = JSON.parse(rawPayload);
    if (user.role === 'customer') {
      const cust = await prisma.customer.findUnique({ where: { id: user.userId } });
      if (!cust) {
        res.clearCookie(COOKIE_NAME, { path: '/' });
        return res.json({ authenticated: false, user: null });
      }
      user.name = cust.name;
      user.company = cust.company;
    } else {
      const ag = await prisma.agent.findUnique({ where: { id: user.userId } });
      if (!ag) {
        res.clearCookie(COOKIE_NAME, { path: '/' });
        return res.json({ authenticated: false, user: null });
      }
      user.name = ag.name;
      user.role = ag.role as 'lead' | 'agent';
    }

    // Refresh valid session cookie with updated maxAge
    res.cookie(COOKIE_NAME, cookieVal, getCookieOptions());

    return res.json({
      authenticated: true,
      user,
    });
  } catch {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return res.json({ authenticated: false, user: null });
  }
});

/**
 * POST /api/auth/logout
 * Clears the session cookie.
 */
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
