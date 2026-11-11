"use client";

import { useState } from "react";
import {
  Warning,
  ArrowLeft,
  SquaresFour,
  CaretDown,
  HardDrives,
  UsersThree,
  Storefront,
  House,
} from "@phosphor-icons/react";
import { Logo } from "@/components/Logo";
import { AdminAppUrlManager } from "@/components/AdminAppUrlManager";
import { UserManagement } from "@/components/UserManagement";
import { BranchManagement } from "@/components/BranchManagement";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";
import type { ServicesUserSession } from "@/lib/auth";
import type { AppTargetUrlInfo } from "@/lib/apps";
import type { ManagedUser } from "@/lib/userService";
import type { ManagedBranch } from "@/lib/branchService";

interface AdminHealthContentProps {
  session: ServicesUserSession;
  apps: AppTargetUrlInfo[];
  initialUsers?: ManagedUser[];
  initialBranches?: ManagedBranch[];
}

export function AdminHealthContent({
  session,
  apps,
  initialUsers = [],
  initialBranches = [],
}: AdminHealthContentProps) {
  const [users, setUsers] = useState<ManagedUser[]>(initialUsers);
  const [branches, setBranches] = useState<ManagedBranch[]>(initialBranches);

  const isAdmin =
    session.role === "super_admin" ||
    session.role === "role_admin" ||
    session.role === "admin";

  const refreshData = async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.success) {
        if (data.users) setUsers(data.users);
        if (data.branches) setBranches(data.branches);
      }
    } catch (err) {
      console.error("Failed to refresh admin data:", err);
    }
  };

  if (!isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-canvas">
        <div className="doppel-outer w-full max-w-sm">
          <div className="doppel-inner p-6 flex flex-col items-center text-center">
            <Warning className="w-10 h-10 text-amber mb-2" weight="duotone" />
            <h1 className="text-lg font-bold text-ink font-display">Akses Ditolak</h1>
            <p className="text-sm text-ash mt-1">
              Halaman ini khusus untuk administrator sistem Mochikin Services.
            </p>
            <div className="mt-5">
              <a
                href="/"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-hairline bg-surface px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-sunken active:scale-95 whitespace-nowrap"
              >
                <ArrowLeft className="w-4 h-4" weight="bold" /> Kembali ke portal
              </a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <header className="sticky top-0 z-40 border-b border-hairline bg-surface/90 backdrop-blur-md px-3.5 sm:px-6">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <a href="/" className="flex items-center gap-2 focus-visible:rounded-md">
              <Logo size="sm" />
            </a>
            <a
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-sunken active:scale-95 shadow-xs"
              title="Kembali ke Beranda Portal"
            >
              <House className="w-3.5 h-3.5 text-accent" weight="bold" />
              <span>Beranda</span>
            </a>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-xs">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-wash text-xs font-bold text-accent">
                {session.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block leading-tight">
                <div className="text-xs font-semibold text-ink">{session.name}</div>
                <div className="text-[10px] text-ash capitalize">
                  {session.role.replace("_", " ")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="p-3.5 sm:p-6 flex-1">
        <motion.div
          className="mx-auto max-w-6xl space-y-5 sm:space-y-6"
          variants={fadeUp}
          initial="hidden"
          animate="show"
        >
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink font-display">
              Admin Control Center
            </h1>
            <p className="text-xs sm:text-sm text-ash mt-0.5">
              Kelola integrasi koneksi modul, otorisasi staf multi-cabang, dan direktori outlet.
            </p>
          </div>

          <Tabs defaultValue="apps" className="w-full space-y-5">
            {/* Scrollable Tab Bar on Mobile */}
            <div className="border-b border-hairline pb-2.5 overflow-x-auto no-scrollbar">
              <TabsList className="bg-sunken border border-hairline p-1 rounded-xl gap-1.5 h-auto inline-flex flex-nowrap min-w-full sm:min-w-0">
                <TabsTrigger
                  value="apps"
                  className="gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg data-active:bg-surface data-active:text-ink data-active:shadow-xs text-ash hover:text-ink transition-all cursor-pointer whitespace-nowrap min-h-[38px]"
                >
                  <HardDrives className="w-4 h-4 text-accent" weight="duotone" />
                  <span>Koneksi App</span>
                </TabsTrigger>
                <TabsTrigger
                  value="users"
                  className="gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg data-active:bg-surface data-active:text-ink data-active:shadow-xs text-ash hover:text-ink transition-all cursor-pointer whitespace-nowrap min-h-[38px]"
                >
                  <UsersThree className="w-4 h-4 text-accent" weight="duotone" />
                  <span>Manajemen User</span>
                  <span className="ml-0.5 rounded-full bg-accent/10 text-accent px-1.5 py-0.2 text-[10px] font-bold">
                    {users.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="branches"
                  className="gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg data-active:bg-surface data-active:text-ink data-active:shadow-xs text-ash hover:text-ink transition-all cursor-pointer whitespace-nowrap min-h-[38px]"
                >
                  <Storefront className="w-4 h-4 text-accent" weight="duotone" />
                  <span>Manajemen Cabang</span>
                  <span className="ml-0.5 rounded-full bg-accent/10 text-accent px-1.5 py-0.2 text-[10px] font-bold">
                    {branches.length}
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="apps" className="focus-visible:outline-none">
              <AdminAppUrlManager initialApps={apps} />
            </TabsContent>

            <TabsContent value="users" className="focus-visible:outline-none">
              <UserManagement
                initialUsers={users}
                branches={branches}
                currentUserId={session.userId}
                onRefresh={refreshData}
              />
            </TabsContent>

            <TabsContent value="branches" className="focus-visible:outline-none">
              <BranchManagement
                initialBranches={branches}
                onRefresh={refreshData}
              />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
