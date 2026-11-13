-- ============================================================================
-- Migration: 015_add_mycust_wa_task.sql
-- Module: MyCustomer WhatsApp Follow-Up Task Definition
-- ============================================================================

INSERT INTO task_definitions (
  task_code,
  name,
  app_id,
  category,
  level_role,
  points_per_unit,
  unit_output,
  valid_from
)
VALUES (
  'MYCUST_WA',
  'Follow-Up WhatsApp Pelanggan',
  'mycustomer',
  'T',
  'Staf',
  1.00,
  'pesan',
  '2026-01-01'
)
ON CONFLICT (task_code) DO NOTHING;
