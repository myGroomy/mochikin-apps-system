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
            <Warning className="w-10 h-10 text-accent mb-2" weight="duotone" />
            <h1 className="text-lg font-bold text-ink">Akses Ditolak</h1>
            <p className="text-sm text-ash mt-1">
              Halaman ini khusus untuk administrator sistem Mochikin Services.
            </p>
            <div className="mt-5">
              <a
                href="/"
                className="inline-flex items-center gap-2 rounded-md border border-hairline bg-white px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-sunken active:scale-95 whitespace-nowrap"
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
      <header className="sticky top-0 z-40 border-b border-hairline bg-white/80 backdrop-blur-md px-4 sm:px-6">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2.5">
              <Logo size="sm" />
            </a>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/admin"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-hairline bg-white px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-sunken whitespace-nowrap"
            >
              <SquaresFour className="w-4 h-4 text-accent" weight="bold" />
              <span>Admin Control Center</span>
            </a>
            <div className="flex items-center gap-2 rounded-md border border-hairline bg-white px-2 py-1.5 text-xs transition-colors hover:bg-sunken">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                {session.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden lg:block leading-tight">
                <div className="text-xs font-medium text-ink">{session.name}</div>
                <div className="text-[11px] text-ash capitalize">
                  {session.role.replace("_", " ")}
                </div>
              </div>
              <CaretDown
                className="w-3.5 h-3.5 text-mist hidden sm:block"
                weight="bold"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6 flex-1">
        <motion.div
          className="mx-auto max-w-6xl space-y-6"
          variants={fadeUp}
          initial="hidden"
          animate="show"
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              Admin Control Center
            </h1>
            <p className="text-sm text-ash mt-1">
              Selamat datang, {session.name}. Kelola integrasi aplikasi, pengguna staf, dan cabang ekosistem Mochikin.
            </p>
          </div>

          <Tabs defaultValue="apps" className="w-full space-y-6">
            <div className="border-b border-hairline pb-3">
              <TabsList className="bg-sunken border border-hairline p-1 rounded-lg gap-1.5 h-auto inline-flex">
                <TabsTrigger
                  value="apps"
                  className="gap-2 px-3 py-1.5 text-xs font-semibold rounded-md data-active:bg-white data-active:text-ink data-active:shadow-xs text-ash hover:text-ink transition-all cursor-pointer"
                >
                  <HardDrives className="w-4 h-4 text-accent" weight="duotone" />
                  <span>Koneksi App</span>
                </TabsTrigger>
                <TabsTrigger
                  value="users"
                  className="gap-2 px-3 py-1.5 text-xs font-semibold rounded-md data-active:bg-white data-active:text-ink data-active:shadow-xs text-ash hover:text-ink transition-all cursor-pointer"
                >
                  <UsersThree className="w-4 h-4 text-accent" weight="duotone" />
                  <span>Manajemen User</span>
                  <span className="ml-1 rounded-full bg-sunken px-1.5 py-0.2 text-[10px] text-ash font-medium">
                    {users.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="branches"
                  className="gap-2 px-3 py-1.5 text-xs font-semibold rounded-md data-active:bg-white data-active:text-ink data-active:shadow-xs text-ash hover:text-ink transition-all cursor-pointer"
                >
                  <Storefront className="w-4 h-4 text-accent" weight="duotone" />
                  <span>Manajemen Cabang</span>
                  <span className="ml-1 rounded-full bg-sunken px-1.5 py-0.2 text-[10px] text-ash font-medium">
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
