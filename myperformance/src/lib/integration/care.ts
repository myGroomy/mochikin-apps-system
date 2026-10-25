import { getSupabaseAdmin } from '@/lib/supabase';

export interface CareDimension {
  code: string;
  label: string;
}

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

export interface SelfScoreData {
  dimension_code: string;
  score: number | null;
  observedFact: string | null;
}

export interface CaptainScoreData {
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

export const CARE_DIMENSIONS: CareDimension[] = [
  { code: 'C1_CUSTOMER', label: 'Customer Focus' },
  { code: 'A2_ACCOUNTABILITY', label: 'Accountability' },
  { code: 'R3_RELIABILITY', label: 'Reliability' },
  { code: 'E4_EXCELLENCE', label: 'Excellence' },
  { code: 'T5_TEAMWORK', label: 'Teamwork' },
  { code: 'I6_INTEGRITY', label: 'Integrity' },
  { code: 'O7_OWNERSHIP', label: 'Ownership' },
];

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
      observedFact: string | null;
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
        observedFact: null,
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
        observedFact: null,
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
        .select('dimension_code, score, observedFact')
        .eq('assessment_id', assessmentId)
        .eq('assessor_role', 'self')
        .eq('person_id', assessment.person_id)
        .order('dimension_code'),
      this.supabase
        .from(SCORES_TABLE)
        .select('dimension_code, score, observedFact, followup')
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
        observedFact: r.observedFact ?? null,
      })),
      captainScores: ((captainScores as any)?.data || []).map((r: any) => ({
        dimension_code: r.dimension_code,
        score: r.score ?? null,
        observedFact: r.observedFact ?? null,
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
        observedFact,
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
      throw new Error('Captaen tidak ditemukan.');
    }

    if (person.role !== 'role_captain') {
      throw new Error('Hanya captain yang dapat mengirim skor.');
    }

    if (person.branch_id !== assessment.branch_id) {
      throw new Error('Captaen tidak memiliki wewenang untuk cabang ini.');
    }

    const { error: updateError } = await this.supabase
      .from(SCORES_TABLE)
      .update({
        score,
        observedFact,
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
