"use client";

import { useCallback, useEffect, useState } from "react";
import type { HomeFeed } from "@/lib/types";

const EMPTY: HomeFeed = { announcements: [], notifications: [], activity: [] };

export function useFeed() {
  const [feed, setFeed] = useState<HomeFeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let loading = false;
    const REFRESH_MS = 30_000;

    async function load() {
      if (loading) return;
      loading = true;
      try {
        const res = await fetch("/api/feed");
        const body = (await res.json()) as { success?: boolean; feed?: HomeFeed; message?: string };
        if (cancelled) return;
        if (res.ok && body.success && body.feed) {
          setFeed(body.feed);
          setError(null);
        } else if (res.status === 401) {
          setFeed(EMPTY);
          setError(null);
        } else {
          setFeed((prev) => prev ?? EMPTY);
          setError(body.message || "Feed unavailable");
        }
      } catch (e) {
        if (!cancelled) {
          setFeed((prev) => prev ?? EMPTY);
          setError(e instanceof Error ? e.message : "Feed unavailable");
        }
      } finally {
        loading = false;
      }
    }

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") void load();
    }

    void load();
    const interval = window.setInterval(() => {
      refreshWhenVisible();
    }, REFRESH_MS);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  const unreadCount = feed ? feed.notifications.filter((n) => !n.read_at).length : 0;

  return {
    feed: feed ?? EMPTY,
    loaded: feed !== null,
    loading: feed === null && error === null,
    error,
    unreadCount,
    refetch,
  };
}

export function markNotificationRead(notificationId: string): Promise<{ success: boolean }> {
  return fetch("/api/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notification_id: notificationId, action: "read" }),
  })
    .then((res) => res.json().then((b: { success?: boolean }) => ({ success: Boolean(b.success) })))
    .catch(() => ({ success: false }));
}
