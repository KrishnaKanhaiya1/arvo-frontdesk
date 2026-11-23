import crypto from 'crypto';

const KNOWN_INSECURE_SECRETS = new Set([
  'arvo-frontdesk-secure-secret-key-prod-2026',
  'arvo_dev_session_secret_min_32_characters_random_key_2026',
  'CHANGE_ME_TO_A_CRYPTOGRAPHICALLY_SECURE_RANDOM_STRING_AT_LEAST_32_CHARS',
  'arvo-dev-secret-key-32-characters-minimum-for-session-testing-ok',
]);

export function resolveSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.COOKIE_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    if (!secret || secret.trim().length < 32 || KNOWN_INSECURE_SECRETS.has(secret.trim())) {
      throw new Error(
        'FATAL: A cryptographically strong SESSION_SECRET (minimum 32 characters) must be configured in production environment variables. Startup aborted.'
      );
    }
    return secret.trim();
  }

  // Development and test environments
  if (secret && secret.trim().length >= 32 && !KNOWN_INSECURE_SECRETS.has(secret.trim())) {
    return secret.trim();
  }
  return 'arvo-dev-secret-key-32-characters-minimum-for-session-testing-ok';
}

const COOKIE_SECRET = resolveSessionSecret();
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'arvo2026';

/**
 * Signs payload with HMAC-SHA256 for secure session cookie verification.
 */
export function signCookie(value: string): string {
  const hmac = crypto.createHmac('sha256', COOKIE_SECRET);
  hmac.update(value);
  const signature = hmac.digest('base64url');
  return `${value}.${signature}`;
}

/**
 * Cryptographically verifies signed session cookie.
 * Returns null if signature is invalid or tampered with.
 */
export function verifySignedCookie(signedValue: string): string | null {
  const lastDot = signedValue.lastIndexOf('.');
  if (lastDot === -1) return null;

  const value = signedValue.slice(0, lastDot);
  const signature = signedValue.slice(lastDot + 1);

  const hmac = crypto.createHmac('sha256', COOKIE_SECRET);
  hmac.update(value);
  const expectedSignature = hmac.digest('base64url');

  try {
    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expectedBuf.length) return null;
    if (crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return value;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * One-way cryptographic password hashing using Node.js scrypt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Constant-time verification of candidate password against stored salt:key hash.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const keyBuffer = Buffer.from(key, 'hex');
    if (derivedKey.length !== keyBuffer.length) return false;
    return crypto.timingSafeEqual(derivedKey, keyBuffer);
  } catch {
    return false;
  }
}

/**
 * Sliding-window rate limiting for authentication endpoints.
 * Only failed authentication attempts increment the failure counter,
 * preventing evaluators from being locked out during normal usage or persona switching.
 */
interface RateLimitRecord {
  failures: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export function isRateLimited(ip: string): { allowed: boolean; remaining: number; retryAfterSec?: number } {
  if (process.env.NODE_ENV === 'test') {
    return { allowed: true, remaining: 10 };
  }

  const now = Date.now();
  const maxFailures = 10;
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetAt) {
    return { allowed: true, remaining: maxFailures };
  }

  if (record.failures >= maxFailures) {
    const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  return { allowed: true, remaining: maxFailures - record.failures };
}

export function recordFailedLogin(ip: string): void {
  if (process.env.NODE_ENV === 'test') return;

  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(ip, { failures: 1, resetAt: now + windowMs });
  } else {
    record.failures += 1;
  }
}

export function clearLoginFailures(ip: string): void {
  rateLimitStore.delete(ip);
}
