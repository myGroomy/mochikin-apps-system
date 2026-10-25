"use client";

import { useState } from "react";
import { useDomainStore } from "@/stores/useLauncherStore";
import { useEmployees, useRoles } from "@/hooks/useAdminApi";
import { Employee } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Plus, Pencil, Lock, Save, X, UserCheck, UserX, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export function EmployeeManagement() {
  const branches = useDomainStore((s) => s.branches);
  const { employees, loading, error, create, update, toggleStatus, resetPin } = useEmployees();
  const { roles } = useRoles();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Employee>>({ status: "ACTIVE" });
  const [pinForm, setPinForm] = useState<{ id: string } | null>(null);
  const [newPin, setNewPin] = useState("");
  const [showNewPin, setShowNewPin] = useState(false);
  const [createPin, setCreatePin] = useState("");
  const [showCreatePin, setShowCreatePin] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<Employee | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setEditingId(null);
    setForm({ status: "ACTIVE" });
    setPinForm(null);
    setNewPin("");
    setCreatePin("");
    setShowNewPin(false);
    setShowCreatePin(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.username || !form.name || !form.role || !form.base_branch) {
      toast.error("Username, name, role, and base branch are required");
      return;
    }
    setBusy(true);
    try {
      if (editingId) {
        const result = await update(editingId, {
          username: form.username,
          name: form.name,
          role_id: form.role,
          status: form.status,
          base_branch: form.base_branch,
        });
        toast[result.success ? "success" : "error"](result.message);
        if (result.success) reset();
      } else {
        const result = await create({
          employee_id: form.employee_id,
          username: form.username,
          name: form.name,
          role_id: form.role,
          status: form.status,
          base_branch: form.base_branch,
          pin: createPin || undefined,
        });
        toast[result.success ? "success" : "error"](result.message);
        if (result.success) reset();
      }
    } finally {
      setBusy(false);
    }
  }

  function startEdit(emp: Employee) {
    setEditingId(emp.employee_id);
    setForm({ ...emp });
    setPinForm(null);
  }

  async function handleResetPin() {
    if (!pinForm || !/^\d{4,8}$/.test(newPin)) {
      toast.error("PIN must be 4-8 digits");
      return;
    }
    setBusy(true);
    try {
      const result = await resetPin(pinForm.id, newPin);
      toast[result.success ? "success" : "error"](result.message);
      if (result.success) {
        setPinForm(null);
        setNewPin("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmToggle() {
    if (!toggleTarget) return;
    setBusy(true);
    try {
      const result = await toggleStatus(toggleTarget.employee_id);
      toast[result.success ? "success" : "error"](result.message);
      if (result.success) setToggleTarget(null);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <span className="sr-only">Loading employees…</span>
        <div className="h-8 w-56 animate-pulse rounded bg-sunken" />
        <div className="h-48 animate-pulse rounded-lg border border-hairline bg-surface" />
        <div className="h-64 animate-pulse rounded-lg border border-hairline bg-surface" />
      </div>
    );
  }
  if (error) {
    return (
      <p className="text-sm text-rose" role="alert">
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Employee Management</h1>
        <p className="text-sm text-ink-soft mt-1">Create accounts, assign roles, reset PINs.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold text-ink flex items-center gap-2">
            {editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editingId ? "Edit Employee" : "New Employee"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              value={form.name || ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Full name"
              aria-label="Full name"
            />
            <Input
              value={form.username || ""}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Username"
              aria-label="Username"
            />
            {!editingId && (
              <Input
                value={form.employee_id || ""}
                onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                placeholder="Employee ID (optional)"
                aria-label="Employee ID"
              />
            )}
            <Select
              value={form.role || undefined}
              onValueChange={(val) => setForm({ ...form, role: val ?? undefined })}
            >
              <SelectTrigger aria-label="Role">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.role_id} value={r.role_id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={form.base_branch || undefined}
              onValueChange={(val) => setForm({ ...form, base_branch: val ?? undefined })}
            >
              <SelectTrigger aria-label="Base branch">
                <SelectValue placeholder="Base branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.branch_id} value={b.branch_id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={form.status || "ACTIVE"}
              onValueChange={(val) => setForm({ ...form, status: val ?? "ACTIVE" })}
            >
              <SelectTrigger aria-label="Status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                <SelectItem value="INACTIVE">INACTIVE</SelectItem>
              </SelectContent>
            </Select>
            {!editingId && (
              <div className="relative">
                <Input
                  value={createPin}
                  onChange={(e) => setCreatePin(e.target.value)}
                  placeholder="PIN (4-8 digits, optional)"
                  inputMode="numeric"
                  type={showCreatePin ? "text" : "password"}
                  aria-label="PIN"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-ash"
                  onClick={() => setShowCreatePin((v) => !v)}
                  aria-label={showCreatePin ? "Hide PIN" : "Show PIN"}
                >
                  {showCreatePin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            )}
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={busy}>
                <Save className="h-4 w-4 mr-2" /> {editingId ? "Update" : "Create"}
              </Button>
              {editingId && (
                <Button variant="outline" type="button" onClick={reset}>
                  <X className="h-4 w-4 mr-2" /> Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {pinForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold text-ink flex items-center gap-2">
              <Lock className="h-4 w-4" /> Reset PIN for {pinForm.id}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2 items-center">
            <div className="relative max-w-xs flex-1">
              <Input
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="New PIN (4-8 digits)"
                inputMode="numeric"
                type={showNewPin ? "text" : "password"}
                aria-label="New PIN"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-ash"
                onClick={() => setShowNewPin((v) => !v)}
                aria-label={showNewPin ? "Hide PIN" : "Show PIN"}
              >
                {showNewPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Button onClick={handleResetPin} disabled={busy}>
              Reset
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setPinForm(null);
                setNewPin("");
              }}
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold text-ink flex items-center gap-2">
            <Users className="h-4 w-4" /> All Employees
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <table className="w-full">
              <thead>
                <tr className="border-b border-hairline">
                  <th className="text-left text-xs font-medium text-ink-soft pb-2">Employee ID</th>
                  <th className="text-left text-xs font-medium text-ink-soft pb-2">Username</th>
                  <th className="text-left text-xs font-medium text-ink-soft pb-2">Name</th>
                  <th className="text-left text-xs font-medium text-ink-soft pb-2">Role</th>
                  <th className="text-left text-xs font-medium text-ink-soft pb-2">Status</th>
                  <th className="text-left text-xs font-medium text-ink-soft pb-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {employees.map((emp) => (
                  <tr key={emp.employee_id} className="hover:bg-secondary/50">
                    <td className="py-2 text-xs font-mono text-ink">{emp.employee_id}</td>
                    <td className="py-2 text-xs font-mono text-ink">{emp.username}</td>
                    <td className="py-2 text-sm text-ink">{emp.name}</td>
                    <td className="py-2">
                      <Badge variant="secondary" className="text-xs">
                        {emp.role}
                      </Badge>
                    </td>
                    <td className="py-2">
                      <Badge
                        variant={emp.status === "ACTIVE" ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {emp.status}
                      </Badge>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-ash hover:text-ink"
                          onClick={() => startEdit(emp)}
                          aria-label={`Edit ${emp.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-ash hover:text-amber"
                          onClick={() => setPinForm({ id: emp.employee_id })}
                          aria-label={`Reset PIN for ${emp.name}`}
                        >
                          <Lock className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={
                            emp.status === "ACTIVE"
                              ? "text-ash hover:text-rose"
                              : "text-ash hover:text-emerald"
                          }
                          onClick={() => setToggleTarget(emp)}
                          aria-label={
                            emp.status === "ACTIVE"
                              ? `Deactivate ${emp.name}`
                              : `Activate ${emp.name}`
                          }
                        >
                          {emp.status === "ACTIVE" ? (
                            <UserX className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-sm text-ink-soft">
                      No employees yet. Create one above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={Boolean(toggleTarget)} onOpenChange={(open) => !open && setToggleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {toggleTarget?.status === "ACTIVE" ? "Deactivate employee?" : "Activate employee?"}
            </DialogTitle>
            <DialogDescription>
              {toggleTarget?.status === "ACTIVE"
                ? `${toggleTarget?.name} will no longer be able to sign in until reactivated.`
                : `${toggleTarget?.name} will be able to sign in again.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setToggleTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy}
              variant={toggleTarget?.status === "ACTIVE" ? "destructive" : "default"}
              onClick={handleConfirmToggle}
            >
              {toggleTarget?.status === "ACTIVE" ? "Deactivate" : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
