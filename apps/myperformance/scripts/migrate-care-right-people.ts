import { Client } from 'pg';
import * as path from 'path';

const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL;

async function run() {
  if (!connectionString) {
    throw new Error('Database connection string not found in environment');
  }

  const cleanConnectionString = connectionString
    .replace(/([?&])sslmode=[^&]+(&|$)/, '$1')
    .replace(/[?&]$/, '');

  const client = new Client({
    connectionString: cleanConnectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log('Connected to PostgreSQL database');

  await client.query(`
    CREATE TABLE IF NOT EXISTS care_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS care_dimensions (
      dimension_id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      icon TEXT,
      sort_order INT DEFAULT 0,
      bars_1 TEXT NOT NULL,
      bars_2 TEXT NOT NULL,
      bars_3 TEXT NOT NULL,
      bars_4 TEXT NOT NULL,
      active BOOLEAN DEFAULT true
    );

    CREATE TABLE IF NOT EXISTS care_periods (
      period_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      period_key TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'closed')),
      opened_at TIMESTAMPTZ,
      closed_at TIMESTAMPTZ,
      participants_json JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS care_submissions (
      submission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      period_id UUID NOT NULL REFERENCES care_periods(period_id) ON DELETE CASCADE,
      rater_id UUID NOT NULL REFERENCES people(id),
      status TEXT NOT NULL CHECK (status IN ('draft', 'submitted')),
      updated_at TIMESTAMPTZ DEFAULT now(),
      submitted_at TIMESTAMPTZ,
      UNIQUE (period_id, rater_id)
    );

    CREATE TABLE IF NOT EXISTS care_assessments_rp (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      period_id UUID NOT NULL REFERENCES care_periods(period_id) ON DELETE CASCADE,
      rater_id UUID NOT NULL REFERENCES people(id),
      ratee_id UUID NOT NULL REFERENCES people(id),
      dimension_id TEXT NOT NULL REFERENCES care_dimensions(dimension_id),
      score INT NOT NULL CHECK (score >= 1 AND score <= 4),
      note TEXT,
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE (period_id, rater_id, ratee_id, dimension_id)
    );

    CREATE TABLE IF NOT EXISTS care_complaints (
      complaint_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      period_id UUID NOT NULL REFERENCES care_periods(period_id) ON DELETE CASCADE,
      reporter_id UUID NOT NULL REFERENCES people(id),
      category TEXT DEFAULT 'Lainnya',
      text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'discussed', 'resolved')),
      created_at TIMESTAMPTZ DEFAULT now(),
      ito_issue_id UUID
    );

    CREATE TABLE IF NOT EXISTS care_ito_issues (
      ito_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      issue TEXT NOT NULL,
      reporter_id UUID REFERENCES people(id),
      date DATE DEFAULT CURRENT_DATE,
      priority TEXT DEFAULT 'Sedang' CHECK (priority IN ('Rendah', 'Sedang', 'Tinggi')),
      solution TEXT,
      status TEXT NOT NULL DEFAULT 'Baru' CHECK (status IN ('Baru', 'Diskusi', 'Selesai')),
      source_complaint_id UUID REFERENCES care_complaints(complaint_id),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS care_followups (
      followup_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      period_id UUID NOT NULL REFERENCES care_periods(period_id) ON DELETE CASCADE,
      employee_id UUID NOT NULL REFERENCES people(id),
      strength_note TEXT,
      focus_note TEXT,
      action_item TEXT,
      due_date DATE,
      status TEXT DEFAULT 'aktif',
      updated_by UUID REFERENCES people(id),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE (period_id, employee_id)
    );
  `);
  console.log('Right People schema created successfully!');

  // Seed care_dimensions (from plan-care.md Section 2)
  const dimensions = [
    {
      id: 'teamwork',
      code: 'teamwork',
      name: 'Teamwork',
      icon: '🤝',
      sort_order: 1,
      bars_1: 'Kerja sendiri-sendiri, jarang bantu rekan.',
      bars_2: 'Mau bantu jika diminta, belum proaktif.',
      bars_3: 'Konsisten bantu rekan tanpa diingatkan. Info shift lengkap.',
      bars_4: 'Aktif seimbangkan beban. Jadi perekat semangat saat tekanan tinggi.',
    },
    {
      id: 'komunikasi',
      code: 'komunikasi',
      name: 'Komunikasi',
      icon: '💬',
      sort_order: 2,
      bars_1: 'Info sering tidak disampaikan, miskomunikasi terjadi.',
      bars_2: 'Umumnya komunikatif tapi kadang kurang lengkap.',
      bars_3: 'Proaktif sampaikan info penting, konfirmasi pesanan.',
      bars_4: 'Komunikasi dua arah sangat baik. Semua selalu terinformasi.',
    },
    {
      id: 'inisiatif',
      code: 'inisiatif',
      name: 'Inisiatif',
      icon: '⚡',
      sort_order: 3,
      bars_1: 'Hanya kerjakan yang diperintah. Situasi butuh tindakan dibiarkan.',
      bars_2: 'Kadang berinisiatif tapi belum konsisten.',
      bars_3: 'Konsisten lihat yang perlu dilakukan dan mengerjakannya tanpa diminta.',
      bars_4: 'Antisipasi kebutuhan yang akan datang. Usulkan perbaikan konkret.',
    },
    {
      id: 'disiplin',
      code: 'disiplin',
      name: 'Disiplin & Tanggung Jawab',
      icon: '📋',
      sort_order: 4,
      bars_1: 'Sering terlambat, tinggalkan tugas belum selesai.',
      bars_2: 'Umumnya tepat waktu tapi ada slip berulang.',
      bars_3: 'Tepat waktu, checklist selesai, amanah diselesaikan tanpa diingatkan.',
      bars_4: 'Disiplin konsisten bahkan dalam tekanan. Akui kesalahan dengan solusi.',
    },
    {
      id: 'service',
      code: 'service',
      name: 'Service Attitude',
      icon: '🌟',
      sort_order: 5,
      bars_1: 'Jarang sapa pelanggan. Respons keluhan defensif.',
      bars_2: 'Menyapa jika diingatkan atau saat mood baik.',
      bars_3: 'Konsisten sapa hangat, pastikan kebutuhan pelanggan, respons keluhan tenang.',
      bars_4: 'Pelanggan merasa diterima. Ingat preferensi, antisipasi kebutuhan.',
    },
    {
      id: 'care',
      code: 'care',
      name: 'Nilai CARE + Kejujuran',
      icon: '💎',
      sort_order: 6,
      bars_1: 'Nilai CARE jarang tercermin. Menutup-nutupi kesalahan.',
      bars_2: 'Berusaha tapi belum konsisten. Lapor hanya jika terpaksa.',
      bars_3: 'Nilai CARE tampak konsisten. Melapor masalah secara proaktif (Good Catch).',
      bars_4: 'Menjadi teladan CARE. Aktif Good Catch. Mendorong rekan transparan.',
    },
    {
      id: 'growth',
      code: 'growth',
      name: 'Pertumbuhan & Belajar',
      icon: '📚',
      sort_order: 7,
      bars_1: 'Hindari area baru, tolak feedback. Kesalahan sama berulang.',
      bars_2: 'Terima feedback tapi belum aktif mencarinya.',
      bars_3: 'Aktif bertanya, mencatat, tampilkan perbaikan nyata dari kelemahan.',
      bars_4: 'Cari referensi mandiri. Berbagi ke rekan. Katalis pertumbuhan tim.',
    },
  ];

  for (const d of dimensions) {
    await client.query(`
      INSERT INTO care_dimensions (dimension_id, code, name, icon, sort_order, bars_1, bars_2, bars_3, bars_4, active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
      ON CONFLICT (dimension_id) DO UPDATE SET
        code = EXCLUDED.code,
        name = EXCLUDED.name,
        icon = EXCLUDED.icon,
        sort_order = EXCLUDED.sort_order,
        bars_1 = EXCLUDED.bars_1,
        bars_2 = EXCLUDED.bars_2,
        bars_3 = EXCLUDED.bars_3,
        bars_4 = EXCLUDED.bars_4,
        active = true;
    `, [d.id, d.code, d.name, d.icon, d.sort_order, d.bars_1, d.bars_2, d.bars_3, d.bars_4]);
  }
  console.log('Seeded 7 CARE dimensions');

  // Seed care_settings
  const settings = [
    { key: 'MIN_RATERS_TO_SHOW', value: 3 },
    { key: 'ENABLE_SELF_ASSESSMENT', value: false },
    { key: 'NOTE_MIN_LENGTH', value: 10 },
    {
      key: 'PREDICATE_THRESHOLDS',
      value: {
        orang_tepat: 3.5,
        solid: 2.5,
        berkembang: 1.5,
        butuh_support: 0.0,
      },
    },
  ];

  for (const s of settings) {
    await client.query(`
      INSERT INTO care_settings (key, value, updated_at)
      VALUES ($1, $2, now())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
    `, [s.key, JSON.stringify(s.value)]);
  }
  console.log('Seeded care_settings');

  // Seed or ensure active period (current month)
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const monthName = new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' });
  const periodLabel = `Periode ${monthName}`;

  // Get active people to snapshot
  const peopleRes = await client.query(`SELECT id FROM people`);
  const participantIds = peopleRes.rows.map(r => r.id);

  await client.query(`
    INSERT INTO care_periods (period_key, label, status, opened_at, participants_json)
    VALUES ($1, $2, 'open', now(), $3)
    ON CONFLICT (period_key) DO NOTHING;
  `, [currentMonthKey, periodLabel, JSON.stringify(participantIds)]);
  console.log(`Ensured active open period: ${currentMonthKey} (${participantIds.length} participants)`);

  await client.end();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
