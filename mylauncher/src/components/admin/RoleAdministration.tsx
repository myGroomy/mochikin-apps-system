"use client";

import { useState } from "react";
import { useRoles, usePermissions } from "@/hooks/useAdminApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Plus, Trash2, Save, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

export function RoleAdministration() {
  const { roles, loading, error, create, updatePermissions, remove } = useRoles();
  const { permissions } = usePermissions();

  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [newRoleName, setNewRoleName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const startEdit = (roleId: string, currentPerms: string[]) => {
    setEditingRole(roleId);
    setSelectedPerms(currentPerms);
  };

  const togglePerm = (key: string) => {
    setSelectedPerms((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
  };

  async function saveRole(roleId: string) {
    const result = await updatePermissions(roleId, selectedPerms);
    toast[result.success ? "success" : "error"](result.message);
    if (result.success) setEditingRole(null);
  }

  const cancelEdit = () => {
    setEditingRole(null);
    setSelectedPerms([]);
  };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoleName.trim()) {
      toast.error("Role name is required");
      return;
    }
    const result = await create({ name: newRoleName, permissions: [] });
    toast[result.success ? "success" : "error"](result.message);
    if (result.success) setNewRoleName("");
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

  if (loading) return <p className="text-sm text-ink-soft">Loading roles…</p>;
  if (error) return <p className="text-sm text-rose">{error}</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Role Administration</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold text-ink flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Role
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex gap-2">
            <Input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="Role name" className="max-w-sm" />
            <Button type="submit">Create</Button>
          </form>
        </CardContent>
      </Card>

      <ScrollArea className="h-[600px]">
        <div className="space-y-4">
          {roles.map((role) => (
            <Card key={role.role_id}>
              <CardHeader>
                <CardTitle className="text-sm font-bold text-ink flex items-center gap-2">
                  <Shield className="h-4 w-4" /> {role.name}
                  <Badge variant="secondary" className="text-xs">{role.role_id}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-ink-soft mb-3">Permissions ({role.permissions.length} granted)</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {role.permissions.map((perm) => (
                    <Badge key={perm} variant="secondary" className="text-xs">{perm}</Badge>
                  ))}
                </div>
                {editingRole === role.role_id ? (
                  <div className="space-y-2">
                    <p className="text-xs text-ink-soft">Toggle permissions:</p>
                    <div className="flex flex-wrap gap-2">
                      {permissions.map((p) => (
                        <Button
                          key={p.key}
                          variant={selectedPerms.includes(p.key) ? "default" : "outline"}
                          size="sm"
                          className="text-xs"
                          onClick={() => togglePerm(p.key)}
                        >
                          {p.key}
                        </Button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveRole(role.role_id)}><Save className="h-3 w-3 mr-1" /> Save</Button>
                      <Button variant="outline" size="sm" onClick={cancelEdit}><X className="h-3 w-3 mr-1" /> Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => startEdit(role.role_id, role.permissions)}>
                      Edit Permissions
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-ash hover:text-rose"
                      aria-label={`Delete role ${role.name}`}
                      onClick={() => setDeleteTarget(role.role_id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {roles.length === 0 && <p className="text-sm text-ink-soft">No roles yet.</p>}
        </div>
      </ScrollArea>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete role?"
        description="Employees with this role will lose its permissions. This cannot be undone."
        confirmLabel="Delete"
        busy={busy}
        onConfirm={handleDelete}
      />
    </div>
  );
}
