import { describe, it } from 'node:test';
import assert from 'node:assert';
import { emitTaskEvent } from '../src/events/contract';

const event = {
  taskId: 'MYCHECK_SHIFT_CLOSE',
  personId: '00000000-0000-0000-0000-000000000001',
  branchId: '00000000-0000-0000-0000-000000000001',
  appId: 'mycheck' as const,
  outputQty: 1,
  occurredAt: '2026-11-06T08:00:00.000Z',
  idempotencyKey: 'mycheck-close-test-001',
};

describe('Task event emitter', () => {
  it('requires explicit production endpoint and secret', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalEndpoint = process.env.MYPERFORMANCE_URL;
    const originalSecret = process.env.MOCHIKIN_EVENTS_SECRET;
    const originalFetch = globalThis.fetch;
    let fetchCalled = false;

    process.env.NODE_ENV = 'production';
    delete process.env.MYPERFORMANCE_URL;
    delete process.env.MOCHIKIN_EVENTS_SECRET;
    globalThis.fetch = (async () => {
      fetchCalled = true;
      return new Response('{}', { status: 200 });
    }) as typeof fetch;

    try {
      const result = await emitTaskEvent(event);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.code, 'CONFIGURATION_ERROR');
      assert.strictEqual(fetchCalled, false);
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      if (originalEndpoint === undefined) delete process.env.MYPERFORMANCE_URL;
      else process.env.MYPERFORMANCE_URL = originalEndpoint;
      if (originalSecret === undefined) delete process.env.MOCHIKIN_EVENTS_SECRET;
      else process.env.MOCHIKIN_EVENTS_SECRET = originalSecret;
      globalThis.fetch = originalFetch;
    }
  });

  it('returns a failed result when MyPerformance rejects the event', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'TASK_NOT_FOUND', message: 'Task tidak ditemukan' },
        }),
        { status: 422 }
      )) as typeof fetch;

    try {
      const result = await emitTaskEvent(
        event,
        'https://myperformance.example/api/events/emit',
        'test-events-secret'
      );
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.status, 422);
      assert.strictEqual(result.code, 'TASK_NOT_FOUND');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
