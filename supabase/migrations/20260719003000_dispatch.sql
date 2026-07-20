-- Dispatch module: one custody journey per Dispatch Attempt. Mirrors
-- src/modules/dispatch/domain exactly. Not yet applied to any shared project.

create table if not exists public.dispatch_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  submission_id uuid not null references public.submissions(id),
  organisation_id uuid not null references public.organisations(id),
  project_id uuid not null references public.tugas_projects(id),
  destination text not null check (length(trim(destination)) > 0),
  recipient_contact text not null check (length(trim(recipient_contact)) > 0),
  package_summary text not null check (length(trim(package_summary)) > 0),
  status text not null check (
    status in ('Prepared', 'Assigned', 'InTransit', 'Delivered', 'Failed', 'Cancelled')
  ) default 'Prepared',
  custodian_type text check (custodian_type in ('internal', 'external')),
  custodian_actor_id uuid references public.users(id),
  custodian_name text,
  delivered_to text,
  failure_reason text,
  replaces_dispatch_attempt_id uuid references public.dispatch_attempts(id),
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references public.users(id),
  version integer not null default 1 check (version > 0)
);

alter table public.dispatch_attempts enable row level security;
revoke all on table public.dispatch_attempts from anon, authenticated;
grant select on table public.dispatch_attempts to authenticated;

drop policy if exists "member reads dispatch attempts" on public.dispatch_attempts;
create policy "member reads dispatch attempts" on public.dispatch_attempts
  for select to authenticated using (public.is_active_project_member(project_id));

insert into public.permissions (code) values
  ('dispatch.create'), ('dispatch.assign'), ('dispatch.report_collection'),
  ('dispatch.report_delivery'), ('dispatch.report_failure'), ('dispatch.create_replacement')
on conflict do nothing;

create or replace function public.record_dispatch_event(
  changed public.dispatch_attempts,
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
    changed.organisation_id, changed.project_id, 'DispatchAttempt', changed.id, changed.version,
    event_type, actor, payload
  ) returning * into accepted_event;
  insert into public.outbox_messages (event_id, topic, payload)
  values (accepted_event.id, topic, accepted_event.payload);
end;
$$;

revoke all on function public.record_dispatch_event(public.dispatch_attempts, text, text, jsonb)
  from public, anon, authenticated;

create or replace function public.create_dispatch_attempt(
  target_submission_id uuid,
  destination text,
  recipient_contact text,
  package_summary text,
  replaces_dispatch_attempt_id uuid
)
returns public.dispatch_attempts
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  submission public.submissions%rowtype;
  created public.dispatch_attempts%rowtype;
begin
  select * into submission from public.submissions where id = target_submission_id;
  if submission.id is null then
    raise exception using errcode = 'P0002', message = 'submission_not_found';
  end if;
  if actor is null or not public.has_project_permission(
    submission.project_id, case when replaces_dispatch_attempt_id is null then 'dispatch.create' else 'dispatch.create_replacement' end
  ) then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if submission.status <> 'ReadyForDispatch' then
    raise exception using errcode = '55000', message = 'submission_not_ready_for_dispatch';
  end if;
  if length(trim(destination)) = 0 or length(trim(recipient_contact)) = 0 or length(trim(package_summary)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_dispatch_facts';
  end if;

  insert into public.dispatch_attempts (
    submission_id, organisation_id, project_id, destination, recipient_contact, package_summary,
    replaces_dispatch_attempt_id, created_by, updated_by
  ) values (
    target_submission_id, submission.organisation_id, submission.project_id, trim(destination),
    trim(recipient_contact), trim(package_summary), replaces_dispatch_attempt_id, actor, actor
  ) returning * into created;

  perform public.record_dispatch_event(
    created,
    case when replaces_dispatch_attempt_id is null then 'DispatchAttemptCreated' else 'ReplacementDispatchCreated' end,
    'dispatch.created.v1',
    jsonb_build_object('submissionId', target_submission_id, 'replacesDispatchAttemptId', replaces_dispatch_attempt_id)
  );
  return created;
end;
$$;

create or replace function public.assign_dispatch(
  target_dispatch_attempt_id uuid,
  custodian_type text,
  custodian_email text,
  custodian_name text,
  expected_record_version integer
)
returns public.dispatch_attempts
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.dispatch_attempts%rowtype;
  custodian_actor uuid;
  changed public.dispatch_attempts%rowtype;
begin
  select * into current_record from public.dispatch_attempts where id = target_dispatch_attempt_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'dispatch_not_found';
  end if;
  if actor is null or not public.has_project_permission(current_record.project_id, 'dispatch.assign') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if current_record.status <> 'Prepared' then
    raise exception using errcode = '55000', message = 'dispatch_not_prepared';
  end if;
  if custodian_type not in ('internal', 'external') or length(trim(custodian_name)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_custodian';
  end if;
  if custodian_type = 'internal' then
    select id into custodian_actor from public.users where lower(email) = lower(custodian_email);
    if custodian_actor is null then
      raise exception using errcode = '22023', message = 'invalid_custodian';
    end if;
  end if;

  update public.dispatch_attempts
     set status = 'Assigned', custodian_type = custodian_type, custodian_actor_id = custodian_actor,
         custodian_name = trim(custodian_name), updated_at = now(), updated_by = actor, version = version + 1
   where id = target_dispatch_attempt_id and version = expected_record_version
   returning * into changed;
  if changed.id is null then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;

  perform public.record_dispatch_event(changed, 'DispatchAssigned', 'dispatch.assigned.v1',
    jsonb_build_object('custodianType', custodian_type, 'custodianName', changed.custodian_name));
  return changed;
end;
$$;

create or replace function public.confirm_package_collection(
  target_dispatch_attempt_id uuid,
  expected_record_version integer
)
returns public.dispatch_attempts
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.dispatch_attempts%rowtype;
  changed public.dispatch_attempts%rowtype;
begin
  select * into current_record from public.dispatch_attempts where id = target_dispatch_attempt_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'dispatch_not_found';
  end if;
  if actor is null or not public.has_project_permission(current_record.project_id, 'dispatch.report_collection') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if current_record.status <> 'Assigned' then
    raise exception using errcode = '55000', message = 'dispatch_not_assigned';
  end if;

  update public.dispatch_attempts
     set status = 'InTransit', updated_at = now(), updated_by = actor, version = version + 1
   where id = target_dispatch_attempt_id and version = expected_record_version
   returning * into changed;

  perform public.record_dispatch_event(changed, 'PackageCollected', 'dispatch.package-collected.v1',
    jsonb_build_object('confirmedBy', actor));
  return changed;
end;
$$;

create or replace function public.report_package_delivery(
  target_dispatch_attempt_id uuid,
  delivered_to text,
  expected_record_version integer
)
returns public.dispatch_attempts
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.dispatch_attempts%rowtype;
  changed public.dispatch_attempts%rowtype;
begin
  select * into current_record from public.dispatch_attempts where id = target_dispatch_attempt_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'dispatch_not_found';
  end if;
  if actor is null or not public.has_project_permission(current_record.project_id, 'dispatch.report_delivery') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if current_record.status <> 'InTransit' then
    raise exception using errcode = '55000', message = 'dispatch_not_in_transit';
  end if;
  if length(trim(delivered_to)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_delivered_to';
  end if;

  update public.dispatch_attempts
     set status = 'Delivered', delivered_to = trim(delivered_to), updated_at = now(), updated_by = actor, version = version + 1
   where id = target_dispatch_attempt_id and version = expected_record_version
   returning * into changed;

  perform public.record_dispatch_event(changed, 'PackageDelivered', 'dispatch.package-delivered.v1',
    jsonb_build_object('reportedBy', actor, 'deliveredTo', changed.delivered_to));
  return changed;
end;
$$;

create or replace function public.report_delivery_failure(
  target_dispatch_attempt_id uuid,
  reason text,
  expected_record_version integer
)
returns public.dispatch_attempts
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.dispatch_attempts%rowtype;
  changed public.dispatch_attempts%rowtype;
begin
  select * into current_record from public.dispatch_attempts where id = target_dispatch_attempt_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'dispatch_not_found';
  end if;
  if actor is null or not public.has_project_permission(current_record.project_id, 'dispatch.report_failure') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if current_record.status not in ('Assigned', 'InTransit') then
    raise exception using errcode = '55000', message = 'dispatch_not_failable';
  end if;
  if length(trim(reason)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_reason';
  end if;

  update public.dispatch_attempts
     set status = 'Failed', failure_reason = trim(reason), updated_at = now(), updated_by = actor, version = version + 1
   where id = target_dispatch_attempt_id and version = expected_record_version
   returning * into changed;

  perform public.record_dispatch_event(changed, 'DeliveryFailed', 'dispatch.delivery-failed.v1',
    jsonb_build_object('reportedBy', actor, 'reason', changed.failure_reason));
  return changed;
end;
$$;

create or replace function public.cancel_dispatch_attempt(
  target_dispatch_attempt_id uuid,
  reason text,
  expected_record_version integer
)
returns public.dispatch_attempts
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.dispatch_attempts%rowtype;
  changed public.dispatch_attempts%rowtype;
begin
  select * into current_record from public.dispatch_attempts where id = target_dispatch_attempt_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'dispatch_not_found';
  end if;
  if actor is null or not public.has_project_permission(current_record.project_id, 'dispatch.create') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if current_record.status not in ('Prepared', 'Assigned') then
    raise exception using errcode = '55000', message = 'dispatch_not_cancellable';
  end if;
  if length(trim(reason)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_reason';
  end if;

  update public.dispatch_attempts
     set status = 'Cancelled', updated_at = now(), updated_by = actor, version = version + 1
   where id = target_dispatch_attempt_id and version = expected_record_version
   returning * into changed;

  perform public.record_dispatch_event(changed, 'DispatchCancelled', 'dispatch.cancelled.v1',
    jsonb_build_object('cancelledBy', actor, 'reason', trim(reason)));
  return changed;
end;
$$;

revoke all on function
  public.create_dispatch_attempt(uuid, text, text, text, uuid),
  public.assign_dispatch(uuid, text, text, text, integer),
  public.confirm_package_collection(uuid, integer),
  public.report_package_delivery(uuid, text, integer),
  public.report_delivery_failure(uuid, text, integer),
  public.cancel_dispatch_attempt(uuid, text, integer)
from public, anon;

grant execute on function
  public.create_dispatch_attempt(uuid, text, text, text, uuid),
  public.assign_dispatch(uuid, text, text, text, integer),
  public.confirm_package_collection(uuid, integer),
  public.report_package_delivery(uuid, text, integer),
  public.report_delivery_failure(uuid, text, integer),
  public.cancel_dispatch_attempt(uuid, text, integer)
to authenticated;

insert into public.role_bundle_permissions (bundle_code, permission_code)
select 'startup_work_owner_admin', code
from public.permissions
where code in (
  'dispatch.create', 'dispatch.assign', 'dispatch.report_collection',
  'dispatch.report_delivery', 'dispatch.report_failure', 'dispatch.create_replacement'
)
on conflict do nothing;
