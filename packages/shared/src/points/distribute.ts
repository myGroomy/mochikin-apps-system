import { SetMethod } from './types';

export interface SplitOptions {
  decimals?: number;
}

/**
 * Method B: Distribute category total points evenly among items using decimal precision
 * (default 2 decimal places), absorbing any floating-point remainder into the last item
 * so that the sum of the array exactly equals categoryPoints.
 *
 * Example:
 * splitByCategory(7, 5)   -> [1.4, 1.4, 1.4, 1.4, 1.4]
 * splitByCategory(10, 3)  -> [3.33, 3.33, 3.34]
 * splitByCategory(3, 5)   -> [0.6, 0.6, 0.6, 0.6, 0.6]
 * splitByCategory(10, 1)  -> [10]
 * splitByCategory(0, 4)   -> [0, 0, 0, 0]
 * splitByCategory(5, 0)   -> []
 */
export function splitByCategory(
  categoryPoints: number,
  itemCount: number,
  options?: SplitOptions
): number[] {
  if (itemCount <= 0) return [];

  const decimals = options?.decimals ?? 2;
  const factor = Math.pow(10, decimals);
  const totalUnits = Math.max(0, Math.round((Number(categoryPoints) || 0) * factor));

  if (totalUnits === 0) return Array(itemCount).fill(0);

  const baseUnits = Math.floor(totalUnits / itemCount);
  const remainderUnits = totalUnits - baseUnits * itemCount;

  return Array.from({ length: itemCount }, (_, index) => {
    const units = index === itemCount - 1 ? baseUnits + remainderUnits : baseUnits;
    return Number((units / factor).toFixed(decimals));
  });
}

/**
 * Method A: Calculate total category points by summing all item points safely.
 */
export function sumFromItems(points: (number | null | undefined)[], options?: { decimals?: number }): number {
  if (!points || points.length === 0) return 0;
  const decimals = options?.decimals ?? 2;
  const factor = Math.pow(10, decimals);

  const totalUnits = points.reduce<number>((acc, curr) => {
    if (curr === null || curr === undefined || isNaN(Number(curr))) return acc;
    const safeVal = Math.max(0, Number(curr));
    return acc + Math.round(safeVal * factor);
  }, 0);

  return Number((totalUnits / factor).toFixed(decimals));
}

/**
 * Universal distribution calculator based on chosen SetMethod.
 */
export function distributePoints(
  method: SetMethod,
  categoryPointsInput: number,
  existingItemPoints: number[],
  options?: SplitOptions
): { totalPoints: number; distributedPoints: number[] } {
  const itemCount = existingItemPoints.length;
  if (itemCount === 0) {
    const safeTotal = Math.max(0, Number(categoryPointsInput) || 0);
    return {
      totalPoints: safeTotal,
      distributedPoints: [],
    };
  }

  if (method === 'per_category') {
    const distributed = splitByCategory(categoryPointsInput, itemCount, options);
    return {
      totalPoints: sumFromItems(distributed, options),
      distributedPoints: distributed,
    };
  }

  // Method A (per_item)
  const safeItems = existingItemPoints.map((p) => Math.max(0, Number(p) || 0));
  return {
    totalPoints: sumFromItems(safeItems, options),
    distributedPoints: safeItems,
  };
}
