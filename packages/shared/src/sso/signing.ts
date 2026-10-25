import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Constant-time string comparison.
 *
 * `===` short-circuits on the first differing byte, which leaks the length of
 * the matching prefix to an attacker who can time responses. Comparing the
 * HMAC digests with `timingSafeEqual` closes that side channel.
 */
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Sign an arbitrary string with HMAC-SHA256.
 * Use this for raw HTTP bodies: the exact bytes that are sent must be signed.
 */
export function signRawPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload, 'utf8').digest('base64');
}

/**
 * Verify an HMAC signature over a raw string in constant time.
 */
export function verifyRawPayload(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    if (!signature) return false;
    return safeEqual(signRawPayload(payload, secret), signature);
  } catch {
    return false;
  }
}

/**
 * Sign a JSON payload with HMAC-SHA256.
 * @returns Base64 encoded signature
 */
export function signPayload(payload: Record<string, any>, secret: string): string {
  return signRawPayload(JSON.stringify(payload), secret);
}

/**
 * Verify HMAC signature over a JSON payload.
 * New server code should prefer `verifyRawPayload(rawBody, ...)`.
 */
export function verifySignature(
  payload: Record<string, any>,
  signature: string,
  secret: string
): boolean {
  try {
    if (!signature) return false;
    return safeEqual(signPayload(payload, secret), signature);
  } catch (error) {
    console.error(
      '❌ Signature verification failed:',
      error instanceof Error ? error.message : error
    );
    return false;
  }
}

/**
 * Generate SSO token for app handoff.
 * Token format: base64url(payload).base64(signature)
 */
export function generateSSOToken(
  person_id: string,
  branch_id: string,
  role: string,
  secret: string,
  expiresIn: number = 300
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    person_id,
    branch_id,
    role,
    iat: now,
    exp: now + expiresIn,
    nonce: randomBytes(8).toString('hex'),
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString(
    'base64url'
  );
  const signature = signRawPayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

/**
 * Verify and parse an SSO token created by `generateSSOToken`.
 * Returns null for malformed, tampered, or expired tokens.
 */
export function verifySSOToken(
  token: string,
  secret: string
): Record<string, any> | null {
  try {
    const [encodedPayload, signature] = token.split('.');
    if (!encodedPayload || !signature) return null;

    if (!verifyRawPayload(encodedPayload, signature, secret)) {
      console.error('❌ Invalid SSO token signature');
      return null;
    }

    const payloadString = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadString) as Record<string, any>;

    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== 'number' || payload.exp < now) {
      console.error('❌ SSO token expired');
      return null;
    }

    return payload;
  } catch (error) {
    console.error(
      '❌ SSO token verification failed:',
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

/** Create HMAC signature for a task event (JSON payload form). */
export function signEvent(event: Record<string, any>, secret: string): string {
  return signPayload(event, secret);
}

/**
 * Verify a task event signature.
 *
 * Prefer `verifyRawPayload(rawBody, signature, secret)` in the ingress route so
 * the check runs over the exact bytes received over the wire.
 */
export function verifyEvent(
  event: Record<string, any>,
  signature: string,
  secret: string
): boolean {
  return verifySignature(event, signature, secret);
}

/**
 * Create an SSO handoff token for a launcher → app redirect.
 */
export function createSsoHandoffToken(
  session: Record<string, any>,
  appId: string,
  secret: string
): string {
  return generateSSOToken(
    session.person_id,
    session.branch_id,
    session.role,
    secret,
    300
  );
}
