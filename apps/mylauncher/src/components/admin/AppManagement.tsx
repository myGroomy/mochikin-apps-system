"use client";

import { useState } from "react";
import { useApps, usePermissions } from "@/hooks/useAdminApi";
import { App } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppWindow, Plus, Trash2, Pencil } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

const APP_ICONS = ["package", "calendar-days", "users", "building", "layout-grid"];
const APP_STATUSES = ["ACTIVE", "MAINTENANCE", "INACTIVE"] as const;

export function AppManagement() {
  const { apps, loading, error, create, update, remove } = useApps();
  const { permissions } = usePermissions();

  const [form, setForm] = useState<Partial<App>>({ status: "ACTIVE", icon: "layout-grid" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function resetForm() {
    setForm({ status: "ACTIVE", icon: "layout-grid" });
    setEditingId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.url || !form.required_permission) {
      toast.error("Name, URL, and permission are required");
      return;
    }
    if (editingId) {
      const result = await update(editingId, form);
      toast[result.success ? "success" : "error"](result.message);
      if (result.success) resetForm();
    } else {
      const result = await create(form as Omit<App, "app_id"> & { app_id?: string });
      toast[result.success ? "success" : "error"](result.message);
      if (result.success) resetForm();
    }
  }

  function startEdit(app: App) {
    setEditingId(app.app_id);
    setForm({ ...app });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const result = await remove(deleteTarget);
      toast[result.success ? "success" : "error"](result.message);
      if (result.success) setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-ink-soft">Loading apps…</p>;
  if (error) return <p className="text-sm text-rose">{error}</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Application Management</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold text-ink flex items-center gap-2">
            {editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editingId ? "Edit Application" : "New Application"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="App name" />
            {!editingId && (
              <Input value={(form.app_id as string) || ""} onChange={(e) => setForm({ ...form, app_id: e.target.value })} placeholder="App ID (optional, e.g. MYPURCHASE)" />
            )}
            <Input value={form.url || ""} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="URL e.g. https://myapp.vercel.app" />
            <Select value={form.required_permission || undefined} onValueChange={(val) => setForm({ ...form, required_permission: val ?? undefined })}>
              <SelectTrigger>
                <SelectValue placeholder="Required permission" />
              </SelectTrigger>
              <SelectContent>
                {permissions.map((p) => (
                  <SelectItem key={p.key} value={p.key}>{p.key}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={form.icon || "layout-grid"} onValueChange={(val) => setForm({ ...form, icon: val ?? "layout-grid" })}>
              <SelectTrigger>
                <SelectValue placeholder="Icon" />
              </SelectTrigger>
              <SelectContent>
                {APP_ICONS.map((icon) => (
                  <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={form.status || "ACTIVE"} onValueChange={(val) => setForm({ ...form, status: val as App["status"] })}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {APP_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">{editingId ? "Update" : "Create"}</Button>
              {editingId && <Button variant="outline" onClick={resetForm}>Cancel</Button>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold text-ink flex items-center gap-2">
            <AppWindow className="h-4 w-4" /> Registered Applications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <table className="w-full">
              <thead>
                <tr className="border-b border-hairline">
                  <th className="text-left text-xs font-medium text-ink-soft pb-2">ID</th>
                  <th className="text-left text-xs font-medium text-ink-soft pb-2">Name</th>
                  <th className="text-left text-xs font-medium text-ink-soft pb-2">Version</th>
                  <th className="text-left text-xs font-medium text-ink-soft pb-2">Category</th>
                  <th className="text-left text-xs font-medium text-ink-soft pb-2">Dependencies</th>
                  <th className="text-left text-xs font-medium text-ink-soft pb-2">Permission</th>
                  <th className="text-left text-xs font-medium text-ink-soft pb-2">Status</th>
                  <th className="text-left text-xs font-medium text-ink-soft pb-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {apps.map((app) => (
                  <tr key={app.app_id} className="hover:bg-secondary/50">
                    <td className="py-2 text-xs font-mono text-ink">{app.app_id}</td>
                    <td className="py-2 text-sm text-ink font-medium">
                      {app.name}
                      {app.description && (
                        <div className="text-xs text-ink-soft font-normal">{app.description}</div>
                      )}
                    </td>
                    <td className="py-2 text-xs text-ink-soft">{app.version || "1.0.0"}</td>
                    <td className="py-2">
                      <Badge variant="outline" className="text-xs uppercase">{app.category || "operational"}</Badge>
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {app.depends && app.depends.length > 0 ? (
                          app.depends.map((dep) => (
                            <span key={dep} className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-ink-soft">
                              {dep}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-ink-soft">-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2"><Badge variant="secondary" className="text-xs">{app.required_permission}</Badge></td>
                    <td className="py-2"><Badge className="text-xs" variant={app.status === "ACTIVE" ? "default" : app.status === "MAINTENANCE" ? "secondary" : "destructive"}>{app.status}</Badge></td>
                    <td className="py-2 flex gap-1">
                      <Button variant="ghost" size="icon" className="text-ash hover:text-ink" onClick={() => startEdit(app)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-ash hover:text-rose"
                        aria-label={`Delete app ${app.name}`}
                        onClick={() => setDeleteTarget(app.app_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {apps.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-4 text-sm text-ink-soft">No apps registered.</td>
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
        title="Delete application?"
        description="The app will be removed from the launcher registry. Deep links to it will stop working."
        confirmLabel="Delete"
        busy={busy}
        onConfirm={handleDelete}
      />
    </div>
  );
}
