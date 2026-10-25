"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ExternalLink, Lock, Star, Package, CalendarDays, Users, Building, LayoutGrid } from "lucide-react";
import type { App } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const APP_DISPLAY: Record<
  string,
  { description: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  STOKIS: { description: "Inventory and stock opname", Icon: Package },
  MYSHIFT: { description: "Schedules, shifts, and branch context", Icon: CalendarDays },
  MYCUSTOMER: { description: "Customer workspace and CRM", Icon: Users },
  MYHR: { description: "Employee and HR management", Icon: Building },
};

export function getAppDisplay(appId: string, name: string) {
  return APP_DISPLAY[appId] ?? { description: `${name} workspace`, Icon: LayoutGrid };
}

interface AppCardProps {
  app: App;
  index?: number;
  onClick: (app: App) => void;
  favorite?: boolean;
  onToggleFavorite?: () => void;
}

export function AppCard({ app, index = 0, onClick, favorite = false, onToggleFavorite }: AppCardProps) {
  const isActive = app.status === "ACTIVE";
  const reduceMotion = useReducedMotion();
  const { description, Icon } = getAppDisplay(app.app_id, app.name);
  const entranceDuration = reduceMotion ? 0 : 0.5;
  const feedbackDuration = reduceMotion ? 0 : 0.25;
  const statusStyle =
    app.status === "ACTIVE"
      ? "bg-emerald/10 text-emerald"
      : app.status === "MAINTENANCE"
        ? "bg-amber/10 text-amber"
        : "bg-rose/10 text-rose";

  return (
    <motion.div
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: entranceDuration,
        ease: [0.4, 0, 0, 1],
        delay: reduceMotion ? 0 : Math.min(index * 0.05, 0.25),
      }}
      whileHover={isActive && !reduceMotion ? { y: -3 } : undefined}
      whileTap={isActive && !reduceMotion ? { scale: 0.99 } : undefined}
      className="h-full"
    >
      <Card
        className={`relative h-full transition-colors ${isActive ? "hover:border-hairline-strong" : "opacity-60"}`}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-wash text-accent ring-1 ring-hairline">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <CardTitle className="truncate text-sm font-bold text-ink">{app.name}</CardTitle>
                <CardDescription className="truncate text-xs">{app.app_id}</CardDescription>
              </div>
            </div>
            {onToggleFavorite && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-ash hover:text-amber"
                aria-label={favorite ? `Remove ${app.name} from favorites` : `Add ${app.name} to favorites`}
                aria-pressed={favorite}
                onClick={onToggleFavorite}
              >
                <motion.span
                  className="flex"
                  animate={favorite && !reduceMotion ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                  transition={{ duration: feedbackDuration, ease: [0.4, 0, 0, 1] }}
                >
                  <Star className={`h-4 w-4 ${favorite ? "fill-amber text-amber" : ""}`} aria-hidden="true" />
                </motion.span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex h-full flex-col gap-3">
          <p className="min-h-8 text-xs leading-5 text-ink-soft">{description}</p>
          <div className="mt-auto flex items-center justify-between gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusStyle}`}>
              {isActive ? (
                <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
              ) : (
                <Lock className="h-3 w-3" aria-hidden="true" />
              )}
              {isActive ? "Tersedia" : app.status === "MAINTENANCE" ? "Perbaikan" : "Terkunci"}
            </span>
            {isActive ? (
              <Button
                size="sm"
                className="h-9 rounded-full px-4"
                onClick={() => onClick(app)}
                aria-label={`Buka ${app.name}`}
              >
                Buka <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            ) : (
              <span className="inline-flex h-9 items-center rounded-full border border-hairline px-4 text-xs font-medium text-mist">
                Tidak Tersedia
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
