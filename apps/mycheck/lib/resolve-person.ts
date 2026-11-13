export interface PersonResolutionContext {
  personId?: string;
  activeBranchId?: string;
  username: string;
  name?: string;
}

export interface ResolvedPerson {
  personId: string;
  branchId: string;
}

const isUuid = (val?: string): boolean =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

/**
 * Resolves personId (UUID) and branchId (UUID) for task event emission.
 * Priority:
 * 1. Primary path: personId & activeBranchId from session / cookie context.
 * 2. Fallback path for legacy sessions: exact lookup by unique username in people table.
 */
export async function resolvePersonForTaskEvent(
  ctx: PersonResolutionContext,
  supabase: unknown
): Promise<ResolvedPerson | null> {
  // 1. Jalur Utama: personId & branchId UUID dari sesi / cookie
  if (isUuid(ctx.personId) && isUuid(ctx.activeBranchId)) {
    return {
      personId: ctx.personId!,
      branchId: ctx.activeBranchId!,
    };
  }

  // 2. Fallback: exact lookup by unique username (constraint: people.username UNIQUE)
  if (ctx.username && supabase) {
    try {
      const client = supabase as {
        from: (t: string) => {
          select: (cols: string) => {
            eq: (col1: string, val1: string) => {
              eq: (col2: string, val2: string) => {
                maybeSingle: () => Promise<{ data: { id: string; branch_id: string } | null; error: Error | null }>;
              };
            };
          };
        };
      };

      const { data: person, error } = await client
        .from('people')
        .select('id, branch_id')
        .eq('username', ctx.username)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.error('❌ Gagal lookup person berdasarkan username:', error.message, { username: ctx.username });
        return null;
      }

      if (person && isUuid(person.id) && isUuid(person.branch_id)) {
        return {
          personId: person.id,
          branchId: person.branch_id,
        };
      }
    } catch (err) {
      console.error('❌ Exception saat lookup person berdasarkan username:', err, { username: ctx.username });
      return null;
    }
  }

  console.error('❌ resolvePersonForTaskEvent: personId atau branchId valid tidak ditemukan', {
    personId: ctx.personId,
    activeBranchId: ctx.activeBranchId,
    username: ctx.username,
  });
  return null;
}
