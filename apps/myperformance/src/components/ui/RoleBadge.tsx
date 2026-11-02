import { Crown, ShieldCheck, User, Users } from "@phosphor-icons/react";
import { normalizeRole, roleMeta } from "@/lib/roles";
import { cn } from "@/lib/utils";

type RoleBadgeSize = "sm" | "md";

const TONE: Record<string, string> = {
  staff: "border-hairline bg-muted text-foreground/80",
  lead: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800",
  admin: "border-purple-200 bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800",
};

const ICON = {
  staff: User,
  lead: Users,
  admin: ShieldCheck,
} as const;

export function RoleBadge({
  role,
  size = "sm",
  className = "",
}: {
  role?: string | null;
  size?: RoleBadgeSize;
  className?: string;
}) {
  const normalized = normalizeRole(role);
  const meta = roleMeta(normalized);
  const Icon = normalized === "super_admin" ? Crown : ICON[meta.tier];
  const sizing =
    size === "md" ? "gap-1.5 px-3 py-1 text-xs" : "gap-1 px-2.5 py-0.5 text-[11px]";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-semibold shadow-2xs",
        sizing,
        TONE[meta.tier] || TONE.staff,
        className
      )}
      title={meta.scope}
    >
      <Icon className={size === "md" ? "size-3.5" : "size-3"} aria-hidden="true" />
      {meta.label}
    </span>
  );
}
