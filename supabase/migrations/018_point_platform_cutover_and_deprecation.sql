-- ============================================================================
-- Migration: 018_point_platform_cutover_and_deprecation.sql
-- Module: Cutover & Deprecation of Legacy Point Tables
-- Note: Legacy tables are retained for audit and rollback safety; do NOT drop them.
-- ============================================================================

COMMENT ON TABLE point_ledger IS 'DEPRECATED: Replaced by point_event (partitioned) in Point Platform v2. Kept for audit trail and rollback safety.';
COMMENT ON TABLE point_logs IS 'DEPRECATED: Replaced by point_event and point_event_line in Point Platform v2. Kept for historical reference.';
COMMENT ON TABLE report_contributors IS 'DEPRECATED: Aggregation now handled via point_daily and point_monthly rollups.';
COMMENT ON TABLE report_audits IS 'DEPRECATED: Replaced by point_event reversal entries with actor_id and reason audit tracking.';
COMMENT ON TABLE point_items IS 'DEPRECATED: Replaced by dim_item with tier and calibrated default_weight.';
COMMENT ON TABLE point_categories IS 'DEPRECATED: Categorization now managed dynamically in dim_item and point_config.';
