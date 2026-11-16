# Supabase data contract

## Authority and rollout

`supabase/FULL_SETUP.sql` is the canonical fresh-install schema, not a production
migration: its opening block drops every view and table in `public`. Apply
incremental migrations to an existing project. Migration
`supabase/migrations/019_application_data_contract.sql` adds the relations
described below without dropping or rewriting existing data. It has not been
applied to the live project as part of this change.

The previously inspected live schema had the 48 relations in the setup file.
This contract adds five canonical relations, for 53 total after migration 019.
The existing worktree change in `supabase/.temp/cli-latest` is unrelated and
preserved.

Migration `020_public_api_lockdown.sql` is an additional incremental security
migration; it has **not** been applied to any live Supabase project. It revokes
direct `anon`/`authenticated` access to application-owned objects in `public`,
enables RLS on application tables, and grants the server-only `service_role`.
Extension-owned objects are excluded. Because the custom app sessions are not
Supabase Auth JWTs, routes using the service role must authenticate the custom
session and enforce branch access themselves. Do not apply migration 020 to
production before a staging rollout and a complete route-authorization review.
Use `node scripts/check-supabase-anon-denied.mjs` with staging credentials to
verify that the zero-row probes are rejected.

## Legacy relation mapping

| Legacy relation | Canonical contract | Data semantics |
| --- | --- | --- |
| `customers` | `mycust_customers` | Customer identity and CRM profile; map old notes to `description` where appropriate. |
| `customer_transactions` | `mycust_transactions` | Distinct financial events (`sale`, `return`, `payment`, `credit`), not `mycust_orders` order headers. Preserve customer, branch, recording person, amount, description, reference, and time. |
| `point_items` | `dim_item` | Shared points catalog; map item code/name/weight to `item_code`/`item_name`/`default_weight`. Domain inventory such as stock quantities remains in `stokis_items`. |
| `point_logs` | `point_event` + `point_event_line` and the canonical `point_ledger` | Immutable point events and ledger entries. Do not mutate historical points; correct them with reversal events. |
| `reports` | `app_reports` | Report identity, source reference, period, status, totals, and app-specific summary/metadata. Stokis stock-opname source data remains in `stokis_opnames` and `stokis_opname_lines`. |
| `report_contributors` | Derived from `point_event`/`point_event_line` and report summary | Not a separate source of truth; calculate contributors from immutable events. |
| `report_audits` | `app_report_audit_log` | Append-only review/status actions and notes. Point changes belong to reversals, not report audit rows. |
| `point_audits` | `point_event` reversal events | Corrections must retain the original event and append a reversal with actor and reason. |
| `point_master_changes` | `point_master_changes` | Existing append-only point-master configuration history. Included in the canonical setup even though it was only present in a prior migration. |
| `mycustomer_point_config` | `mycustomer_branch_settings` | Per-branch repeat-customer/repeat-WA switches and WA point amount; global numeric defaults stay in `point_config`. |

Do not create compatibility copies named `customers`, `customer_transactions`,
`point_items`, `point_logs`, `reports`, `report_contributors`,
`report_audits`, `point_audits`, or `mycustomer_point_config`.

## New relation definitions

- **`mycust_transactions`**: one financial transaction per row. `transaction_type`
  is `sale`, `return`, `payment`, or `credit`; `amount` is positive. Foreign keys
  retain the customer, branch, and recording `people` row.
- **`app_reports`**: app/branch-scoped report workflow record with a stable
  `(app_id, source_ref)` key, optional period, status, total, JSON metadata and
  summary, creator, and timestamps. It does not replace operational source data
  or point events.
- **`app_report_audit_log`**: append-only report workflow audit entries, including
  actor, action, details, and timestamp. A report with audit history cannot be
  deleted.
- **`mycustomer_branch_settings`**: one row per branch, with repeat-customer and
  repeat-WA reward switches plus points per WA.
- **`point_master_changes`**: append-only point configuration change history,
  keyed by app, entity type/reference, action, actor, and timestamp.

RLS is enabled on all five relations. The report, transaction, and branch
settings tables have no client-role policies and are intended for the trusted
server/service-role path only. `point_master_changes` has admin-read/admin-insert
claim policies and is immutable by trigger. Migration 020 adds branch-scoped
policies for selected identity and points tables, but direct client access is
revoked; these policies are defense in depth, not a substitute for route auth.
Legacy branch codes/IDs must be resolved to `branches.id` before writing the
UUID foreign keys in the new relations.

## Scope boundary

The current change switches selected MyCustomer customer/transaction/config
routes to canonical relations and adds custom-session/branch checks to the
WhatsApp follow-up route. The follow-up route still writes legacy `point_logs`
because the configurable per-branch tariff has not yet been mapped to the
canonical task/ledger semantics; this is a temporary migration gap, not an
approved permanent dual-write. MyCheck, Stokis, MyService, and other MyCustomer
routes still have Sheets/GAS or legacy-relation paths.

No spreadsheet/Drive data has been imported, no route cutover or cleanup is
complete, and neither migration 019 nor 020 has been applied live. The data
import and security rollout remain blocked on source snapshots/credentials and
a staging Supabase project. Retire a legacy relation only after its data and
business semantics have been reconciled and every caller is migrated.
