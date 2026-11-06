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

export async function hardDeleteBranch(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from("branches").delete().eq("id", id);
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

/**
 * Returns all branches accessible by a user.
 * For super_admin and role_admin, returns all active branches.
 * For other roles, returns their primary branch plus any active assignments in branch_members.
 */
export async function getUserAccessibleBranches(
  personId: string,
  primaryBranchId?: string,
  role?: string
): Promise<Array<{ id: string; code: string; name: string; city: string }>> {
  const supabase = getSupabaseAdmin();
  const isAdmin =
    role === "super_admin" ||
    role === "role_admin" ||
    role === "admin";

  if (isAdmin) {
    const { data: allBranches } = await supabase
      .from("branches")
      .select("id, code, name, city")
      .eq("status", "active")
      .is("deleted_at", null)
      .order("name", { ascending: true });

    if (allBranches && allBranches.length > 0) {
      return allBranches;
    }
  }

  const branchMap = new Map<string, { id: string; code: string; name: string; city: string }>();

  // 1. Fetch primary branch if provided
  if (primaryBranchId) {
    const { data: primary } = await supabase
      .from("branches")
      .select("id, code, name, city, status")
      .eq("id", primaryBranchId)
      .is("deleted_at", null)
      .maybeSingle();

    if (primary && primary.status === "active") {
      branchMap.set(primary.id, {
        id: primary.id,
        code: primary.code,
        name: primary.name,
        city: primary.city || "",
      });
    }
  }

  // 2. Fetch multi-branch assignments from branch_members
  try {
    const { data: members } = await supabase
      .from("branch_members")
      .select("branch_id, is_active, branches(id, code, name, city, status)")
      .eq("person_id", personId)
      .eq("is_active", true);

    if (members) {
      for (const m of members) {
        const b = Array.isArray(m.branches) ? m.branches[0] : m.branches;
        if (b && b.id && b.status === "active") {
          branchMap.set(b.id, {
            id: b.id,
            code: b.code,
            name: b.name,
            city: b.city || "",
          });
        }
      }
    }
  } catch (err) {
    console.warn("Could not query branch_members (table might be empty or migrating):", err);
  }

  // If map is still empty, fallback to looking up branch_id from people table
  if (branchMap.size === 0) {
    const { data: person } = await supabase
      .from("people")
      .select("branch_id, branches(id, code, name, city, status)")
      .eq("id", personId)
      .maybeSingle();

    if (person) {
      const b = Array.isArray(person.branches) ? person.branches[0] : person.branches;
      if (b && b.id) {
        branchMap.set(b.id, {
          id: b.id,
          code: b.code,
          name: b.name,
          city: b.city || "",
        });
      }
    }
  }

  return Array.from(branchMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get all branch IDs assigned to a specific person (primary + branch_members)
 */
export async function getUserBranchAssignments(personId: string): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const branchIds = new Set<string>();

  const { data: person } = await supabase
    .from("people")
    .select("branch_id")
    .eq("id", personId)
    .maybeSingle();

  if (person?.branch_id) {
    branchIds.add(person.branch_id);
  }

  try {
    const { data: members } = await supabase
      .from("branch_members")
      .select("branch_id")
      .eq("person_id", personId)
      .eq("is_active", true);

    if (members) {
      for (const m of members) {
        if (m.branch_id) branchIds.add(m.branch_id);
      }
    }
  } catch (err) {
    console.warn("Error querying branch_members for user:", err);
  }

  return Array.from(branchIds);
}

/**
 * Update multi-branch assignments for a person.
 * Updates people.branch_id (if primary is changed/unset) and reconciles branch_members.
 */
export async function setUserBranchAssignments(
  personId: string,
  branchIds: string[],
  assignedBy: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (branchIds.length === 0) return;

  // 1. Ensure people.branch_id is set to the first assigned branch
  const primaryBranchId = branchIds[0];
  await supabase
    .from("people")
    .update({ branch_id: primaryBranchId, updated_by: assignedBy, updated_at: new Date().toISOString() })
    .eq("id", personId);

  // 2. Fetch current active branch_members for this person
  try {
    const { data: currentMembers } = await supabase
      .from("branch_members")
      .select("id, branch_id, is_active")
      .eq("person_id", personId);

    const existingMap = new Map<string, { id: string; is_active: boolean }>();
    if (currentMembers) {
      for (const cm of currentMembers) {
        existingMap.set(cm.branch_id, { id: cm.id, is_active: cm.is_active });
      }
    }

    const newSet = new Set(branchIds);

    // Deactivate branches no longer assigned
    for (const [bId, record] of existingMap.entries()) {
      if (!newSet.has(bId) && record.is_active) {
        await supabase
          .from("branch_members")
          .update({ is_active: false, removed_at: new Date().toISOString() })
          .eq("id", record.id);
      }
    }

    // Insert or re-activate new assignments
    for (const bId of branchIds) {
      const existing = existingMap.get(bId);
      if (existing) {
        if (!existing.is_active) {
          await supabase
            .from("branch_members")
            .update({ is_active: true, removed_at: null, assigned_by: assignedBy, assigned_at: new Date().toISOString() })
            .eq("id", existing.id);
        }
      } else {
        await supabase
          .from("branch_members")
          .insert({
            branch_id: bId,
            person_id: personId,
            branch_role: "staff",
            is_active: true,
            assigned_by: assignedBy,
            assigned_at: new Date().toISOString(),
          });
      }
    }
  } catch (err) {
    console.warn("branch_members synchronization skipped or failed:", err);
  }
}

/**
 * Get staff assigned to a specific branch (both primary and branch_members)
 */
export async function getStaffAssignedToBranch(branchId: string): Promise<Array<{
  id: string;
  name: string;
  username: string;
  role: string;
  isPrimary: boolean;
}>> {
  const supabase = getSupabaseAdmin();
  const staffMap = new Map<string, {
    id: string;
    name: string;
    username: string;
    role: string;
    isPrimary: boolean;
  }>();

  // Primary branch
  const { data: primaryStaff } = await supabase
    .from("people")
    .select("id, name, username, role")
    .eq("branch_id", branchId)
    .is("deleted_at", null);

  if (primaryStaff) {
    for (const s of primaryStaff) {
      staffMap.set(s.id, {
        id: s.id,
        name: s.name,
        username: s.username || "",
        role:
          s.role.toLowerCase().includes("admin") || s.role.toLowerCase().includes("super")
            ? "admin"
            : "petugas",
        isPrimary: true,
      });
    }
  }

  // Branch members
  try {
    const { data: memberStaff } = await supabase
      .from("branch_members")
      .select("person_id, is_active, people(id, name, username, role, deleted_at)")
      .eq("branch_id", branchId)
      .eq("is_active", true);

    if (memberStaff) {
      for (const ms of memberStaff) {
        const p = Array.isArray(ms.people) ? ms.people[0] : ms.people;
        if (p && !p.deleted_at && !staffMap.has(p.id)) {
          staffMap.set(p.id, {
            id: p.id,
            name: p.name,
            username: p.username || "",
            role:
              p.role.toLowerCase().includes("admin") || p.role.toLowerCase().includes("super")
                ? "admin"
                : "petugas",
            isPrimary: false,
          });
        }
      }
    }
  } catch (err) {
    console.warn("Could not query branch_members for branch staff:", err);
  }

  return Array.from(staffMap.values());
}

