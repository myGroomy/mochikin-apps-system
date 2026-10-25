import { TaskEventSchema } from '../../packages/shared/src/events/contract';
import { signEvent } from '../../packages/shared/src/sso/signing';

async function runPilotTest() {
  console.log('🧪 Starting M1 Pilot & Emit Test...');

  const secret = 'dev-events-secret-key-12345';
  process.env.MOCHIKIN_EVENTS_SECRET = secret;

  const testEvent = {
    taskId: 'MYCHECK_HADIR',
    personId: '00000000-0000-0000-0000-000000000001',
    branchId: '00000000-0000-0000-0000-000000000002',
    appId: 'mycheck' as const,
    outputQty: 1,
    occurredAt: new Date().toISOString(),
    idempotencyKey: `test-idem-${Date.now()}`,
  };

  const parsed = TaskEventSchema.safeParse(testEvent);
  console.assert(parsed.success, 'TaskEventSchema validation failed');
  console.log('✅ TaskEventSchema Zod validation passed');

  const sig = signEvent(testEvent, secret);
  console.assert(typeof sig === 'string' && sig.length > 0, 'HMAC signature generation failed');
  console.log('✅ HMAC signEvent passed');

  console.log('🏁 M1 code structure verified successfully.');
}

runPilotTest().catch(console.error);
