import { createHash } from 'crypto';
import { getSupabase } from './supabase';

export function dedupNotificationId(dedupKey: string, userId: string): string {
  const hash = createHash('sha1').update(`${dedupKey}::${userId}`).digest('hex').slice(0, 32);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export interface NotificationTarget {
  userId: string;
}

async function personIdFor(userId: string): Promise<string> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
  const { data, error } = await getSupabase()
    .from('people')
    .select('id')
    .eq(isUuid ? 'id' : 'username', userId)
    .maybeSingle();
  if (error) throw new Error(`Supabase notification recipient lookup failed: ${error.message}`);
  if (!data) throw new Error(`Notification recipient not found: ${userId}`);
  return data.id;
}

export async function pushNotificationDedup(
  branchId: string,
  input: {
    userId: string;
    type: string;
    title: string;
    body: string;
    link?: string;
    dedupKey?: string;
  }
): Promise<boolean> {
  const userId = await personIdFor(input.userId);
  const { error } = await getSupabase().from('mycheck_notifications').insert({
    user_id: userId,
    branch_id: branchId,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link ?? null,
    dedup_key: input.dedupKey || null,
  });
  if (error?.code === '23505' && input.dedupKey) return false;
  if (error) throw new Error(`Supabase notification creation failed: ${error.message}`);
  return true;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function branchUuid(branchId: string): Promise<string> {
  const { data, error } = await getSupabase()
    .from('branches')
    .select('id')
    .eq(isUuid(branchId) ? 'id' : 'code', branchId)
    .maybeSingle();
  if (error) throw new Error(`Supabase branch lookup failed: ${error.message}`);
  if (!data) throw new Error(`Branch not found: ${branchId}`);
  return data.id;
}

export async function branchUserIds(branchId: string, excludeUserId: string): Promise<string[]> {
  const id = await branchUuid(branchId);
  const [{ data: people, error: peopleError }, { data: members, error: membersError }] = await Promise.all([
    getSupabase().from('people').select('id').eq('branch_id', id).eq('status', 'active').is('deleted_at', null),
    getSupabase().from('branch_members').select('person_id').eq('branch_id', id).eq('is_active', true),
  ]);
  if (peopleError) throw new Error(`Supabase branch people lookup failed: ${peopleError.message}`);
  if (membersError) throw new Error(`Supabase branch member lookup failed: ${membersError.message}`);
  const ids = [...new Set([...(people ?? []).map((person) => person.id), ...(members ?? []).map((member) => member.person_id)])];
  if (!ids.length) return [];
  const { data, error } = await getSupabase().from('people').select('id').in('id', ids);
  if (error) throw new Error(`Supabase branch recipient lookup failed: ${error.message}`);
  return (data ?? []).map((person) => person.id).filter((personId) => personId !== excludeUserId);
}

interface EventBase {
  spreadsheetId: string;
  branchId: string;
  shiftInstanceId: string;
  actorId: string;
  actorName: string;
  shiftName: string;
  link?: string;
}

export async function notifyShiftOpened(base: EventBase): Promise<void> {
  const targets = await branchUserIds(base.branchId, base.actorId);
  await Promise.all(targets.map((userId) => pushNotificationDedup(base.spreadsheetId, {
    userId,
    type: 'shift_open',
    title: 'Shift dibuka',
    body: `${base.actorName} membuka shift ${base.shiftName}.`,
    link: base.link ?? `/shift/${base.shiftInstanceId}`,
    dedupKey: `shift_open:${base.shiftInstanceId}:${userId}`,
  })));
}

export async function notifyShiftClosed(base: EventBase): Promise<void> {
  const { data: participants, error } = await getSupabase()
    .from('mycheck_shift_participants')
    .select('user_id')
    .eq('shift_instance_id', base.shiftInstanceId);
  if (error) throw new Error(`Supabase shift participant lookup failed: ${error.message}`);
  const targets = [...new Set((participants ?? []).map((participant) => participant.user_id))]
    .filter((userId) => userId !== base.actorId);
  await Promise.all(targets.map((userId) => pushNotificationDedup(base.spreadsheetId, {
    userId,
    type: 'shift_close',
    title: 'Shift ditutup',
    body: `${base.actorName} menutup shift ${base.shiftName}.`,
    link: base.link ?? '/report',
    dedupKey: `shift_close:${base.shiftInstanceId}:${userId}`,
  })));
}

export async function notifyEntryDone(base: {
  spreadsheetId: string;
  shiftInstanceId: string;
  pjUserId: string;
  workerUserId: string;
  workerName: string;
  pointRef: string;
  pointTitle: string;
  link?: string;
}): Promise<void> {
  if (base.workerUserId === base.pjUserId) return;
  await pushNotificationDedup(base.spreadsheetId, {
    userId: base.pjUserId,
    type: 'entry_done',
    title: 'Item checklist dikerjakan',
    body: `${base.workerName} mengisi item ${base.pointTitle}.`,
    link: base.link ?? `/shift/${base.shiftInstanceId}`,
    dedupKey: `entry_done:${base.pointRef}:${base.workerUserId}`,
  });
}

export async function notifySync(base: {
  spreadsheetId: string;
  shiftInstanceId: string;
  scopeIds: string[];
  status: 'berhasil' | 'tersinkron_ulang' | 'gagal';
  detail?: string;
  link?: string;
}): Promise<void> {
  const type = `sync_${base.status}`;
  const title = base.status === 'berhasil'
    ? 'Sinkronisasi berhasil'
    : base.status === 'tersinkron_ulang'
      ? 'Shift tersinkron ulang'
      : 'Sinkronisasi gagal';
  await Promise.all(base.scopeIds.map((userId) => pushNotificationDedup(base.spreadsheetId, {
    userId,
    type,
    title,
    body: base.detail ?? title,
    link: base.link ?? `/shift/${base.shiftInstanceId}`,
    dedupKey: `${type}:${base.shiftInstanceId}:${userId}`,
  })));
}

export async function shiftParticipantIds(_branchId: string, shiftInstanceId: string): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from('mycheck_shift_participants')
    .select('user_id')
    .eq('shift_instance_id', shiftInstanceId);
  if (error) throw new Error(`Supabase shift participant lookup failed: ${error.message}`);
  return [...new Set((data ?? []).map((participant) => participant.user_id))];
}
