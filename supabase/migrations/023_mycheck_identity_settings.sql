-- Additive MyCheck identity/configuration contract.
BEGIN;

ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS must_change_pin BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.mycheck_shift_definitions
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.mycheck_shift_instances
  ADD COLUMN IF NOT EXISTS snapshot_encoding TEXT NOT NULL DEFAULT 'json',
  ADD COLUMN IF NOT EXISTS snapshot_hash TEXT,
  ADD COLUMN IF NOT EXISTS closed_outside_hours BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.mycheck_sop_categories
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.mycheck_checklist_points
  ADD COLUMN IF NOT EXISTS instruction TEXT,
  ADD COLUMN IF NOT EXISTS target_time TEXT,
  ADD COLUMN IF NOT EXISTS tolerance_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS active_days TEXT,
  ADD COLUMN IF NOT EXISTS number_min NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS number_max NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.mycheck_handover_fields
  ADD COLUMN IF NOT EXISTS input_types TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS options TEXT[],
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS public.mycheck_incident_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  points NUMERIC(8, 2) NOT NULL DEFAULT 0,
  penalty_min_severity TEXT NOT NULL DEFAULT 'none',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (branch_id, name)
);
CREATE INDEX IF NOT EXISTS mycheck_incident_categories_branch_order_idx
  ON public.mycheck_incident_categories (branch_id, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS mycheck_incident_categories_branch_name_ci_uq
  ON public.mycheck_incident_categories (branch_id, lower(name));

ALTER TABLE public.mycheck_incidents
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.mycheck_incident_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS outside_shift BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS points_snapshot NUMERIC(8, 2),
  ADD COLUMN IF NOT EXISTS penalty_min_severity_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS link_source TEXT,
  ADD COLUMN IF NOT EXISTS linked_by UUID REFERENCES public.people(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_entry_id UUID,
  ADD COLUMN IF NOT EXISTS status_changed_by UUID REFERENCES public.people(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.mycheck_incident_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.mycheck_incidents(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.people(id) ON DELETE RESTRICT,
  author_role TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mycheck_incident_notes_incident_at_idx
  ON public.mycheck_incident_notes (incident_id, created_at);

CREATE TABLE IF NOT EXISTS public.mycheck_shift_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_instance_id TEXT NOT NULL REFERENCES public.mycheck_shift_instances(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.people(id) ON DELETE RESTRICT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_action_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_action_type TEXT NOT NULL DEFAULT 'buka_shift',
  UNIQUE (shift_instance_id, user_id)
);

ALTER TABLE public.mycheck_shift_participants
  ADD COLUMN IF NOT EXISTS first_action_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS first_action_type TEXT NOT NULL DEFAULT 'buka_shift';

ALTER TABLE public.mycheck_notifications
  ADD COLUMN IF NOT EXISTS dedup_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS mycheck_notifications_dedup_uq
  ON public.mycheck_notifications (user_id, dedup_key)
  WHERE dedup_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.mycheck_pj_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_instance_id TEXT NOT NULL REFERENCES public.mycheck_shift_instances(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.people(id) ON DELETE RESTRICT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  is_current BOOLEAN NOT NULL DEFAULT true,
  source TEXT NOT NULL CHECK (source IN ('open', 'change_pj')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mycheck_pj_assignments_shift_current_idx
  ON public.mycheck_pj_assignments (shift_instance_id, is_current);

CREATE TABLE IF NOT EXISTS public.mycheck_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  shift_instance_id TEXT REFERENCES public.mycheck_shift_instances(id) ON DELETE SET NULL,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('entry', 'handover', 'incident')),
  owner_id TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  mime TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  sha256 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded',
  uploaded_by UUID NOT NULL REFERENCES public.people(id) ON DELETE RESTRICT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mycheck_photos_owner_idx
  ON public.mycheck_photos (branch_id, owner_type, owner_id, status);

ALTER TABLE public.mycheck_incident_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mycheck_shift_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mycheck_pj_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mycheck_photos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mycheck_incident_notes, public.mycheck_shift_participants, public.mycheck_pj_assignments, public.mycheck_photos FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mycheck_incident_notes, public.mycheck_shift_participants, public.mycheck_pj_assignments, public.mycheck_photos TO service_role;

CREATE OR REPLACE FUNCTION public.mycheck_open_shift(
  p_candidate_id TEXT,
  p_new_id TEXT,
  p_branch_id UUID,
  p_shift_definition_id UUID,
  p_shift_date DATE,
  p_is_test BOOLEAN,
  p_person_id UUID,
  p_opened_at TIMESTAMPTZ,
  p_opened_outside_hours BOOLEAN,
  p_snapshot JSONB,
  p_snapshot_hash TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_existing TEXT;
  v_instance_id TEXT;
  v_created BOOLEAN;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(
    p_branch_id::TEXT || ':' || p_shift_definition_id::TEXT || ':' || p_shift_date::TEXT || ':' || p_is_test::TEXT,
    0
  ));
  IF NOT EXISTS (
    SELECT 1 FROM public.mycheck_shift_definitions
    WHERE id = p_shift_definition_id AND branch_id = p_branch_id AND is_active
  ) THEN
    RAISE EXCEPTION 'Shift definition is not active in this branch';
  END IF;

  SELECT id INTO v_existing
  FROM public.mycheck_shift_instances
  WHERE branch_id = p_branch_id
    AND shift_definition_id = p_shift_definition_id
    AND shift_date = p_shift_date
    AND is_test = p_is_test
    AND status <> 'void'
  ORDER BY opened_at DESC
  LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('id', v_existing, 'created', false);
  END IF;

  v_instance_id := p_candidate_id;
  IF EXISTS (SELECT 1 FROM public.mycheck_shift_instances WHERE id = p_candidate_id) THEN
    v_instance_id := p_new_id;
  END IF;

  INSERT INTO public.mycheck_shift_instances (
    id, branch_id, shift_definition_id, shift_date, status, pj_user_id,
    opened_at, opened_outside_hours, is_test, template_snapshot,
    snapshot_encoding, snapshot_hash, updated_at
  ) VALUES (
    v_instance_id, p_branch_id, p_shift_definition_id, p_shift_date, 'open',
    p_person_id, p_opened_at, p_opened_outside_hours, p_is_test, p_snapshot,
    'json', p_snapshot_hash, p_opened_at
  );
  INSERT INTO public.mycheck_shift_participants (
    shift_instance_id, user_id, first_action_at, first_action_type
  ) VALUES (v_instance_id, p_person_id, p_opened_at, 'buka_shift');
  INSERT INTO public.mycheck_pj_assignments (shift_instance_id, user_id, started_at, source)
  VALUES (v_instance_id, p_person_id, p_opened_at, 'open');
  RETURN jsonb_build_object('id', v_instance_id, 'created', true);
END;
$$;

REVOKE ALL ON FUNCTION public.mycheck_open_shift(TEXT, TEXT, UUID, UUID, DATE, BOOLEAN, UUID, TIMESTAMPTZ, BOOLEAN, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mycheck_open_shift(TEXT, TEXT, UUID, UUID, DATE, BOOLEAN, UUID, TIMESTAMPTZ, BOOLEAN, JSONB, TEXT) TO service_role;

CREATE TABLE IF NOT EXISTS public.mycheck_app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_by UUID REFERENCES public.people(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mycheck_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  seq BIGINT NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id TEXT,
  action TEXT NOT NULL,
  object_type TEXT,
  object_id TEXT,
  shift_instance_id TEXT,
  before JSONB,
  after JSONB,
  reason TEXT,
  prev_hash TEXT NOT NULL DEFAULT '',
  hash TEXT NOT NULL,
  UNIQUE (branch_id, seq)
);

CREATE INDEX IF NOT EXISTS mycheck_audit_log_branch_at_idx
  ON public.mycheck_audit_log (branch_id, at DESC, seq DESC);
ALTER TABLE public.mycheck_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mycheck_audit_log FROM anon, authenticated;
GRANT SELECT, INSERT ON public.mycheck_audit_log TO service_role;

CREATE OR REPLACE FUNCTION public.mycheck_audit_log_prevent_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'mycheck_audit_log is append-only'
    USING ERRCODE = 'restrict_violation';
END;
$$;
DROP TRIGGER IF EXISTS trg_mycheck_audit_log_append_only ON public.mycheck_audit_log;
CREATE TRIGGER trg_mycheck_audit_log_append_only
  BEFORE UPDATE OR DELETE ON public.mycheck_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.mycheck_audit_log_prevent_mutation();

CREATE OR REPLACE FUNCTION public.mycheck_append_audit_log(
  p_branch_id UUID,
  p_entry JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  v_seq BIGINT;
  v_prev_hash TEXT;
  v_payload JSONB;
  v_hash TEXT;
  v_id UUID := gen_random_uuid();
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_branch_id::TEXT, 0));
  SELECT COALESCE(max(seq), 0) + 1, COALESCE((array_agg(hash ORDER BY seq DESC))[1], '')
  INTO v_seq, v_prev_hash
  FROM public.mycheck_audit_log
  WHERE branch_id = p_branch_id;

  v_payload := jsonb_build_object(
    'at', COALESCE(p_entry->>'at', now()::TEXT),
    'actor_id', p_entry->'actor_id',
    'action', p_entry->>'action',
    'object_type', p_entry->'object_type',
    'object_id', p_entry->'object_id',
    'branch_id', p_branch_id,
    'shift_instance_id', p_entry->'shift_instance_id',
    'before', p_entry->'before',
    'after', p_entry->'after',
    'reason', p_entry->'reason'
  );
  v_hash := encode(digest(convert_to(v_prev_hash || '|' || v_payload::TEXT, 'UTF8'), 'sha256'), 'hex');

  INSERT INTO public.mycheck_audit_log (
    id, branch_id, seq, at, actor_id, action, object_type, object_id,
    shift_instance_id, before, after, reason, prev_hash, hash
  ) VALUES (
    v_id, p_branch_id, v_seq, COALESCE((p_entry->>'at')::TIMESTAMPTZ, now()),
    p_entry->>'actor_id', p_entry->>'action', p_entry->>'object_type',
    p_entry->>'object_id', p_entry->>'shift_instance_id', p_entry->'before',
    p_entry->'after', p_entry->>'reason', v_prev_hash, v_hash
  );
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mycheck_append_audit_log(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mycheck_append_audit_log(UUID, JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.mycheck_verify_audit_chain(p_branch_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  v_row RECORD;
  v_expected_seq BIGINT := 1;
  v_previous_hash TEXT := '';
  v_payload JSONB;
  v_expected_hash TEXT;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_checked INTEGER := 0;
BEGIN
  FOR v_row IN
    SELECT * FROM public.mycheck_audit_log
    WHERE branch_id = p_branch_id
    ORDER BY seq
  LOOP
    v_payload := jsonb_build_object(
      'at', v_row.at::TEXT,
      'actor_id', v_row.actor_id,
      'action', v_row.action,
      'object_type', v_row.object_type,
      'object_id', v_row.object_id,
      'branch_id', p_branch_id,
      'shift_instance_id', v_row.shift_instance_id,
      'before', v_row.before,
      'after', v_row.after,
      'reason', v_row.reason
    );
    v_expected_hash := encode(
      digest(convert_to(v_previous_hash || '|' || v_payload::TEXT, 'UTF8'), 'sha256'),
      'hex'
    );
    IF v_row.seq <> v_expected_seq THEN
      v_errors := array_append(v_errors, format('seq is out of order at %s', v_row.seq));
    END IF;
    IF v_row.prev_hash <> v_previous_hash THEN
      v_errors := array_append(v_errors, format('prev_hash mismatch at seq %s', v_row.seq));
    END IF;
    IF v_row.hash <> v_expected_hash THEN
      v_errors := array_append(v_errors, format('hash mismatch at seq %s', v_row.seq));
    END IF;
    v_previous_hash := v_row.hash;
    v_expected_seq := v_expected_seq + 1;
    v_checked := v_checked + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'valid', cardinality(v_errors) = 0,
    'checked', v_checked,
    'errors', to_jsonb(v_errors)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mycheck_verify_audit_chain(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mycheck_verify_audit_chain(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.mycheck_copy_branch_template(
  p_source_branch_id UUID,
  p_target_branch_id UUID,
  p_actor_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_source_shift RECORD;
  v_source_category RECORD;
  v_new_shift_id UUID;
  v_new_category_id UUID;
  v_shift_count INTEGER := 0;
  v_category_count INTEGER := 0;
  v_point_count INTEGER := 0;
  v_handover_count INTEGER := 0;
  v_incident_count INTEGER := 0;
  v_inserted_count INTEGER := 0;
  v_audit_id UUID;
BEGIN
  IF p_source_branch_id = p_target_branch_id THEN
    RAISE EXCEPTION 'Source and target branches must differ';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_target_branch_id::TEXT, 0));
  IF NOT EXISTS (
    SELECT 1 FROM public.branches
    WHERE id = p_source_branch_id AND status = 'active' AND deleted_at IS NULL
  ) OR NOT EXISTS (
    SELECT 1 FROM public.branches
    WHERE id = p_target_branch_id AND status = 'active' AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Source or target branch is not active';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.mycheck_shift_definitions
    WHERE branch_id = p_target_branch_id
  ) THEN
    RAISE EXCEPTION 'Target branch already has shift definitions';
  END IF;

  FOR v_source_shift IN
    SELECT * FROM public.mycheck_shift_definitions
    WHERE branch_id = p_source_branch_id
    ORDER BY sort_order, id
  LOOP
    INSERT INTO public.mycheck_shift_definitions (
      branch_id, name, start_time, end_time, crosses_midnight, sort_order, is_active, version
    ) VALUES (
      p_target_branch_id, v_source_shift.name, v_source_shift.start_time,
      v_source_shift.end_time, v_source_shift.crosses_midnight,
      v_source_shift.sort_order, v_source_shift.is_active, 1
    ) RETURNING id INTO v_new_shift_id;
    v_shift_count := v_shift_count + 1;

    FOR v_source_category IN
      SELECT * FROM public.mycheck_sop_categories
      WHERE shift_definition_id = v_source_shift.id
      ORDER BY sort_order, id
    LOOP
      INSERT INTO public.mycheck_sop_categories (
        shift_definition_id, name, color, sort_order, is_active, version
      ) VALUES (
        v_new_shift_id, v_source_category.name, v_source_category.color,
        v_source_category.sort_order, v_source_category.is_active, 1
      ) RETURNING id INTO v_new_category_id;
      v_category_count := v_category_count + 1;

      INSERT INTO public.mycheck_checklist_points (
        category_id, point_text, input_types, options, weight_points, is_required,
        sort_order, is_active, instruction, target_time, tolerance_minutes,
        active_days, number_min, number_max, version
      )
      SELECT v_new_category_id, point_text, input_types, options, weight_points,
        is_required, sort_order, is_active, instruction, target_time,
        tolerance_minutes, active_days, number_min, number_max, 1
      FROM public.mycheck_checklist_points
      WHERE category_id = v_source_category.id;
      GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
      v_point_count := v_point_count + v_inserted_count;
    END LOOP;

    INSERT INTO public.mycheck_handover_fields (
      shift_definition_id, field_name, field_type, is_required, sort_order,
      is_active, input_types, options, version
    )
    SELECT v_new_shift_id, field_name, field_type, is_required, sort_order,
      is_active, input_types, options, 1
    FROM public.mycheck_handover_fields
    WHERE shift_definition_id = v_source_shift.id;
    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
    v_handover_count := v_handover_count + v_inserted_count;
  END LOOP;

  INSERT INTO public.mycheck_incident_categories (
    branch_id, name, sort_order, is_active, points, penalty_min_severity
  )
  SELECT p_target_branch_id, name, sort_order, is_active, points, penalty_min_severity
  FROM public.mycheck_incident_categories
  WHERE branch_id = p_source_branch_id
    AND NOT EXISTS (
      SELECT 1 FROM public.mycheck_incident_categories
      WHERE branch_id = p_target_branch_id
    );
  GET DIAGNOSTICS v_incident_count = ROW_COUNT;

  v_audit_id := public.mycheck_append_audit_log(
    p_target_branch_id,
    jsonb_build_object(
      'actor_id', p_actor_id,
      'action', 'copy_branch_template',
      'object_type', 'branch_template',
      'object_id', p_target_branch_id::TEXT,
      'before', jsonb_build_object('targetWasEmpty', true),
      'after', jsonb_build_object(
        'sourceBranchId', p_source_branch_id,
        'shiftDefinitions', v_shift_count,
        'categories', v_category_count,
        'checklistPoints', v_point_count,
        'handoverFields', v_handover_count,
        'incidentCategories', v_incident_count
      ),
      'reason', 'Copy template configuration only; operational history is unchanged.'
    )
  );

  RETURN jsonb_build_object(
    'auditId', v_audit_id,
    'shiftDefinitions', v_shift_count,
    'categories', v_category_count,
    'checklistPoints', v_point_count,
    'handoverFields', v_handover_count,
    'incidentCategories', v_incident_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mycheck_copy_branch_template(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mycheck_copy_branch_template(UUID, UUID, TEXT) TO service_role;

ALTER TABLE public.mycheck_app_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mycheck_app_settings FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mycheck_app_settings TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS people_username_case_insensitive_uq
  ON public.people (lower(username))
  WHERE username IS NOT NULL AND deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.mycheck_create_person(
  p_name TEXT,
  p_username TEXT,
  p_email TEXT,
  p_pin_hash TEXT,
  p_role TEXT,
  p_branch_ids UUID[],
  p_created_by UUID
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_person_id UUID;
  v_primary_branch UUID;
  v_branch_ids UUID[] := COALESCE(p_branch_ids, ARRAY[]::UUID[]);
  v_role TEXT;
BEGIN
  IF p_role NOT IN ('admin', 'petugas') THEN
    RAISE EXCEPTION 'Invalid MyCheck role';
  END IF;
  v_role := CASE WHEN p_role = 'admin' THEN 'role_admin' ELSE 'staff' END;

  IF p_role = 'petugas' AND cardinality(v_branch_ids) = 0 THEN
    RAISE EXCEPTION 'Staff must be assigned to at least one branch';
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(v_branch_ids) AS assigned(id)
    LEFT JOIN public.branches b ON b.id = assigned.id
    WHERE b.id IS NULL OR b.status <> 'active' OR b.deleted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Branch assignment is not active';
  END IF;

  v_primary_branch := v_branch_ids[1];
  IF v_primary_branch IS NULL THEN
    SELECT id INTO v_primary_branch
    FROM public.branches
    WHERE status = 'active' AND deleted_at IS NULL
    ORDER BY code
    LIMIT 1;
  END IF;
  IF v_primary_branch IS NULL THEN
    RAISE EXCEPTION 'No active branch is available';
  END IF;

  INSERT INTO public.people (name, email, username, pin_hash, must_change_pin, role, branch_id, status, created_by)
  VALUES (p_name, p_email, p_username, p_pin_hash, false, v_role, v_primary_branch, 'active', p_created_by)
  RETURNING id INTO v_person_id;

  IF p_role = 'petugas' THEN
    INSERT INTO public.branch_members (branch_id, person_id, branch_role, is_active, assigned_by)
    SELECT assigned.branch_id, v_person_id, 'staff', true, p_created_by
    FROM unnest(v_branch_ids) AS assigned(branch_id);
  END IF;

  RETURN v_person_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mycheck_update_person(
  p_person_id UUID,
  p_name TEXT,
  p_role TEXT,
  p_status TEXT,
  p_branch_ids UUID[],
  p_assigned_by UUID
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_person public.people%ROWTYPE;
  v_primary_branch UUID;
  v_branch_ids UUID[] := COALESCE(p_branch_ids, ARRAY[]::UUID[]);
  v_role TEXT;
BEGIN
  IF p_role NOT IN ('admin', 'petugas') OR p_status NOT IN ('active', 'inactive') THEN
    RAISE EXCEPTION 'Invalid MyCheck user state';
  END IF;
  v_role := CASE WHEN p_role = 'admin' THEN 'role_admin' ELSE 'staff' END;

  IF p_role = 'petugas' AND cardinality(v_branch_ids) = 0 THEN
    RAISE EXCEPTION 'Staff must be assigned to at least one branch';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(v_branch_ids) AS assigned(id)
    LEFT JOIN public.branches b ON b.id = assigned.id
    WHERE b.id IS NULL OR b.status <> 'active' OR b.deleted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Branch assignment is not active';
  END IF;

  SELECT * INTO v_person
  FROM public.people
  WHERE id = p_person_id AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_person.role IN ('admin', 'role_admin', 'super_admin')
     AND (p_role <> 'admin' OR p_status <> 'active') THEN
    PERFORM pg_advisory_xact_lock(915031);
    IF (
      SELECT count(*) FROM public.people
      WHERE role IN ('admin', 'role_admin', 'super_admin')
        AND status = 'active' AND deleted_at IS NULL AND id <> p_person_id
    ) = 0 THEN
      RAISE EXCEPTION 'At least one active admin must remain';
    END IF;
  END IF;

  v_primary_branch := v_branch_ids[1];
  IF v_primary_branch IS NULL THEN
    v_primary_branch := v_person.branch_id;
  END IF;
  UPDATE public.people
  SET name = p_name,
      role = v_role,
      status = p_status,
      branch_id = v_primary_branch,
      updated_by = p_assigned_by,
      updated_at = now()
  WHERE id = p_person_id;

  DELETE FROM public.branch_members WHERE person_id = p_person_id;
  IF p_role = 'petugas' THEN
    INSERT INTO public.branch_members (branch_id, person_id, branch_role, is_active, assigned_by)
    SELECT assigned.branch_id, p_person_id, 'staff', p_status = 'active', p_assigned_by
    FROM unnest(v_branch_ids) AS assigned(branch_id);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.mycheck_create_person(TEXT, TEXT, TEXT, TEXT, TEXT, UUID[], UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mycheck_update_person(UUID, TEXT, TEXT, TEXT, UUID[], UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mycheck_create_person(TEXT, TEXT, TEXT, TEXT, TEXT, UUID[], UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.mycheck_update_person(UUID, TEXT, TEXT, TEXT, UUID[], UUID) TO service_role;

COMMIT;
