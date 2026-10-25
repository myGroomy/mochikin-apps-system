-- ============================================================================
-- F3.5: Master Data Hub - Centralized Audit Log
-- ============================================================================
-- Single audit table for all master data changes (people, branches, items, customers)
-- Provides compliance, debugging, and change history tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS master_data_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identify which table changed
  table_name TEXT NOT NULL CHECK (table_name IN ('people', 'branches', 'items', 'customers')),
  
  -- Reference to the record that changed
  record_id UUID NOT NULL,
  
  -- Change details
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Old & new values (JSONB for flexibility)
  old_values JSONB,
  new_values JSONB,
  
  -- Context
  ip_address TEXT,
  user_agent TEXT,
  change_reason TEXT, -- e.g., "bulk_import", "manual_fix", "sync_from_sheets"
  
  -- For searching
  changed_email TEXT, -- Email of who made change
  record_identifier TEXT -- e.g., person name, branch code, SKU
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_master_audit_table_name ON master_data_audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_master_audit_record_id ON master_data_audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_master_audit_changed_at ON master_data_audit_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_master_audit_changed_by ON master_data_audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_master_audit_action ON master_data_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_master_audit_table_record ON master_data_audit_log(table_name, record_id);

-- ============================================================================
-- AUDIT FUNCTIONS & TRIGGERS
-- ============================================================================
-- Automatically log changes to master data tables

-- Function to log changes to master_data_audit_log
CREATE OR REPLACE FUNCTION log_master_data_change()
RETURNS TRIGGER AS $$
DECLARE
  old_vals JSONB;
  new_vals JSONB;
  record_ident TEXT;
BEGIN
  -- Capture old and new values
  old_vals := to_jsonb(OLD.*);
  new_vals := to_jsonb(NEW.*);
  
  -- Determine record identifier based on table
  CASE TG_TABLE_NAME
    WHEN 'people' THEN
      record_ident := NEW.email;
    WHEN 'branches' THEN
      record_ident := NEW.code;
    WHEN 'items' THEN
      record_ident := NEW.sku;
    WHEN 'customers' THEN
      record_ident := NEW.phone;
  END CASE;
  
  -- Handle DELETE operations (NEW is NULL)
  IF TG_OP = 'DELETE' THEN
    record_ident := COALESCE(
      OLD.email,
      OLD.code,
      OLD.sku,
      OLD.phone
    );
    new_vals := NULL;
  END IF;
  
  -- Insert audit log
  INSERT INTO master_data_audit_log (
    table_name,
    record_id,
    action,
    changed_by,
    old_values,
    new_values,
    record_identifier,
    changed_email
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    COALESCE(NEW.updated_by, NEW.created_by, OLD.updated_by, OLD.created_by),
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE old_vals END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE new_vals END,
    record_ident,
    (SELECT email FROM people WHERE id = COALESCE(NEW.updated_by, NEW.created_by, OLD.updated_by, OLD.created_by) LIMIT 1)
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for each master data table
DROP TRIGGER IF EXISTS trigger_people_audit ON people;
CREATE TRIGGER trigger_people_audit
  AFTER INSERT OR UPDATE OR DELETE ON people
  FOR EACH ROW
  EXECUTE FUNCTION log_master_data_change();

DROP TRIGGER IF EXISTS trigger_branches_audit ON branches;
CREATE TRIGGER trigger_branches_audit
  AFTER INSERT OR UPDATE OR DELETE ON branches
  FOR EACH ROW
  EXECUTE FUNCTION log_master_data_change();

DROP TRIGGER IF EXISTS trigger_items_audit ON items;
CREATE TRIGGER trigger_items_audit
  AFTER INSERT OR UPDATE OR DELETE ON items
  FOR EACH ROW
  EXECUTE FUNCTION log_master_data_change();

DROP TRIGGER IF EXISTS trigger_customers_audit ON customers;
CREATE TRIGGER trigger_customers_audit
  AFTER INSERT OR UPDATE OR DELETE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION log_master_data_change();

-- ============================================================================
-- VIEW: Change History for Any Record
-- ============================================================================
-- Easily query the history of changes to a specific record

CREATE OR REPLACE VIEW master_data_change_history AS
SELECT
  id,
  table_name,
  record_id,
  action,
  changed_at,
  changed_by,
  changed_email,
  record_identifier,
  change_reason,
  -- Show what changed (for UPDATE operations)
  CASE
    WHEN action = 'UPDATE' THEN (
      SELECT string_agg(key || ': ' || old_val || ' → ' || new_val, ', ')
      FROM (
        SELECT
          key,
          COALESCE(old_values ->> key, 'NULL') as old_val,
          COALESCE(new_values ->> key, 'NULL') as new_val
        FROM jsonb_each(new_values)
        WHERE old_values IS NOT NULL
          AND (old_values ->> key) IS DISTINCT FROM (new_values ->> key)
      ) t
    )
    WHEN action = 'INSERT' THEN 'New record created'
    WHEN action = 'DELETE' THEN 'Record deleted'
  END as change_summary
FROM master_data_audit_log
ORDER BY changed_at DESC;

-- ============================================================================
-- QUERY HELPERS
-- ============================================================================

-- Get recent changes across all master data (last 24 hours)
CREATE OR REPLACE VIEW recent_master_data_changes AS
SELECT
  changed_at,
  table_name,
  action,
  record_identifier,
  changed_email,
  change_reason
FROM master_data_audit_log
WHERE changed_at > NOW() - INTERVAL '24 hours'
ORDER BY changed_at DESC;

-- Get all changes by a specific user
CREATE OR REPLACE VIEW audit_by_user AS
SELECT
  changed_by,
  changed_email,
  table_name,
  action,
  COUNT(*) as change_count,
  MAX(changed_at) as last_change_at
FROM master_data_audit_log
WHERE changed_at > NOW() - INTERVAL '30 days'
GROUP BY changed_by, changed_email, table_name, action
ORDER BY last_change_at DESC;

-- ============================================================================
-- RETENTION POLICY (Optional)
-- ============================================================================
-- Keep audit logs for 2 years, then archive/delete

-- Function to cleanup old audit logs (run manually or via cron)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS TABLE(deleted_count INT) AS $$
DECLARE
  rows_deleted INT;
BEGIN
  DELETE FROM master_data_audit_log
  WHERE changed_at < NOW() - INTERVAL '2 years';
  
  GET DIAGNOSTICS rows_deleted = ROW_COUNT;
  
  RETURN QUERY SELECT rows_deleted;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS: Audit log visibility
-- ============================================================================

ALTER TABLE master_data_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Super admin can see all audit logs
DROP POLICY IF EXISTS audit_admin_all ON master_data_audit_log;
CREATE POLICY audit_admin_all
  ON master_data_audit_log FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'super_admin'
  );

-- Policy: Branch managers can see audit logs for their branch's records
DROP POLICY IF EXISTS audit_branch_manager_see_branch ON master_data_audit_log;
CREATE POLICY audit_branch_manager_see_branch
  ON master_data_audit_log FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'branch_manager'
    AND (
      -- Can see changes to people in own branch
      (table_name = 'people' AND record_id IN (
        SELECT id FROM people WHERE branch_id = (auth.jwt() ->> 'branch_id')::UUID
      ))
      -- Can see changes to customers in own branch
      OR (table_name = 'customers' AND record_id IN (
        SELECT id FROM customers WHERE branch_id = (auth.jwt() ->> 'branch_id')::UUID
      ))
      -- Can see all branch changes
      OR (table_name = 'branches' AND record_id = (auth.jwt() ->> 'branch_id')::UUID)
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE master_data_audit_log IS 'Centralized audit log for all master data changes (people, branches, items, customers)';
COMMENT ON FUNCTION log_master_data_change() IS 'Automatically logs INSERT/UPDATE/DELETE operations to audit table';
COMMENT ON VIEW master_data_change_history IS 'Query change history for any record with human-readable diffs';
COMMENT ON VIEW recent_master_data_changes IS 'Recent changes across all master data (last 24 hours)';
COMMENT ON VIEW audit_by_user IS 'Audit summary by user (last 30 days)';
