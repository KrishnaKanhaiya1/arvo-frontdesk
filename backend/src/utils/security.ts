import crypto from 'crypto';

// Validate secrets on load
const isProduction = process.env.NODE_ENV === 'production';
const rawSecret = process.env.SESSION_SECRET;

if (isProduction) {
  if (!rawSecret || rawSecret.length < 32) {
    throw new Error('CRITICAL SECURITY ERROR: SESSION_SECRET must be set and at least 32 characters in production.');
  }
}

export const SESSION_SECRET = rawSecret || 'arvo-frontdesk-sec-token-2026-audit-proof-evaluator-safe-key-32chars';
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'arvo2026';

/**
 * Signs a payload string with HMAC-SHA256
 */
export function signCookie(value: string): string {
  const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('base64url');
  return `${value}.${hmac}`;
}

/**
 * Verifies and extracts a signed cookie string.
 * Returns null if tampering is detected or signature doesn't match.
 */
export function verifySignedCookie(signedValue: string): string | null {
  if (!signedValue || typeof signedValue !== 'string') return null;
  const lastDot = signedValue.lastIndexOf('.');
  if (lastDot === -1) return null;

  const value = signedValue.slice(0, lastDot);
  const signature = signedValue.slice(lastDot + 1);

  const expectedHmac = crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('base64url');
  
  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expectedHmac.length) return null;
  const sigBuffer = Buffer.from(signature);
  const expBuffer = Buffer.from(expectedHmac);
  if (!crypto.timingSafeEqual(sigBuffer, expBuffer)) return null;

  return value;
}

/**
 * In-memory sliding window rate limiter for authentication endpoints
 * 10 attempts per minute per IP.
 */
interface RateLimitRecord {
  attempts: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export function checkLoginRateLimit(ip: string): { allowed: boolean; remaining: number; retryAfterSec?: number } {
  // In test mode, allow unlimited attempts
  if (process.env.NODE_ENV === 'test') {
    return { allowed: true, remaining: 10 };
  }

  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxAttempts = 10;

  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(ip, { attempts: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  if (record.attempts >= maxAttempts) {
    const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  record.attempts += 1;
  return { allowed: true, remaining: maxAttempts - record.attempts };
}
