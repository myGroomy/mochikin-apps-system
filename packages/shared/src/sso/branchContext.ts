/**
 * Centralized active working branch context utilities.
 * Ensures consistent handling of Active Working Branch across all ecosystem apps.
 */
export interface ActiveWorkingBranch {
  id?: string;
  code: string;
  name?: string;
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
