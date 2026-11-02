import { getSupabaseAdmin } from "./supabase";

export interface ManagedBranch {
  id: string;
  code: string;
  name: string;
  city: string;
  address: string | null;
  phone: string | null;
  status: string;
  userCount: number;
  createdAt: string;
}

export interface CreateBranchData {
  code: string;
  name: string;
  city: string;
  address?: string | null;
  phone?: string | null;
}

export interface UpdateBranchData {
  code?: string;
  name?: string;
  city?: string;
  address?: string | null;
  phone?: string | null;
  status?: string;
}

export async function getAllBranches(): Promise<ManagedBranch[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("branches")
    .select(
      `
      id,
      code,
      name,
      city,
      address,
      phone,
      status,
      created_at,
      deleted_at
    `
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("Failed to fetch branches from database:", error);
    return [];
  }

  // Get user counts per branch in a single query
  const { data: userCounts } = await supabase
    .from("people")
    .select("branch_id")
    .is("deleted_at", null);

  const countMap = new Map<string, number>();
  if (userCounts) {
    for (const row of userCounts) {
      const bid = row.branch_id as string;
      countMap.set(bid, (countMap.get(bid) || 0) + 1);
    }
  }

  return (data || []).map((branch) => ({
    id: branch.id,
    code: branch.code,
    name: branch.name,
    city: branch.city,
    address: branch.address,
    phone: branch.phone,
    status: branch.status,
    userCount: countMap.get(branch.id) || 0,
    createdAt: branch.created_at,
  }));
}

export async function createBranch(
  input: CreateBranchData,
  createdBy: string
): Promise<{ id: string }> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("branches")
    .insert([
      {
        code: input.code.toUpperCase().trim(),
        name: input.name.trim(),
        city: input.city.trim(),
        address: input.address?.trim() || null,
        phone: input.phone?.trim() || null,
        status: "active",
        created_by: createdBy,
      },
    ])
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Kode cabang sudah digunakan");
    }
    throw new Error(error.message || "Gagal membuat cabang");
  }

  return { id: data.id };
}

export async function updateBranch(
  id: string,
  input: UpdateBranchData,
  updatedBy: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const updateData: Record<string, unknown> = {
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  };

  if (input.code !== undefined) updateData.code = input.code.toUpperCase().trim();
  if (input.name !== undefined) updateData.name = input.name.trim();
  if (input.city !== undefined) updateData.city = input.city.trim();
  if (input.address !== undefined)
    updateData.address = input.address?.trim() || null;
  if (input.phone !== undefined) updateData.phone = input.phone?.trim() || null;
  if (input.status !== undefined) updateData.status = input.status;

  const { error } = await supabase
    .from("branches")
    .update(updateData)
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      throw new Error("Kode cabang sudah digunakan");
    }
    throw new Error(error.message || "Gagal memperbarui cabang");
  }
}

export async function deleteBranch(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("branches")
    .update({
      deleted_at: new Date().toISOString(),
      status: "closed",
    })
    .eq("id", id);

  if (error) throw new Error(error.message || "Gagal menghapus cabang");
}

export async function getBranchById(id: string): Promise<ManagedBranch | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("branches")
    .select(
      `
      id,
      code,
      name,
      city,
      address,
      phone,
      status,
      created_at,
      deleted_at
    `
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !data) return null;

  const { count } = await supabase
    .from("people")
    .select("id", { count: "exact", head: true })
    .eq("branch_id", id)
    .is("deleted_at", null);

  return {
    id: data.id,
    code: data.code,
    name: data.name,
    city: data.city,
    address: data.address,
    phone: data.phone,
    status: data.status,
    userCount: count || 0,
    createdAt: data.created_at,
  };
}

