import { SetMethod } from './types';

/**
 * Method B: Distribute category total points evenly among items using integer floor,
 * assigning the remainder to the last item.
 *
 * Example:
 * splitByCategory(10, 3) -> [3, 3, 4]
 * splitByCategory(10, 1) -> [10]
 * splitByCategory(0, 4)  -> [0, 0, 0, 0]
 */
export function splitByCategory(categoryPoints: number, itemCount: number): number[] {
  if (itemCount <= 0) return [];
  const safeTotal = Math.max(0, Math.round(categoryPoints));
  if (safeTotal === 0) return Array(itemCount).fill(0);

  const base = Math.floor(safeTotal / itemCount);
  const remainder = safeTotal - base * itemCount;

  return Array.from({ length: itemCount }, (_, index) => {
    return index === itemCount - 1 ? base + remainder : base;
  });
}

/**
 * Method A: Calculate total category points by summing all item points.
 */
export function sumFromItems(points: number[]): number {
  if (!points || points.length === 0) return 0;
  return points.reduce((acc, curr) => acc + Math.max(0, Number(curr) || 0), 0);
}

/**
 * Universal distribution calculator based on chosen SetMethod.
 */
export function distributePoints(
  method: SetMethod,
  categoryPointsInput: number,
  existingItemPoints: number[]
): { totalPoints: number; distributedPoints: number[] } {
  const itemCount = existingItemPoints.length;
  if (itemCount === 0) {
    return {
      totalPoints: Math.max(0, categoryPointsInput || 0),
      distributedPoints: [],
    };
  }

  if (method === 'per_category') {
    const distributed = splitByCategory(categoryPointsInput, itemCount);
    return {
      totalPoints: sumFromItems(distributed),
      distributedPoints: distributed,
    };
  }

  // Method A (per_item)
  const safeItems = existingItemPoints.map((p) => Math.max(0, Number(p) || 0));
  return {
    totalPoints: sumFromItems(safeItems),
    distributedPoints: safeItems,
  };
}
