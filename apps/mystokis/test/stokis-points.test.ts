import assert from 'node:assert/strict';
import test from 'node:test';
import { calibrateItemTier } from '../lib/domain/sync-dim-items';
import { partitionOpnameLines } from '../lib/domain/stokis-points';

test('partitionOpnameLines distributes every line once across contributors', () => {
  const lines = Array.from({ length: 5 }, (_, id) => ({ id: String(id) }));
  const result = partitionOpnameLines(lines, [{ id: 'a' }, { id: 'b' }]);

  assert.deepEqual(result.get('a')?.map((line) => line.id), ['0', '1', '2']);
  assert.deepEqual(result.get('b')?.map((line) => line.id), ['3', '4']);
  assert.equal(Array.from(result.values()).flat().length, lines.length);
});

test('calibrateItemTier preserves an explicitly configured zero weight', () => {
  assert.equal(calibrateItemTier({ Point: 0 }).weight, 0);
});
