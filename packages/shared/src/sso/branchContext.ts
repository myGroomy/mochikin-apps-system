/**
 * Centralized active working branch and shift context utilities.
 * Ensures consistent handling of Active Working Branch, Shift, and Dual-Mode detection
 * across all ecosystem apps.
 */
export interface ActiveWorkingBranch {
  id?: string;
  code: string;
  name?: string;
}

export interface ActiveWorkingShift {
  id: string;
  name: string;
  type: 'opening' | 'closing' | 'regular' | string;
}

export function parseActiveBranchCookies(
  cookieGetter: (name: string) => string | undefined
): ActiveWorkingBranch | null {
  const code = cookieGetter('mochikin_active_branch_code');
  if (!code) return null;
  return {
    id: cookieGetter('mochikin_active_branch_id'),
    code,
    name: cookieGetter('mochikin_active_branch_name') || code,
  };
}

export function parseActiveShiftCookies(
  cookieGetter: (name: string) => string | undefined
): ActiveWorkingShift | null {
  const type = cookieGetter('mochikin_active_shift_type');
  const name = cookieGetter('mochikin_active_shift_name');
  const id = cookieGetter('mochikin_active_shift_id');
  if (!type && !name && !id) return null;
  return {
    id: id || type || 'opening',
    name: name || (type === 'closing' ? 'Shift Sore (Closing)' : 'Shift Pagi (Opening)'),
    type: type || 'opening',
  };
}

/**
 * Checks whether an app is operating in SSO-Connected mode or Standalone mode.
 * Dual-Mode guard:
 * - SSO-Connected: Redirects login, locks branch/shift selectors to portal context.
 * - Standalone: Preserves local auth and local switchers.
 */
export function isSsoConnected(options: {
  cookieGetter?: (name: string) => string | undefined;
  envPortalUrl?: string;
  hasSecret?: boolean;
}): boolean {
  if (options.cookieGetter) {
    const ssoMode = options.cookieGetter('mochikin_sso_mode');
    if (ssoMode === 'connected') return true;
    const portalCookie = options.cookieGetter('mochikin_portal_url');
    const branchCookie = options.cookieGetter('mochikin_active_branch_code');
    if (portalCookie || branchCookie) return true;
  }
  if (options.envPortalUrl && options.envPortalUrl.trim().length > 0) return true;
  if (options.hasSecret) return true;
  return false;
}

export function getClientCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

export function isClientSsoConnected(): boolean {
  if (typeof window === 'undefined') return false;
  const ssoMode = getClientCookie('mochikin_sso_mode');
  if (ssoMode === 'connected') return true;
  const portalUrl = getClientCookie('mochikin_portal_url');
  if (portalUrl && portalUrl.trim().length > 0) return true;
  return false;
}

export function getClientPortalUrl(): string {
  if (typeof window !== 'undefined') {
    const portalUrl = getClientCookie('mochikin_portal_url');
    if (portalUrl) return portalUrl;
  }
  return (
    (typeof process !== 'undefined' &&
      (process.env.NEXT_PUBLIC_SERVICE_URL || process.env.NEXT_PUBLIC_LAUNCHER_URL)) ||
    'http://localhost:3000'
  );
}
