'use client';

import React, { useEffect, useState } from 'react';
import {
  IconCheck,
  IconAlertCircle,
  IconShieldCheck,
  IconClock,
  IconStar,
  IconUserCircle,
} from '@/components/icons';

interface SelfScore {
  dimension_code: string;
  score: number | null;
  observed_fact: string | null;
}

export interface CaptainScore {
  dimension_code: string;
  score: number | null;
  observed_fact: string | null;
  followup: string | null;
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

export interface CareScorecardProps {
  assessmentId?: string;
  personId?: string;
  onUpdated?: () => void;
}

const DIMENSION_LABELS: Record<string, string> = {
  C1_CUSTOMER: 'C1 - Customer Focus',
  A2_ACCOUNTABILITY: 'A2 - Accountability',
  R3_RELIABILITY: 'R3 - Reliability',
  E4_EXCELLENCE: 'E4 - Excellence',
  T5_TEAMWORK: 'T5 - Teamwork',
  I6_INTEGRITY: 'I6 - Integrity',
  O7_OWNERSHIP: 'O7 - Ownership',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  discussed: 'Discussed',
  final: 'Final',
};

const STATUS_TAGS: Record<string, string> = {
  draft: 'tag-neutral',
  submitted: 'tag-blue',
  discussed: 'tag-green',
  final: 'tag-green',
};

const SCORE_RANGE = [1, 2, 3, 4, 5];

export default function CareScorecard({ assessmentId, personId, onUpdated }: CareScorecardProps) {
  const [details, setDetails] = useState<AssessmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [savedScores, setSavedScores] = useState<Map<string, number>>(new Map());
  const [feedback, setFeedback] = useState('');

  const fetchAssessment = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (assessmentId) params.append('id', assessmentId);
      const res = await fetch(`/api/assessments?${params}`);
      const json = await res.json();
      if (json.success && json.data) {
        setDetails(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch assessment:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessment();
  }, [assessmentId]);

  const getScore = (dimensionCode: string, role: string) => {
    if (!details) return null;
    const scores = role === 'self' ? details.selfScores : details.captainScores;
    return scores.find((s) => s.dimension_code === dimensionCode)?.score ?? null;
  };

  const getObservation = (dimensionCode: string, role: string) => {
    if (!details) return '';
    const scores = role === 'self' ? details.selfScores : details.captainScores;
    return scores.find((s) => s.dimension_code === dimensionCode)?.observed_fact ?? '';
  };

  const getFollowup = (dimensionCode: string) => {
    if (!details) return '';
    const c = details.captainScores.find((s) => s.dimension_code === dimensionCode);
    return c?.followup ?? '';
  };

  const handleSelfScoreChange = async (dimensionCode: string, score: number) => {
    setSavedScores((prev) => new Map(prev).set(`self:${dimensionCode}`, score));
    if (!assessmentId) return;
    try {
      setSubmitting('self');
      const res = await fetch(`/api/assessments/${assessmentId}/self-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dimensionCode,
          score,
          observedFact: getObservation(dimensionCode, 'self'),
        }),
      });
      if (res.ok) {
        setFeedback('Skor diri tersimpan.');
      } else {
        const err = await res.json();
        setFeedback(err.error?.message || 'Gagal menyimpan skor.');
      }
    } catch (err) {
      setFeedback('Gagal menghubungi server.');
    } finally {
      setSubmitting(null);
    }
  };

  const handleCaptainScoreChange = async (dimensionCode: string, score: number) => {
    setSavedScores((prev) => new Map(prev).set(`captain:${dimensionCode}`, score));
    if (!assessmentId) return;
    try {
      setSubmitting('captain');
      const res = await fetch(`/api/assessments/${assessmentId}/captain-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dimensionCode,
          score,
          observedFact: getObservation(dimensionCode, 'self'),
          followup: '',
        }),
      });
      if (res.ok) {
        setFeedback('Skor captain tersimpan.');
      } else {
        const err = await res.json();
        setFeedback(err.error?.message || 'Gagal menyimpan skor.');
      }
    } catch (err) {
      setFeedback('Gagal menghubungi server.');
    } finally {
      setSubmitting(null);
    }
  };

  const handleSubmit = async () => {
    if (!assessmentId) return;
    try {
      setSubmitting('submit');
      const res = await fetch(`/api/assessments/${assessmentId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ savedScores: Array.from(savedScores.entries()) }),
      });
      if (res.ok) {
        setFeedback('Assessment dikirim ke captain.');
      } else {
        const err = await res.json();
        setFeedback(err.error?.message || 'Gagal mengirim.');
      }
    } catch (err) {
      setFeedback('Gagal menghubungi server.');
    } finally {
      setSubmitting(null);
    }
  };

  const handleFinalize = async () => {
    if (!assessmentId) return;
    try {
      setSubmitting('finalize');
      const res = await fetch(`/api/assessments/${assessmentId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ savedScores: Array.from(savedScores.entries()) }),
      });
      if (res.ok) {
        setFeedback('Assessment di-finalisasi.');
      } else {
        const err = await res.json();
        setFeedback(err.error?.message || 'Gagal finalisasi.');
      }
    } catch (err) {
      setFeedback('Gagal menghubungi server.');
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) return <div className="text-base-content/60">Memuat scorecard...</div>;
  if (!details) return <div className="text-base-content/60">Assessment tidak ditemukan.</div>;

  const isCaptain = true;
  const canEditSelf = details.status === 'draft';
  const canSeeCaptain = details.status !== 'draft';

  return (
    <div className="space-y-6">
      <div className="section-head">
        <div>
          <p className="kicker">CARE Scorecard</p>
          <h2 className="text-2xl font-semibold text-base-content mt-0.5">
            {details.period}
          </h2>
        </div>
        <span className={`tag ${STATUS_TAGS[details.status] || 'tag-neutral'}`}>
          {STATUS_LABELS[details.status] || details.status}
        </span>
      </div>

      <div className="card p-5 reveal">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-md flex items-center justify-center ${details.status === 'final' ? 'bg-success/15' : details.status === 'submitted' ? 'bg-primary/15' : 'bg-base-200/50'}`}>
              {details.status === 'final' ? <IconCheck className="w-5 h-5 text-success" /> : details.status === 'submitted' ? <IconShieldCheck className="w-5 h-5 text-primary" /> : <IconClock className="w-5 h-5 text-base-content/60" />}
            </div>
            <div>
              <p className="text-xs text-base-content/60 uppercase tracking-wide">Status</p>
              <p className="font-semibold text-base-content">{STATUS_LABELS[details.status] || details.status}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-base-content/60 uppercase tracking-wide">Progress</p>
            <p className="font-bold text-base-content">
              {details.status === 'final' ? '100%' : details.status === 'discussed' ? '50%' : details.status === 'submitted' ? '25%' : '0%'}
            </p>
          </div>
        </div>
        {details.note_1on1 && <p className="text-sm text-base-content/60">Note 1:1: {details.note_1on1}</p>}
      </div>

      {feedback && (
        <div className="card p-4 border-l-4 border-primary bg-primary/5">
          <p className="text-sm text-base-content">{feedback}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5">
        <div className="card p-5 reveal" style={{ animationDelay: '80ms' }}>
          <h3 className="text-lg font-semibold text-base-content mb-4 flex items-center gap-2">
            <IconUserCircle className="w-5 h-5 text-base-content/60" />
            Self (1—4) {canEditSelf ? '(edit)' : '(sudah)'}
          </h3>
          <div className="space-y-5">
            {details.selfScores.map((item) => {
              const score = getScore(item.dimension_code, 'self');
              const canEdit = canEditSelf;
              const isDirty = savedScores.has(`self:${item.dimension_code}`);
              return (
                <div key={item.dimension_code} className="border-b border-base-200/40 pb-4 last:border-0">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-base-content">{DIMENSION_LABELS[item.dimension_code] || item.dimension_code}</span>
                    <div className="flex gap-2">
                      {canEdit && (
                        <select
                          value={score ?? ''}
                          onChange={(e) => handleSelfScoreChange(item.dimension_code, Number(e.target.value))}
                          className="text-sm border border-base-300 rounded-md px-2 py-1.5 min-h-[44px] touch-target"
                          disabled={submitting === 'self'}
                        >
                          <option value="">Belum diisi</option>
                          {SCORE_RANGE.map((v) => <option key={v} value={v}>{v}</option>)}
                        </select>
                      )}
                      {!canEdit && <span className="text-sm font-medium text-base-content">{score ?? '—'}</span>}
                    </div>
                  </div>
                  {canEdit && isDirty && (
                    <input
                      type="text"
                      value={getObservation(item.dimension_code, 'self') || ''}
                      onChange={() => {}}
                      placeholder="Fakta pengamatan..."
                      className="mt-1 w-full border border-base-300 rounded-md px-3 py-1.5 text-sm min-h-[44px] touch-target"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-5 reveal" style={{ animationDelay: '160ms' }}>
          <h3 className="text-lg font-semibold text-base-content mb-4 flex items-center gap-2">
            <IconShieldCheck className="w-5 h-5 text-base-content/60" />
            Captain (1–4) {canSeeCaptain ? '(lihat/submit)' : '(tidak tersedia)'}
          </h3>
          <div className="space-y-5">
            {details.captainScores.map((item) => {
              const score = getScore(item.dimension_code, 'captain');
              const isEditable = canSeeCaptain && details.status === 'draft' && isCaptain;
              const followupText = getFollowup(item.dimension_code);
              return (
                <div key={item.dimension_code} className="border-b border-base-200/40 pb-4 last:border-0">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-base-content">{DIMENSION_LABELS[item.dimension_code] || item.dimension_code}</span>
                    <div className="flex gap-2">
                      {isEditable && (
                        <select
                          value={score ?? ''}
                          onChange={(e) => handleCaptainScoreChange(item.dimension_code, Number(e.target.value))}
                          className="text-sm border border-base-300 rounded-md px-2 py-1.5 min-h-[44px] touch-target"
                          disabled={submitting === 'captain'}
                        >
                          <option value="">Belum diisi</option>
                          {SCORE_RANGE.map((v) => <option key={v} value={v}>{v}</option>)}
                        </select>
                      )}
                      {!isEditable && <span className="text-sm font-medium text-base-content">{score ?? '—'}</span>}
                    </div>
                  </div>
                  {isEditable && (
                    <input
                      type="text"
                      value={getObservation(item.dimension_code, 'captain') || ''}
                      onChange={() => {}}
                      placeholder="Fakta pengamatan..."
                      className="mt-1 w-full border border-base-300 rounded-md px-3 py-1.5 text-sm min-h-[44px] touch-target"
                    />
                  )}
                  {followupText && (
                    <p className="mt-2 text-sm text-base-content/70">Komentar captain: {followupText}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {details.status === 'draft' && (
        <div className="flex gap-3 reveal" style={{ animationDelay: '240ms' }}>
          <button
            onClick={handleSubmit}
            disabled={submitting === 'submit'}
            className="btn-reset btn-reset-primary flex-1 min-h-[44px] touch-target"
          >
            {submitting === 'submit' ? 'Mengirim...' : 'Kirim Assessment (Draft → Submitted)'}
          </button>
          <button
            onClick={handleFinalize}
            disabled={submitting === 'finalize'}
            className="btn-reset flex-1 min-h-[44px] touch-target"
          >
            {submitting === 'finalize' ? 'Finalisasi...' : 'Finalisasi (Discuss → Final)'}
          </button>
        </div>
      )}

      {details.status === 'final' && (
        <div className="card p-5 reveal" style={{ animationDelay: '240ms' }}>
          <h3 className="text-lg font-semibold text-base-content mb-4">Skor Akhir (Final)</h3>
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-base-content/60">
                  <th className="py-3 px-4">Dimensi</th>
                  <th className="py-3 px-4 text-center">Self</th>
                  <th className="py-3 px-4 text-center">Captain</th>
                  <th className="py-3 px-4 text-center">Final</th>
                </tr>
              </thead>
              <tbody className="text-base-content">
                {details.selfScores.map((item) => {
                  const self = getScore(item.dimension_code, 'self');
                  const captain = getScore(item.dimension_code, 'captain');
                  const final = savedScores.get(item.dimension_code) ?? null;
                  return (
                    <tr key={item.dimension_code} className="hover:bg-base-200/50 transition-colors">
                      <td className="py-3 px-4 font-medium">{DIMENSION_LABELS[item.dimension_code] || item.dimension_code}</td>
                      <td className="py-3 px-4 text-center">{self ?? '—'}</td>
                      <td className="py-3 px-4 text-center">{captain ?? '—'}</td>
                      <td className="py-3 px-4 text-center font-bold text-primary">{final ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

