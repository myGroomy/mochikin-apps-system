import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPin, verifyPin } from '../lib/pin';

test('PIN hashes are salted and verify only the matching PIN', () => {
  const first = hashPin('123456');
  const second = hashPin('123456');

  assert.notEqual(first, second);
  assert.equal(verifyPin('123456', first), true);
  assert.equal(verifyPin('654321', first), false);
  assert.equal(verifyPin('123456', '123456'), false);
});
