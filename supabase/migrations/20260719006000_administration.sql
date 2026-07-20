-- Administration: capability grants over the existing role_bundle /
-- project_role_assignments tables (BOM 9.1 -- "grants are a row, not a
-- column on the user"), plus system health banner and defect reporting
-- (BOM 12.2 / 12.4). Deliberately excludes WhatsApp/Gmail ingestion admin
-- (wa_groups, bridge_heartbeat, email_accounts, candidate inbox) --
-- 13_V2_DEFERRED_REGISTER.md already places that out of V1 scope. Not yet
-- applied to any shared project.

create table if not exists public.system_status (
  id integer primary key default 1 check (id = 1),
  active boolean not null default false,
  message text,
  updated_by uuid references public.users(id),
  updated_at timestamptz not null default now()
);

insert into public.system_status (id, active, message) values (1, false, null)
on conflict (id) do nothing;

create table if not exists public.defect_reports (
  id uuid primary key default extensions.gen_random_uuid(),
  reported_by uuid not null references public.users(id),
  project_id uuid references public.tugas_projects(id),
  summary text not null check (length(trim(summary)) > 0),
  details text,
  acknowledged boolean not null default false,
  acknowledged_by uuid references public.users(id),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.system_status enable row level security;
alter table public.defect_reports enable row level security;
revoke all on table public.system_status from anon, authenticated;
revoke all on table public.defect_reports from anon, authenticated;
grant select on table public.system_status to authenticated;

drop policy if exists "authenticated reads system status" on public.system_status;
create policy "authenticated reads system status" on public.system_status
  for select to authenticated using (true);

drop policy if exists "reporter reads own defect reports" on public.defect_reports;
create policy "reporter reads own defect reports" on public.defect_reports
  for select to authenticated using (
    reported_by = public.current_identity_id()
    or public.has_project_permission(project_id, 'administration.manage_users')
  );

create or replace function public.grant_role_bundle(
  target_project_id uuid,
  grantee_email text,
  bundle_code text,
  basis text
)
returns public.project_role_assignments
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  target_organisation uuid;
  grantee uuid;
  created public.project_role_assignments%rowtype;
  accepted_event public.domain_events%rowtype;
begin
  if actor is null or not public.has_project_permission(target_project_id, 'administration.manage_roles') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if not exists (select 1 from public.role_bundles where code = bundle_code) then
    raise exception using errcode = '22023', message = 'unknown_bundle';
  end if;
  if length(trim(basis)) = 0 then
    raise exception using errcode = '22023', message = 'basis_required';
  end if;

  select id into grantee from public.users where lower(email) = lower(grantee_email);
  if grantee is null then
    raise exception using errcode = '42501', message = 'grantee_not_eligible';
  end if;
  if not exists (
    select 1 from public.project_memberships
    where project_id = target_project_id and identity_id = grantee and (revoked_at is null or revoked_at > now())
  ) then
    raise exception using errcode = '42501', message = 'grantee_not_project_member';
  end if;

  select organisation_id into target_organisation from public.tugas_projects where id = target_project_id;
  insert into public.project_role_assignments (project_id, organisation_id, identity_id, bundle_code, granted_by, basis)
  values (target_project_id, target_organisation, grantee, bundle_code, actor, trim(basis))
  returning * into created;

  insert into public.domain_events (
    organisation_id, project_id, aggregate_type, aggregate_id, aggregate_version,
    event_type, actor_id, payload
  ) values (
    target_organisation, target_project_id, 'CapabilityGrant', grantee, 1,
    'RoleBundleGranted', actor,
    jsonb_build_object('granteeId', grantee, 'bundleCode', bundle_code, 'basis', trim(basis))
  ) returning * into accepted_event;
  insert into public.outbox_messages (event_id, topic, payload)
  values (accepted_event.id, 'administration.role-bundle-granted.v1', accepted_event.payload);
  return created;
end;
$$;

create or replace function public.revoke_role_bundle(
  target_project_id uuid,
  grantee_email text,
  bundle_code text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  grantee uuid;
  accepted_event public.domain_events%rowtype;
  target_organisation uuid;
begin
  if actor is null or not public.has_project_permission(target_project_id, 'administration.manage_roles') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;

  select id into grantee from public.users where lower(email) = lower(grantee_email);
  if grantee is null then
    raise exception using errcode = '42501', message = 'grantee_not_eligible';
  end if;

  update public.project_role_assignments
     set revoked_at = now()
   where project_id = target_project_id and identity_id = grantee and bundle_code = bundle_code
     and revoked_at is null;

  select organisation_id into target_organisation from public.tugas_projects where id = target_project_id;
  insert into public.domain_events (
    organisation_id, project_id, aggregate_type, aggregate_id, aggregate_version,
    event_type, actor_id, payload
  ) values (
    target_organisation, target_project_id, 'CapabilityGrant', grantee, 1,
    'RoleBundleRevoked', actor, jsonb_build_object('granteeId', grantee, 'bundleCode', bundle_code)
  ) returning * into accepted_event;
  insert into public.outbox_messages (event_id, topic, payload)
  values (accepted_event.id, 'administration.role-bundle-revoked.v1', accepted_event.payload);
end;
$$;

create or replace function public.set_system_status(
  status_active boolean,
  status_message text
)
returns public.system_status
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  changed public.system_status%rowtype;
begin
  -- System-wide, not project-scoped: requires the administration bundle on
  -- any project the actor belongs to. A dedicated org-level check is a
  -- Configuration-module concern for later; this is the documented
  -- simplification for the startup reference slice.
  if actor is null or not exists (
    select 1 from public.project_role_assignments pra
    join public.role_bundle_permissions rbp on rbp.bundle_code = pra.bundle_code
    where pra.identity_id = actor and rbp.permission_code = 'administration.manage_users'
      and (pra.revoked_at is null or pra.revoked_at > now())
  ) then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;

  update public.system_status
     set active = status_active, message = nullif(trim(coalesce(status_message, '')), ''),
         updated_by = actor, updated_at = now()
   where id = 1
   returning * into changed;
  return changed;
end;
$$;

create or replace function public.report_defect(
  target_project_id uuid,
  summary text,
  details text
)
returns public.defect_reports
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  created public.defect_reports%rowtype;
begin
  if actor is null then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if length(trim(summary)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_summary';
  end if;

  insert into public.defect_reports (reported_by, project_id, summary, details)
  values (actor, target_project_id, trim(summary), nullif(trim(coalesce(details, '')), ''))
  returning * into created;
  return created;
end;
$$;

create or replace function public.acknowledge_defect(
  target_defect_report_id uuid
)
returns public.defect_reports
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  report public.defect_reports%rowtype;
  changed public.defect_reports%rowtype;
begin
  select * into report from public.defect_reports where id = target_defect_report_id;
  if report.id is null then
    raise exception using errcode = 'P0002', message = 'defect_report_not_found';
  end if;
  if actor is null or not (
    report.project_id is not null and public.has_project_permission(report.project_id, 'administration.manage_users')
  ) then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;

  update public.defect_reports
     set acknowledged = true, acknowledged_by = actor, acknowledged_at = now()
   where id = target_defect_report_id
   returning * into changed;
  return changed;
end;
$$;

revoke all on function
  public.grant_role_bundle(uuid, text, text, text),
  public.revoke_role_bundle(uuid, text, text),
  public.set_system_status(boolean, text),
  public.report_defect(uuid, text, text),
  public.acknowledge_defect(uuid)
from public, anon;

grant execute on function
  public.grant_role_bundle(uuid, text, text, text),
  public.revoke_role_bundle(uuid, text, text),
  public.set_system_status(boolean, text),
  public.report_defect(uuid, text, text),
  public.acknowledge_defect(uuid)
to authenticated;
