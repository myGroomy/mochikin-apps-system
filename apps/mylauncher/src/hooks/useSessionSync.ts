"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useDomainStore, type SessionUser } from "@/stores/useLauncherStore";

const LOGOUT_EVENT = "mochikin-logout";
const BROADCAST_CHANNEL = "mochikin-session";
const SESSION_POLL_MS = 30_000;

export function useSessionSync() {
  const logout = useDomainStore((s) => s.logout);
  const isAuthenticated = useDomainStore((s) => s.isAuthenticated);
  const hydrateSession = useDomainStore((s) => s.hydrateSession);
  const isAuthenticatedRef = useRef(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    let cancelled = false;

    function endSession() {
      if (!isAuthenticatedRef.current) return;
      logout();
      const isProtected =
        pathname.startsWith("/launcher") || pathname.startsWith("/admin");
      if (isProtected) router.replace("/");
    }

    async function syncFromServer() {
      try {
        const response = await fetch("/api/auth/sso");
        if (cancelled) return;
        if (!response.ok) {
          endSession();
          return;
        }
        const result = (await response.json()) as {
          authenticated?: boolean;
          session?: SessionUser;
        };
        if (cancelled) return;
        if (result.authenticated && result.session?.employee) {
          hydrateSession(result.session);
        } else {
          endSession();
        }
      } catch {
        // Network blip: keep current client state until next poll.
      }
    }

    void syncFromServer();
    const interval = setInterval(() => {
      void syncFromServer();
    }, SESSION_POLL_MS);

    function handleStorage(e: StorageEvent) {
      if (e.key !== "mochikin-domain-storage") return;
      if (!e.newValue) {
        endSession();
        return;
      }
      try {
        const parsed = JSON.parse(e.newValue) as { state?: { isAuthenticated?: boolean } };
        if (!parsed.state?.isAuthenticated) endSession();
      } catch {
        // ignore malformed storage data
      }
    }

    function handleBroadcast() {
      endSession();
    }

    const channel =
      typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(BROADCAST_CHANNEL) : null;
    if (channel) {
      channel.onmessage = (event: MessageEvent) => {
        if (event.data === "logout") handleBroadcast();
      };
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener(LOGOUT_EVENT, handleBroadcast);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(LOGOUT_EVENT, handleBroadcast);
      channel?.close();
    };
  }, [logout, hydrateSession, pathname, router]);
}

export function broadcastLogout() {
  window.dispatchEvent(new CustomEvent(LOGOUT_EVENT));
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(BROADCAST_CHANNEL);
    channel.postMessage("logout");
    channel.close();
  }
}
