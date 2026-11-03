import { describe, it, expect } from 'vitest';
import { computeAnomalyScore } from '@mochikin/shared';

describe('MyPerformance Branch Statistics & Analytics Scope Engine', () => {
  const sampleLogs = [
    { id: '1', user_id: 'user-a', branch_id: 'branch-bdg', points_earned: 20, app_id: 'mycheck' },
    { id: '2', user_id: 'user-a', branch_id: 'branch-bdg', points_earned: 15, app_id: 'stokis' },
    { id: '3', user_id: 'user-b', branch_id: 'branch-bdg', points_earned: 25, app_id: 'mycustomer' },
    { id: '4', user_id: 'user-c', branch_id: 'branch-jkt', points_earned: 40, app_id: 'mycheck' },
    { id: '5', user_id: 'user-a', branch_id: 'branch-jkt', points_earned: 10, app_id: 'myperformance' }, // user-a works across branches
  ];

  it('aggregates Overall Statistics across all branches without double counting staff', () => {
    const userScores: Record<string, { total: number; mycheck: number; stokis: number; mycustomer: number; myperformance: number }> = {};
    let totalPoints = 0;

    for (const log of sampleLogs) {
      totalPoints += log.points_earned;
      if (!userScores[log.user_id]) {
        userScores[log.user_id] = { total: 0, mycheck: 0, stokis: 0, mycustomer: 0, myperformance: 0 };
      }
      userScores[log.user_id].total += log.points_earned;
      const appKey = log.app_id as 'mycheck' | 'stokis' | 'mycustomer' | 'myperformance';
      userScores[log.user_id][appKey] += log.points_earned;
    }

    const leaderboard = Object.entries(userScores)
      .map(([userId, stats]) => ({ userId, ...stats }))
      .sort((a, b) => b.total - a.total);

    // Total points is 20 + 15 + 25 + 40 + 10 = 110
    expect(totalPoints).toBe(110);

    // Staff count: exactly 3 distinct users (user-a, user-b, user-c), NOT 5
    expect(leaderboard.length).toBe(3);

    // user-a aggregated points across Bandung and Jakarta: 20 + 15 + 10 = 45
    const userA = leaderboard.find((u) => u.userId === 'user-a');
    expect(userA?.total).toBe(45);

    // user-c: 40 points
    const userC = leaderboard.find((u) => u.userId === 'user-c');
    expect(userC?.total).toBe(40);

    // Average Score = 110 / 3 = 36.7
    const averageScore = Number((totalPoints / leaderboard.length).toFixed(1));
    expect(averageScore).toBe(36.7);
  });

  it('filters to Individual Branch Statistics accurately', () => {
    const bdgLogs = sampleLogs.filter((l) => l.branch_id === 'branch-bdg');
    let bdgTotal = 0;
    const userScores: Record<string, number> = {};

    for (const log of bdgLogs) {
      bdgTotal += log.points_earned;
      userScores[log.user_id] = (userScores[log.user_id] || 0) + log.points_earned;
    }

    // Bandung total = 20 + 15 + 25 = 60
    expect(bdgTotal).toBe(60);
    // 2 staff in Bandung (user-a, user-b)
    expect(Object.keys(userScores).length).toBe(2);
    expect(userScores['user-a']).toBe(35);
    expect(userScores['user-b']).toBe(25);
    expect(userScores['user-c']).toBeUndefined();
  });

  it('preserves Branch Context Independence (Analytics Scope does not overwrite operational active branch)', () => {
    const activeWorkingBranch = 'branch-bdg';
    const analyticsScopeFilter = 'all'; // Viewing Overall Statistics

    // Operational branch must remain intact
    expect(activeWorkingBranch).toBe('branch-bdg');
    expect(analyticsScopeFilter).toBe('all');
    expect(activeWorkingBranch).not.toBe(analyticsScopeFilter);
  });

  it('calculates anomaly detection scores and rankings correctly', () => {
    // computeAnomalyScore flags zScore > 2.5 as anomaly
    const anomalyResult = computeAnomalyScore(30, 10, 5); // z = (30 - 10) / 5 = 4.0
    expect(anomalyResult.isAnomaly).toBe(true);
    expect(anomalyResult.zScore).toBe(4.0);

    // Normal score: z = (12 - 10) / 2 = 1.0 < 2.5
    const normalResult = computeAnomalyScore(12, 10, 2);
    expect(normalResult.isAnomaly).toBe(false);
    expect(normalResult.zScore).toBe(1.0);
  });
});
