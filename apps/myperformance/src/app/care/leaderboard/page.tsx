"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Lock,
  ArrowRight,
  Sparkle,
  User,
  Funnel,
} from "@phosphor-icons/react";
import { useSession } from "@/components/session/SessionProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { formatScore } from "@/lib/care/scoring";

interface LeaderboardItem {
  employeeId: string;
  name: string;
  role: string;
  overallAverage: number;
  rank: number;
  predicate: {
    code: string;
    label: string;
    badge: string;
    meaning: string;
  };
}

export default function CareLeaderboardPage() {
  const router = useRouter();
  const { personId, role } = useSession();

  const [loading, setLoading] = useState(true);
  const [isClosed, setIsClosed] = useState(false);
  const [periodLabel, setPeriodLabel] = useState("");
  const [items, setItems] = useState<LeaderboardItem[]>([]);
  const [roleFilter, setRoleFilter] = useState("all");

  const isAdmin =
    role === "role_admin" ||
    role === "super_admin" ||
    role === "role_manager" ||
    role === "role_captain";

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true);
        const res = await fetch("/api/care/leaderboard");
        const json = await res.json();
        if (json.ok && json.data) {
          setIsClosed(Boolean(json.data.isClosed));
          if (json.data.period) {
            setPeriodLabel(json.data.period.label || json.data.period.period_key);
          }
          setItems(json.data.leaderboard || []);
        }
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader kicker="KUALITATIF BUDAYA" title="Leaderboard Budaya CARE" />
        <CardSkeleton />
      </div>
    );
  }

  if (!isClosed) {
    return (
      <div className="space-y-6 pb-20">
        <PageHeader
          kicker="KUALITATIF BUDAYA"
          title="Leaderboard Budaya CARE"
          description="Peringkat evaluasi kualitatif 7 dimensi budaya kerja (skala 1.0–4.0, target 3.0)."
        />

        <div className="rounded-2xl border border-hairline bg-surface p-12 text-center space-y-4 shadow-2xs">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-ash/10 text-ash">
            <Lock className="size-6" />
          </div>
          <h3 className="text-base font-bold text-ink">Ranking Dibuka Setelah Periode Ditutup</h3>
          <p className="text-xs text-ash max-w-md mx-auto leading-relaxed">
            Untuk menjaga independensi dan objektivitas penilaian, papan peringkat dan hasil penilaian budaya CARE hanya akan dipublikasikan setelah periode evaluasi resmi ditutup oleh Manajemen.
          </p>
        </div>
      </div>
    );
  }

  const filteredItems = items.filter((item) => {
    if (roleFilter === "all") return true;
    return item.role.toLowerCase().includes(roleFilter.toLowerCase());
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          kicker="KUALITATIF BUDAYA"
          title={`Leaderboard — ${periodLabel}`}
          description="Peringkat budaya kerja seluruh staf berdasarkan rata-rata agregat 7 dimensi."
          badge={
            <div className="flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/5 px-2.5 py-1 text-xs font-semibold text-accent">
              <Sparkle className="size-3.5" />
              <span>Target Minimal: 3.0 (Solid)</span>
            </div>
          }
        />

        {/* Filter Role */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <Funnel className="size-4 text-ash" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-ink outline-none focus:border-accent"
          >
            <option value="all">Semua Posisi</option>
            <option value="staff">Crew / Staff</option>
            <option value="captain">Captain</option>
            <option value="manager">Manager</option>
          </select>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="rounded-2xl border border-hairline bg-surface shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-canvas border-b border-hairline text-ash uppercase font-semibold">
              <tr>
                <th className="py-3 px-4 w-16 text-center">Rank</th>
                <th className="py-3 px-4">Nama Staf</th>
                <th className="py-3 px-4">Posisi</th>
                <th className="py-3 px-4 text-center">Skor Rata-rata</th>
                <th className="py-3 px-4">Predikat</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {filteredItems.map((item) => {
                const isMe = item.employeeId === personId;
                const canClick = isMe || isAdmin;

                return (
                  <tr
                    key={item.employeeId}
                    onClick={() => {
                      if (canClick) {
                        router.push(isMe ? "/care/profile" : `/care/profile/${item.employeeId}`);
                      }
                    }}
                    className={`transition-colors ${
                      canClick ? "cursor-pointer hover:bg-canvas/60" : "cursor-default"
                    } ${isMe ? "bg-accent/5 font-semibold" : ""}`}
                  >
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                          item.rank === 1
                            ? "bg-amber-400 text-white"
                            : item.rank === 2
                            ? "bg-slate-300 text-slate-800"
                            : item.rank === 3
                            ? "bg-amber-600 text-white"
                            : "text-ash"
                        }`}
                      >
                        {item.rank}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-ink font-bold">{item.name}</span>
                        {isMe && (
                          <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                            SAYA
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-ash capitalize">
                      {item.role.replace("role_", "")}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono font-bold text-ink">
                      {formatScore(item.overallAverage)}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-ink">
                        {item.predicate.badge}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {canClick ? (
                        <span className="inline-flex items-center gap-1 text-accent font-semibold hover:underline">
                          <span>Profil</span>
                          <ArrowRight className="size-3.5" />
                        </span>
                      ) : (
                        <span className="text-ash/50">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
