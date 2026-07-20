-- Operator health snapshot: closes the "no single operator dashboard shows
-- app, database, migration, outbox, and projection health at a glance" gap
-- recorded in gaps-findings.md (Implementation gaps > Operator health).
--
-- Deliberately aggregate-only and read-only. No new table grants: outbox
-- payloads and defect-report detail stay behind their existing RLS/RPC
-- boundary, this only counts them. Migration status is deliberately NOT
-- included -- that lives in Supabase's own schema_migrations catalog, which
-- is infrastructure-level and out of scope for an application permission
-- check to expose. Same system-wide-via-any-project simplification already
-- used by set_system_status (20260719006000_administration.sql): a proper
-- org-level check is a Configuration-module concern for later.

create or replace function public.operator_health_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  outbox_pending integer;
  outbox_oldest_pending_at timestamptz;
  open_defects integer;
  deferred_gates integer;
begin
  if actor is null or not exists (
    select 1 from public.project_role_assignments pra
    join public.role_bundle_permissions rbp on rbp.bundle_code = pra.bundle_code
    where pra.identity_id = actor and rbp.permission_code = 'administration.manage_users'
      and (pra.revoked_at is null or pra.revoked_at > now())
  ) then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;

  select count(*), min(created_at) into outbox_pending, outbox_oldest_pending_at
    from public.outbox_messages where published_at is null;

  select count(*) into open_defects from public.defect_reports where acknowledged = false;

  select count(*) into deferred_gates from public.governance_gates where lifecycle = 'Deferred';

  return jsonb_build_object(
    'asOf', now(),
    'databaseConnected', true,
    'outboxPendingCount', outbox_pending,
    'outboxOldestPendingAt', outbox_oldest_pending_at,
    'openDefectCount', open_defects,
    'deferredGateCount', deferred_gates
  );
end;
$$;

revoke all on function public.operator_health_snapshot() from public, anon;
grant execute on function public.operator_health_snapshot() to authenticated;
