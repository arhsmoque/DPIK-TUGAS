-- Governance gate: the operator's absolute veto over any blocking gate in
-- the app. Deferral is a logged, reversible, never-auto-expiring override --
-- not a second approval path; approval is the strictly stronger state and
-- supersedes an active deferral. Mirrors src/modules/governance-gate/domain
-- exactly, and the RLS/RPC structure of claim.sql (20260719005000) byte for
-- byte -- this table is enabled RLS with real policies from the start,
-- unlike the legacy public.projects gap noted separately in gaps-findings.md.
--
-- First concrete gate instance: the "Operational approval is unsigned" P0
-- blocker (gaps-findings.md / AGENTS.md), seeded below as
-- gate_type = 'operational_approval', one row per existing project.
-- Not yet applied to any shared project.

create table if not exists public.governance_gates (
  id uuid primary key default extensions.gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  project_id uuid not null references public.tugas_projects(id),
  gate_type text not null,
  lifecycle text not null check (lifecycle in ('Open', 'Deferred', 'Approved')) default 'Open',
  deferred_reason text,
  deferred_by uuid references public.users(id),
  deferred_at timestamptz,
  approved_by uuid references public.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id),
  version integer not null default 1 check (version > 0),
  unique (project_id, gate_type)
);

alter table public.governance_gates enable row level security;
revoke all on table public.governance_gates from anon, authenticated;
grant select on table public.governance_gates to authenticated;

drop policy if exists "member reads governance gates" on public.governance_gates;
create policy "member reads governance gates" on public.governance_gates
  for select to authenticated using (public.is_active_project_member(project_id));

-- governance.override_gate: the operator's absolute-veto permission, ungated
-- by gate type since the veto applies uniformly to every gate. Wired into
-- startup_work_owner_admin below -- the bundle the operator already holds --
-- so the veto works immediately with zero new admin-console action.
-- governance.approve_gate:<gate_type> is a distinct, per-gate-type, formally
-- assignable authority, extending the existing flat domain.action permission
-- code convention (claim.create, administration.manage_roles) with a
-- :variant suffix rather than a new lookup/join table.
insert into public.permissions (code) values
  ('governance.override_gate'), ('governance.approve_gate:operational_approval')
on conflict do nothing;

create or replace function public.record_governance_gate_event(
  changed public.governance_gates,
  event_type text,
  topic text,
  payload jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  accepted_event public.domain_events%rowtype;
begin
  insert into public.domain_events (
    organisation_id, project_id, aggregate_type, aggregate_id, aggregate_version,
    event_type, actor_id, payload
  ) values (
    changed.organisation_id, changed.project_id, 'GovernanceGate', changed.id, changed.version,
    event_type, actor, payload
  ) returning * into accepted_event;
  insert into public.outbox_messages (event_id, topic, payload)
  values (accepted_event.id, topic, accepted_event.payload);
end;
$$;

revoke all on function public.record_governance_gate_event(public.governance_gates, text, text, jsonb)
  from public, anon, authenticated;

create or replace function public.defer_gate(
  target_gate_id uuid,
  reason text,
  expected_record_version integer
)
returns public.governance_gates
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.governance_gates%rowtype;
  changed public.governance_gates%rowtype;
begin
  select * into current_record from public.governance_gates where id = target_gate_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'gate_not_found';
  end if;
  if actor is null or not public.has_project_permission(current_record.project_id, 'governance.override_gate') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if current_record.lifecycle <> 'Open' then
    raise exception using errcode = '55000', message = 'gate_not_open';
  end if;
  if length(trim(reason)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_reason';
  end if;

  update public.governance_gates
     set lifecycle = 'Deferred', deferred_reason = trim(reason), deferred_by = actor, deferred_at = now(),
         updated_at = now(), updated_by = actor, version = version + 1
   where id = target_gate_id and version = expected_record_version
   returning * into changed;
  if changed.id is null then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;

  perform public.record_governance_gate_event(changed, 'GateDeferred', 'governance.gate-deferred.v1',
    jsonb_build_object('gateType', changed.gate_type, 'reason', changed.deferred_reason, 'deferredBy', actor));
  return changed;
end;
$$;

create or replace function public.reconsider_gate_deferral(
  target_gate_id uuid,
  expected_record_version integer
)
returns public.governance_gates
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.governance_gates%rowtype;
  changed public.governance_gates%rowtype;
begin
  select * into current_record from public.governance_gates where id = target_gate_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'gate_not_found';
  end if;
  if actor is null or not public.has_project_permission(current_record.project_id, 'governance.override_gate') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if current_record.lifecycle <> 'Deferred' then
    raise exception using errcode = '55000', message = 'gate_not_deferred';
  end if;

  update public.governance_gates
     set lifecycle = 'Open', deferred_reason = null, deferred_by = null, deferred_at = null,
         updated_at = now(), updated_by = actor, version = version + 1
   where id = target_gate_id and version = expected_record_version
   returning * into changed;
  if changed.id is null then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;

  perform public.record_governance_gate_event(changed, 'GateDeferralReconsidered',
    'governance.gate-deferral-reconsidered.v1', jsonb_build_object('gateType', changed.gate_type, 'reconsideredBy', actor));
  return changed;
end;
$$;

-- Approval is the strictly stronger state: legal from both Open and
-- Deferred, and clears any active deferral -- mirrors decide.ts exactly.
create or replace function public.approve_gate(
  target_gate_id uuid,
  expected_record_version integer
)
returns public.governance_gates
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.governance_gates%rowtype;
  changed public.governance_gates%rowtype;
begin
  select * into current_record from public.governance_gates where id = target_gate_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'gate_not_found';
  end if;
  if actor is null or not public.has_project_permission(
    current_record.project_id, 'governance.approve_gate:' || current_record.gate_type
  ) then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if current_record.lifecycle = 'Approved' then
    raise exception using errcode = '55000', message = 'gate_already_approved';
  end if;

  update public.governance_gates
     set lifecycle = 'Approved', approved_by = actor, approved_at = now(),
         deferred_reason = null, deferred_by = null, deferred_at = null,
         updated_at = now(), updated_by = actor, version = version + 1
   where id = target_gate_id and version = expected_record_version
   returning * into changed;
  if changed.id is null then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;

  perform public.record_governance_gate_event(changed, 'GateApproved', 'governance.gate-approved.v1',
    jsonb_build_object('gateType', changed.gate_type, 'approvedBy', actor));
  return changed;
end;
$$;

revoke all on function
  public.defer_gate(uuid, text, integer),
  public.reconsider_gate_deferral(uuid, integer),
  public.approve_gate(uuid, integer)
from public, anon;

grant execute on function
  public.defer_gate(uuid, text, integer),
  public.reconsider_gate_deferral(uuid, integer),
  public.approve_gate(uuid, integer)
to authenticated;

-- Operator absolute veto: startup_work_owner_admin already holds
-- administration.* and is the bundle the operator holds today, so this
-- grants the override without any new admin-console action for the operator
-- themselves.
insert into public.role_bundle_permissions (bundle_code, permission_code)
values ('startup_work_owner_admin', 'governance.override_gate')
on conflict do nothing;

-- Formal approval authority is a separate, assignable bundle -- reuses the
-- existing grant_role_bundle/revoke_role_bundle RPCs and AdminPanel grant
-- UI unmodified. grant_role_bundle only requires the bundle code to exist
-- in role_bundles (confirmed by reading its body in
-- 20260719006000_administration.sql) -- no check constraint on allowed
-- codes, so seeding this row is sufficient.
insert into public.role_bundles (code, name) values
  ('gate_approver:operational_approval', 'Operational Approval Gate Approver')
on conflict (code) do nothing;

insert into public.role_bundle_permissions (bundle_code, permission_code) values
  ('gate_approver:operational_approval', 'governance.approve_gate:operational_approval')
on conflict do nothing;

-- First concrete gate instance: the "Operational approval is unsigned" P0
-- blocker, one row per existing project, state Open. There is no CreateGate
-- command in the domain module by design (see
-- src/modules/governance-gate/AGENTS.md) -- gate rows are always seeded.
insert into public.governance_gates (organisation_id, project_id, gate_type)
select organisation_id, id, 'operational_approval' from public.tugas_projects
on conflict (project_id, gate_type) do nothing;
