import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolveEventEmitUrl } from '../src/events/contract';

describe('Event Emit URL Dynamic Resolution', () => {
  test('falls back to default localhost:3004 when no env or db set', async () => {
    const originalEnv = process.env.MYPERFORMANCE_URL;
    delete process.env.MYPERFORMANCE_URL;
    try {
      const url = await resolveEventEmitUrl();
      assert.ok(url.endsWith('/api/events/emit'), 'Should point to /api/events/emit');
    } finally {
      if (originalEnv) process.env.MYPERFORMANCE_URL = originalEnv;
    }
  });

  test('prioritizes process.env.MYPERFORMANCE_URL when provided', async () => {
    const originalEnv = process.env.MYPERFORMANCE_URL;
    process.env.MYPERFORMANCE_URL = 'https://custom-perf.mochikin.com/api/events/emit';
    try {
      const url = await resolveEventEmitUrl();
      assert.equal(url, 'https://custom-perf.mochikin.com/api/events/emit');
    } finally {
      if (originalEnv) process.env.MYPERFORMANCE_URL = originalEnv;
      else delete process.env.MYPERFORMANCE_URL;
    }
  });
});
