'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Award,
  AlertCircle,
  CheckCircle2,
  EyeOff,
  Info,
  ListChecks,
  Lock,
  LogIn,
  MessageSquare,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Unlock,
  Users,
} from 'lucide-react';
import { PointBadge } from '@mochikin/ui';
import { useSession } from '@/components/session/SessionProvider';
import { PageHeader } from '@/components/ui/PageHeader';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { ConfirmAction } from '@/components/ui/ConfirmAction';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { SegmentedControl, TabPanel, type SegmentItem } from '@/components/ui/SegmentedControl';
import { StatCard } from '@/components/ui/StatCard';

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

interface QuestionDraft {
  question_text: string;
  max_points: number;
}

type Tab = 'evaluate' | 'results' | 'manage';

const DEFAULT_QUESTIONS: QuestionDraft[] = [
  { question_text: 'Tanggung jawab dan ketepatan waktu dalam tugas harian', max_points: 10 },
  { question_text: 'Komunikasi dan kerjasama tim antar rekan kerja', max_points: 10 },
  { question_text: 'Kerapian, kebersihan, dan standar operasional kerja', max_points: 10 },
];

const TABS: SegmentItem<Tab>[] = [
  { value: 'evaluate', label: 'Isi Penilaian', icon: Star },
  { value: 'results', label: 'Rekap Tim', icon: Users },
  { value: 'manage', label: 'Kelola Sesi', icon: ShieldCheck },
];

export default function ScorecardsPage({ initialTab = 'evaluate' }: { initialTab?: Tab }) {
  const session = useSession();
  const {
    status: sessionStatus,
    authenticated,
    personId,
    branchId,
    branchName,
    role,
    capabilities,
    refresh,
  } = session;

  const [tab, setTab] = useState<Tab>(initialTab);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [people, setPeople] = useState<Person[]>([]);

  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);

  const [evaluatedId, setEvaluatedId] = useState('');
  const [ratings, setRatings] = useState<Record<string, { points: number; feedback: string }>>({});

  const [newTitle, setNewTitle] = useState('');
  const [newQuestions, setNewQuestions] = useState<QuestionDraft[]>(DEFAULT_QUESTIONS);

  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((type: 'ok' | 'err', msg: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice({ type, msg });
    noticeTimer.current = setTimeout(() => setNotice(null), 4200);
  }, []);

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    []
  );

  const canManage = capabilities.canManageScorecards;
  const canSeeTeam = capabilities.canViewTeamInsights;
  const canSeeDetail = capabilities.canViewScorecardDetail;

  const tabs = useMemo(
    () =>
      TABS.filter((item) => {
        if (item.value === 'manage') return canManage;
        return true;
      }),
    [canManage]
  );

  const activeTab = tabs.some((item) => item.value === tab) ? tab : 'evaluate';

  const loadSessions = useCallback(async () => {
    if (sessionStatus === 'loading') return;
    setSessionsLoading(true);
    try {
      const scopedBranch = !capabilities.canViewAllBranches && branchId ? branchId : null;
      const query = scopedBranch ? `?branch_id=${encodeURIComponent(scopedBranch)}` : '';
      const res = await fetch(`/api/scorecards/sessions${query}`, { cache: 'no-store' });
      const data = await res.json();
      if (!data.success) throw new Error(apiErrorMessage(data, 'Gagal memuat sesi'));

      const list: Session[] = data.sessions ?? [];
      setSessions(list);
      setSelectedSessionId((current) => {
        if (current && list.some((item) => item.id === current)) return current;
        return list.find((item) => item.is_open)?.id ?? list[0]?.id ?? null;
      });
    } catch {
      flash('err', 'Daftar sesi evaluasi tidak dapat dimuat.');
    } finally {
      setSessionsLoading(false);
    }
  }, [branchId, capabilities.canViewAllBranches, flash, sessionStatus]);

  const loadPeople = useCallback(async () => {
    if (!authenticated) {
      setPeople([]);
      return;
    }
    setPeopleLoading(true);
    try {
      const res = await fetch('/api/scorecards/people', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(apiErrorMessage(data, 'Gagal memuat rekan kerja'));
      setPeople(data.people ?? []);
      setEvaluatedId((current) => {
        if (current && (data.people ?? []).some((person: Person) => person.id === current)) return current;
        return data.people?.[0]?.id ?? '';
      });
    } catch {
      setPeople([]);
    } finally {
      setPeopleLoading(false);
    }
  }, [authenticated]);

  const loadSessionDetails = useCallback(
    async (sessionId: string) => {
      setDetailsLoading(true);
      try {
        const res = await fetch(`/api/scorecards/sessions/${sessionId}`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(apiErrorMessage(data, 'Gagal memuat sesi'));

        const nextQuestions: Question[] = data.questions ?? [];
        setQuestions(nextQuestions);
        setResults(data.summaryResults ?? []);
        setRatings((current) => {
          const next: Record<string, { points: number; feedback: string }> = {};
          nextQuestions.forEach((question) => {
            next[question.id] = current[question.id] ?? {
              points: question.max_points,
              feedback: '',
            };
          });
          return next;
        });
      } catch {
        flash('err', 'Detail sesi tidak dapat dimuat.');
      } finally {
        setDetailsLoading(false);
      }
    },
    [flash]
  );

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    void loadPeople();
  }, [loadPeople]);

  useEffect(() => {
    if (selectedSessionId) void loadSessionDetails(selectedSessionId);
  }, [selectedSessionId, loadSessionDetails]);

  const selectedSession = sessions.find((item) => item.id === selectedSessionId);

  const ownResult = useMemo(
    () => (personId ? results.find((item) => item.personId === personId) ?? null : null),
    [personId, results]
  );

  const visibleResults = useMemo(() => {
    if (canSeeTeam) return results;
    return personId ? results.filter((item) => item.personId === personId) : [];
  }, [canSeeTeam, personId, results]);

  const totalGiven = useMemo(
    () => Object.values(ratings).reduce((sum, rating) => sum + Number(rating.points || 0), 0),
    [ratings]
  );

  const canSubmit =
    authenticated &&
    Boolean(personId) &&
    Boolean(selectedSession?.is_open) &&
    Boolean(evaluatedId) &&
    questions.length > 0 &&
    !submitting;

  const handleRefresh = useCallback(async () => {
    await refresh();
    await loadSessions();
    if (selectedSessionId) await loadSessionDetails(selectedSessionId);
    await loadPeople();
  }, [loadPeople, loadSessions, loadSessionDetails, refresh, selectedSessionId]);

  const handleSubmitEvaluation = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!authenticated || !personId) {
      flash('err', 'Masuk lewat Launcher sebelum mengirim penilaian.');
      return;
    }
    if (!selectedSessionId || !evaluatedId) {
      flash('err', 'Pilih rekan kerja yang dinilai.');
      return;
    }
    if (personId === evaluatedId) {
      flash('err', 'Kamu tidak dapat menilai diri sendiri.');
      return;
    }
    if (questions.length === 0) {
      flash('err', 'Sesi ini belum memiliki pertanyaan.');
      return;
    }

    setSubmitting(true);
    try {
      const ratingsPayload = questions.map((question) => ({
        question_id: question.id,
        points_given: ratings[question.id]?.points ?? question.max_points,
        feedback: ratings[question.id]?.feedback?.trim() || null,
      }));

      const res = await fetch('/api/scorecards/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: selectedSessionId,
          evaluated_id: evaluatedId,
          ratings: ratingsPayload,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(apiErrorMessage(data, 'Gagal mengirim penilaian'));

      flash('ok', 'Penilaian terkirim. Skor dicatat pada penerima.');
      await Promise.all([loadSessionDetails(selectedSessionId), loadSessions()]);
    } catch (error) {
      flash('err', error instanceof Error ? error.message : 'Terjadi kesalahan jaringan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSession = async () => {
    if (!newTitle.trim()) {
      flash('err', 'Judul sesi evaluasi wajib diisi.');
      return;
    }

    const cleaned = newQuestions.map((question) => ({
      question_text: question.question_text.trim(),
      max_points: Number(question.max_points) || 10,
    }));

    if (cleaned.length === 0 || cleaned.some((question) => !question.question_text)) {
      flash('err', 'Setiap pertanyaan harus memiliki teks.');
      return;
    }
    if (cleaned.some((question) => question.max_points < 1 || question.max_points > 50)) {
      flash('err', 'Bobot pertanyaan harus antara 1 dan 50 poin.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/scorecards/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          questions: cleaned,
          branch_id: branchId ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(apiErrorMessage(data, 'Gagal membuat sesi'));

      flash('ok', 'Sesi evaluasi baru berhasil dibuka.');
      setNewTitle('');
      setNewQuestions(DEFAULT_QUESTIONS);
      await loadSessions();
      if (data.session?.id) setSelectedSessionId(data.session.id);
      setTab('evaluate');
    } catch (error) {
      flash('err', error instanceof Error ? error.message : 'Kesalahan server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseSession = async (sessionId: string) => {
    setClosingId(sessionId);
    try {
      const res = await fetch(`/api/scorecards/sessions/${sessionId}`, { method: 'PUT' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(apiErrorMessage(data, 'Gagal menutup sesi'));

      flash('ok', 'Sesi ditutup. Skor akhir tidak berubah lagi.');
      await loadSessions();
      if (selectedSessionId === sessionId) await loadSessionDetails(sessionId);
    } catch (error) {
      flash('err', error instanceof Error ? error.message : 'Kesalahan server.');
    } finally {
      setClosingId(null);
    }
  };

  const headerDescription = canSeeDetail
    ? 'Kelola periode penilaian 360°, pantau rekap tim, dan audit detail penilai.'
    : canSeeTeam
      ? 'Pantau rekap skor tim. Catatan dan identitas penilai tetap terbatas pada Admin.'
      : 'Nilai rekan kerjamu secara anonim. Kamu hanya melihat total skor yang kamu terima.';

  if (initialTab === 'manage' && sessionStatus === 'ready' && !canManage) {
    return (
      <main className="page-shell min-h-[calc(100vh-5rem)]">
        <PageHeader
          kicker="Scorecard 360°"
          title="Kelola Scorecard"
          description="Halaman ini dipakai untuk membuka dan menutup periode penilaian tim."
          badge={<RoleBadge role={role} size="md" />}
          meta={branchName ?? undefined}
          actions={
            <Link href="/scorecards" className="btn btn-primary btn-sm min-h-[44px] gap-1.5">
              <ListChecks className="h-4 w-4" aria-hidden="true" />
              Buka scorecard
            </Link>
          }
        />
        <div className="mt-6">
          <EmptyState
            icon={ShieldCheck}
            tone="locked"
            title="Kelola scorecard khusus Manajer ke atas"
            description="Sesuai peranmu, kamu dapat mengisi penilaian rekan kerja tetapi tidak dapat membuka atau menutup sesi. Hubungi Manajer atau Admin jika periode penilaian perlu diubah."
            action={
              <Link href="/scorecards" className="btn btn-ghost btn-sm min-h-[44px] gap-1.5">
                <ListChecks className="h-4 w-4" aria-hidden="true" />
                Kembali ke Isi Penilaian
              </Link>
            }
          />
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell min-h-[calc(100vh-5rem)] space-y-6">
      <PageHeader
        kicker="Scorecard 360°"
        title="Penilaian Rekan Kerja"
        description={headerDescription}
        badge={<RoleBadge role={role} size="md" />}
        meta={branchName ?? undefined}
        actions={
          <>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={sessionsLoading || detailsLoading}
              className="btn btn-ghost btn-sm min-h-[44px] gap-1.5"
            >
              <RotateCcw
                className={`h-3.5 w-3.5 ${sessionsLoading || detailsLoading ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              Segarkan
            </button>
            {canManage ? (
              <button
                type="button"
                onClick={() => setTab('manage')}
                className="btn btn-primary btn-sm min-h-[44px] gap-1.5"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Kelola sesi
              </button>
            ) : null}
          </>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl
          items={tabs.map((item) =>
            item.value === 'results'
              ? { ...item, label: canSeeTeam ? 'Rekap Tim' : 'Skor Saya' }
              : item
          )}
          value={activeTab}
          onChange={setTab}
          ariaLabel="Bagian scorecard"
          idPrefix="scorecards"
        />
        {selectedSession ? (
          <div className="flex items-center gap-2 text-[11px] text-base-content/50">
            {selectedSession.is_open ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 font-semibold text-success">
                <Unlock className="h-3 w-3" aria-hidden="true" />
                Sesi terbuka
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-base-300 bg-base-200/60 px-2 py-0.5 font-semibold text-base-content/55">
                <Lock className="h-3 w-3" aria-hidden="true" />
                Sesi ditutup
              </span>
            )}
            <span className="tabular">{selectedSession.responseCount} respons</span>
          </div>
        ) : null}
      </div>

      {activeTab !== 'manage' ? (
        <SessionSelector
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          onSelect={setSelectedSessionId}
          loading={sessionsLoading}
        />
      ) : null}

      {activeTab === 'evaluate' ? (
        <TabPanel id="scorecards" value="evaluate">
          <EvaluateTab
            sessionStatus={sessionStatus}
            authenticated={authenticated}
            canManage={canManage}
            sessionsLoading={sessionsLoading}
            detailsLoading={detailsLoading}
            peopleLoading={peopleLoading}
            submitting={submitting}
            sessions={sessions}
            selectedSession={selectedSession ?? null}
            questions={questions}
            people={people}
            personId={personId}
            evaluatedId={evaluatedId}
            onEvaluatedChange={setEvaluatedId}
            ratings={ratings}
            onRatingChange={(questionId, next) =>
              setRatings((current) => ({ ...current, [questionId]: next }))
            }
            totalGiven={totalGiven}
            canSubmit={canSubmit}
            onSubmit={handleSubmitEvaluation}
            onCreateSession={() => setTab('manage')}
          />
        </TabPanel>
      ) : null}

      {activeTab === 'results' ? (
        <TabPanel id="scorecards" value="results">
          <ResultsTab
            loading={detailsLoading}
            canSeeTeam={canSeeTeam}
            canSeeDetail={canSeeDetail}
            ownResult={ownResult}
            visibleResults={visibleResults}
            personId={personId}
            selectedSession={selectedSession ?? null}
            onRefresh={() =>
              selectedSessionId ? void loadSessionDetails(selectedSessionId) : undefined
            }
          />
        </TabPanel>
      ) : null}

      {activeTab === 'manage' ? (
        <TabPanel id="scorecards" value="manage">
          <ManageTab
            canManage={canManage}
            sessions={sessions}
            sessionsLoading={sessionsLoading}
            selectedSessionId={selectedSessionId}
            closingId={closingId}
            submitting={submitting}
            newTitle={newTitle}
            onTitleChange={setNewTitle}
            newQuestions={newQuestions}
            onQuestionChange={(index, next) =>
              setNewQuestions((current) =>
                current.map((item, itemIndex) => (itemIndex === index ? next : item))
              )
            }
            onQuestionRemove={(index) =>
              setNewQuestions((current) => current.filter((_, itemIndex) => itemIndex !== index))
            }
            onQuestionAdd={() =>
              setNewQuestions((current) => [...current, { question_text: '', max_points: 10 }])
            }
            onCreate={handleCreateSession}
            onClose={handleCloseSession}
            onSelectSession={(id) => {
              setSelectedSessionId(id);
              setTab('evaluate');
            }}
          />
        </TabPanel>
      ) : null}

      {notice ? (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-24 right-4 z-50 flex max-w-sm items-start gap-2 rounded-lg border px-3.5 py-3 text-xs font-medium shadow-lg md:bottom-6 ${
            notice.type === 'ok'
              ? 'border-success/30 bg-base-100 text-base-content'
              : 'border-error/30 bg-base-100 text-base-content'
          }`}
        >
          {notice.type === 'ok' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error" aria-hidden="true" />
          )}
          <span>{notice.msg}</span>
        </div>
      ) : null}
    </main>
  );
}

function SessionSelector({
  sessions,
  selectedSessionId,
  onSelect,
  loading,
}: {
  sessions: Session[];
  selectedSessionId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}) {
  if (loading && sessions.length === 0) {
    return <CardSkeleton rows={1} />;
  }

  if (sessions.length === 0) return null;

  return (
    <div className="card card-static flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/50">
          Periode penilaian
        </span>
        <select
          value={selectedSessionId ?? ''}
          onChange={(event) => onSelect(event.target.value)}
          className="select select-bordered select-sm min-h-[44px] max-w-full text-xs font-semibold"
          aria-label="Pilih sesi penilaian"
        >
          {sessions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title} — {item.is_open ? 'Aktif' : 'Ditutup'}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-3 text-[11px] text-base-content/50">
        <span className="inline-flex items-center gap-1">
          <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
          {sessions.find((item) => item.id === selectedSessionId)?.questionCount ?? 0} pertanyaan
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
          {sessions.find((item) => item.id === selectedSessionId)?.responseCount ?? 0} respons
        </span>
      </div>
    </div>
  );
}

function EvaluateTab({
  sessionStatus,
  authenticated,
  canManage,
  sessionsLoading,
  detailsLoading,
  peopleLoading,
  submitting,
  sessions,
  selectedSession,
  questions,
  people,
  personId,
  evaluatedId,
  onEvaluatedChange,
  ratings,
  onRatingChange,
  totalGiven,
  canSubmit,
  onSubmit,
  onCreateSession,
}: {
  sessionStatus: 'loading' | 'ready' | 'error';
  authenticated: boolean;
  canManage: boolean;
  sessionsLoading: boolean;
  detailsLoading: boolean;
  peopleLoading: boolean;
  submitting: boolean;
  sessions: Session[];
  selectedSession: Session | null;
  questions: Question[];
  people: Person[];
  personId: string | null;
  evaluatedId: string;
  onEvaluatedChange: (id: string) => void;
  ratings: Record<string, { points: number; feedback: string }>;
  onRatingChange: (id: string, next: { points: number; feedback: string }) => void;
  totalGiven: number;
  canSubmit: boolean;
  onSubmit: (event: React.FormEvent) => void;
  onCreateSession: () => void;
}) {
  if (sessionStatus === 'loading' || (sessionsLoading && sessions.length === 0)) {
    return <CardSkeleton rows={5} />;
  }

  if (sessionStatus === 'ready' && !authenticated) {
    return (
      <EmptyState
        icon={LogIn}
        tone="locked"
        title="Masuk lewat Launcher untuk menilai"
        description="Identitas penilai diambil dari sesi Launcher, bukan dari input bebas. Buka MyPerformance dari Launcher lalu kembali ke halaman ini."
      />
    );
  }

  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={Award}
        title="Belum ada sesi penilaian"
        description={
          canManage
            ? 'Buka periode penilaian pertama agar petugas dapat menilai rekan kerjanya.'
            : 'Admin belum membuka periode penilaian untuk cabang ini. Cek kembali nanti.'
        }
        action={
          canManage ? (
            <button type="button" onClick={onCreateSession} className="btn btn-primary btn-sm min-h-[44px] gap-1.5">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Buka sesi baru
            </button>
          ) : undefined
        }
      />
    );
  }

  if (!selectedSession) return <CardSkeleton rows={4} />;

  if (!selectedSession.is_open) {
    return (
      <EmptyState
        icon={Lock}
        tone="locked"
        title="Sesi ini sudah ditutup"
        description="Pengisian hanya tersedia saat sesi dibuka Admin atau Manajer. Pilih sesi aktif lain, atau lihat rekap pada tab hasil."
      />
    );
  }

  if (detailsLoading) return <CardSkeleton rows={6} />;

  if (questions.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="Sesi belum memiliki pertanyaan"
        description="Minta Admin melengkapi pertanyaan sesi sebelum mengisi penilaian."
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="card card-static space-y-6 p-5 sm:p-6">
      <div className="flex flex-col gap-4 border-b border-base-300 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full max-w-md">
          <label
            htmlFor="evaluated-person"
            className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/55"
          >
            Rekan yang dinilai
          </label>
          <select
            id="evaluated-person"
            value={evaluatedId}
            onChange={(event) => onEvaluatedChange(event.target.value)}
            disabled={peopleLoading || people.length === 0}
            className="select select-bordered min-h-[44px] w-full text-sm font-semibold"
          >
            <option value="" disabled>
              {peopleLoading ? 'Memuat rekan kerja…' : people.length === 0 ? 'Tidak ada rekan untuk dinilai' : 'Pilih karyawan'}
            </option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
          <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-base-content/50">
            <EyeOff className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
            Penilaian dikirim anonim. Penerima tidak melihat identitas penilai.
          </p>
        </div>

        <div className="rounded-md border border-base-300 bg-base-200/40 px-3 py-2 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-base-content/45">
            Total skor diberikan
          </p>
          <p className="text-xl font-semibold tabular text-base-content">{totalGiven} pts</p>
        </div>
      </div>

      {people.length === 0 && !peopleLoading ? (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/[0.06] px-3.5 py-3 text-xs leading-relaxed text-base-content/65">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          Belum ada rekan lain di cabang ini. Penilaian tidak dapat dikirim sampai ada petugas lain
          yang terdaftar.
        </div>
      ) : null}

      <fieldset className="space-y-4">
        <legend className="sr-only">Pertanyaan penilaian</legend>
        {questions.map((question, index) => {
          const current = ratings[question.id] ?? {
            points: question.max_points,
            feedback: '',
          };
          const rangeId = `rating-${question.id}`;
          const feedbackId = `feedback-${question.id}`;

          return (
            <div key={question.id} className="rounded-lg border border-base-300 bg-base-100 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="max-w-xl">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
                    Pertanyaan {index + 1}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold leading-relaxed text-base-content">
                    {question.question_text}
                  </p>
                </div>
                <output
                  htmlFor={rangeId}
                  className="rounded-full border border-primary/20 bg-primary/[0.06] px-2.5 py-1 text-[11px] font-semibold tabular text-primary"
                >
                  {current.points} / {question.max_points}
                </output>
              </div>

              <div className="mt-4 space-y-1">
                <label htmlFor={rangeId} className="sr-only">
                  Skor untuk pertanyaan {index + 1}
                </label>
                <input
                  id={rangeId}
                  type="range"
                  min={0}
                  max={question.max_points}
                  value={current.points}
                  onChange={(event) =>
                    onRatingChange(question.id, {
                      ...current,
                      points: Number(event.target.value),
                    })
                  }
                  className="range range-primary range-sm w-full"
                />
                <div className="flex justify-between px-0.5 text-[10px] text-base-content/40">
                  <span>0 · Kurang</span>
                  <span>{Math.floor(question.max_points / 2)} · Cukup</span>
                  <span>{question.max_points} · Sangat baik</span>
                </div>
              </div>

              <div className="mt-3">
                <label
                  htmlFor={feedbackId}
                  className="mb-1 block text-[11px] font-medium text-base-content/55"
                >
                  Catatan untuk Admin <span className="font-normal text-base-content/40">(opsional)</span>
                </label>
                <input
                  id={feedbackId}
                  type="text"
                  value={current.feedback}
                  placeholder="Masukan konstruktif, tidak ditampilkan ke penerima…"
                  onChange={(event) =>
                    onRatingChange(question.id, {
                      ...current,
                      feedback: event.target.value,
                    })
                  }
                  className="input input-bordered min-h-[44px] w-full text-xs"
                />
              </div>
            </div>
          );
        })}
      </fieldset>

      <div className="flex flex-col gap-3 border-t border-base-300 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-1.5 text-[11px] text-base-content/50">
          <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
          Hanya Admin yang dapat melihat detail penilai dan catatan.
        </p>
        <button
          type="submit"
          disabled={!canSubmit}
          className="btn btn-primary btn-sm min-h-[44px] gap-1.5 px-5 font-semibold"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {submitting ? 'Mengirim…' : 'Kirim penilaian'}
        </button>
      </div>
      {!personId && authenticated ? (
        <p className="text-[11px] text-error">Identitas pengguna tidak lengkap; muat ulang sesi.</p>
      ) : null}
    </form>
  );
}

function ResultsTab({
  loading,
  canSeeTeam,
  canSeeDetail,
  ownResult,
  visibleResults,
  personId,
  selectedSession,
  onRefresh,
}: {
  loading: boolean;
  canSeeTeam: boolean;
  canSeeDetail: boolean;
  ownResult: EvaluationResult | null;
  visibleResults: EvaluationResult[];
  personId: string | null;
  selectedSession: Session | null;
  onRefresh: () => void;
}) {
  if (!selectedSession) {
    return (
      <EmptyState
        icon={Award}
        title="Belum ada sesi untuk direkap"
        description="Rekap akan muncul setelah Admin membuka periode penilaian."
      />
    );
  }

  if (loading) return <TableSkeleton rows={5} columns={4} />;

  if (!canSeeTeam) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label="Total skor diterima"
            value={ownResult?.totalScore ?? 0}
            unit="pts"
            icon={Award}
            tone="primary"
            hint="Akumulasi dari seluruh penilai anonim."
          />
          <StatCard
            label="Penilai masuk"
            value={ownResult?.responseCount ?? 0}
            unit="respons"
            icon={Users}
            tone="info"
            hint="Jumlah penilaian yang sudah masuk."
          />
          <StatCard
            label="Rata-rata per penilai"
            value={ownResult?.averageScore ?? 0}
            unit="pts"
            icon={Star}
            tone="neutral"
            hint="Total dibagi jumlah penilai."
          />
        </div>

        <div className="card card-static p-4 sm:p-5">
          <div className="flex items-start gap-2 text-xs leading-relaxed text-base-content/60">
            <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-base-content/40" aria-hidden="true" />
            <p>
              Rekap tim, catatan, dan identitas penilai tidak ditampilkan pada peran Petugas. Yang
              terlihat hanya total skor yang kamu terima sesuai kebijakan privasi PRD.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="btn btn-ghost btn-xs mt-3 min-h-[40px] gap-1.5"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            Muat ulang skor
          </button>
        </div>

        {!ownResult ? (
          <EmptyState
            icon={Star}
            title="Belum ada skor untukmu"
            description="Skor muncul setelah rekan kerja mengirim penilaian pada sesi ini."
          />
        ) : null}
      </div>
    );
  }

  const topScore = visibleResults[0]?.totalScore ?? 0;

  return (
    <div className="card card-static overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-base-300 bg-base-200/40 px-4 py-3.5 sm:px-5">
        <div>
          <h2 className="text-sm font-semibold text-base-content">Rekap skor sesi</h2>
          <p className="text-[11px] text-base-content/50">
            {selectedSession.title} · diurutkan dari total poin tertinggi
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-base-content/50">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            {visibleResults.length} karyawan
          </span>
          {!canSeeDetail ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-base-300 bg-base-100 px-2 py-0.5">
              <Lock className="h-3 w-3" aria-hidden="true" />
              Catatan: Admin
            </span>
          ) : null}
        </div>
      </div>

      {visibleResults.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Belum ada penilaian masuk"
          description="Bagikan sesi ini ke tim. Rekap muncul otomatis setelah penilaian pertama masuk."
        />
      ) : (
        <>
          <div className="divide-y divide-base-200 md:hidden">
            {visibleResults.map((result, index) => {
              const isSelf = result.personId === personId;
              return (
                <div key={result.personId} className={`space-y-2 p-4 ${isSelf ? 'bg-primary/[0.03]' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-base-content">
                        <RankMark rank={index + 1} />
                        {result.personName}
                        {isSelf ? (
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                            Anda
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-[11px] text-base-content/50">
                        {result.responseCount} penilai · rata-rata {result.averageScore}
                      </p>
                    </div>
                    {/* STANDALONE SYMMETRICAL POINT CONTAINER */}
                    <div className="shrink-0 flex items-center justify-end">
                      <PointBadge points={result.totalScore} earned={result.totalScore > 0} size="sm" />
                    </div>
                  </div>
                  {canSeeDetail && result.feedbackList.length > 0 ? (
                    <ul className="space-y-0.5 pl-4 text-[11px] leading-relaxed text-base-content/55">
                      {result.feedbackList.slice(0, 2).map((feedback, feedbackIndex) => (
                        <li key={feedbackIndex} className="list-disc">
                          {feedback}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="table table-sm w-full">
              <thead>
                <tr className="border-b border-base-200 text-[11px] text-base-content/50">
                  <th className="w-14 text-center">Rank</th>
                  <th>Karyawan</th>
                  <th className="text-center">Penilai</th>
                  <th className="text-center">Rata-rata</th>
                  <th className="text-right">Total poin</th>
                  {canSeeDetail ? <th>Catatan</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-base-200 text-xs">
                {visibleResults.map((result, index) => {
                  const isSelf = result.personId === personId;
                  return (
                    <tr key={result.personId} className={isSelf ? 'bg-primary/[0.03]' : ''}>
                      <td className="text-center">
                        <RankMark rank={index + 1} />
                      </td>
                      <td className="font-semibold text-base-content">
                        <span className="inline-flex items-center gap-1.5">
                          {result.personName}
                          {isSelf ? (
                            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                              Anda
                            </span>
                          ) : null}
                        </span>
                      </td>
                      <td className="text-center tabular text-base-content/65">{result.responseCount}</td>
                      <td className="text-center tabular font-semibold text-base-content/80">
                        {result.averageScore}
                      </td>
                      <td className="text-right">
                        {/* STANDALONE SYMMETRICAL POINT CONTAINER */}
                        <div className="flex items-center justify-end gap-1.5">
                          <PointBadge points={result.totalScore} earned={result.totalScore > 0} size="sm" />
                          {result.totalScore === topScore && topScore > 0 ? (
                            <span className="inline-flex items-center text-warning" title="Skor tertinggi">
                              <Award className="h-3.5 w-3.5" aria-hidden="true" />
                            </span>
                          ) : null}
                        </div>
                      </td>
                      {canSeeDetail ? (
                        <td className="max-w-xs text-[11px] leading-relaxed text-base-content/55">
                          {result.feedbackList.length > 0 ? (
                            <ul className="space-y-0.5 pl-3.5">
                              {result.feedbackList.slice(0, 3).map((feedback, feedbackIndex) => (
                                <li key={feedbackIndex} className="list-disc truncate">
                                  {feedback}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="italic text-base-content/30">Tanpa catatan</span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function RankMark({ rank }: { rank: number }) {
  const tone =
    rank === 1
      ? 'bg-warning/15 text-warning'
      : rank === 2
        ? 'bg-base-300/70 text-base-content/70'
        : rank === 3
          ? 'bg-warning/10 text-warning/80'
          : 'text-base-content/45';

  return (
    <span
      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold tabular ${tone}`}
    >
      {rank}
    </span>
  );
}

function ManageTab({
  canManage,
  sessions,
  sessionsLoading,
  selectedSessionId,
  closingId,
  submitting,
  newTitle,
  onTitleChange,
  newQuestions,
  onQuestionChange,
  onQuestionRemove,
  onQuestionAdd,
  onCreate,
  onClose,
  onSelectSession,
}: {
  canManage: boolean;
  sessions: Session[];
  sessionsLoading: boolean;
  selectedSessionId: string | null;
  closingId: string | null;
  submitting: boolean;
  newTitle: string;
  onTitleChange: (value: string) => void;
  newQuestions: QuestionDraft[];
  onQuestionChange: (index: number, next: QuestionDraft) => void;
  onQuestionRemove: (index: number) => void;
  onQuestionAdd: () => void;
  onCreate: () => void;
  onClose: (id: string) => Promise<void>;
  onSelectSession: (id: string) => void;
}) {
  if (!canManage) {
    return (
      <EmptyState
        icon={Lock}
        tone="locked"
        title="Ruang kelola khusus Manajer & Admin"
        description="Peran Petugas dan Kapten dapat mengisi penilaian serta melihat rekap sesuai izinnya, tetapi tidak dapat membuka atau menutup sesi."
      />
    );
  }

  const openCount = sessions.filter((item) => item.is_open).length;
  const responseCount = sessions.reduce((sum, item) => sum + item.responseCount, 0);
  const questionCount = sessions.reduce((sum, item) => sum + item.questionCount, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Sesi terbuka"
          value={openCount}
          unit="sesi"
          icon={Unlock}
          tone="success"
          hint="Periode yang masih menerima penilaian."
        />
        <StatCard
          label="Total respons"
          value={responseCount}
          unit="penilaian"
          icon={MessageSquare}
          tone="info"
          hint="Seluruh respons pada cabang ini."
        />
        <StatCard
          label="Butir pertanyaan"
          value={questionCount}
          icon={ListChecks}
          tone="neutral"
          hint="Akumulasi pertanyaan di semua sesi."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card card-static space-y-4 p-5">
          <div className="flex items-start gap-2 border-b border-base-300 pb-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Plus className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-base-content">Buka sesi baru</h2>
              <p className="text-[11px] text-base-content/50">
                Tentukan judul dan butir pertanyaan. Bobot 1–50 poin per pertanyaan.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="session-title"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/55"
            >
              Judul sesi
            </label>
            <input
              id="session-title"
              type="text"
              value={newTitle}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="Misal: Evaluasi Kolaborasi Kuartal Ini"
              className="input input-bordered min-h-[44px] w-full text-sm"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/55">
                Pertanyaan &amp; bobot
              </span>
              <button
                type="button"
                onClick={onQuestionAdd}
                disabled={newQuestions.length >= 10}
                className="btn btn-ghost btn-xs min-h-[36px] gap-1"
              >
                <Plus className="h-3 w-3" aria-hidden="true" />
                Tambah
              </button>
            </div>
            <div className="space-y-2">
              {newQuestions.map((question, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="mt-3 w-4 shrink-0 text-right text-[10px] tabular text-base-content/40">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={question.question_text}
                    onChange={(event) =>
                      onQuestionChange(index, { ...question, question_text: event.target.value })
                    }
                    placeholder="Tulis butir pertanyaan…"
                    aria-label={`Pertanyaan ${index + 1}`}
                    className="input input-bordered min-h-[44px] min-w-0 flex-1 text-xs"
                  />
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={question.max_points}
                    onChange={(event) =>
                      onQuestionChange(index, {
                        ...question,
                        max_points: Number(event.target.value),
                      })
                    }
                    aria-label={`Bobot pertanyaan ${index + 1}`}
                    className="input input-bordered min-h-[44px] w-16 text-center text-xs font-semibold"
                    title="Bobot maksimal"
                  />
                  <button
                    type="button"
                    onClick={() => onQuestionRemove(index)}
                    disabled={newQuestions.length <= 1}
                    aria-label={`Hapus pertanyaan ${index + 1}`}
                    className="btn btn-ghost btn-sm h-11 w-11 shrink-0 text-base-content/45 hover:text-error"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onCreate}
            disabled={submitting}
            className="btn btn-primary btn-sm min-h-[44px] w-full gap-1.5 font-semibold"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {submitting ? 'Membuka sesi…' : 'Buka sesi sekarang'}
          </button>
        </section>

        <section className="card card-static flex flex-col p-5">
          <div className="flex items-start gap-2 border-b border-base-300 pb-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-base-200 text-base-content/60">
              <Lock className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-base-content">Status sesi</h2>
              <p className="text-[11px] text-base-content/50">
                Tutup sesi untuk mengunci skor. Tindakan ini final.
              </p>
            </div>
          </div>

          {sessionsLoading && sessions.length === 0 ? (
            <div className="mt-4">
              <CardSkeleton rows={3} />
            </div>
          ) : sessions.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={Award}
                compact
                title="Belum ada sesi"
                description="Sesi yang kamu buka akan tampil di sini."
              />
            </div>
          ) : (
            <ul className="mt-3 max-h-[420px] divide-y divide-base-200 overflow-y-auto">
              {sessions.map((item) => {
                const active = item.id === selectedSessionId;
                return (
                  <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onSelectSession(item.id)}
                        className={`block max-w-full truncate text-left text-xs font-semibold transition-colors hover:text-primary ${
                          active ? 'text-primary' : 'text-base-content'
                        }`}
                      >
                        {item.title}
                      </button>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-base-content/50">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold ${
                            item.is_open
                              ? 'bg-success/10 text-success'
                              : 'bg-base-200 text-base-content/50'
                          }`}
                        >
                          {item.is_open ? 'Buka' : 'Ditutup'}
                        </span>
                        <span className="tabular">{item.questionCount} pertanyaan</span>
                        <span className="tabular">{item.responseCount} respons</span>
                      </p>
                    </div>

                    {item.is_open ? (
                      <ConfirmAction
                        label="Tutup"
                        confirmLabel="Ya, tutup"
                        onConfirm={() => onClose(item.id)}
                        disabled={closingId === item.id}
                        icon={Lock}
                        className="btn btn-warning btn-xs min-h-[36px] shrink-0 gap-1 font-semibold"
                      />
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1 text-[10px] text-base-content/40">
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        Final
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function apiErrorMessage(payload: { error?: unknown }, fallback: string): string {
  const error = payload?.error;
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}
