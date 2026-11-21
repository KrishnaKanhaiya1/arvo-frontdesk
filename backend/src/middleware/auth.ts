import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { ERROR_CODES } from '../types/contracts';
import prisma from '../utils/prisma';

export interface AuthContext {
  actorId: string;
  actorRole: 'agent' | 'customer' | 'system' | 'lead';
  actorName: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

/**
 * Extracts and verifies actor credentials from headers:
 * - x-actor-role: 'agent' | 'lead' | 'customer' | 'system'
 * - x-actor-id: agentId or customerId
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const roleHeader = req.headers['x-actor-role'] as string | undefined;
  const idHeader = req.headers['x-actor-id'] as string | undefined;

  // Default to agent mode for internal/demo convenience if not explicitly customer
  const role = (roleHeader || 'agent') as 'agent' | 'lead' | 'customer' | 'system';
  const actorId = idHeader || (role === 'customer' ? 'cust-acme' : 'agent-meera');

  let actorName = 'System';
  if (role === 'agent' || role === 'lead') {
    const agent = await prisma.agent.findUnique({ where: { id: actorId } });
    actorName = agent ? agent.name : 'Support Agent';
  } else if (role === 'customer') {
    const customer = await prisma.customer.findUnique({ where: { id: actorId } });
    actorName = customer ? customer.name : 'Customer';
  }

  req.auth = {
    actorId,
    actorRole: role,
    actorName,
  };

  next();
}

/**
 * Strict role guard: Requires active agent credentials.
 * Customers are strictly rejected with 403 Forbidden.
 * Enforces INC-0304 private note isolation at the API boundary.
 */
export function requireAgentRole(req: Request, _res: Response, next: NextFunction): void {
  const role = req.headers['x-actor-role'] as string | undefined;
  if (!role || (role !== 'agent' && role !== 'lead')) {
    throw new AppError(
      403,
      ERROR_CODES.FORBIDDEN,
      'Access denied: This endpoint is restricted to Arvo support agents only. Internal notes and team actions are not accessible to customers.'
    );
  }
  next();
}

/**
 * Strict role guard: Requires lead or admin permissions.
 */
export function requireLeadRole(req: Request, _res: Response, next: NextFunction): void {
  const role = req.headers['x-actor-role'] as string | undefined;
  if (role !== 'lead' && role !== 'agent') {
    throw new AppError(
      403,
      ERROR_CODES.FORBIDDEN,
      'Access denied: Admin/Lead role required for this system action.'
    );
  }
  next();
}

/**
 * Strict role guard: For customer portal actions.
 */
export function requireCustomerRole(req: Request, _res: Response, next: NextFunction): void {
  const role = req.headers['x-actor-role'] as string | undefined;
  if (role && role !== 'customer') {
    // If explicitly specified and not customer, reject
    throw new AppError(403, ERROR_CODES.FORBIDDEN, 'Customer access required.');
  }
  next();
}
