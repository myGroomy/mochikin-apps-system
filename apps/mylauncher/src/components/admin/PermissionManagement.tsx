"use client";

import { useState } from "react";
import { usePermissions } from "@/hooks/useAdminApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KeyRound, Plus, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

export function PermissionManagement() {
  const { permissions, loading, error, create, remove } = usePermissions();
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const result = await create({ key, description });
    if (result.success) {
      toast.success(result.message);
      setKey("");
      setDescription("");
    } else {
      toast.error(result.message);
    }
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

  if (loading) return <p className="text-sm text-ink-soft">Loading permissions…</p>;
  if (error) return <p className="text-sm text-rose">{error}</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Permission Management</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold text-ink flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Permission
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
            <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="resource.action" className="flex-1" />
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="flex-1" />
            <Button type="submit">Create</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold text-ink flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> All Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <table className="w-full">
              <thead>
                <tr className="border-b border-hairline">
                  <th className="text-left text-xs font-medium text-ink-soft pb-2">Key</th>
                  <th className="text-left text-xs font-medium text-ink-soft pb-2">Description</th>
                  <th className="text-left text-xs font-medium text-ink-soft pb-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {permissions.map((perm) => (
                  <tr key={perm.key} className="hover:bg-secondary/50">
                    <td className="py-2 text-xs font-mono text-ink">
                      <Badge variant="secondary" className="text-xs">{perm.key}</Badge>
                    </td>
                    <td className="py-2 text-sm text-ink">{perm.description}</td>
                    <td className="py-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-ash hover:text-rose"
                        aria-label={`Delete permission ${perm.key}`}
                        onClick={() => setDeleteTarget(perm.key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {permissions.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-4 text-sm text-ink-soft">No permissions yet.</td>
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
        title="Delete permission?"
        description={`The permission "${deleteTarget}" will be removed from roles that use it. This cannot be undone.`}
        confirmLabel="Delete"
        busy={busy}
        onConfirm={handleDelete}
      />
    </div>
  );
}
