import { getSupabaseAdmin } from '@/lib/supabase';

export interface CareDimension {
  code: string;
  label: string;
  titleIndo: string;
  description: string;
  indicators: string[];
}

export interface CareRubricLevel {
  score: number;
  range: string;
  label: string;
  description: string;
}

export const CARE_RUBRIC: CareRubricLevel[] = [
  {
    score: 1.0,
    range: '1.0 - 1.5',
    label: 'Perlu Pembinaan Khusus',
    description: 'Sering tidak memenuhi standar atau SOP, membutuhkan supervisi intensif harian.',
  },
  {
    score: 2.0,
    range: '2.0 - 2.5',
    label: 'Cukup / Berkembang',
    description: 'Memahami standar, terkadang memenuhi ekspektasi namun belum stabil; perlu dorongan berkala.',
  },
  {
    score: 3.0,
    range: '3.0 - 3.5',
    label: 'Standar Target (Konsisten)',
    description: 'Konsisten memenuhi ekspektasi perilaku budaya kerja Mochikin secara mandiri setiap hari (TARGET = 3.0).',
  },
  {
    score: 4.0,
    range: '4.0',
    label: 'Teladan (Role Model)',
    description: 'Konsisten melampaui standar kerja, proaktif, dan menjadi panutan inspiratif bagi rekan tim.',
  },
];

export const CARE_DIMENSIONS: CareDimension[] = [
  {
    code: 'C1_CUSTOMER',
    label: 'Customer Focus',
    titleIndo: 'Fokus & Pelayanan Pelanggan',
    description: 'Orientasi pada kepuasan pelanggan, keramahan layanan, kecepatan respon, dan penyelesaian keluhan.',
    indicators: [
      'Menerapkan budaya 3S (Senyum, Salam, Sapa) dan keramahan tulus dalam setiap interaksi dengan pelanggan.',
      'Sigap dan responsif dalam menanggapi pertanyaan, permintaan, dan penanganan keluhan pelanggan hingga tuntas.',
      'Menjaga kecepatan penyajian dan ketepatan pesanan tanpa mengorbankan kualitas dan kebersihan produk.',
    ],
  },
  {
    code: 'A2_ACCOUNTABILITY',
    label: 'Accountability',
    titleIndo: 'Akuntabilitas & Tanggung Jawab',
    description: 'Tanggung jawab penuh atas hasil kerja, kepatuhan tugas harian, dan keterbukaan mengakui kesalahan.',
    indicators: [
      'Bertanggung jawab penuh atas penyelesaian checklist tugas harian, kebersihan area kerja, dan target operasional shift.',
      'Mengakui kesalahan secara terbuka, segera memperbaiki, dan tidak mencari alasan atau menyalahkan rekan kerja/faktor luar.',
      'Menjalankan seluruh SOP operasional dengan disiplin tinggi secara mandiri tanpa harus terus-menerus diawasi atasan.',
    ],
  },
  {
    code: 'R3_RELIABILITY',
    label: 'Reliability',
    titleIndo: 'Keandalan & Konsistensi',
    description: 'Konsistensi performa kerja, ketepatan waktu hadir, dan keakuratan operasional harian.',
    indicators: [
      'Hadir tepat waktu sesuai jadwal shift, siap bekerja di awal shift, dan tidak meninggalkan pos kerja sebelum waktu serah terima.',
      'Akurasi transaksi kasir (zero selisih uang fisik vs laporan POS) serta ketertiban pencatatan mutasi stok bahan baku.',
      'Konsisten dalam menjaga stabilitas ritme kerja dan output baik saat situasi gerai santai maupun saat jam sibuk (peak hour).',
    ],
  },
  {
    code: 'E4_EXCELLENCE',
    label: 'Excellence',
    titleIndo: 'Keunggulan Kualitas & SOP',
    description: 'Standar kualitas kerja tinggi, kepatuhan resep dan gramasi produk, serta higienitas gerai.',
    indicators: [
      'Kepatuhan 100% pada resep, gramasi bahan, teknik pengolahan, dan standar plating/packaging Mochikin.',
      'Menerapkan prinsip "Clean as you go", menjaga sanitasi gerai, kebersihan peralatan masak, dan standar food safety.',
      'Memastikan seluruh peralatan operasional selalu higienis, terawat dengan baik, dan langsung dilaporkan jika ada malfungsi.',
    ],
  },
  {
    code: 'T5_TEAMWORK',
    label: 'Teamwork',
    titleIndo: 'Kerjasama & Kolaborasi Tim',
    description: 'Kolaborasi yang solid, komunikasi terbuka, dan sikap saling mendukung antar rekan kerja.',
    indicators: [
      'Proaktif membantu rekan kerja satu tim tanpa harus diminta, terutama saat antrean pelanggan membludak (rush hour).',
      'Berkomunikasi secara sopan, terbuka, dan jelas dengan rekan kerja se-shift maupun saat serah terima antar shift.',
      'Menjaga suasana kerja yang positif, menghargai perbedaan, dan terbuka menerima masukan membangun demi kemajuan bersama.',
    ],
  },
  {
    code: 'I6_INTEGRITY',
    label: 'Integrity',
    titleIndo: 'Integritas & Kejujuran',
    description: 'Kejujuran mutlak, etika kerja tinggi, dan perlindungan terhadap aset serta data gerai.',
    indicators: [
      'Jujur dan transparan dalam setiap pencatatan keuangan kasir, perhitungan stok fisik harian, dan pelaporan insiden.',
      'Menolak keras segala bentuk manipulasi data kehadiran/poin, kecurangan transaksi, pemberian gratis tanpa izin, atau pemborosan.',
      'Menjaga kerahasiaan resep, formula, data pelanggan, dan mematuhi kode etik kerja perusahaan secara konsisten.',
    ],
  },
  {
    code: 'O7_OWNERSHIP',
    label: 'Ownership',
    titleIndo: 'Rasa Memiliki & Inisiatif',
    description: 'Rasa memiliki terhadap gerai, efisiensi sumber daya, dan inisiatif perbaikan tanpa menunggu instruksi.',
    indicators: [
      'Memperlakukan peralatan gerai, bahan baku, dan fasilitas seperti milik sendiri (hemat listrik, air, dan rawat inventaris gerai).',
      'Peka melihat potensi masalah operasional dan proaktif menyampaikan ide perbaikan (isu perbaikan/ITO) kepada Captain.',
      'Menunjukkan inisiatif tinggi dalam mencari solusi praktis ketika menghadapi kendala di lapangan tanpa bersikap pasif.',
    ],
  },
];

export interface SelfScore {
  dimension_code: string;
  score: number | null;
  observedFact: string | null;
}

export interface CaptainScore {
  dimension_code: string;
  score: number | null;
  observedFact: string | null;
  followup: string | null;
}

export interface FinalScorePerDimension {
  dimension_code: string;
  self_score: number | null;
  captain_score: number | null;
  final: number | null;
}

export interface SelfScoreInput {
  dimensionCode: string;
  score: number;
  observedFact: string;
}

export interface CaptainScoreInput {
  captainPersonId: string;
  dimensionCode: string;
  score: number;
  observedFact: string;
  followup: string;
}

export interface AssessmentInput {
  personId: string;
  period: string;
  captainPersonId: string;
  branchId: string;
}

export interface AssessmentDetail {
  id: string;
  person_id: string;
  branch_id: string;
  period: string;
  status: string;
  note_1on1: string | null;
  created_at: string;
  updated_at: string | null;
  selfScores: SelfScore[];
  captainScores: CaptainScore[];
}

const ASSESSMENT_TABLE = 'care_assessments';
const SCORES_TABLE = 'care_scores';

export class CareIntegrationService {
  private supabase = getSupabaseAdmin();

  async createAssessment(input: AssessmentInput): Promise<string> {
    const { personId, period, captainPersonId, branchId } = input;
    const { data: assessment, error: assessmentError } = await this.supabase
      .from(ASSESSMENT_TABLE)
      .insert({
        person_id: personId,
        branch_id: branchId,
        period,
        status: 'draft',
      })
      .select()
      .single();

    if (assessmentError) {
      throw new Error(`Gagal membuat assessment: ${assessmentError.message}`);
    }

    const assessmentId = assessment.id;

    const scoresToInsert: {
      assessment_id: string;
      person_id: string;
      branch_id: string;
      assessor_person_id: string;
      assessor_role: 'self' | 'captain';
      dimension_code: string;
      score: number | null;
      observed_fact: string | null;
      followup: string | null;
      period_key: string;
    }[] = [];

    for (const dim of CARE_DIMENSIONS) {
      scoresToInsert.push({
        assessment_id: assessment.id,
        person_id: personId,
        branch_id: branchId,
        assessor_person_id: personId,
        assessor_role: 'self',
        dimension_code: dim.code,
        score: null,
        observed_fact: null,
        followup: null,
        period_key: period,
      });

      scoresToInsert.push({
        assessment_id: assessment.id,
        person_id: personId,
        branch_id: branchId,
        assessor_person_id: captainPersonId,
        assessor_role: 'captain',
        dimension_code: dim.code,
        score: null,
        observed_fact: null,
        followup: null,
        period_key: period,
      });
    }

    const { error: scoresError } = await this.supabase
      .from(SCORES_TABLE)
      .insert(scoresToInsert);

    if (scoresError) {
      throw new Error(`Gagal menyisipkan skor awal: ${scoresError.message}`);
    }

    return assessmentId;
  }

  async getAssessment(assessmentId: string, personId: string, role: string): Promise<AssessmentDetail | null> {
    const { data: assessment, error: assessmentError } = await this.supabase
      .from(ASSESSMENT_TABLE)
      .select(
        'id, person_id, branch_id, period, status, note_1on1, created_at, updated_at'
      )
      .eq('id', assessmentId)
      .single();

    if (assessmentError || !assessment) {
      return null;
    }

    const isCaptain = role === 'role_captain';
    const isAuthorized =
      assessment.person_id === personId ||
      (isCaptain && assessment.status !== 'draft') ||
      role === 'role_admin' ||
      role === 'role_manager' ||
      role === 'super_admin';

    if (!isAuthorized) {
      throw new Error('Akses ditolak: kamu tidak memiliki izin membaca detail ini.');
    }

    const [selfScores, captainScores] = await Promise.all([
      this.supabase
        .from(SCORES_TABLE)
        .select('dimension_code, score, observed_fact')
        .eq('assessment_id', assessmentId)
        .eq('assessor_role', 'self')
        .eq('person_id', assessment.person_id)
        .order('dimension_code'),
      this.supabase
        .from(SCORES_TABLE)
        .select('dimension_code, score, observed_fact, followup')
        .eq('assessment_id', assessmentId)
        .eq('assessor_role', 'captain')
        .eq('assessor_person_id', assessment.person_id)
        .order('dimension_code'),
    ]);

    return {
      id: assessment.id,
      person_id: assessment.person_id,
      branch_id: assessment.branch_id,
      period: assessment.period,
      status: assessment.status,
      note_1on1: assessment.note_1on1,
      created_at: assessment.created_at,
      updated_at: assessment.updated_at ?? null,
      selfScores: ((selfScores as any)?.data || []).map((r: any) => ({
        dimension_code: r.dimension_code,
        score: r.score ?? null,
        observedFact: r.observed_fact ?? r.observedFact ?? null,
      })),
      captainScores: ((captainScores as any)?.data || []).map((r: any) => ({
        dimension_code: r.dimension_code,
        score: r.score ?? null,
        observedFact: r.observed_fact ?? r.observedFact ?? null,
        followup: r.followup ?? null,
      })),
    };
  }

  async submitSelfScore(
    assessmentId: string,
    personId: string,
    dimensionCode: string,
    score: number,
    observedFact: string
  ): Promise<void> {
    if (!Number.isFinite(score) || score < 1.0 || score > 4.0 || Math.round(score * 2) !== score * 2) {
      throw new Error('Score harus 1.0–4.0 dengan kenaikan setengah poin.');
    }

    const { data: assessment, error: assessError } = await this.supabase
      .from(ASSESSMENT_TABLE)
      .select('status, branch_id')
      .eq('id', assessmentId)
      .single();

    if (assessError || !assessment) {
      throw new Error('Assessment tidak ditemukan.');
    }

    if (assessment.status !== 'draft') {
      throw new Error(`Assessment sudah '${assessment.status}', tidak bisa dikirim skor self.`);
    }

    const dim = CARE_DIMENSIONS.find((d) => d.code === dimensionCode);
    if (!dim) {
      throw new Error('Dimensi tidak valid.');
    }

    const { error: updateError } = await this.supabase
      .from(SCORES_TABLE)
      .update({
        score,
        observed_fact: observedFact,
      })
      .eq('assessment_id', assessmentId)
      .eq('assessor_role', 'self')
      .eq('person_id', personId)
      .eq('dimension_code', dimensionCode);

    if (updateError) {
      throw new Error(`Gagal mengirim skor self: ${updateError.message}`);
    }
  }

  async submitCaptainScore(
    assessmentId: string,
    captainPersonId: string,
    personId: string,
    dimensionCode: string,
    score: number,
    observedFact: string,
    followup: string
  ): Promise<void> {
    if (!Number.isFinite(score) || score < 1.0 || score > 4.0 || Math.round(score * 2) !== score * 2) {
      throw new Error('Score harus 1.0–4.0 dengan kenaikan setengah poin.');
    }

    const { data: assessment, error: assessError } = await this.supabase
      .from(ASSESSMENT_TABLE)
      .select('status, branch_id')
      .eq('id', assessmentId)
      .single();

    if (assessError || !assessment) {
      throw new Error('Assessment tidak ditemukan.');
    }

    if (assessment.status !== 'draft') {
      throw new Error(`Assessment sudah '${assessment.status}', tidak bisa dikirim skor captain.`);
    }

    const dim = CARE_DIMENSIONS.find((d) => d.code === dimensionCode);
    if (!dim) {
      throw new Error('Dimensi tidak valid.');
    }

    const { data: person, error: personError } = await this.supabase
      .from('people')
      .select('role, branch_id')
      .eq('id', captainPersonId)
      .single();

    if (personError || !person) {
      throw new Error('Penilai tidak ditemukan.');
    }

    const allowedRoles = ['role_captain', 'role_manager', 'role_admin', 'super_admin'];
    if (!allowedRoles.includes(person.role)) {
      throw new Error('Hanya captain atau atasan yang dapat mengirim skor.');
    }

    if (person.role !== 'super_admin' && person.branch_id !== assessment.branch_id) {
      throw new Error('Penilai tidak memiliki wewenang untuk cabang ini.');
    }

    const { error: updateError } = await this.supabase
      .from(SCORES_TABLE)
      .update({
        score,
        observed_fact: observedFact,
        followup,
      })
      .eq('assessment_id', assessmentId)
      .eq('assessor_role', 'captain')
      .eq('assessor_person_id', captainPersonId)
      .eq('person_id', personId)
      .eq('dimension_code', dimensionCode);

    if (updateError) {
      throw new Error(`Gagal mengirim skor captain: ${updateError.message}`);
    }
  }

  async submitAssessment(assessmentId: string, personId: string): Promise<void> {
    const { data: assessment, error: assessError } = await this.supabase
      .from(ASSESSMENT_TABLE)
      .select('status, person_id')
      .eq('id', assessmentId)
      .single();

    if (assessError || !assessment) {
      throw new Error('Assessment tidak ditemukan.');
    }

    if (assessment.person_id !== personId) {
      throw new Error('Hanya person yang dievaluasi yang dapat mengirim assessment.');
    }

    if (assessment.status !== 'draft') {
      throw new Error(`Assessment sudah '${assessment.status}', tidak bisa submit ulang.`);
    }

    const { error: updateError } = await this.supabase
      .from(ASSESSMENT_TABLE)
      .update({ status: 'submitted' })
      .eq('id', assessmentId);

    if (updateError) {
      throw new Error(`Gagal submit assessment: ${updateError.message}`);
    }
  }

  async markDiscussed(assessmentId: string, personId: string): Promise<void> {
    const { data: assessment, error: assessError } = await this.supabase
      .from(ASSESSMENT_TABLE)
      .select('status, person_id')
      .eq('id', assessmentId)
      .single();

    if (assessError || !assessment) {
      throw new Error('Assessment tidak ditemukan.');
    }

    if (assessment.person_id !== personId) {
      throw new Error('Hanya person yang dievaluasi yang dapat membahas assessment.');
    }

    if (assessment.status !== 'submitted') {
      throw new Error(`Assessment sudah '${assessment.status}', hanya dapat dibahas dari status 'submitted'.`);
    }

    const { error: updateError } = await this.supabase
      .from(ASSESSMENT_TABLE)
      .update({ status: 'discussed' })
      .eq('id', assessmentId);

    if (updateError) {
      throw new Error(`Gagal mark as discussed: ${updateError.message}`);
    }
  }

  async finalizeAssessment(assessmentId: string, personId: string): Promise<void> {
    const { data: assessment, error: assessError } = await this.supabase
      .from(ASSESSMENT_TABLE)
      .select('status, person_id, period')
      .eq('id', assessmentId)
      .single();

    if (assessError || !assessment) {
      throw new Error('Assessment tidak ditemukan.');
    }

    if (assessment.person_id !== personId) {
      throw new Error('Hanya person yang dievaluasi yang dapat finalisasi.');
    }

    if (assessment.status !== 'discussed') {
      throw new Error(`Assessment sudah '${assessment.status}', hanya dapat finalize dari status 'discussed'.`);
    }

    const finalScores = await this.computeFinalScore(assessmentId);
    const finalMap = new Map(finalScores.map((f) => [f.dimension_code, f.final]));

    for (const dim of CARE_DIMENSIONS) {
      const finalScore = finalMap.get(dim.code);
      if (finalScore !== undefined) {
        const { data: row, error: rowError } = await this.supabase
          .from(SCORES_TABLE)
          .select('id')
          .eq('assessment_id', assessmentId)
          .eq('dimension_code', dim.code)
          .eq('assessor_role', 'self')
          .single();

        if (!rowError && row) {
          const { error: updateError } = await this.supabase
            .from(SCORES_TABLE)
            .update({ score: finalScore })
            .eq('id', row.id);
          if (updateError) {
            throw new Error(`Gagal finalisasi skor: ${updateError.message}`);
          }
        }
      }
    }

    const { error: statusError } = await this.supabase
      .from(ASSESSMENT_TABLE)
      .update({ status: 'final', updated_at: new Date().toISOString() })
      .eq('id', assessmentId);

    if (statusError) {
      throw new Error(`Gagal finalize assessment: ${statusError.message}`);
    }
  }

  async computeFinalScore(assessmentId: string): Promise<FinalScorePerDimension[]> {
    const selfResult = await this.supabase
      .from(SCORES_TABLE)
      .select('dimension_code, score')
      .eq('assessment_id', assessmentId)
      .eq('assessor_role', 'self')
      .eq('score', { not: null });

    const captainResult = await this.supabase
      .from(SCORES_TABLE)
      .select('dimension_code, score')
      .eq('assessment_id', assessmentId)
      .eq('assessor_role', 'captain')
      .eq('score', { not: null });

    const selfMap = new Map<string, number[]>();
    for (const row of ((selfResult as any)?.data || [])) {
      const arr = selfMap.get(row.dimension_code) || [];
      arr.push(Number(row.score));
      selfMap.set(row.dimension_code, arr);
    }

    const captainMap = new Map<string, number[]>();
    for (const row of ((captainResult as any)?.data || [])) {
      const arr = captainMap.get(row.dimension_code) || [];
      arr.push(Number(row.score));
      captainMap.set(row.dimension_code, arr);
    }

    const results: FinalScorePerDimension[] = [];

    for (const dim of CARE_DIMENSIONS) {
      const selfScoresArr = selfMap.get(dim.code) || [];
      const captainScoresArr = captainMap.get(dim.code) || [];

      const avgSelf = selfScoresArr.length > 0 ? selfScoresArr.reduce((s, v) => s + v, 0) / selfScoresArr.length : null;
      const avgCaptain = captainScoresArr.length > 0 ? captainScoresArr.reduce((s, v) => s + v, 0) / captainScoresArr.length : null;

      let finalValue: number | null = null;
      if (avgSelf !== null && avgCaptain !== null) {
        finalValue = Math.round(((avgSelf + avgCaptain) / 2) * 2) / 2;
      } else if (avgSelf !== null) {
        finalValue = Math.round(avgSelf * 2) / 2;
      } else if (avgCaptain !== null) {
        finalValue = Math.round(avgCaptain * 2) / 2;
      }

      results.push({
        dimension_code: dim.code,
        self_score: avgSelf,
        captain_score: avgCaptain,
        final: finalValue,
      });
    }

    return results;
  }

  async getAssessmentsByPerson(personId: string, role: string): Promise<AssessmentDetail[]> {
    const { data: assessments, error: error } = await this.supabase
      .from(ASSESSMENT_TABLE)
      .select(
        'id, person_id, branch_id, period, status, note_1on1, created_at, updated_at'
      )
      .eq('person_id', personId)
      .order('period', { ascending: false });

    if (error) {
      throw new Error(`Gagal mengambil assessment: ${error.message}`);
    }

    const details = [];
    for (const assessment of assessments || []) {
      const detail = await this.getAssessment(assessment.id, personId, role);
      if (detail) {
        details.push(detail);
      }
    }

    return details;
  }
}

export const careService = new CareIntegrationService();
