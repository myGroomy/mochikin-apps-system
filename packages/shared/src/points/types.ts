import { z } from 'zod';

export type SetMethod = 'per_item' | 'per_category';
export type AppId = 'mycheck' | 'mycustomer' | 'stokis' | 'myperformance';
export type ReportStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'revision'
  | 'approved'
  | 'rejected';
export type AuditAction =
  | 'approve'
  | 'reject'
  | 'feedback'
  | 'zero_point'
  | 'undo_zero_point';

export interface PointCategory {
  id: string;
  app_id: AppId;
  name: string;
  set_method: SetMethod;
  total_points: number;
  branch_id?: string | null;
  external_ref?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PointItem {
  id: string;
  category_id: string;
  app_id: AppId;
  name: string;
  points: number;
  sort_order: number;
  external_ref?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Report {
  id: string;
  app_id: AppId;
  branch_id: string;
  period_label: string;
  period_start: string;
  period_end: string;
  status: ReportStatus;
  total_points: number;
  external_ref?: string | null;
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

export interface ReportContributor {
  id?: string;
  report_id: string;
  user_id: string;
  user_name?: string;
  points_earned: number;
  items_count: number;
}

export interface PointLog {
  id: string;
  app_id: AppId;
  user_id: string;
  user_name?: string;
  branch_id: string;
  item_id?: string | null;
  category_id?: string | null;
  activity_type: string;
  points_earned: number;
  points_original: number;
  report_id?: string | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface ReportAudit {
  id: string;
  report_id: string;
  auditor_id: string;
  auditor_name?: string;
  action: AuditAction;
  target_log_id?: string | null;
  note?: string | null;
  points_before?: number | null;
  points_after?: number | null;
  created_at?: string;
}

export interface MyCustomerPointConfig {
  id?: string;
  branch_id: string;
  repeat_customer_point: boolean;
  repeat_wa_point: boolean;
  points_per_wa: number;
  updated_by?: string | null;
  updated_at?: string;
}

export interface MyCustomerWaLog {
  id?: string;
  user_id: string;
  customer_id: string;
  order_id: string;
  clicked_at?: string;
  point_granted: boolean;
  locked_until: string;
}

export interface ScorecardSession {
  id: string;
  branch_id: string;
  title: string;
  opened_by: string;
  opened_at: string;
  closed_at?: string | null;
  is_open: boolean;
}

export interface ScorecardQuestion {
  id: string;
  session_id: string;
  question_text: string;
  max_points: number;
  sort_order: number;
}

export interface ScorecardResponse {
  id: string;
  session_id: string;
  question_id: string;
  evaluator_id: string;
  evaluated_id: string;
  points_given: number;
  feedback?: string | null;
  created_at?: string;
}

export const SetMethodSchema = z.enum(['per_item', 'per_category']);
export const AppIdSchema = z.enum(['mycheck', 'mycustomer', 'stokis', 'myperformance']);
export const ReportStatusSchema = z.enum([
  'draft',
  'submitted',
  'under_review',
  'revision',
  'approved',
  'rejected',
]);
export const AuditActionSchema = z.enum([
  'approve',
  'reject',
  'feedback',
  'zero_point',
  'undo_zero_point',
]);
