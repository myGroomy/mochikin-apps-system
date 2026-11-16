import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const HASH_PATTERN = /^([\da-f]{32})\$([\da-f]{64})$/i;

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex');
  return `${salt}$${scryptSync(pin, salt, 32).toString('hex')}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const match = HASH_PATTERN.exec(stored);
  if (!match) return false;
  const actual = scryptSync(pin, match[1], 32);
  const expected = Buffer.from(match[2], 'hex');
  return timingSafeEqual(actual, expected);
}
