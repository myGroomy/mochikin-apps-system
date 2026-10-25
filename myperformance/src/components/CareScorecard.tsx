'use client';

import React, { useEffect, useState } from 'react';

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
  C1_CUSTOMER: 'C1 – Customer Focus',
  A2_ACCOUNTABILITY: 'A2 – Accountability',
  R3_RELIABILITY: 'R3 – Reliability',
  E4_EXCELLENCE: 'E4 – Excellence',
  T5_TEAMWORK: 'T5 – Teamwork',
  I6_INTEGRITY: 'I6 – Integrity',
  O7_OWNERSHIP: 'O7 – Ownership',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  discussed: 'Discussed',
  final: 'Final',
};

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
      const json = await res.json();
      if (json.success) {
        fetchAssessment();
        setFeedback('✅ Skor self berhasil disimpan.');
      } else {
        setFeedback(`❌ ${json.error.message}`);
      }
    } catch (err) {
      setFeedback('❌ Gagal mengirim skor.');
    } finally {
      setSubmitting(null);
    }
  };

  const handleCaptainScoreChange = async (
    dimensionCode: string,
    score: number,
    followup: string
  ) => {
    if (!assessmentId) return;
    try {
      setSubmitting('captain');
      const res = await fetch(`/api/assessments/${assessmentId}/captain-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          captainPersonId: personId || '',
          dimensionCode,
          score,
          observedFact: getObservation(dimensionCode, 'captain'),
          followup,
        }),
      });
      const json = await res.json();
      if (json.success) {
        fetchAssessment();
        setFeedback('✅ Skor captain berhasil disimpan.');
      } else {
        setFeedback(`❌ ${json.error.message}`);
      }
    } catch (err) {
      setFeedback('❌ Gagal mengirim skor captain.');
    } finally {
      setSubmitting(null);
    }
  };

  const handleSubmit = async () => {
    if (!assessmentId) return;
    try {
      setSubmitting('submit');
      const res = await fetch(`/api/assessments/${assessmentId}/submit`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setFeedback('✅ Assessment berhasil dikirim.');
        fetchAssessment();
      } else {
        setFeedback(`❌ ${json.error.message}`);
      }
    } catch (err) {
      setFeedback('❌ Gagal submit.');
    } finally {
      setSubmitting(null);
    }
  };

  const handleFinalize = async () => {
    if (!assessmentId) return;
    try {
      setSubmitting('finalize');
      const res = await fetch(`/api/assessments/${assessmentId}/finalize`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setFeedback('✅ Assessment berhasil difinalisasi.');
        fetchAssessment();
      } else {
        setFeedback(`❌ ${json.error.message}`);
      }
    } catch (err) {
      setFeedback('❌ Gagal finalize.');
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) return <div className="text-gray-500">Memuat scorecard...</div>;
  if (!details) return <div className="text-gray-500">Assessment tidak ditemukan.</div>;

  const isCaptain = true;
  const canEditSelf = details.status === 'draft';
  const canSeeCaptain = details.status !== 'draft';

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">CARE Scorecard</h2>
        <p className="text-gray-600">
          Periode: {details.period} · Status: {STATUS_LABELS[details.status] || details.status}
        </p>
      </div>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold">Status:</span>
          <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-colors duration-300 ${
                details.status === 'final'
                  ? 'bg-green-500'
                  : details.status === 'discussed'
                  ? 'bg-blue-500'
                  : details.status === 'submitted'
                  ? 'bg-yellow-500'
                  : 'bg-gray-400'
              }`}
              style={{ width: `${Math.min(100, details.status === 'final' ? 100 : details.status === 'discussed' ? 66 : details.status === 'submitted' ? 33 : 0)}%` }}
            />
          </div>
          <span className="text-sm font-semibold">
            {Math.min(100, details.status === 'final' ? 100 : details.status === 'discussed' ? 50 : details.status === 'submitted' ? 25 : 0)}
          </span>
        </div>
        {details.note_1on1 && <p className="mt-2 text-sm text-gray-600">Note 1:1: {details.note_1on1}</p>}
      </div>

      {feedback && (
        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">{feedback}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border">
          <h3 className="text-lg font-semibold mb-4">Self (1–4) {canEditSelf ? '(edit)' : '(sudah)'}</h3>
          <div className="space-y-4">
            {details.selfScores.map((item) => {
              const score = getScore(item.dimension_code, 'self');
              const canEdit = canEditSelf;
              const isDirty = savedScores.has(`self:${item.dimension_code}`);
              return (
                <div key={item.dimension_code} className="border-b pb-4 last:border-0">
                  <div className="flex justify-between items-start">
                    <span className="font-medium">{DIMENSION_LABELS[item.dimension_code] || item.dimension_code}</span>
                    <div className="flex gap-2">
                      {canEdit && (
                        <select
                          value={score ?? ''}
                          onChange={(e) => handleSelfScoreChange(item.dimension_code, Number(e.target.value))}
                          className="border rounded px-2 py-1 text-sm"
                          disabled={submitting === 'self'}
                        >
                          <option value="">Belum diisi</option>
                          {[1, 1.5, 2, 2.5, 3, 3.5, 4].map((v) => <option key={v} value={v}>{v}</option>)}
                        </select>
                      )}
                      {!canEdit && <span className="text-gray-600 font-medium">{score ?? '—'}</span>}
                    </div>
                  </div>
                  {canEdit && isDirty && (
                    <input
                      type="text"
                      value={getObservation(item.dimension_code, 'self') || ''}
                      onChange={() => {}}
                      placeholder="Fakta pengamatan..."
                      className="mt-1 w-full border rounded px-2 py-1 text-sm"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border">
          <h3 className="text-lg font-semibold mb-4">Captain (1–4) {canSeeCaptain ? '(lihat/submit)' : '(tidak tersedia)'}</h3>
          <div className="space-y-4">
            {details.captainScores.map((item) => {
              const score = getScore(item.dimension_code, 'captain');
              const isEditable = canSeeCaptain && details.status === 'draft' && isCaptain;
              const followupText = getFollowup(item.dimension_code);
              return (
                <div key={item.dimension_code} className="border-b pb-4 last:border-0">
                  <div className="flex justify-between items-start">
                    <span className="font-medium">{DIMENSION_LABELS[item.dimension_code] || item.dimension_code}</span>
                    <div className="flex gap-2">
                      {isEditable && (
                        <>
                          <select
                            value={score ?? ''}
                            onChange={(e) => handleCaptainScoreChange(item.dimension_code, Number(e.target.value), followupText)}
                            className="border rounded px-2 py-1 text-sm"
                            disabled={submitting === 'captain'}
                          >
                            <option value="">Belum diisi</option>
                            {[1, 1.5, 2, 2.5, 3, 3.5, 4].map((v) => <option key={v} value={v}>{v}</option>)}
                          </select>
                          <input
                            type="text"
                            value={followupText || ''}
                            onChange={() => {}}
                            placeholder="Follow-up / Tindak lanjut..."
                            className="border rounded px-2 py-1 text-sm w-32"
                            disabled={submitting === 'captain'}
                          />
                        </>
                      )}
                      {!isEditable && <span className="text-gray-600 font-medium">{score ?? '—'}</span>}
                    </div>
                  </div>
                  {followupText && <p className="mt-1 text-sm text-gray-600">📋 Follow-up: {followupText}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {details.status === 'draft' && (
        <div className="mt-6 flex gap-4">
          <button
            onClick={handleSubmit}
            disabled={submitting === 'submit'}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Kirim Assessment (Draft → Submitted)
          </button>
          <button
            onClick={handleFinalize}
            disabled={submitting === 'finalize'}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            Finalisasi (Discuss → Final)
          </button>
        </div>
      )}

      {details.status === 'submitted' && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">⚠️ Assessment sudah dikirim. Captain dapat membaca self-score. Lanjutkan ke diskusi (1:1).</p>
        </div>
      )}
      {details.status === 'discussed' && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">✅ Assessment sudah didiskusikan. Proses dapat difinalisasi.</p>
        </div>
      )}
      {details.status === 'final' && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">✅ Assessment telah final. Skor akhir telah dihitung.</p>
        </div>
      )}

      {details.status === 'final' && (
        <div className="mt-6 bg-white p-6 rounded-xl border">
          <h3 className="text-lg font-semibold mb-4">Skor Akhir (Final)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Dimensi</th>
                  <th className="text-center py-2">Self</th>
                  <th className="text-center py-2">Captain</th>
                  <th className="text-center py-2">Final</th>
                </tr>
              </thead>
              <tbody>
                {details.selfScores.map((item) => {
                  const self = getScore(item.dimension_code, 'self');
                  const captain = getScore(item.dimension_code, 'captain');
                  const final = savedScores.get(item.dimension_code) ?? null;
                  return (
                    <tr key={item.dimension_code} className="border-b">
                      <td className="py-2 font-medium">{DIMENSION_LABELS[item.dimension_code] || item.dimension_code}</td>
                      <td className="text-center">{self ?? '—'}</td>
                      <td className="text-center">{captain ?? '—'}</td>
                      <td className="text-center font-bold text-blue-600">{final ?? '—'}</td>
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
