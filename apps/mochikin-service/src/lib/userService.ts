import { getSupabaseAdmin } from "./supabase";
import { hashPin } from "./auth";

export interface ManagedUser {
  id: string;
  username: string | null;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  branchId: string;
  branchCode: string;
  branchName: string;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface CreateUserData {
  username: string;
  name: string;
  email: string;
  phone?: string | null;
  pin: string;
  role: string;
  branchId: string;
}

export interface UpdateUserData {
  username?: string;
  name?: string;
  email?: string;
  phone?: string | null;
  pin?: string | null;
  role?: string;
  status?: string;
  branchId?: string;
}

export async function getAllUsers(): Promise<ManagedUser[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("people")
    .select(
      `
      id,
      username,
      name,
      email,
      phone,
      role,
      status,
      branch_id,
      last_login_at,
      created_at,
      deleted_at,
      branches (
        id,
        name,
        code
      )
    `
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Failed to fetch users from database:", error);
    return [];
  }

  return (data || []).map((person) => {
    const branch = Array.isArray(person.branches)
      ? person.branches[0]
      : person.branches;

    return {
      id: person.id,
      username: person.username,
      name: person.name,
      email: person.email,
      phone: person.phone,
      role: person.role,
      status: person.status,
      branchId: person.branch_id,
      branchCode: branch?.code || "N/A",
      branchName: branch?.name || "Unassigned",
      lastLoginAt: person.last_login_at,
      createdAt: person.created_at,
    };
  });
}

export async function createUser(
  input: CreateUserData,
  createdBy: string
): Promise<{ id: string }> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("people")
    .insert([
      {
        username: input.username.toLowerCase().trim(),
        name: input.name.trim(),
        email: input.email.toLowerCase().trim(),
        phone: input.phone?.trim() || null,
        pin_hash: hashPin(input.pin),
        role: input.role,
        branch_id: input.branchId,
        status: "active",
        created_by: createdBy,
        failed_attempts: 0,
      },
    ])
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Username atau email sudah digunakan");
    }
    throw new Error(error.message || "Gagal membuat user");
  }

  return { id: data.id };
}

export async function updateUser(
  id: string,
  input: UpdateUserData,
  updatedBy: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const updateData: Record<string, unknown> = {
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  };

  if (input.username !== undefined)
    updateData.username = input.username.toLowerCase().trim();
  if (input.name !== undefined) updateData.name = input.name.trim();
  if (input.email !== undefined)
    updateData.email = input.email.toLowerCase().trim();
  if (input.phone !== undefined)
    updateData.phone = input.phone ? input.phone.trim() : null;
  if (input.role !== undefined) updateData.role = input.role;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.branchId !== undefined && input.branchId.trim())
    updateData.branch_id = input.branchId.trim();

  if (input.pin) {
    updateData.pin_hash = hashPin(input.pin);
    updateData.failed_attempts = 0;
    updateData.locked_until = null;
  }

  const { error } = await supabase
    .from("people")
    .update(updateData)
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      throw new Error("Username atau email sudah digunakan");
    }
    throw new Error(error.message || "Gagal memperbarui user");
  }
}

export async function deleteUser(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("people")
    .update({
      deleted_at: new Date().toISOString(),
      status: "inactive",
    })
    .eq("id", id);

  if (error) throw new Error(error.message || "Gagal menghapus user");
}

export async function getUserById(id: string): Promise<ManagedUser | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("people")
    .select(
      `
      id,
      username,
      name,
      email,
      phone,
      role,
      status,
      branch_id,
      last_login_at,
      created_at,
      deleted_at,
      branches (
        id,
        name,
        code
      )
    `
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !data) return null;

  const branch = Array.isArray(data.branches)
    ? data.branches[0]
    : data.branches;

  return {
    id: data.id,
    username: data.username,
    name: data.name,
    email: data.email,
    phone: data.phone,
    role: data.role,
    status: data.status,
    branchId: data.branch_id,
    branchCode: branch?.code || "N/A",
    branchName: branch?.name || "Unassigned",
    lastLoginAt: data.last_login_at,
    createdAt: data.created_at,
  };
}

export async function countUsersByBranch(branchId: string): Promise<number> {
  const supabase = getSupabaseAdmin();

  const { count, error } = await supabase
    .from("people")
    .select("id", { count: "exact", head: true })
    .eq("branch_id", branchId)
    .is("deleted_at", null);

  if (error) return 0;
  return count || 0;
}
