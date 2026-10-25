/**
 * Normalize Indonesian phone numbers to international format
 * Handles formats: 08XX, +628XX, 628XX
 * Result: +62XXXXXXXXX
 */
export function normalizePhone(phone: string): string | null {
  if (!phone) return null;

  // Remove all non-digit characters except +
  let normalized = phone.replace(/[^\d+]/g, '');

  // If starts with +, keep it; otherwise remove +
  if (!normalized.startsWith('+')) {
    normalized = normalized.replace(/\+/g, '');
  }

  // Handle Indonesian formats
  if (normalized.startsWith('08')) {
    // 08XX -> +628XX
    normalized = '+62' + normalized.substring(1);
  } else if (normalized.startsWith('8')) {
    // 8XX (no leading 0) -> +628XX
    normalized = '+62' + normalized;
  } else if (normalized.startsWith('+628')) {
    // Already in correct format
    // no-op
  } else if (normalized.startsWith('628')) {
    // 628XX -> +628XX
    normalized = '+' + normalized;
  }

  // Validate format: +62 followed by 9-10 digits
  const match = normalized.match(/^\+62(\d{9,10})$/);
  if (!match) {
    return null; // Invalid format
  }

  return normalized;
}

/**
 * Check if phone number is valid Indonesian number
 */
export function isValidPhone(phone: string): boolean {
  return normalizePhone(phone) !== null;
}

/**
 * Extract only digits from phone number
 */
export function extractPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Convert to local format (08XX)
 */
export function phoneToLocal(phone: string): string | null {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;

  // Remove +62 and add 0
  return '0' + normalized.substring(3);
}
