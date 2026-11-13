-- ============================================================================
-- Migration: 017_point_platform_monitoring.sql
-- Module: Point Platform Storage Statistics & Monitoring Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_point_platform_storage_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bytes BIGINT;
  v_res JSONB;
BEGIN
  v_bytes := pg_database_size(current_database());
  SELECT jsonb_build_object(
    'size_bytes', v_bytes,
    'size_mb', round((v_bytes::numeric / (1024 * 1024)), 2),
    'size_pretty', pg_size_pretty(v_bytes),
    'target_max_mb', 250.00,
    'free_tier_cap_mb', 500.00,
    'warning_threshold_mb', 150.00,
    'usage_percent_of_target', round(((v_bytes::numeric / (1024 * 1024)) / 250.00) * 100, 2),
    'is_warning', ((v_bytes::numeric / (1024 * 1024)) >= 150.00)
  ) INTO v_res;
  RETURN v_res;
END;
$$;
