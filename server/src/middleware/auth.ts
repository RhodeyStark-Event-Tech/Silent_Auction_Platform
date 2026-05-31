import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface AdminTokenPayload {
  email: string;
  role: 'admin';
}

/** Constant-time string comparison to avoid leaking length/early-exit timing. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // Still compare against itself to keep timing uniform.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

/** Verify the single allowed admin credentials. */
export function verifyAdminCredentials(email: string, password: string): boolean {
  const emailOk = safeEqual(email.trim().toLowerCase(), config.admin.email);
  const passwordOk = safeEqual(password, config.admin.password);
  // Evaluate both regardless of the first result to keep timing uniform.
  return emailOk && passwordOk;
}

export function issueAdminToken(): string {
  const payload: AdminTokenPayload = { email: config.admin.email, role: 'admin' };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as jwt.SignOptions);
}

/** Express guard: requires a valid admin bearer token. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const header = req.header('authorization') ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AdminTokenPayload;
    if (decoded.role !== 'admin' || decoded.email !== config.admin.email) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }
}
