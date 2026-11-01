import { PointLog, ReportContributor } from './types';

export interface UserPointAggregate {
  userId: string;
  userName?: string;
  totalPoints: number;
  itemsCount: number;
  byActivity: Record<string, number>;
  byApp: Record<string, number>;
}

/**
 * Aggregates point logs by user.
 */
export function aggregatePointsByUser(logs: PointLog[]): Map<string, UserPointAggregate> {
  const map = new Map<string, UserPointAggregate>();

  for (const log of logs) {
    if (!log.user_id) continue;
    const existing = map.get(log.user_id) ?? {
      userId: log.user_id,
      userName: log.user_name,
      totalPoints: 0,
      itemsCount: 0,
      byActivity: {},
      byApp: {},
    };

    const earned = Number(log.points_earned) || 0;
    existing.totalPoints += earned;
    existing.itemsCount += 1;

    existing.byActivity[log.activity_type] = (existing.byActivity[log.activity_type] || 0) + earned;
    existing.byApp[log.app_id] = (existing.byApp[log.app_id] || 0) + earned;

    map.set(log.user_id, existing);
  }

  return map;
}

/**
 * Calculates contributor breakdown for a completed shift or SO report.
 */
export function calculateReportContributors(
  reportId: string,
  executedItems: { userId: string; userName?: string; points: number }[]
): ReportContributor[] {
  const userMap = new Map<string, { points: number; count: number; name?: string }>();

  for (const item of executedItems) {
    if (!item.userId) continue;
    const current = userMap.get(item.userId) ?? { points: 0, count: 0, name: item.userName };
    current.points += Math.max(0, Number(item.points) || 0);
    current.count += 1;
    if (item.userName && !current.name) current.name = item.userName;
    userMap.set(item.userId, current);
  }

  const results: ReportContributor[] = [];
  for (const [userId, val] of userMap.entries()) {
    results.push({
      report_id: reportId,
      user_id: userId,
      user_name: val.name,
      points_earned: val.points,
      items_count: val.count,
    });
  }

  return results.sort((a, b) => b.points_earned - a.points_earned);
}

/**
 * Computes statistical Z-score anomaly detection for anti-fraud monitoring.
 * A zScore > 2.5 indicates high outlier activity compared to peers.
 */
export function computeAnomalyScore(
  userPoints: number,
  branchMean: number,
  branchStdDev: number
): { isAnomaly: boolean; zScore: number } {
  if (branchStdDev <= 0) {
    return { isAnomaly: false, zScore: 0 };
  }

  const zScore = (userPoints - branchMean) / branchStdDev;
  const isAnomaly = zScore > 2.5;

  return { isAnomaly, zScore: Number(zScore.toFixed(2)) };
}
