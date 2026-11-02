import { Crown, ShieldCheck, UserRound, Users } from 'lucide-react';
import { normalizeRole, roleMeta } from '@/lib/roles';

type RoleBadgeSize = 'sm' | 'md';

const TONE: Record<string, string> = {
  staff: 'border-base-300 bg-base-200/70 text-base-content/70',
  lead: 'border-info/25 bg-info/10 text-info',
  admin: 'border-primary/25 bg-primary/10 text-primary',
};

const ICON = {
  staff: UserRound,
  lead: Users,
  admin: ShieldCheck,
} as const;

export function RoleBadge({
  role,
  size = 'sm',
  className = '',
}: {
  role?: string | null;
  size?: RoleBadgeSize;
  className?: string;
}) {
  const normalized = normalizeRole(role);
  const meta = roleMeta(normalized);
  const Icon = normalized === 'super_admin' ? Crown : ICON[meta.tier];
  const sizing =
    size === 'md' ? 'gap-2 px-3 py-1.5 text-xs' : 'gap-1.5 px-2.5 py-1 text-[11px]';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${sizing} ${TONE[meta.tier]} ${className}`}
      title={meta.scope}
    >
      <Icon className={size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3'} aria-hidden="true" />
      {meta.label}
    </span>
  );
}
