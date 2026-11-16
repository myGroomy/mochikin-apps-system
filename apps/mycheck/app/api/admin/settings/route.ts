import { NextResponse } from 'next/server';
import { requireRole, withAuth } from '../../../../lib/api-auth';
import {
  SETTINGS_CATALOG,
  coerceSettingValue,
  getSettingDefinition,
  validateSettingValue,
} from '../../../../lib/admin/settings-catalog';
import { listGlobalSettings, writeGlobalSettings } from '../../../../lib/db/settings';

export const GET = // eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
withAuth(async (_req, ctx, _session) => {
  const roleErr = requireRole(ctx, 'admin');
  if (roleErr) return roleErr;

  const stored = await listGlobalSettings();

  const settings = SETTINGS_CATALOG.map((def) => {
    const row = stored.find((s) => s.key === def.key);
    const raw = row?.value ?? def.value;
    return {
      key: def.key,
      value: coerceSettingValue(def.valueType, raw),
      valueType: def.valueType,
      description: def.description,
      updatedBy: row?.updated_by ?? null,
      updatedAt: row?.updated_at ?? null,
    };
  });

  return NextResponse.json({ settings });
});

export const PUT = // eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
withAuth(async (_req, ctx, _session) => {
  const roleErr = requireRole(ctx, 'admin');
  if (roleErr) return roleErr;

  let body: unknown;
  try {
    body = await _req.json();
  } catch {
    return NextResponse.json({ error: 'Body harus berupa JSON' }, { status: 400 });
  }

  const incoming = (body as { settings?: { key?: string; value?: unknown }[] })?.settings;
  if (!Array.isArray(incoming) || incoming.length === 0) {
    return NextResponse.json(
      { error: 'Body harus berisi { settings: [{ key, value }, ...] }' },
      { status: 400 }
    );
  }

  // Validasi semua nilai dulu sebelum menulis apa pun
  const updates: { key: string; value: string; updatedBy: string }[] = [];
  const seen = new Set<string>();
  for (const item of incoming) {
    const key = String(item.key ?? '');
    if (seen.has(key)) {
      return NextResponse.json({ error: `Pengaturan '${key}' dikirim lebih dari sekali.` }, { status: 400 });
    }
    seen.add(key);
    const def = getSettingDefinition(key);
    if (!def) {
      return NextResponse.json(
        { error: `Pengaturan '${key}' tidak dikenal.` },
        { status: 400 }
      );
    }
    const raw =
      typeof item.value === 'boolean'
        ? item.value
          ? 'TRUE'
          : 'FALSE'
        : String(item.value ?? '');

    const invalid = validateSettingValue(def, raw);
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }
    updates.push({ key, value: raw, updatedBy: ctx.user.id });
  }

  await writeGlobalSettings(updates);

  return NextResponse.json({ message: 'Pengaturan berhasil diperbarui' });
});