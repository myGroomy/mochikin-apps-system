"use client";

import { useState } from "react";
import { useAnnouncements } from "@/hooks/useAdminApi";
import type { Announcement, AnnouncementSeverity } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, Plus, Trash2, Pencil } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

const SEVERITIES: AnnouncementSeverity[] = ["info", "warning", "critical"];
const AUDIENCES = ["*", "role_admin", "role_user", "role_viewer"];

interface FormState {
  title: string;
  body: string;
  severity: AnnouncementSeverity;
  audience: string;
  expires_at: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  body: "",
  severity: "info",
  audience: "*",
  expires_at: "",
};

export function AnnouncementManagement() {
  const { announcements, loading, error, create, update, remove } = useAnnouncements();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    const payload = {
      title: form.title,
      body: form.body,
      severity: form.severity,
      audience: form.audience,
      expires_at: form.expires_at,
    };
    if (editingId) {
      const result = await update(editingId, payload);
      toast[result.success ? "success" : "error"](result.message);
      if (result.success) resetForm();
    } else {
      const result = await create(payload);
      toast[result.success ? "success" : "error"](result.message);
      if (result.success) resetForm();
    }
  }

  function startEdit(item: Announcement) {
    setEditingId(item.announcement_id);
    setForm({
      title: item.title,
      body: item.body,
      severity: item.severity,
      audience: item.audience || "*",
      expires_at: item.expires_at || "",
    });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const result = await remove(deleteTarget);
      toast[result.success ? "success" : "error"](result.message);
      if (result.success) {
        if (editingId === deleteTarget) resetForm();
        setDeleteTarget(null);
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-ink-soft">Loading announcements…</p>;
  if (error) return <p className="text-sm text-rose">{error}</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Announcement Management</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold text-ink flex items-center gap-2">
            {editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editingId ? "Edit Announcement" : "New Announcement"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Title"
            />
            <Select
              value={form.severity}
              onValueChange={(val) => setForm({ ...form, severity: (val || "info") as AnnouncementSeverity })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                {SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Body"
              rows={3}
              className="md:col-span-2"
            />
            <Select
              value={form.audience}
              onValueChange={(val) => setForm({ ...form, audience: val || "*" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Audience" />
              </SelectTrigger>
              <SelectContent>
                {AUDIENCES.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a === "*" ? "All roles" : a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="datetime-local"
              value={form.expires_at}
              onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              placeholder="Expires at"
            />
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">{editingId ? "Update" : "Create"}</Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold text-ink flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> Announcements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <table className="w-full">
              <thead>
                <tr className="border-b border-hairline">
                  <th className="text-left text-xs font-medium text-ink-soft pb-2">Title</th>
                  <th className="text-left text-xs font-medium text-ink-soft pb-2">Severity</th>
                  <th className="text-left text-xs font-medium text-ink-soft pb-2">Audience</th>
                  <th className="text-left text-xs font-medium text-ink-soft pb-2">Status</th>
                  <th className="text-left text-xs font-medium text-ink-soft pb-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {announcements.map((item) => (
                  <tr key={item.announcement_id} className="hover:bg-secondary/50">
                    <td className="py-2 text-sm text-ink max-w-48 truncate">{item.title}</td>
                    <td className="py-2">
                      <Badge
                        className="text-xs"
                        variant={
                          item.severity === "critical"
                            ? "destructive"
                            : item.severity === "warning"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {item.severity}
                      </Badge>
                    </td>
                    <td className="py-2 text-xs text-ink-soft">{item.audience || "*"}</td>
                    <td className="py-2">
                      <Badge
                        className="text-xs"
                        variant={item.status === "ACTIVE" ? "default" : "secondary"}
                      >
                        {item.status}
                      </Badge>
                    </td>
                    <td className="py-2 flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-ash hover:text-ink"
                        onClick={() => startEdit(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-ash hover:text-rose"
                        aria-label={`Delete announcement ${item.title}`}
                        onClick={() => setDeleteTarget(item.announcement_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {announcements.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-sm text-ink-soft">
                      No announcements yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete announcement?"
        description="The announcement will be removed for all audiences. This cannot be undone."
        confirmLabel="Delete"
        busy={busy}
        onConfirm={handleDelete}
      />
    </div>
  );
}
