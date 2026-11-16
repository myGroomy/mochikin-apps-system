-- Additive handover acknowledgement and draft lifecycle support.
BEGIN;

ALTER TABLE public.mycheck_shift_instances
  ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES public.people(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS close_type TEXT,
  ADD COLUMN IF NOT EXISTS no_incident_confirmed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.mycheck_handovers
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('draft', 'submitted'));

CREATE UNIQUE INDEX IF NOT EXISTS mycheck_handovers_shift_instance_uq
  ON public.mycheck_handovers (shift_instance_id);

CREATE TABLE IF NOT EXISTS public.mycheck_handover_acks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id UUID NOT NULL REFERENCES public.mycheck_handovers(id) ON DELETE CASCADE,
  reading_shift_instance_id TEXT NOT NULL REFERENCES public.mycheck_shift_instances(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.people(id) ON DELETE RESTRICT,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (handover_id, reading_shift_instance_id, user_id)
);
CREATE INDEX IF NOT EXISTS mycheck_handover_acks_handover_idx
  ON public.mycheck_handover_acks (handover_id, read_at);

ALTER TABLE public.mycheck_handover_acks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mycheck_handover_acks FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mycheck_handover_acks TO service_role;

COMMIT;
