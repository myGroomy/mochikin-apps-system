'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Award,
  Plus,
  CheckCircle2,
  Lock,
  Unlock,
  Users,
  MessageSquare,
  ShieldCheck,
  RotateCcw,
  Star,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { PointBadge } from '@mochikin/ui';

interface Session {
  id: string;
  title: string;
  is_open: boolean;
  opened_at: string;
  closed_at?: string;
  questionCount: number;
  responseCount: number;
}

interface Question {
  id: string;
  question_text: string;
  max_points: number;
  sort_order: number;
}

interface EvaluationResult {
  personId: string;
  personName: string;
  totalScore: number;
  responseCount: number;
  averageScore: number;
  feedbackList: string[];
}

interface Person {
  id: string;
  name: string;
}

export default function ScorecardsPage() {
  const [activeTab, setActiveTab] = useState<'evaluate' | 'results' | 'manage'>('evaluate');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // Evaluation Form State
  const [evaluatorId, setEvaluatorId] = useState<string>('00000000-0000-0000-0000-000000000001');
  const [evaluatedId, setEvaluatedId] = useState<string>('');
  const [ratings, setRatings] = useState<Record<string, { points: number; feedback: string }>>({});

  // Admin New Session State
  const [newTitle, setNewTitle] = useState('');
  const [newQuestions, setNewQuestions] = useState([
    { question_text: 'Tanggung jawab dan ketepatan waktu dalam tugas harian', max_points: 10 },
    { question_text: 'Komunikasi dan kerjasama tim antar rekan kerja', max_points: 10 },
    { question_text: 'Kerapian, kebersihan, dan standar operasional kerja', max_points: 10 },
  ]);

  const flash = (type: 'ok' | 'err', msg: string) => {
    setNotice({ type, msg });
    setTimeout(() => setNotice(null), 4000);
  };

  // 1. Load Sessions
  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/scorecards/sessions');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSessions(data.sessions || []);
          // Auto select first open session
          const openSess = (data.sessions || []).find((s: Session) => s.is_open);
          if (openSess) {
            setSelectedSessionId(openSess.id);
          } else if (data.sessions?.[0]) {
            setSelectedSessionId(data.sessions[0].id);
          }
        }
      }
    } catch {
      flash('err', 'Gagal memuat daftar sesi evaluasi');
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Load Session Details (Questions & Results)
  const loadSessionDetails = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/scorecards/sessions/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setQuestions(data.questions || []);
          setResults(data.summaryResults || []);

          // Inisialisasi default ratings
          const initRatings: Record<string, { points: number; feedback: string }> = {};
          (data.questions || []).forEach((q: Question) => {
            initRatings[q.id] = { points: q.max_points, feedback: '' };
          });
          setRatings(initRatings);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // 3. Load People
  const loadPeople = useCallback(async () => {
    try {
      const res = await fetch('/api/points/central?period=month');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.leaderboard) {
          setPeople(data.leaderboard.map((u: any) => ({ id: u.userId, name: u.name })));
          if (data.leaderboard[0]) {
            setEvaluatedId(data.leaderboard[0].userId);
          }
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadSessions();
    loadPeople();
  }, [loadSessions, loadPeople]);

  useEffect(() => {
    if (selectedSessionId) {
      loadSessionDetails(selectedSessionId);
    }
  }, [selectedSessionId, loadSessionDetails]);

  // 4. Submit Evaluation
  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId || !evaluatedId) {
      flash('err', 'Pilih rekan kerja yang dinilai');
      return;
    }
    if (evaluatorId === evaluatedId) {
      flash('err', 'Anda tidak dapat menilai diri sendiri');
      return;
    }

    setSubmitting(true);
    try {
      const ratingsPayload = Object.entries(ratings).map(([qId, r]) => ({
        question_id: qId,
        points_given: r.points,
        feedback: r.feedback,
      }));

      const res = await fetch('/api/scorecards/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: selectedSessionId,
          evaluator_id: evaluatorId,
          evaluated_id: evaluatedId,
          ratings: ratingsPayload,
        }),
      });

      const data = await res.json();
      if (data.success) {
        flash('ok', `Penilaian berhasil dikirim (+${data.totalScoreAwarded} poin dicatat)`);
        loadSessionDetails(selectedSessionId);
      } else {
        flash('err', data.error || 'Gagal mengirim evaluasi');
      }
    } catch {
      flash('err', 'Terjadi kesalahan jaringan');
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Create New Session
  const handleCreateSession = async () => {
    if (!newTitle.trim()) {
      flash('err', 'Judul sesi evaluasi wajib diisi');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/scorecards/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          questions: newQuestions,
        }),
      });
      const data = await res.json();
      if (data.success) {
        flash('ok', 'Sesi evaluasi baru berhasil dibuka!');
        setNewTitle('');
        loadSessions();
        setActiveTab('evaluate');
      } else {
        flash('err', data.error || 'Gagal membuat sesi');
      }
    } catch {
      flash('err', 'Kesalahan server');
    } finally {
      setSubmitting(false);
    }
  };

  // 6. Close Session
  const handleCloseSession = async (sessionId: string) => {
    if (!confirm('Tutup sesi evaluasi ini secara final?')) return;
    try {
      const res = await fetch(`/api/scorecards/sessions/${sessionId}`, {
        method: 'PUT',
      });
      const data = await res.json();
      if (data.success) {
        flash('ok', 'Sesi evaluasi berhasil ditutup');
        loadSessions();
      } else {
        flash('err', data.error || 'Gagal menutup sesi');
      }
    } catch {
      flash('err', 'Kesalahan server');
    }
  };

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  return (
    <main className="page-shell min-h-[calc(100vh-5rem)] space-y-6">
      {/* Toast Notification */}
      {notice && (
        <div className={`alert ${notice.type === 'ok' ? 'alert-success' : 'alert-error'} shadow-lg text-xs font-semibold`}>
          <span>{notice.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard/team"
              className="text-xs text-base-content/60 hover:text-base-content transition-colors"
            >
              ← Kembali ke Dashboard Tim
            </Link>
            <span className="text-base-content/40 text-xs">•</span>
            <span className="badge badge-sm badge-secondary text-[10px] font-bold">
              360° Peer Evaluation
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-base-content tracking-tight">
            Scorecards Evaluasi Karyawan
          </h1>
          <p className="text-xs sm:text-sm text-base-content/60">
            Penilaian berkala antar rekan kerja secara anonim untuk memupuk budaya kerja solid
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-base-200 rounded-lg p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('evaluate')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'evaluate' ? 'bg-base-100 text-base-content shadow-sm' : 'text-base-content/60 hover:text-base-content'
            }`}
          >
            Beri Penilaian
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('results')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'results' ? 'bg-base-100 text-base-content shadow-sm' : 'text-base-content/60 hover:text-base-content'
            }`}
          >
            Hasil Evaluasi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manage')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'manage' ? 'bg-base-100 text-base-content shadow-sm' : 'text-base-content/60 hover:text-base-content'
            }`}
          >
            Kelola Sesi (Admin)
          </button>
        </div>
      </div>

      {/* Sesi Selector Bar */}
      {sessions.length > 0 && (
        <div className="card bg-base-100 border border-base-300 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-secondary" />
            <span className="text-xs font-bold uppercase tracking-wider text-base-content/60">
              Pilih Sesi:
            </span>
            <select
              value={selectedSessionId || ''}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="select select-bordered select-sm text-xs font-semibold"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.is_open ? 'Aktif' : 'Selesai'})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {selectedSession?.is_open ? (
              <span className="badge badge-success badge-sm gap-1 text-[10px] font-bold text-white">
                <Unlock className="w-3 h-3" />
                <span>Sesi Terbuka</span>
              </span>
            ) : (
              <span className="badge badge-ghost badge-sm gap-1 text-[10px] font-bold">
                <Lock className="w-3 h-3" />
                <span>Sesi Ditutup</span>
              </span>
            )}
            <span className="text-xs text-base-content/50">
              {questions.length} Pertanyaan • {selectedSession?.responseCount || 0} Respons
            </span>
          </div>
        </div>
      )}

      {/* TAB 1: FORM EVALUASI */}
      {activeTab === 'evaluate' && (
        <div className="space-y-6">
          {!selectedSession?.is_open ? (
            <div className="card bg-base-100 border border-base-300 p-12 text-center space-y-3">
              <Lock className="w-10 h-10 mx-auto text-base-content/40" />
              <h3 className="font-bold text-base text-base-content">Sesi Ini Telah Ditutup</h3>
              <p className="text-xs text-base-content/60 max-w-md mx-auto">
                Pengisian penilaian hanya dapat dilakukan saat sesi dibuka oleh Admin/Owner. Silakan pilih sesi aktif lain atau lihat rekap hasil di tab Hasil Evaluasi.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitEvaluation} className="card bg-base-100 border border-base-300 p-6 shadow-sm space-y-6">
              {/* Evaluated Person Picker */}
              <div className="border-b border-base-300 pb-5">
                <label className="block text-xs font-bold uppercase tracking-wider text-base-content/60 mb-2">
                  Pilih Rekan Kerja yang Dinilai
                </label>
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-secondary" />
                  <select
                    value={evaluatedId}
                    onChange={(e) => setEvaluatedId(e.target.value)}
                    className="select select-bordered w-full max-w-sm text-sm font-semibold"
                  >
                    <option value="" disabled>-- Pilih Karyawan --</option>
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-base-content/50">
                  <ShieldCheck className="w-3.5 h-3.5 text-success" />
                  <span>Penilaian ini bersifat <strong>anonim</strong> bagi penerima.</span>
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-5">
                <h3 className="font-bold text-sm text-base-content">Daftar Pertanyaan Evaluasi:</h3>
                {questions.map((q, idx) => {
                  const currentRating = ratings[q.id]?.points ?? q.max_points;
                  const currentFeedback = ratings[q.id]?.feedback ?? '';

                  return (
                    <div key={q.id} className="p-4 rounded-xl border border-base-200 bg-base-200/30 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-secondary">
                            Pertanyaan #{idx + 1}
                          </span>
                          <p className="font-semibold text-sm text-base-content mt-0.5">
                            {q.question_text}
                          </p>
                        </div>
                        <span className="badge badge-sm badge-outline font-bold text-xs">
                          Skor: {currentRating} / {q.max_points}
                        </span>
                      </div>

                      {/* Score slider */}
                      <div className="space-y-1">
                        <input
                          type="range"
                          min="0"
                          max={q.max_points}
                          value={currentRating}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setRatings((prev) => ({
                              ...prev,
                              [q.id]: { ...prev[q.id], points: val },
                            }));
                          }}
                          className="range range-secondary range-sm"
                        />
                        <div className="flex justify-between text-[10px] text-base-content/40 px-1 font-mono">
                          <span>0 (Kurang)</span>
                          <span>{Math.floor(q.max_points / 2)} (Cukup)</span>
                          <span>{q.max_points} (Sangat Baik)</span>
                        </div>
                      </div>

                      {/* Optional feedback */}
                      <div>
                        <input
                          type="text"
                          value={currentFeedback}
                          placeholder="Catatan / masukan konstruktif (opsional)..."
                          onChange={(e) => {
                            const val = e.target.value;
                            setRatings((prev) => ({
                              ...prev,
                              [q.id]: { ...prev[q.id], feedback: val },
                            }));
                          }}
                          className="input input-bordered input-sm w-full text-xs"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-base-300 flex items-center justify-between">
                <span className="text-xs text-base-content/50">
                  Total skor yang akan diberikan: <strong>{Object.values(ratings).reduce((a, b) => a + b.points, 0)} pts</strong>
                </span>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-secondary btn-sm px-6 font-bold gap-2 min-h-[40px]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{submitting ? 'Mengirim...' : 'Kirim Penilaian Rekan'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 2: HASIL EVALUASI (ANONIM & REKAP) */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          <div className="card bg-base-100 border border-base-300 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-base-300 flex items-center justify-between bg-base-200/50">
              <div>
                <h2 className="font-bold text-sm text-base-content">Rekapitulasi Skor Sesi</h2>
                <p className="text-[11px] text-base-content/50">
                  Total akumulasi poin yang diterima karyawan dari peer review
                </p>
              </div>
              <span className="badge badge-sm badge-outline text-[10px] font-bold">
                {results.length} Karyawan Terpilih
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="table table-sm w-full">
                <thead>
                  <tr className="border-b border-base-200 text-base-content/50 text-[11px]">
                    <th>Karyawan</th>
                    <th className="text-center">Penilai Masuk</th>
                    <th className="text-center">Rata-rata Skor</th>
                    <th className="text-right">Total Poin Diperoleh</th>
                    <th className="text-left">Feedback Masuk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-200 text-xs">
                  {results.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-base-content/40">
                        Belum ada data penilaian pada sesi ini
                      </td>
                    </tr>
                  ) : (
                    results.map((r) => (
                      <tr key={r.personId} className="hover:bg-base-200/40 transition-colors">
                        <td className="font-semibold text-base-content">{r.personName}</td>
                        <td className="text-center tabular-nums text-base-content/70">{r.responseCount}</td>
                        <td className="text-center font-bold text-secondary tabular-nums">{r.averageScore}</td>
                        <td className="text-right">
                          <PointBadge points={r.totalScore} />
                        </td>
                        <td className="text-base-content/60 text-[11px] max-w-xs">
                          {r.feedbackList.length > 0 ? (
                            <ul className="list-disc pl-4 space-y-0.5">
                              {r.feedbackList.slice(0, 3).map((f, i) => (
                                <li key={i} className="truncate">{f}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="italic text-base-content/30">Tidak ada catatan</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: KELOLA SESI (ADMIN) */}
      {activeTab === 'manage' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create New Session */}
          <div className="card bg-base-100 border border-base-300 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-base-300">
              <Plus className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-bold text-sm text-base-content">Buka Sesi Evaluasi Baru</h3>
                <p className="text-[11px] text-base-content/50">Admin/Owner membuka periode penilaian 360° baru</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-base-content/60 mb-1">
                  Judul Sesi
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Misal: Evaluasi Kolaborasi & Kedisiplinan Bulan Ini"
                  className="input input-bordered input-sm w-full"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-base-content/60 mb-1">
                  Daftar Pertanyaan &amp; Bobot Poin
                </label>
                <div className="space-y-2">
                  {newQuestions.map((q, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={q.question_text}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewQuestions((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, question_text: val } : item))
                          );
                        }}
                        className="input input-bordered input-sm flex-1 text-xs"
                      />
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={q.max_points}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setNewQuestions((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, max_points: val } : item))
                          );
                        }}
                        className="input input-bordered input-sm w-16 text-center text-xs font-bold"
                        title="Maksimal skor"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCreateSession}
                disabled={submitting}
                className="btn btn-primary btn-sm w-full mt-2 font-bold"
              >
                <Sparkles className="w-4 h-4" />
                <span>{submitting ? 'Membuka...' : 'Buka Sesi Sekarang'}</span>
              </button>
            </div>
          </div>

          {/* List Sesi & Tutup Sesi */}
          <div className="card bg-base-100 border border-base-300 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-base-300">
              <Lock className="w-5 h-5 text-base-content/60" />
              <div>
                <h3 className="font-bold text-sm text-base-content">Status Sesi Evaluasi</h3>
                <p className="text-[11px] text-base-content/50">Tutup sesi aktif untuk memfinalisasi skor</p>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-xl border border-base-200 bg-base-200/30 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base-content">{s.title}</span>
                      {s.is_open ? (
                        <span className="badge badge-success badge-xs text-[9px] font-bold text-white">Buka</span>
                      ) : (
                        <span className="badge badge-ghost badge-xs text-[9px]">Tutup</span>
                      )}
                    </div>
                    <span className="text-[10px] text-base-content/50">
                      {s.questionCount} pertanyaan • {s.responseCount} penilaian masuk
                    </span>
                  </div>

                  {s.is_open && (
                    <button
                      type="button"
                      onClick={() => handleCloseSession(s.id)}
                      className="btn btn-warning btn-xs gap-1 font-semibold"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Tutup Sesi</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
