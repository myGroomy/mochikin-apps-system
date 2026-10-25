import * as jwt from 'jsonwebtoken';
import { JWTCustomClaimsSchema, type JWTCustomClaims, type UserRole, type Person, type Branch } from '../types/auth';

export { JWTCustomClaimsSchema };
export type { JWTCustomClaims, UserRole, Person, Branch };

/**
 * Validate JWT token and extract custom claims
 * @param token - JWT token string
 * @param secret - Secret key for verification
 * @returns Decoded JWT claims or null if invalid
 */
export function validateJWT(token: string, secret: string): JWTCustomClaims | null {
  try {
    const decoded = jwt.verify(token, secret) as JWTCustomClaims;
    const validated = JWTCustomClaimsSchema.parse(decoded);
    return validated;
  } catch (error) {
    console.error('❌ JWT validation failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Extract claims from JWT without verification (for inspection)
 * @param token - JWT token string
 * @returns Decoded JWT claims
 */
export function extractClaims(token: string): JWTCustomClaims | null {
  try {
    const decoded = jwt.decode(token) as JWTCustomClaims | null;
    if (!decoded) return null;
    
    const validated = JWTCustomClaimsSchema.parse(decoded);
    return validated;
  } catch (error) {
    console.error('❌ Claim extraction failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Check if JWT token is expired
 * @param token - JWT token string
 * @returns true if expired, false otherwise
 */
export function isTokenExpired(token: string): boolean {
  const claims = extractClaims(token);
  if (!claims) return true;
  
  const now = Math.floor(Date.now() / 1000);
  return claims.exp < now;
}

/**
 * Get remaining time until token expiration
 * @param token - JWT token string
 * @returns Remaining seconds, or 0 if expired
 */
export function getTokenTTL(token: string): number {
  const claims = extractClaims(token);
  if (!claims) return 0;
  
  const now = Math.floor(Date.now() / 1000);
  const remaining = claims.exp - now;
  return remaining > 0 ? remaining : 0;
}
