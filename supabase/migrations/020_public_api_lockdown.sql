-- Keep application data behind authenticated server routes.
-- Custom Mochikin sessions are verified by the app; they are not Supabase Auth JWTs.

BEGIN;

GRANT USAGE ON SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL PRIVILEGES ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO service_role;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname, c.relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
      AND NOT EXISTS (
        SELECT 1
        FROM pg_depend d
        WHERE d.classid = 'pg_class'::regclass
          AND d.objid = c.oid
          AND d.refclassid = 'pg_extension'::regclass
          AND d.deptype = 'e'
      )
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated', r.relname);
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE public.%I TO service_role', r.relname);
    IF r.relkind IN ('r', 'p') THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);
    END IF;
  END LOOP;

  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'S'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_depend d
        WHERE d.classid = 'pg_class'::regclass
          AND d.objid = c.oid
          AND d.refclassid = 'pg_extension'::regclass
          AND d.deptype = 'e'
      )
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON SEQUENCE public.%I FROM PUBLIC, anon, authenticated', r.relname);
    EXECUTE format('GRANT ALL PRIVILEGES ON SEQUENCE public.%I TO service_role', r.relname);
  END LOOP;

  FOR r IN
    SELECT p.proname, p.prokind, pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_depend d
        WHERE d.classid = 'pg_proc'::regclass
          AND d.objid = p.oid
          AND d.refclassid = 'pg_extension'::regclass
          AND d.deptype = 'e'
      )
  LOOP
    IF r.prokind = 'p' THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON PROCEDURE public.%I(%s) FROM PUBLIC, anon, authenticated', r.proname, r.identity_args);
      EXECUTE format('GRANT EXECUTE ON PROCEDURE public.%I(%s) TO service_role', r.proname, r.identity_args);
    ELSE
      EXECUTE format('REVOKE ALL PRIVILEGES ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated', r.proname, r.identity_args);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role', r.proname, r.identity_args);
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.app_can_access_branch(p_branch_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT CASE
    WHEN auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'role_admin') THEN true
    WHEN p_branch_id IS NULL THEN false
    ELSE
      p_branch_id = NULLIF(auth.jwt() ->> 'branch_id', '')::UUID
      OR EXISTS (
        SELECT 1
        FROM public.branch_members bm
        WHERE bm.branch_id = p_branch_id
          AND bm.person_id = NULLIF(auth.jwt() ->> 'person_id', '')::UUID
          AND bm.is_active
      )
  END;
$$;

REVOKE ALL ON FUNCTION public.app_can_access_branch(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_can_access_branch(UUID) TO authenticated, service_role;

DROP POLICY IF EXISTS branches_user_see_assigned ON public.branches;
CREATE POLICY branches_user_see_assigned
  ON public.branches FOR SELECT TO authenticated
  USING (public.app_can_access_branch(id));

DROP POLICY IF EXISTS people_self_or_branch_select ON public.people;
CREATE POLICY people_self_or_branch_select
  ON public.people FOR SELECT TO authenticated
  USING (
    id = NULLIF(auth.jwt() ->> 'person_id', '')::UUID
    OR public.app_can_access_branch(branch_id)
  );

DROP POLICY IF EXISTS "Allow public read shift_definitions" ON public.shift_definitions;
DROP POLICY IF EXISTS shift_definitions_branch_read ON public.shift_definitions;
CREATE POLICY shift_definitions_branch_read
  ON public.shift_definitions FOR SELECT TO authenticated
  USING (branch_id IS NULL OR public.app_can_access_branch(branch_id));

DROP POLICY IF EXISTS idempotency_registry_read ON public.idempotency_registry;

DROP POLICY IF EXISTS point_event_read ON public.point_event;
CREATE POLICY point_event_read
  ON public.point_event FOR SELECT TO authenticated
  USING (
    person_id = NULLIF(auth.jwt() ->> 'person_id', '')::UUID
    OR (
      public.app_can_access_branch(branch_id)
      AND auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'role_admin', 'branch_manager', 'role_manager', 'role_captain')
    )
  );

DROP POLICY IF EXISTS point_event_line_read ON public.point_event_line;
CREATE POLICY point_event_line_read
  ON public.point_event_line FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.point_event e
      WHERE e.event_id = point_event_line.event_id
        AND (
          e.person_id = NULLIF(auth.jwt() ->> 'person_id', '')::UUID
          OR (
            public.app_can_access_branch(e.branch_id)
            AND auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'role_admin', 'branch_manager', 'role_manager', 'role_captain')
          )
        )
    )
  );

DROP POLICY IF EXISTS point_daily_read ON public.point_daily;
CREATE POLICY point_daily_read
  ON public.point_daily FOR SELECT TO authenticated
  USING (
    person_id = NULLIF(auth.jwt() ->> 'person_id', '')::UUID
    OR (
      public.app_can_access_branch(branch_id)
      AND auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'role_admin', 'branch_manager', 'role_manager', 'role_captain')
    )
  );

DROP POLICY IF EXISTS point_monthly_read ON public.point_monthly;
CREATE POLICY point_monthly_read
  ON public.point_monthly FOR SELECT TO authenticated
  USING (
    person_id = NULLIF(auth.jwt() ->> 'person_id', '')::UUID
    OR (
      public.app_can_access_branch(branch_id)
      AND auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'role_admin', 'branch_manager', 'role_manager', 'role_captain')
    )
  );

DROP POLICY IF EXISTS ledger_select_scoped ON public.point_ledger;
CREATE POLICY ledger_select_scoped
  ON public.point_ledger FOR SELECT TO authenticated
  USING (
    person_id = NULLIF(auth.jwt() ->> 'person_id', '')::UUID
    OR (
      public.app_can_access_branch(branch_id)
      AND auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'role_admin', 'branch_manager', 'role_manager', 'role_captain')
    )
  );

DROP POLICY IF EXISTS rollup_select_scoped ON public.point_rollups;
CREATE POLICY rollup_select_scoped
  ON public.point_rollups FOR SELECT TO authenticated
  USING (
    person_id = NULLIF(auth.jwt() ->> 'person_id', '')::UUID
    OR (
      public.app_can_access_branch(branch_id)
      AND auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'role_admin', 'branch_manager', 'role_manager', 'role_captain')
    )
  );

COMMIT;
