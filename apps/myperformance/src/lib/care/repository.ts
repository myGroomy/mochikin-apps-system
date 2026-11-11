import { getSupabaseAdmin } from '@/lib/supabase';
import {
  calculateDimensionAverages,
  calculateOverallAverage,
  calculateStrengthsAndFocus,
  calculateLeaderboard,
  calculateTrend,
  getPredicate,
  LeaderboardItem,
} from './scoring';

export interface CareDimensionRecord {
  dimension_id: string;
  code: string;
  name: string;
  icon: string | null;
  sort_order: number;
  bars_1: string;
  bars_2: string;
  bars_3: string;
  bars_4: string;
  active: boolean;
}

export interface CarePeriodRecord {
  period_id: string;
  period_key: string;
  label: string;
  status: 'draft' | 'open' | 'closed';
  opened_at: string | null;
  closed_at: string | null;
  participants_json: string[];
}

export interface RateeProgressItem {
  rateeId: string;
  name: string;
  role: string;
  avatarUrl?: string;
  ratedCount: number; // 0 to 7
  isComplete: boolean;
}

export interface SingleScoreItem {
  dimensionId: string;
  score: number;
  note: string;
}

export class CareRepository {
  private supabase = getSupabaseAdmin();

  // ==========================================
  // SETTINGS & DIMENSIONS
  // ==========================================
  async getDimensions(): Promise<CareDimensionRecord[]> {
    const { data, error } = await this.supabase
      .from('care_dimensions')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  }

  async getSettings(): Promise<Record<string, unknown>> {
    const { data, error } = await this.supabase.from('care_settings').select('*');
    if (error) throw new Error(error.message);
    const result: Record<string, unknown> = {};
    for (const item of data || []) {
      result[item.key] = item.value;
    }
    return result;
  }

  // ==========================================
  // PERIODS
  // ==========================================
  async getCurrentOpenPeriod(): Promise<CarePeriodRecord | null> {
    const { data, error } = await this.supabase
      .from('care_periods')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  }

  async getPeriods(): Promise<CarePeriodRecord[]> {
    const { data, error } = await this.supabase
      .from('care_periods')
      .select('*')
      .order('period_key', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }

  async getPeriodById(periodId: string): Promise<CarePeriodRecord | null> {
    const { data, error } = await this.supabase
      .from('care_periods')
      .select('*')
      .eq('period_id', periodId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  }

  async createPeriod(periodKey: string, label: string, participants: string[]): Promise<CarePeriodRecord> {
    const { data, error } = await this.supabase
      .from('care_periods')
      .insert({
        period_key: periodKey,
        label,
        status: 'draft',
        participants_json: participants,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async openPeriod(periodId: string): Promise<void> {
    // Only one open period at a time
    await this.supabase.from('care_periods').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('status', 'open');

    // Get current people snapshot if not set
    const { data: people } = await this.supabase.from('people').select('id');
    const participants = people?.map((p) => p.id) || [];

    const { error } = await this.supabase
      .from('care_periods')
      .update({
        status: 'open',
        opened_at: new Date().toISOString(),
        participants_json: participants,
      })
      .eq('period_id', periodId);

    if (error) throw new Error(error.message);
  }

  async closePeriod(periodId: string): Promise<void> {
    const { error } = await this.supabase
      .from('care_periods')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
      })
      .eq('period_id', periodId);

    if (error) throw new Error(error.message);
  }

  // ==========================================
  // INPUT & ASSESSMENTS
  // ==========================================
  async getRateesToAssess(periodId: string, currentRaterId: string): Promise<{
    ratees: RateeProgressItem[];
    submissionStatus: 'none' | 'draft' | 'submitted';
  }> {
    const period = await this.getPeriodById(periodId);
    if (!period) throw new Error('Periode tidak ditemukan');

    const participantIds: string[] = period.participants_json || [];
    // Self assessment is excluded: rater does NOT assess themselves
    const targetIds = participantIds.filter((id) => id !== currentRaterId);

    // Fetch people details
    const { data: people } = await this.supabase
      .from('people')
      .select('id, name, role')
      .in('id', targetIds.length > 0 ? targetIds : ['00000000-0000-0000-0000-000000000000']);

    // Fetch saved assessments for this rater in this period
    const { data: savedRows } = await this.supabase
      .from('care_assessments_rp')
      .select('ratee_id, dimension_id, score')
      .eq('period_id', periodId)
      .eq('rater_id', currentRaterId);

    // Fetch submission status
    const { data: sub } = await this.supabase
      .from('care_submissions')
      .select('status')
      .eq('period_id', periodId)
      .eq('rater_id', currentRaterId)
      .maybeSingle();

    const rateeScoresMap: Record<string, number> = {};
    for (const row of savedRows || []) {
      rateeScoresMap[row.ratee_id] = (rateeScoresMap[row.ratee_id] || 0) + 1;
    }

    const ratees: RateeProgressItem[] = (people || []).map((p) => {
      const ratedCount = rateeScoresMap[p.id] || 0;
      return {
        rateeId: p.id,
        name: p.name,
        role: p.role || 'Staff',
        ratedCount,
        isComplete: ratedCount >= 7,
      };
    });

    return {
      ratees,
      submissionStatus: sub?.status || 'none',
    };
  }

  async getDraftEvaluation(periodId: string, raterId: string, rateeId: string): Promise<SingleScoreItem[]> {
    const { data, error } = await this.supabase
      .from('care_assessments_rp')
      .select('dimension_id, score, note')
      .eq('period_id', periodId)
      .eq('rater_id', raterId)
      .eq('ratee_id', rateeId);

    if (error) throw new Error(error.message);
    return (data || []).map((d) => ({
      dimensionId: d.dimension_id,
      score: d.score,
      note: d.note || '',
    }));
  }

  async saveDraftEvaluation(
    periodId: string,
    raterId: string,
    rateeId: string,
    scores: SingleScoreItem[]
  ): Promise<void> {
    const period = await this.getPeriodById(periodId);
    if (!period || period.status !== 'open') {
      throw new Error('Periode tidak dalam status buka (hanya dapat mengedit pada periode buka)');
    }

    // Ensure care_submissions row exists with 'draft'
    await this.supabase
      .from('care_submissions')
      .upsert(
        { period_id: periodId, rater_id: raterId, status: 'draft', updated_at: new Date().toISOString() },
        { onConflict: 'period_id,rater_id' }
      );

    // Upsert individual dimension scores
    for (const item of scores) {
      if (item.score >= 1 && item.score <= 4) {
        await this.supabase.from('care_assessments_rp').upsert(
          {
            period_id: periodId,
            rater_id: raterId,
            ratee_id: rateeId,
            dimension_id: item.dimensionId,
            score: item.score,
            note: item.note || '',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'period_id,rater_id,ratee_id,dimension_id' }
        );
      }
    }
  }

  async submitEvaluation(periodId: string, raterId: string): Promise<void> {
    const period = await this.getPeriodById(periodId);
    if (!period || period.status !== 'open') {
      throw new Error('Periode penilaian sudah ditutup');
    }

    const { ratees } = await this.getRateesToAssess(periodId, raterId);
    const incomplete = ratees.filter((r) => !r.isComplete);
    if (incomplete.length > 0) {
      throw new Error(`Masih ada ${incomplete.length} rekan yang belum lengkap dinilai (wajib 7 dimensi per orang).`);
    }

    // Check description rule: if score != 3, note is required min 10 chars
    const { data: scores } = await this.supabase
      .from('care_assessments_rp')
      .select('score, note, dimension_id, ratee_id')
      .eq('period_id', periodId)
      .eq('rater_id', raterId);

    for (const sc of scores || []) {
      if (sc.score !== 3) {
        if (!sc.note || sc.note.trim().length < 10) {
          throw new Error(`Catatan deskripsi wajib diisi minimal 10 karakter untuk skor yang bukan 3.`);
        }
      }
    }

    // Mark submission as submitted
    const { error } = await this.supabase.from('care_submissions').upsert(
      {
        period_id: periodId,
        rater_id: raterId,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'period_id,rater_id' }
    );

    if (error) throw new Error(error.message);
  }

  // ==========================================
  // COMPLAINTS & ITO
  // ==========================================
  async createComplaint(periodId: string, reporterId: string, category: string, text: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('care_complaints')
      .insert({
        period_id: periodId,
        reporter_id: reporterId,
        category: category || 'Lainnya',
        text,
        status: 'received',
      })
      .select('complaint_id')
      .single();

    if (error) throw new Error(error.message);
    return data.complaint_id;
  }

  async getMyComplaints(reporterId: string) {
    const { data, error } = await this.supabase
      .from('care_complaints')
      .select('*')
      .eq('reporter_id', reporterId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }

  async getAllComplaints(periodId?: string) {
    let query = this.supabase
      .from('care_complaints')
      .select('*, people:reporter_id(id, name, role)')
      .order('created_at', { ascending: false });

    if (periodId) {
      query = query.eq('period_id', periodId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  }

  async convertComplaintToIto(complaintId: string, priority = 'Sedang'): Promise<string> {
    const { data: comp } = await this.supabase
      .from('care_complaints')
      .select('*')
      .eq('complaint_id', complaintId)
      .single();

    if (!comp) throw new Error('Keluhan tidak ditemukan');
    if (comp.ito_issue_id) {
      throw new Error('Keluhan ini sudah pernah dikonversi ke Isu ITO');
    }

    const { data: ito, error: itoErr } = await this.supabase
      .from('care_ito_issues')
      .insert({
        issue: comp.text,
        reporter_id: comp.reporter_id,
        priority: priority as 'Rendah' | 'Sedang' | 'Tinggi',
        source_complaint_id: comp.complaint_id,
        status: 'Baru',
      })
      .select('ito_id')
      .single();

    if (itoErr) throw new Error(itoErr.message);

    await this.supabase
      .from('care_complaints')
      .update({ ito_issue_id: ito.ito_id, status: 'discussed' })
      .eq('complaint_id', complaintId);

    return ito.ito_id;
  }

  async getItoIssues() {
    const { data, error } = await this.supabase
      .from('care_ito_issues')
      .select('*, reporter:reporter_id(name)')
      .order('date', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }

  async updateItoIssue(itoId: string, patch: { priority?: string; solution?: string; status?: string }) {
    const { error } = await this.supabase.from('care_ito_issues').update(patch).eq('ito_id', itoId);
    if (error) throw new Error(error.message);
  }

  // ==========================================
  // LEADERBOARD & PROFILES
  // ==========================================
  async getLeaderboardData(periodId: string): Promise<LeaderboardItem[]> {
    const period = await this.getPeriodById(periodId);
    if (!period) return [];

    // Only submitted submissions are calculated
    const { data: submittedSubs } = await this.supabase
      .from('care_submissions')
      .select('rater_id')
      .eq('period_id', periodId)
      .eq('status', 'submitted');

    const validRaterIds = (submittedSubs || []).map((s) => s.rater_id);
    if (validRaterIds.length === 0) return [];

    // Get all scores from valid raters
    const { data: allScores } = await this.supabase
      .from('care_assessments_rp')
      .select('ratee_id, dimension_id, score')
      .eq('period_id', periodId)
      .in('rater_id', validRaterIds);

    const { data: people } = await this.supabase.from('people').select('id, name, role');
    const peopleMap = new Map((people || []).map((p) => [p.id, p]));

    // Group scores per ratee
    const rateeScores: Record<string, Array<{ dimensionId: string; score: number }>> = {};
    for (const sc of allScores || []) {
      if (!rateeScores[sc.ratee_id]) rateeScores[sc.ratee_id] = [];
      rateeScores[sc.ratee_id].push({ dimensionId: sc.dimension_id, score: sc.score });
    }

    const candidates = [];
    for (const [rateeId, scores] of Object.entries(rateeScores)) {
      const dimAvg = calculateDimensionAverages(scores);
      const overall = calculateOverallAverage(dimAvg);
      const person = peopleMap.get(rateeId);
      candidates.push({
        employeeId: rateeId,
        name: person?.name || 'Karyawan',
        role: person?.role || 'Staff',
        overallAverage: overall,
      });
    }

    return calculateLeaderboard(candidates);
  }

  async getProfileData(employeeId: string, periodId: string, isAdmin: boolean) {
    const period = await this.getPeriodById(periodId);
    if (!period) throw new Error('Periode tidak ditemukan');

    // Get submitted raters
    const { data: submittedSubs } = await this.supabase
      .from('care_submissions')
      .select('rater_id')
      .eq('period_id', periodId)
      .eq('status', 'submitted');

    const validRaterIds = (submittedSubs || []).map((s) => s.rater_id);

    const { data: scores } = await this.supabase
      .from('care_assessments_rp')
      .select('dimension_id, score, note, rater_id, updated_at')
      .eq('period_id', periodId)
      .eq('ratee_id', employeeId)
      .in('rater_id', validRaterIds.length > 0 ? validRaterIds : ['00000000-0000-0000-0000-000000000000']);

    const { data: ratersInfo } = await this.supabase.from('people').select('id, name');
    const raterNameMap = new Map((ratersInfo || []).map((r) => [r.id, r.name]));

    const dimAverages = calculateDimensionAverages(
      (scores || []).map((s) => ({ dimensionId: s.dimension_id, score: s.score }))
    );
    const overallAvg = calculateOverallAverage(dimAverages);
    const predicate = getPredicate(overallAvg);
    const { strengths, focus } = calculateStrengthsAndFocus(dimAverages);

    // Calculate trend with previous closed period
    const { data: prevPeriod } = await this.supabase
      .from('care_periods')
      .select('period_id')
      .eq('status', 'closed')
      .neq('period_id', periodId)
      .order('closed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let trend = { diff: null as number | null, direction: 'none' as 'up' | 'down' | 'same' | 'none' };
    if (prevPeriod) {
      const prevLeaderboard = await this.getLeaderboardData(prevPeriod.period_id);
      const prevEntry = prevLeaderboard.find((l) => l.employeeId === employeeId);
      if (prevEntry) {
        trend = calculateTrend(overallAvg, prevEntry.overallAverage);
      }
    }

    // Feedback items: anonymize if not admin!
    const feedbackList = (scores || [])
      .filter((s) => s.note && s.note.trim().length > 0)
      .map((s, idx) => ({
        dimensionId: s.dimension_id,
        score: s.score,
        note: s.note,
        // Privacy rule: staff NEVER sees rater name
        raterName: isAdmin ? raterNameMap.get(s.rater_id) || 'Admin/Staf' : `Rekan Kerja #${idx + 1}`,
        date: s.updated_at,
      }));

    return {
      period,
      overallAverage: overallAvg,
      predicate,
      dimensionAverages: dimAverages,
      strengths,
      focus,
      trend,
      feedback: feedbackList,
      totalRaters: validRaterIds.length,
    };
  }

  async getMonitoringData(periodId: string) {
    const period = await this.getPeriodById(periodId);
    if (!period) throw new Error('Periode tidak ditemukan');

    const participantIds = period.participants_json || [];
    const { data: people } = await this.supabase
      .from('people')
      .select('id, name, role')
      .in('id', participantIds.length > 0 ? participantIds : ['00000000-0000-0000-0000-000000000000']);

    const { data: submissions } = await this.supabase
      .from('care_submissions')
      .select('rater_id, status, submitted_at, updated_at')
      .eq('period_id', periodId);

    const subMap = new Map((submissions || []).map((s) => [s.rater_id, s]));

    return (people || []).map((p) => {
      const sub = subMap.get(p.id);
      return {
        employeeId: p.id,
        name: p.name,
        role: p.role || 'Staff',
        status: sub?.status || 'belum',
        submittedAt: sub?.submitted_at || null,
        updatedAt: sub?.updated_at || null,
      };
    });
  }

  async getHeatmapData(periodId: string) {
    const dimensions = await this.getDimensions();
    const leaderboard = await this.getLeaderboardData(periodId);

    const { data: scores } = await this.supabase
      .from('care_assessments_rp')
      .select('ratee_id, dimension_id, score')
      .eq('period_id', periodId);

    const matrix: Record<string, Record<string, number>> = {};
    for (const sc of scores || []) {
      if (!matrix[sc.ratee_id]) matrix[sc.ratee_id] = {};
      // Calculate running sum & count per ratee dimension
    }

    return {
      dimensions,
      leaderboard,
    };
  }
}

export const careRepo = new CareRepository();
