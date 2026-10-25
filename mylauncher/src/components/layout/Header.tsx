"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDomainStore } from "@/stores/useLauncherStore";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { GlobalSearch } from "@/components/launcher/GlobalSearch";
import { NotificationBell } from "@/components/launcher/NotificationBell";
import { Menu, User, Clock, LogOut, ChevronDown, Shield, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { broadcastLogout } from "@/hooks/useSessionSync";
import { useFeatureSettings } from "@/components/layout/FeatureSettingsProvider";

interface HeaderProps {
  onMenuClick: () => void;
  mobileOpen?: boolean;
  menuButtonRef?: React.RefObject<HTMLButtonElement | null>;
}

export function Header({ onMenuClick, mobileOpen = false, menuButtonRef }: HeaderProps) {
  const router = useRouter();
  const isAuthenticated = useDomainStore((s) => s.isAuthenticated);
  const activeEmployee = useDomainStore((s) => s.activeEmployee);
  const roleName = useDomainStore((s) => s.roleName);
  const roleId = useDomainStore((s) => s.roleId);
  const logout = useDomainStore((s) => s.logout);
  const getSession = useDomainStore((s) => s.getSession);
  const [now, setNow] = useState(0);
  const [sessionInfo, setSessionInfo] = useState(getSession());
  const features = useFeatureSettings();

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
      setSessionInfo(getSession());
    }, 1000);
    return () => clearInterval(interval);
  }, [getSession]);

  const minutesLeft =
    sessionInfo.isValid && sessionInfo.expiresAt
      ? Math.ceil((sessionInfo.expiresAt - now) / 60000)
      : 0;

  function handleLogout() {
    void fetch("/api/auth/logout", { method: "POST" });
    toast.info("Signed out");
    logout();
    broadcastLogout();
    router.push("/");
  }

  const initials = activeEmployee?.name
    ? activeEmployee.name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("")
    : "?";

  return (
    <header className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-hairline bg-surface">
      <Button
        ref={menuButtonRef}
        variant="ghost"
        size="icon"
        className="lg:hidden text-ash hover:text-ink"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        aria-expanded={mobileOpen}
        aria-controls="primary-navigation"
        disabled={mobileOpen}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </Button>

      <div className="flex-1" />

      <div className="flex items-center gap-2 sm:gap-3">
        {features.global_search && <GlobalSearch />}
        {isAuthenticated && activeEmployee && (
          <>
            {features.notifications && <NotificationBell />}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    className="h-9 gap-2 px-2 text-ash hover:text-ink"
                    aria-label="Account menu"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-wash text-[10px] font-bold text-accent-deep">
                      {initials}
                    </span>
                    <span className="hidden sm:flex flex-col items-start leading-none">
                      <span className="text-xs font-medium text-ink">{activeEmployee.name}</span>
                      <span className="text-[10px] text-mist">
                        {roleName || activeEmployee.role}
                      </span>
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-mist" aria-hidden="true" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-ink">{activeEmployee.name}</span>
                  <span className="text-xs font-normal text-mist">@{activeEmployee.username}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-mist">
                      <Shield className="h-3 w-3" /> Peran
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {roleName || activeEmployee.role}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-mist">
                      <User className="h-3 w-3" /> ID
                    </span>
                    <span className="font-mono text-ink">{activeEmployee.employee_id}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-mist">
                      <Clock className="h-3 w-3" /> Sesi
                    </span>
                    <span className={`font-mono ${sessionInfo.isValid ? "text-ink" : "text-rose"}`}>
                      {sessionInfo.isValid ? `${minutesLeft} menit tersisa` : "kadaluarsa"}
                    </span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                {roleId === "role_admin" && (
                  <DropdownMenuItem
                    className="cursor-pointer text-ink"
                    onClick={() => router.push("/admin")}
                  >
                    <Settings className="h-4 w-4" />
                    Konsol Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="cursor-pointer text-rose focus:text-rose"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
