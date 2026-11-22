import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { ERROR_CODES } from '../types/contracts';
import prisma from '../utils/prisma';
import { COOKIE_NAME, SessionPayload } from '../routes/auth';
import { verifySignedCookie } from '../utils/security';

export interface AuthContext {
  actorId: string;
  actorRole: 'agent' | 'customer' | 'system' | 'lead';
  actorName: string;
  customerId?: string;
  customerOrg?: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

/**
 * Extracts and verifies actor credentials:
 * 1. Primary & Production: Server-issued cryptographically HMAC-signed session cookie 'arvo_session'
 * 2. Automated test environment ONLY (NODE_ENV === 'test'): x-actor-role and x-actor-id for fast test runner isolation.
 * Header fallback is strictly denied in development and production environments.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  let actorId: string | undefined;
  let actorRole: 'agent' | 'lead' | 'customer' | 'system' | undefined;
  let actorName = 'Anonymous';
  let customerId: string | undefined;
  let customerOrg: string | undefined;

  // 1. Primary & Sole Authentication: Verify signed session cookie
  const cookieVal = req.cookies?.[COOKIE_NAME];
  if (cookieVal && typeof cookieVal === 'string') {
    const rawPayload = verifySignedCookie(cookieVal);
    if (rawPayload) {
      try {
        const session: SessionPayload = JSON.parse(rawPayload);
        actorId = session.userId;
        actorRole = session.role;
        actorName = session.name;
        if (session.role === 'customer') {
          customerId = session.userId;
          customerOrg = session.company;
        }
      } catch {
        // Invalid session payload JSON
      }
    }
  }

  // 3. Revalidate actor identity against database to guarantee freshness & avoid stale state
  if (actorRole && actorId) {
    if (actorRole === 'agent' || actorRole === 'lead') {
      const agent = await prisma.agent.findUnique({ where: { id: actorId } });
      if (agent) {
        actorName = agent.name;
        actorRole = agent.role as 'lead' | 'agent';
      } else {
        actorId = undefined;
        actorRole = undefined;
      }
    } else if (actorRole === 'customer') {
      const customer = await prisma.customer.findUnique({ where: { id: actorId } });
      if (customer) {
        actorName = customer.name;
        customerId = customer.id;
        customerOrg = customer.company;
      } else {
        actorId = undefined;
        actorRole = undefined;
        customerId = undefined;
      }
    }
  }

  if (actorId && actorRole) {
    req.auth = {
      actorId,
      actorRole,
      actorName,
      customerId,
      customerOrg,
    };
  }

  next();
}

/**
 * Strict role guard: Requires active agent or lead credentials.
 * Customers and unauthenticated callers are rejected with 401/403.
 */
export function requireAgentRole(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth) {
    throw new AppError(401, ERROR_CODES.UNAUTHORIZED, 'Authentication required: Please sign in as an Arvo support agent.');
  }

  const role = req.auth.actorRole;
  if (role !== 'agent' && role !== 'lead') {
    throw new AppError(
      403,
      ERROR_CODES.FORBIDDEN,
      'Access denied: This endpoint is restricted to Arvo support agents only. Internal notes and team actions are not accessible to customers.'
    );
  }
  next();
}

/**
 * Strict role guard: Requires lead permissions ONLY.
 * Ordinary agents and customers receive 403 Forbidden.
 */
export function requireLeadRole(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth) {
    throw new AppError(401, ERROR_CODES.UNAUTHORIZED, 'Authentication required: Please sign in as an Arvo Lead.');
  }

  const role = req.auth.actorRole;
  if (role !== 'lead') {
    throw new AppError(
      403,
      ERROR_CODES.FORBIDDEN,
      'Access denied: Lead privileges required to execute administrative lifecycle operations.'
    );
  }
  next();
}

/**
 * Strict role guard: Requires customer credentials ONLY.
 * Agents and unauthenticated callers receive 401/403.
 */
export function requireCustomerRole(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth) {
    throw new AppError(401, ERROR_CODES.UNAUTHORIZED, 'Authentication required: Please sign in to the Arvo Customer Portal.');
  }

  const role = req.auth.actorRole;
  if (role !== 'customer') {
    throw new AppError(
      403,
      ERROR_CODES.FORBIDDEN,
      'Access denied: This endpoint is restricted to customer accounts.'
    );
  }
  next();
}
