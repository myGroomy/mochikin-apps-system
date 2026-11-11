/**
 * Logic murni kalkulasi penilaian CARE Right People.
 * Tanpa dependensi database atau Next.js (mudah di-unit-test).
 */

export interface PredicateInfo {
  code: 'orang_tepat' | 'solid' | 'berkembang' | 'butuh_support';
  label: string;
  badge: string;
  meaning: string;
}

export const PREDICATES: Record<string, PredicateInfo> = {
  orang_tepat: {
    code: 'orang_tepat',
    label: 'Orang Tepat',
    badge: '🌟 Orang Tepat',
    meaning: 'Hidup nilai CARE, performa excellent. Pertimbangkan tanggung jawab lebih besar atau mentor.',
  },
  solid: {
    code: 'solid',
    label: 'Solid',
    badge: '✅ Solid',
    meaning: 'Konsisten dan andal. Fokus pengembangan 1 area terlemah.',
  },
  berkembang: {
    code: 'berkembang',
    label: 'Berkembang',
    badge: '📈 Berkembang',
    meaning: 'Butuh coaching rutin, support sistem, target konkret 30-60 hari.',
  },
  butuh_support: {
    code: 'butuh_support',
    label: 'Butuh Support',
    badge: '⚠️ Butuh Support',
    meaning: 'Perlu perhatian serius. Evaluasi kesesuaian posisi. Sesi 1:1 segera.',
  },
};

/**
 * Menghitung predikat dari angka mentah (tanpa pembulatan).
 * Ambang batas:
 * >= 3.5           -> Orang Tepat
 * 2.5 <= x < 3.5   -> Solid
 * 1.5 <= x < 2.5   -> Berkembang
 * < 1.5            -> Butuh Support
 */
export function getPredicate(rawScore: number): PredicateInfo {
  if (rawScore >= 3.5) return PREDICATES.orang_tepat;
  if (rawScore >= 2.5) return PREDICATES.solid;
  if (rawScore >= 1.5) return PREDICATES.berkembang;
  return PREDICATES.butuh_support;
}

/**
 * Format angka 1 desimal untuk tampilan.
 */
export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined || isNaN(score)) return '—';
  return (Math.round(score * 10) / 10).toFixed(1);
}

export interface DimensionScoreInput {
  dimensionId: string;
  score: number;
}

export interface RateeDimensionAverage {
  dimensionId: string;
  average: number;
  count: number;
}

/**
 * Menghitung rata-rata skor per dimensi dari sekumpulan penilaian yang sudah valid/submitted.
 */
export function calculateDimensionAverages(
  evaluations: Array<{ dimensionId: string; score: number }>
): Record<string, RateeDimensionAverage> {
  const groups: Record<string, number[]> = {};

  for (const ev of evaluations) {
    if (!groups[ev.dimensionId]) {
      groups[ev.dimensionId] = [];
    }
    groups[ev.dimensionId].push(ev.score);
  }

  const result: Record<string, RateeDimensionAverage> = {};
  for (const [dimId, scores] of Object.entries(groups)) {
    const sum = scores.reduce((a, b) => a + b, 0);
    const avg = sum / scores.length;
    result[dimId] = {
      dimensionId: dimId,
      average: avg,
      count: scores.length,
    };
  }

  return result;
}

/**
 * Menghitung rata-rata keseluruhan (mean dari rata-rata dimensi).
 */
export function calculateOverallAverage(dimensionAverages: Record<string, RateeDimensionAverage>): number {
  const values = Object.values(dimensionAverages);
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, curr) => acc + curr.average, 0);
  return sum / values.length;
}

/**
 * Menentukan 2 Kekuatan Utama (tertinggi) dan 2 Fokus Pengembangan (terendah).
 * Jika ada nilai seri (tie), urutan dimensi awal dipertahankan.
 */
export function calculateStrengthsAndFocus(
  dimensionAverages: Record<string, RateeDimensionAverage>,
  dimensionOrder?: string[]
): { strengths: string[]; focus: string[] } {
  const entries = Object.values(dimensionAverages);
  if (entries.length === 0) {
    return { strengths: [], focus: [] };
  }

  // Sort descending by average
  const sorted = [...entries].sort((a, b) => {
    if (b.average !== a.average) {
      return b.average - a.average;
    }
    if (dimensionOrder) {
      return dimensionOrder.indexOf(a.dimensionId) - dimensionOrder.indexOf(b.dimensionId);
    }
    return a.dimensionId.localeCompare(b.dimensionId);
  });

  const strengths = sorted.slice(0, 2).map((s) => s.dimensionId);

  // Fokus pengembangan: 2 terbawah
  const reverseSorted = [...entries].sort((a, b) => {
    if (a.average !== b.average) {
      return a.average - b.average;
    }
    if (dimensionOrder) {
      return dimensionOrder.indexOf(a.dimensionId) - dimensionOrder.indexOf(b.dimensionId);
    }
    return a.dimensionId.localeCompare(b.dimensionId);
  });

  const focus = reverseSorted.slice(0, 2).map((f) => f.dimensionId);

  return { strengths, focus };
}

export interface LeaderboardItem {
  employeeId: string;
  name: string;
  role: string;
  overallAverage: number;
  rank: number;
  predicate: PredicateInfo;
}

/**
 * Competition ranking (1, 2, 2, 4) berdasarkan overallAverage mentah menurun.
 */
export function calculateLeaderboard(
  candidates: Array<{ employeeId: string; name: string; role: string; overallAverage: number }>
): LeaderboardItem[] {
  // Sort descending by raw score
  const sorted = [...candidates].sort((a, b) => b.overallAverage - a.overallAverage);

  const result: LeaderboardItem[] = [];
  let currentRank = 1;

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].overallAverage < sorted[i - 1].overallAverage) {
      currentRank = i + 1;
    }

    result.push({
      employeeId: sorted[i].employeeId,
      name: sorted[i].name,
      role: sorted[i].role,
      overallAverage: sorted[i].overallAverage,
      rank: currentRank,
      predicate: getPredicate(sorted[i].overallAverage),
    });
  }

  return result;
}

/**
 * Menghitung tren selisih skor dengan periode sebelumnya.
 */
export function calculateTrend(currentAvg: number, previousAvg: number | null | undefined): {
  diff: number | null;
  direction: 'up' | 'down' | 'same' | 'none';
} {
  if (previousAvg === null || previousAvg === undefined || isNaN(previousAvg)) {
    return { diff: null, direction: 'none' };
  }

  const diff = Math.round((currentAvg - previousAvg) * 10) / 10;
  if (diff > 0) return { diff, direction: 'up' };
  if (diff < 0) return { diff, direction: 'down' };
  return { diff: 0, direction: 'same' };
}
