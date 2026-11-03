import { getSupabaseAdmin } from "./supabase";
import { hashPin } from "./auth";
import { setUserBranchAssignments } from "./branchService";

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
  assignedBranchIds?: string[];
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
  branchIds?: string[];
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
  branchIds?: string[];
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

  // Fetch multi-branch assignments from branch_members
  const userBranchMap = new Map<string, string[]>();
  try {
    const { data: memberRows } = await supabase
      .from("branch_members")
      .select("person_id, branch_id")
      .eq("is_active", true);

    if (memberRows) {
      for (const row of memberRows) {
        const list = userBranchMap.get(row.person_id) || [];
        list.push(row.branch_id);
        userBranchMap.set(row.person_id, list);
      }
    }
  } catch (err) {
    console.warn("Could not query branch_members in getAllUsers:", err);
  }

  return (data || []).map((person) => {
    const branch = Array.isArray(person.branches)
      ? person.branches[0]
      : person.branches;

    const memberBranchIds = userBranchMap.get(person.id) || [];
    const assignedBranchIds = Array.from(
      new Set([person.branch_id, ...memberBranchIds].filter(Boolean))
    );

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
      assignedBranchIds,
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
  const primaryBranch = (input.branchIds && input.branchIds.length > 0) ? input.branchIds[0] : input.branchId;

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
        branch_id: primaryBranch,
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

  // Reconcile multi-branch assignment
  const targetBranchIds = (input.branchIds && input.branchIds.length > 0)
    ? input.branchIds
    : [input.branchId].filter(Boolean);

  if (targetBranchIds.length > 0) {
    try {
      await setUserBranchAssignments(data.id, targetBranchIds, createdBy);
    } catch (assignErr) {
      console.warn("Could not set branch assignments on create:", assignErr);
    }
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

  const chosenBranchId =
    input.branchIds && input.branchIds.length > 0
      ? input.branchIds[0]
      : input.branchId;

  if (chosenBranchId !== undefined && chosenBranchId.trim()) {
    updateData.branch_id = chosenBranchId.trim();
  }

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

  // Update multi-branch assignments if passed
  if (input.branchIds && Array.isArray(input.branchIds)) {
    try {
      await setUserBranchAssignments(id, input.branchIds, updatedBy);
    } catch (assignErr) {
      console.warn("Could not update branch assignments:", assignErr);
    }
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
