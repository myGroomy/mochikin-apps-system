import { describe, it, expect } from 'vitest';
import {
  getPredicate,
  formatScore,
  calculateDimensionAverages,
  calculateOverallAverage,
  calculateStrengthsAndFocus,
  calculateLeaderboard,
  calculateTrend,
} from '../src/lib/care/scoring';

describe('CARE Scoring System (Right People)', () => {
  describe('Predicate Calculation (Batas Ambang)', () => {
    it('determines Orang Tepat for >= 3.5', () => {
      expect(getPredicate(3.5).code).toBe('orang_tepat');
      expect(getPredicate(3.8).code).toBe('orang_tepat');
      expect(getPredicate(4.0).code).toBe('orang_tepat');
    });

    it('determines Solid for 2.5 <= x < 3.5', () => {
      expect(getPredicate(3.49).code).toBe('solid');
      expect(getPredicate(3.0).code).toBe('solid');
      expect(getPredicate(2.5).code).toBe('solid');
    });

    it('determines Berkembang for 1.5 <= x < 2.5', () => {
      expect(getPredicate(2.49).code).toBe('berkembang');
      expect(getPredicate(2.0).code).toBe('berkembang');
      expect(getPredicate(1.5).code).toBe('berkembang');
    });

    it('determines Butuh Support for < 1.5', () => {
      expect(getPredicate(1.49).code).toBe('butuh_support');
      expect(getPredicate(1.0).code).toBe('butuh_support');
      expect(getPredicate(0.0).code).toBe('butuh_support');
    });
  });

  describe('Display Formatting', () => {
    it('formats numbers to 1 decimal place without affecting raw values', () => {
      expect(formatScore(3.44)).toBe('3.4');
      expect(formatScore(3.46)).toBe('3.5');
      expect(formatScore(null)).toBe('—');
    });
  });

  describe('Dimension & Overall Averages', () => {
    it('calculates averages per dimension and overall', () => {
      const evaluations = [
        { dimensionId: 'teamwork', score: 3 },
        { dimensionId: 'teamwork', score: 4 },
        { dimensionId: 'komunikasi', score: 2 },
        { dimensionId: 'komunikasi', score: 4 },
      ];

      const dimAvg = calculateDimensionAverages(evaluations);
      expect(dimAvg['teamwork'].average).toBe(3.5);
      expect(dimAvg['teamwork'].count).toBe(2);
      expect(dimAvg['komunikasi'].average).toBe(3.0);
      expect(dimAvg['komunikasi'].count).toBe(2);

      const overall = calculateOverallAverage(dimAvg);
      expect(overall).toBe(3.25);
    });
  });

  describe('Strengths & Focus Areas', () => {
    it('identifies top 2 strengths and bottom 2 focus areas', () => {
      const dimAvg = {
        teamwork: { dimensionId: 'teamwork', average: 3.8, count: 5 },
        komunikasi: { dimensionId: 'komunikasi', average: 3.2, count: 5 },
        inisiatif: { dimensionId: 'inisiatif', average: 2.5, count: 5 },
        disiplin: { dimensionId: 'disiplin', average: 3.9, count: 5 },
        service: { dimensionId: 'service', average: 2.1, count: 5 },
        care: { dimensionId: 'care', average: 3.0, count: 5 },
        growth: { dimensionId: 'growth', average: 3.5, count: 5 },
      };

      const { strengths, focus } = calculateStrengthsAndFocus(dimAvg);
      expect(strengths).toEqual(['disiplin', 'teamwork']);
      expect(focus).toEqual(['service', 'inisiatif']);
    });
  });

  describe('Competition Ranking with Ties', () => {
    it('assigns ranks 1, 2, 2, 4 for ties', () => {
      const candidates = [
        { employeeId: 'A', name: 'Alice', role: 'Staff', overallAverage: 3.8 },
        { employeeId: 'B', name: 'Bob', role: 'Staff', overallAverage: 3.5 },
        { employeeId: 'C', name: 'Charlie', role: 'Staff', overallAverage: 3.5 },
        { employeeId: 'D', name: 'David', role: 'Staff', overallAverage: 3.0 },
      ];

      const ranked = calculateLeaderboard(candidates);
      expect(ranked[0].rank).toBe(1);
      expect(ranked[0].employeeId).toBe('A');

      expect(ranked[1].rank).toBe(2);
      expect(ranked[1].employeeId).toBe('B');

      expect(ranked[2].rank).toBe(2);
      expect(ranked[2].employeeId).toBe('C');

      expect(ranked[3].rank).toBe(4);
      expect(ranked[3].employeeId).toBe('D');
    });
  });

  describe('Trend Calculation', () => {
    it('computes positive, negative, and zero differences', () => {
      expect(calculateTrend(3.5, 3.2)).toEqual({ diff: 0.3, direction: 'up' });
      expect(calculateTrend(3.0, 3.4)).toEqual({ diff: -0.4, direction: 'down' });
      expect(calculateTrend(3.2, 3.2)).toEqual({ diff: 0, direction: 'same' });
      expect(calculateTrend(3.2, null)).toEqual({ diff: null, direction: 'none' });
    });
  });
});
