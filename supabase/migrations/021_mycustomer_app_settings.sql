-- Persist MyCustomer's shared CRM and WhatsApp templates in Supabase.
CREATE TABLE IF NOT EXISTS mycustomer_app_settings (
  id         TEXT PRIMARY KEY CHECK (id = 'global'),
  settings   JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES people(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE mycustomer_app_settings ENABLE ROW LEVEL SECURITY;
