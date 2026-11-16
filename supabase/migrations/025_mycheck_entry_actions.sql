-- Atomic, idempotent checklist actions for MyCheck.
BEGIN;

ALTER TABLE public.mycheck_entries
  ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT 'selesai'
    CHECK (state IN ('belum', 'selesai', 'skip')),
  ADD COLUMN IF NOT EXISTS skip_reason TEXT,
  ADD COLUMN IF NOT EXISTS out_of_range BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS timing_label TEXT,
  ADD COLUMN IF NOT EXISTS timing_delta_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS mycheck_entries_shift_point_uq
  ON public.mycheck_entries (shift_instance_id, point_id)
  WHERE point_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.mycheck_entry_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_instance_id TEXT NOT NULL REFERENCES public.mycheck_shift_instances(id) ON DELETE CASCADE,
  point_id UUID NOT NULL REFERENCES public.mycheck_checklist_points(id) ON DELETE RESTRICT,
  client_action_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('selesai', 'batal', 'skip', 'ubah_nilai')),
  outcome TEXT NOT NULL CHECK (outcome IN ('diterima', 'ditolak_kalah')),
  user_id UUID NOT NULL REFERENCES public.people(id) ON DELETE RESTRICT,
  winner_user_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  prev_state TEXT NOT NULL,
  new_state TEXT NOT NULL,
  value JSONB,
  client_at TEXT,
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_action_id)
);
CREATE INDEX IF NOT EXISTS mycheck_entry_actions_instance_at_idx
  ON public.mycheck_entry_actions (shift_instance_id, at);

ALTER TABLE public.mycheck_entry_actions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mycheck_entry_actions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mycheck_entry_actions TO service_role;

CREATE OR REPLACE FUNCTION public.mycheck_record_entry_action(
  p_shift_instance_id TEXT,
  p_point_id UUID,
  p_point_text TEXT,
  p_input_type TEXT,
  p_action TEXT,
  p_new_state TEXT,
  p_value_boolean BOOLEAN,
  p_value_number NUMERIC,
  p_value_text TEXT,
  p_photo_url TEXT,
  p_skip_reason TEXT,
  p_out_of_range BOOLEAN,
  p_timing_label TEXT,
  p_timing_delta_minutes INTEGER,
  p_user_id UUID,
  p_client_action_id TEXT,
  p_client_at TEXT,
  p_at TIMESTAMPTZ,
  p_first_action_type TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_entry public.mycheck_entries%ROWTYPE;
  v_existing_action public.mycheck_entry_actions%ROWTYPE;
  v_prev_state TEXT := 'belum';
  v_new_id UUID;
  v_has_entry BOOLEAN := false;
  v_prev_count INTEGER := 0;
  v_next_count INTEGER := 0;
BEGIN
  PERFORM 1
  FROM public.mycheck_shift_instances
  WHERE id = p_shift_instance_id AND status = 'open'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shift is not open';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::TEXT || ':' || p_client_action_id, 0));
  SELECT * INTO v_existing_action
  FROM public.mycheck_entry_actions
  WHERE user_id = p_user_id AND client_action_id = p_client_action_id;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', 'duplikat',
      'outcome', v_existing_action.outcome,
      'entry_id', (SELECT id FROM public.mycheck_entries WHERE shift_instance_id = p_shift_instance_id AND point_id = p_point_id),
      'state', v_existing_action.new_state,
      'value', v_existing_action.value
    );
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_shift_instance_id || ':' || p_point_id::TEXT, 0));
  SELECT * INTO v_entry
  FROM public.mycheck_entries
  WHERE shift_instance_id = p_shift_instance_id AND point_id = p_point_id
  FOR UPDATE;
  IF FOUND THEN
    v_prev_state := v_entry.state;
    v_has_entry := true;
  END IF;

  IF v_has_entry AND p_action <> 'batal' AND v_prev_state <> 'belum'
     AND NOT (p_action = 'ubah_nilai' AND v_entry.filled_by_user_id = p_user_id) THEN
    INSERT INTO public.mycheck_entry_actions (
      shift_instance_id, point_id, client_action_id, action, outcome,
      user_id, winner_user_id, prev_state, new_state, value, client_at, at
    ) VALUES (
      p_shift_instance_id, p_point_id, p_client_action_id, p_action, 'ditolak_kalah',
      p_user_id, v_entry.filled_by_user_id, v_prev_state, v_prev_state,
      CASE WHEN p_value_text IS NULL THEN NULL ELSE to_jsonb(p_value_text) END,
      p_client_at, p_at
    );
    RETURN jsonb_build_object(
      'status', 'konflik',
      'state', v_prev_state,
      'winner_user_id', v_entry.filled_by_user_id,
      'entry_id', v_entry.id
    );
  END IF;

  SELECT count(*) INTO v_prev_count
  FROM public.mycheck_entries
  WHERE shift_instance_id = p_shift_instance_id
    AND filled_by_user_id = p_user_id
    AND state IN ('selesai', 'skip');

  IF v_has_entry THEN
    UPDATE public.mycheck_entries SET
      state = p_new_state,
      point_text_snap = p_point_text,
      input_type = p_input_type,
      value_boolean = CASE WHEN p_new_state = 'belum' THEN NULL ELSE p_value_boolean END,
      value_number = CASE WHEN p_new_state = 'belum' THEN NULL ELSE p_value_number END,
      value_text = CASE WHEN p_new_state = 'belum' THEN NULL ELSE p_value_text END,
      photo_url = CASE WHEN p_new_state = 'belum' THEN NULL ELSE p_photo_url END,
      notes = CASE WHEN p_new_state = 'skip' THEN p_skip_reason ELSE NULL END,
      skip_reason = CASE WHEN p_new_state = 'skip' THEN p_skip_reason ELSE NULL END,
      out_of_range = CASE WHEN p_new_state = 'belum' THEN false ELSE p_out_of_range END,
      timing_label = CASE WHEN p_new_state = 'belum' THEN NULL ELSE p_timing_label END,
      timing_delta_minutes = CASE WHEN p_new_state = 'belum' THEN NULL ELSE p_timing_delta_minutes END,
      filled_by_user_id = CASE WHEN p_new_state = 'belum' THEN p_user_id ELSE p_user_id END,
      filled_at = p_at,
      updated_at = p_at
    WHERE id = v_entry.id
    RETURNING id INTO v_new_id;
  ELSE
    INSERT INTO public.mycheck_entries (
      shift_instance_id, point_id, point_text_snap, input_type, state,
      value_boolean, value_number, value_text, photo_url, notes, skip_reason,
      out_of_range, timing_label, timing_delta_minutes, filled_by_user_id, filled_at, updated_at
    ) VALUES (
      p_shift_instance_id, p_point_id, p_point_text, p_input_type, p_new_state,
      CASE WHEN p_new_state = 'belum' THEN NULL ELSE p_value_boolean END,
      CASE WHEN p_new_state = 'belum' THEN NULL ELSE p_value_number END,
      CASE WHEN p_new_state = 'belum' THEN NULL ELSE p_value_text END,
      CASE WHEN p_new_state = 'belum' THEN NULL ELSE p_photo_url END,
      CASE WHEN p_new_state = 'skip' THEN p_skip_reason ELSE NULL END,
      CASE WHEN p_new_state = 'skip' THEN p_skip_reason ELSE NULL END,
      CASE WHEN p_new_state = 'belum' THEN false ELSE p_out_of_range END,
      CASE WHEN p_new_state = 'belum' THEN NULL ELSE p_timing_label END,
      CASE WHEN p_new_state = 'belum' THEN NULL ELSE p_timing_delta_minutes END,
      p_user_id, p_at, p_at
    ) RETURNING id INTO v_new_id;
  END IF;

  INSERT INTO public.mycheck_shift_participants (
    shift_instance_id, user_id, first_action_at, first_action_type
  ) VALUES (p_shift_instance_id, p_user_id, p_at, p_first_action_type)
  ON CONFLICT (shift_instance_id, user_id) DO NOTHING;

  SELECT count(*) INTO v_next_count
  FROM public.mycheck_entries
  WHERE shift_instance_id = p_shift_instance_id
    AND filled_by_user_id = p_user_id
    AND state IN ('selesai', 'skip');

  INSERT INTO public.mycheck_entry_actions (
    shift_instance_id, point_id, client_action_id, action, outcome,
    user_id, prev_state, new_state, value, client_at, at
  ) VALUES (
    p_shift_instance_id, p_point_id, p_client_action_id, p_action, 'diterima',
    p_user_id, v_prev_state, p_new_state,
    CASE WHEN p_value_text IS NULL THEN NULL ELSE to_jsonb(p_value_text) END,
    p_client_at, p_at
  );

  RETURN jsonb_build_object(
    'status', 'diterima',
    'entry_id', v_new_id,
    'prev_state', v_prev_state,
    'new_state', p_new_state,
    'item_count_delta', v_next_count - v_prev_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mycheck_record_entry_action(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, NUMERIC, TEXT, TEXT, TEXT, BOOLEAN, TEXT, INTEGER, UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mycheck_record_entry_action(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, NUMERIC, TEXT, TEXT, TEXT, BOOLEAN, TEXT, INTEGER, UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT) TO service_role;

COMMIT;
