'use client';

import React, { useEffect, useState } from 'react';
import {
  IconPlus,
  IconTag,
  IconClock,
  IconAlertCircle,
  IconCheck,
} from '@/components/icons';

interface ItoIssue {
  id: string;
  person_id: string;
  branch_id: string;
  raised_by: string;
  title: string;
  description: string | null;
  action_item: string | null;
  assignee: string | null;
  severity: 'low' | 'medium' | 'high' | null;
  status: 'baru' | 'diskusi' | 'selesai';
  period_key: string;
  resolved_at: string | null;
  created_at: string;
  person?: { id: string; full_name: string };
  raised_by_person?: { id: string; full_name: string };
  assignee_person?: { id: string; full_name: string };
}

interface ItoBoardProps {
  personId?: string;
  period?: string;
}

const SEVERITY_LEVELS: { code: 'low' | 'medium' | 'high'; label: string; tag: string }[] = [
  { code: 'low', label: 'Low', tag: 'tag-green' },
  { code: 'medium', label: 'Medium', tag: 'tag-yellow' },
  { code: 'high', label: 'High', tag: 'tag-red' },
];

const STATUS_LABELS: Record<string, string> = {
  baru: 'Baru',
  diskusi: 'Diskusi',
  selesai: 'Selesai',
};

const STATUS_TAGS: Record<string, string> = {
  baru: 'tag-neutral',
  diskusi: 'tag-blue',
  selesai: 'tag-green',
};

const STATUS_ORDER = ['baru', 'diskusi', 'selesai'] as const;

const SEVERITY_MAP: Record<string, string> = {
  low: 'tag-green',
  medium: 'tag-yellow',
  high: 'tag-red',
};

export default function ItoBoard({ personId, period }: ItoBoardProps) {
  const [issues, setIssues] = useState<ItoIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPeriod, setCurrentPeriod] = useState(period || new Date().toISOString().slice(0, 7));
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState('');

  const [newIssue, setNewIssue] = useState({
    title: '',
    description: '',
    severity: 'medium' as 'low' | 'medium' | 'high',
    actionItem: '',
    assignee: '',
  });

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('period', currentPeriod);
      if (severityFilter) params.append('severity', severityFilter);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/ito?${params}`);
      const json = await res.json();
      if (json.success) {
        setIssues(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch issues:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [currentPeriod, severityFilter, statusFilter]);

  const handleCreate = async () => {
    if (!newIssue.title) {
      setFeedback('Judul wajib diisi.');
      return;
    }
    try {
      setCreating(true);
      const res = await fetch('/api/ito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newIssue.title,
          description: newIssue.description,
          severity: newIssue.severity,
          actionItem: newIssue.actionItem,
          assignee: newIssue.assignee || null,
          period: currentPeriod,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback('Issue berhasil dibuat.');
        setNewIssue({ title: '', description: '', severity: 'medium', actionItem: '', assignee: '' });
        fetchIssues();
      } else {
        setFeedback(json.error.message);
      }
    } catch (err) {
      setFeedback('Gagal membuat issue.');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/ito/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback('Status diperbarui.');
        fetchIssues();
      } else {
        setFeedback(json.error?.message || 'Gagal mengubah status.');
      }
    } catch (err) {
      setFeedback('Gagal menghubungi server.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus issue ini?')) return;
    try {
      const res = await fetch(`/api/ito/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setFeedback('Issue dihapus.');
        fetchIssues();
      } else {
        setFeedback(json.error?.message || 'Gagal menghapus.');
      }
    } catch (err) {
      setFeedback('Gagal menghubungi server.');
    }
  };

  const filteredIssues = issues.filter((i) => {
    if (severityFilter && i.severity !== severityFilter) return false;
    if (statusFilter && i.status !== statusFilter) return false;
    return true;
  });

  const groupedByStatus = STATUS_ORDER.map((status) => ({
    status,
    issues: filteredIssues.filter((i) => i.status === status),
  }));


  
  if (loading) return <div className="text-base-content/60">Memuat ITO board...</div>;

  return (
    <div className="space-y-6">
      <div className="section-head">
        <div>
          <p className="kicker">ITO Board</p>
          <h2 className="text-2xl font-semibold text-base-content mt-0.5">Issues / Diskusi / Selesai</h2>
        </div>
        <span className="badge">{issues.length} issue</span>
      </div>

      {feedback && (
        <div className="card p-4 border-l-4 border-primary bg-primary/5">
          <p className="text-sm text-base-content">{feedback}</p>
        </div>
      )}

      <div className="card p-5 reveal" style={{ animationDelay: '80ms' }}>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
          <select
            value={currentPeriod}
            onChange={(e) => setCurrentPeriod(e.target.value)}
            className="input-field"
          >
            {['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08','2026-09','2026-10','2026-11','2026-12'].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="input-field"
          >
            <option value="">Semua Severity</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field"
          >
            <option value="">Semua Status</option>
            <option value="baru">Baru</option>
            <option value="diskusi">Diskusi</option>
            <option value="selesai">Selesai</option>
          </select>
          <button
            onClick={() => setCreating(!creating)}
            className="btn-reset"
          >
            {creating ? 'Tutup Form' : 'Buat Issue'}
          </button>
        </div>

        {creating && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-base-200/40">
            <input
              type="text"
              value={newIssue.title}
              onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
              placeholder="Judul issue..."
              className="input-field"
            />
            <select
              value={newIssue.severity}
              onChange={(e) => setNewIssue({ ...newIssue, severity: e.target.value as 'low'|'medium'|'high' })}
              className="input-field"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <textarea
              value={newIssue.description}
              onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
              placeholder="Deskripsi..."
              className="input-field md:col-span-2"
              rows={2}
            />
            <input
              type="text"
              value={newIssue.actionItem}
              onChange={(e) => setNewIssue({ ...newIssue, actionItem: e.target.value })}
              placeholder="Action item..."
              className="input-field"
            />
            <input
              type="text"
              value={newIssue.assignee}
              onChange={(e) => setNewIssue({ ...newIssue, assignee: e.target.value })}
              placeholder="Assignee person_id (opsional)..."
              className="input-field"
            />
            <button
              onClick={handleCreate}
              disabled={creating}
              className="btn-reset btn-reset-primary"
            >
              {creating ? 'Membuat...' : 'Buat Issue'}
            </button>
          </div>
        )}
      </div>
        <div className="flex justify-end mt-3 pt-3 border-t border-base-200/40">
          <button
            onClick={handleCreate}
            disabled={creating}
            className="btn-reset btn-reset-primary"
          >
            {creating ? 'Membuat...' : 'Buat Issue'}
          </button>
        </div>

      <div className="grid grid-cols-1 gap-5">
        {groupedByStatus.map((group, idx) => (
          <div
            key={group.status}
            className={`card p-5 reveal ${group.issues.length > 0 ? '' : 'hidden'}`}
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-base-content flex items-center gap-2">
                <IconTag className={`w-3 h-3 ${STATUS_TAGS[group.status]}`} />
                {STATUS_LABELS[group.status]}
                <span className="text-xs text-base-content/50">({group.issues.length})</span>
              </h3>
              <div className="flex gap-1">
                {SEVERITY_LEVELS.map((sev) => (
                  <button
                    key={sev.code}
                    onClick={() => setSeverityFilter(sev.code === severityFilter ? '' : sev.code)}
                    className={`tag px-2 py-0.5 text-xs font-bold capitalize ${sev.code === severityFilter ? 'bg-primary text-primary-content' : 'bg-base-200/50 text-base-content/60 hover:bg-base-200'}`}
                  >
                    {sev.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {group.issues.map((issue) => (
                <div
                  key={issue.id}
                  className="border border-base-200/40 rounded-md p-3 space-y-2 hover:bg-base-200/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-sm text-base-content">{issue.title}</span>
                    {issue.severity && (
                      <span className={`tag text-xs ${SEVERITY_MAP[issue.severity]}`}>{issue.severity}</span>
                    )}
                  </div>
                  {issue.description && (
                    <p className="text-xs text-base-content/70">{issue.description}</p>
                  )}
                  {issue.action_item && (
                    <p className="text-xs text-base-content/60">Action: {issue.action_item}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-base-200/30">
                    <span className="text-xs text-base-content/50">
                      {issue.raised_by_person?.full_name || issue.raised_by}
                    </span>
                    <span className="text-xs text-base-content/40">
                      <IconClock className="w-3 h-3 inline" />
                      {new Date(issue.created_at).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                  {issue.assignee_person && (
                    <p className="text-xs text-base-content/60">PIC: {issue.assignee_person.full_name}</p>
                  )}
                  <div className="flex gap-1 mt-2">
                    {(group.status === 'baru' || group.status === 'diskusi' || group.status === 'selesai') && (
                      <button
                        onClick={() => handleStatusChange(issue.id, group.status === 'baru' ? 'diskusi' : group.status === 'diskusi' ? 'selesai' : 'baru')}
                        className="text-xs font-medium px-2.5 py-1 rounded-md border border-base-300 text-base-content/70 hover:bg-base-200 hover:text-base-content transition-colors min-h-[32px] touch-target"
                      >
                        {group.status === 'baru' ? 'Ke Diskusi' : group.status === 'diskusi' ? 'Ke Selesai' : 'Ke Baru'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {group.issues.length === 0 && (
                <p className="text-sm text-base-content/40 text-center py-4">Tidak ada issue</p>
              )}
            </div>
          </div>
        ))}
      </div>
        {groupedByStatus.map((group, idx) => {
          const columnIssues = issues.filter((i) => i.status === group.status);
          return (
            <div
              key={group.status}
              className={`card p-5 reveal ${columnIssues.length > 0 ? '' : 'hidden'}`}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-base-content flex items-center gap-2">
                  <IconTag className={`w-3 h-3 ${STATUS_TAGS[group.status]}`} />
                  {STATUS_LABELS[group.status]}
                  <span className="text-xs text-base-content/50">({columnIssues.length})</span>
                </h3>
                <div className="flex gap-1">
                  {SEVERITY_LEVELS.map((sev) => (
                    <button
                      key={sev.code}
                      onClick={() => setSeverityFilter(sev.code === severityFilter ? '' : sev.code)}
                      className={`tag px-2 py-0.5 text-xs font-bold capitalize ${sev.code === severityFilter ? 'bg-primary text-primary-content' : 'bg-base-200/50 text-base-content/60 hover:bg-base-200'}`}
                    >
                      {sev.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {columnIssues.map((issue) => (
                  <div key={issue.id} className="p-3 bg-gray-50 rounded-lg border">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-sm">{issue.title}</span>
                      {issue.severity && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${SEVERITY_MAP[issue.severity]}`}>
                          {issue.severity}
                        </span>
                      )}
                    </div>
                    {issue.description && (
                      <p className="text-xs text-gray-600 mb-2">{issue.description}</p>
                    )}
                    {issue.action_item && (
                      <p className="text-xs text-gray-500 mb-2">Action: {issue.action_item}</p>
                    )}
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>{issue.raised_by_person?.full_name || issue.raised_by}</span>
                      <span>{new Date(issue.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                    {issue.assignee_person && (
                      <p className="text-xs text-gray-500 mt-1">PIC: {issue.assignee_person.full_name}</p>
                    )}
                    <div className="mt-2 flex gap-2">
                      {group.status === 'baru' && (
                        <button
                          onClick={() => handleStatusChange(issue.id, 'diskusi')}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          to Diskusi
                        </button>
                      )}
                      {group.status === 'diskusi' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(issue.id, 'baru')}
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          >
                            to Baru
                          </button>
                          <button
                            onClick={() => handleStatusChange(issue.id, 'selesai')}
                            className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            to Selesai
                          </button>
                        </>
                      )}
                      {group.status === 'selesai' && (
                        <button
                          onClick={() => handleStatusChange(issue.id, 'diskusi')}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          to Diskusi
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {columnIssues.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">Tidak ada issue</p>
                )}
              </div>
            </div>
          );
        })}</div>
  );
}
