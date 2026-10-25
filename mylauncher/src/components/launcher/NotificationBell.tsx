"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Info, AlertTriangle, AlertOctagon, CheckCheck } from "lucide-react";
import { useFeed, markNotificationRead } from "@/hooks/useFeed";
import { useDomainStore } from "@/stores/useLauncherStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Announcement, NotificationItem } from "@/lib/types";
import { useFeatureSettings } from "@/components/layout/FeatureSettingsProvider";

function formatWhen(iso: string): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const diff = Date.now() - t;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(t).toLocaleDateString();
}

function severityIcon(severity: Announcement["severity"]) {
  if (severity === "critical")
    return <AlertOctagon className="h-3.5 w-3.5 text-rose shrink-0" aria-hidden="true" />;
  if (severity === "warning")
    return <AlertTriangle className="h-3.5 w-3.5 text-amber shrink-0" aria-hidden="true" />;
  return <Info className="h-3.5 w-3.5 text-accent shrink-0" aria-hidden="true" />;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { feed, unreadCount, refetch, loaded } = useFeed();
  const dismissed = useDomainStore((s) => s.dismissedAnnouncements);
  const dismissAnnouncement = useDomainStore((s) => s.dismissAnnouncement);
  const features = useFeatureSettings();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && loaded) refetch();
  }

  async function handleRead(n: NotificationItem) {
    if (n.read_at) return;
    const result = await markNotificationRead(n.notification_id);
    if (result.success) refetch();
  }

  async function handleReadAll() {
    await Promise.all(
      feed.notifications
        .filter((n) => !n.read_at)
        .map((n) => markNotificationRead(n.notification_id))
    );
    refetch();
  }

  function openNotification(n: NotificationItem) {
    void handleRead(n);
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  }

  const visibleAnnouncements = features.announcements
    ? feed.announcements.filter((a) => !dismissed.includes(a.announcement_id))
    : [];

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative text-ash hover:text-ink"
            aria-label={
              unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
            }
          />
        }
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose px-1 text-[10px] font-bold text-white"
            aria-hidden="true"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between gap-2 pr-8">
            Notifications
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleReadAll}
              >
                    <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" /> Mark all read
              </Button>
            )}
          </SheetTitle>
          <SheetDescription>
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-4 px-4 min-h-0">
          <div className="space-y-4 pb-4">
            {visibleAnnouncements.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-ink-soft mb-2">Announcements</p>
                <ul className="space-y-2">
                  {visibleAnnouncements.map((a) => (
                    <li
                      key={a.announcement_id}
                      className="rounded-lg border border-hairline p-3 space-y-1"
                    >
                      <div className="flex items-start gap-2">
                        {severityIcon(a.severity)}
                        <p className="text-sm font-semibold text-ink flex-1">{a.title}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] text-ink-soft"
                          onClick={() => dismissAnnouncement(a.announcement_id)}
                          aria-label={`Dismiss announcement: ${a.title}`}
                        >
                          Dismiss
                        </Button>
                      </div>
                      <p className="text-xs text-ink-soft pl-5.5">{a.body}</p>
                      <p className="text-[10px] text-mist pl-5.5">{formatWhen(a.created_at)}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <p className="text-xs font-semibold text-ink-soft mb-2">Personal</p>
              {feed.notifications.length === 0 ? (
                <p className="text-xs text-mist">No personal notifications.</p>
              ) : (
                <ul className="space-y-1.5">
                  {feed.notifications.map((n) => (
                    <li
                      key={n.notification_id}
                      className={`rounded-lg border p-2.5 cursor-pointer transition-colors hover:bg-secondary/60 ${
                        n.read_at ? "border-hairline opacity-70" : "border-accent/30 bg-accent/5"
                      }`}
                      onClick={() => openNotification(n)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openNotification(n);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {!n.read_at && (
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-accent shrink-0"
                            aria-hidden="true"
                          />
                        )}
                        <p className="text-sm font-medium text-ink flex-1 truncate">
                          {n.title}
                        </p>
                        <Badge variant="secondary" className="text-[10px]">
                          {n.type}
                        </Badge>
                      </div>
                      {n.body && (
                        <p className="text-xs text-ink-soft mt-1 line-clamp-2">{n.body}</p>
                      )}
                      <p className="text-[10px] text-mist mt-1">{formatWhen(n.created_at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
