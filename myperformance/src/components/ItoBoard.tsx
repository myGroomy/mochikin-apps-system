'use client';

import React, { useEffect, useState } from 'react';

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

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
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
    severity: 'medium',
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
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        fetchIssues();
      } else {
        setFeedback(json.error.message);
      }
    } catch (err) {
      setFeedback('Gagal update status.');
    }
  };

  const columns = [
    { status: 'baru', label: 'Baru', color: 'border-gray-300' },
    { status: 'diskusi', label: 'Diskusi', color: 'border-blue-300' },
    { status: 'selesai', label: 'Selesai', color: 'border-green-300' },
  ];

  if (loading) return <div className="text-gray-500">Memuat ITO board...</div>;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">ITO Board</h2>
        <p className="text-gray-600">Issues / Talk / Observation</p>
      </div>

      {feedback && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">{feedback}</div>
      )}

      <div className="mb-6 flex flex-wrap gap-4">
        <select
          value={currentPeriod}
          onChange={(e) => setCurrentPeriod(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          {['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08','2026-09','2026-10','2026-11','2026-12'].map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="">Semua Severity</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="">Semua Status</option>
          <option value="baru">Baru</option>
          <option value="diskusi">Diskusi</option>
          <option value="selesai">Selesai</option>
        </select>
      </div>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Buat Issue Baru</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            value={newIssue.title}
            onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
            placeholder="Judul issue..."
            className="border rounded px-3 py-2 text-sm"
          />
          <select
            value={newIssue.severity}
            onChange={(e) => setNewIssue({ ...newIssue, severity: e.target.value })}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <textarea
            value={newIssue.description}
            onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
            placeholder="Deskripsi..."
            className="border rounded px-3 py-2 text-sm md:col-span-2"
            rows={2}
          />
          <input
            type="text"
            value={newIssue.actionItem}
            onChange={(e) => setNewIssue({ ...newIssue, actionItem: e.target.value })}
            placeholder="Action item..."
            className="border rounded px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={newIssue.assignee}
            onChange={(e) => setNewIssue({ ...newIssue, assignee: e.target.value })}
            placeholder="Assignee person_id..."
            className="border rounded px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="mt-3 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {creating ? 'Membuat...' : 'Buat Issue'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((col) => {
          const columnIssues = issues.filter((i) => i.status === col.status);
          return (
            <div key={col.status} className={`bg-white p-4 rounded-xl border-2 ${col.color}`}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                {col.label}
                <span className="text-sm font-normal text-gray-500">({columnIssues.length})</span>
              </h3>
              <div className="space-y-3">
                {columnIssues.map((issue) => (
                  <div key={issue.id} className="p-3 bg-gray-50 rounded-lg border">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-sm">{issue.title}</span>
                      {issue.severity && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${SEVERITY_COLORS[issue.severity]}`}>
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
                      {col.status === 'baru' && (
                        <button
                          onClick={() => handleStatusChange(issue.id, 'diskusi')}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          to Diskusi
                        </button>
                      )}
                      {col.status === 'diskusi' && (
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
                      {col.status === 'selesai' && (
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
        })}
      </div>
    </div>
  );
}
