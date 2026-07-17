-- DPIK TUGAS canonical non-production startup reference slice.
-- Authority fixtures are proposed defaults and are not production approval.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.organisations (
  id uuid primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key default extensions.gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.organisation_memberships (
  organisation_id uuid not null references public.organisations(id),
  identity_id uuid not null references public.users(id),
  active_from timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (organisation_id, identity_id)
);

-- `public.projects` is a retained legacy bigint table. The UUID canonical Project table
-- is isolated during transition and will take the canonical name only at legacy retirement.
create table if not exists public.tugas_projects (
  id uuid primary key,
  organisation_id uuid not null references public.organisations(id),
  code text not null,
  name text not null,
  created_at timestamptz not null default now(),
  unique (organisation_id, code)
);

create table if not exists public.project_memberships (
  project_id uuid not null references public.tugas_projects(id),
  organisation_id uuid not null references public.organisations(id),
  identity_id uuid not null references public.users(id),
  active_from timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (project_id, identity_id)
);

create table if not exists public.permissions (
  code text primary key
);

create table if not exists public.role_bundles (
  code text primary key,
  name text not null,
  proposed_default boolean not null default true,
  production_approved boolean not null default false
);

create table if not exists public.role_bundle_permissions (
  bundle_code text not null references public.role_bundles(code),
  permission_code text not null references public.permissions(code),
  primary key (bundle_code, permission_code)
);

create table if not exists public.project_role_assignments (
  project_id uuid not null references public.tugas_projects(id),
  organisation_id uuid not null references public.organisations(id),
  identity_id uuid not null references public.users(id),
  bundle_code text not null references public.role_bundles(code),
  granted_by uuid references public.users(id),
  granted_at timestamptz not null default now(),
  basis text not null,
  revoked_at timestamptz,
  primary key (project_id, identity_id, bundle_code, granted_at)
);

create table if not exists public.work_threads (
  id uuid primary key default extensions.gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  project_id uuid not null references public.tugas_projects(id),
  title text not null check (length(trim(title)) > 0),
  expected_outcome text not null check (length(trim(expected_outcome)) > 0),
  source_reference text not null check (length(trim(source_reference)) > 0),
  lifecycle text not null check (
    lifecycle in ('Unassigned', 'AwaitingAcknowledgement', 'Assigned')
  ),
  current_assignee_id uuid references public.users(id),
  assigned_by uuid references public.users(id),
  assigned_at timestamptz,
  due_at timestamptz,
  assignment_reason text,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid not null references public.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references public.users(id),
  version integer not null default 1 check (version > 0)
);

create table if not exists public.domain_events (
  id uuid primary key default extensions.gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  project_id uuid not null references public.tugas_projects(id),
  aggregate_type text not null,
  aggregate_id uuid not null,
  aggregate_version integer not null,
  event_type text not null,
  actor_id uuid not null references public.users(id),
  occurred_at timestamptz not null default now(),
  payload jsonb not null,
  unique (aggregate_type, aggregate_id, aggregate_version)
);

create table if not exists public.outbox_messages (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null unique references public.domain_events(id),
  topic text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  attempt_count integer not null default 0
);

alter table public.organisations enable row level security;
alter table public.users enable row level security;
alter table public.organisation_memberships enable row level security;
alter table public.tugas_projects enable row level security;
alter table public.project_memberships enable row level security;
alter table public.permissions enable row level security;
alter table public.role_bundles enable row level security;
alter table public.role_bundle_permissions enable row level security;
alter table public.project_role_assignments enable row level security;
alter table public.work_threads enable row level security;
alter table public.domain_events enable row level security;
alter table public.outbox_messages enable row level security;

revoke all on table public.organisations from anon, authenticated;
revoke all on table public.users from anon, authenticated;
revoke all on table public.organisation_memberships from anon, authenticated;
revoke all on table public.tugas_projects from anon, authenticated;
revoke all on table public.project_memberships from anon, authenticated;
revoke all on table public.permissions from anon, authenticated;
revoke all on table public.role_bundles from anon, authenticated;
revoke all on table public.role_bundle_permissions from anon, authenticated;
revoke all on table public.project_role_assignments from anon, authenticated;
revoke all on table public.work_threads from anon, authenticated;
revoke all on table public.domain_events from anon, authenticated;
revoke all on table public.outbox_messages from anon, authenticated;
grant select on table public.organisations, public.users, public.tugas_projects,
  public.work_threads, public.domain_events to authenticated;

create or replace function public.current_identity_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select id from public.users where auth_user_id = auth.uid() limit 1
$$;

create or replace function public.is_active_project_member(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.project_memberships pm
    join public.organisation_memberships om
      on om.organisation_id = pm.organisation_id
     and om.identity_id = pm.identity_id
    where pm.project_id = target_project_id
      and pm.identity_id = public.current_identity_id()
      and pm.active_from <= now()
      and (pm.revoked_at is null or pm.revoked_at > now())
      and om.active_from <= now()
      and (om.revoked_at is null or om.revoked_at > now())
  )
$$;

create or replace function public.has_project_permission(
  target_project_id uuid,
  target_permission text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.is_active_project_member(target_project_id) and exists (
    select 1
    from public.project_role_assignments pra
    join public.role_bundle_permissions rbp on rbp.bundle_code = pra.bundle_code
    where pra.project_id = target_project_id
      and pra.identity_id = public.current_identity_id()
      and pra.granted_at <= now()
      and (pra.revoked_at is null or pra.revoked_at > now())
      and rbp.permission_code = target_permission
  )
$$;

revoke all on function public.current_identity_id() from public, anon, authenticated;
revoke all on function public.is_active_project_member(uuid) from public, anon, authenticated;
revoke all on function public.has_project_permission(uuid, text) from public, anon, authenticated;
grant execute on function public.current_identity_id() to authenticated;
grant execute on function public.is_active_project_member(uuid) to authenticated;

drop policy if exists "member reads organisation" on public.organisations;
create policy "member reads organisation" on public.organisations
  for select to authenticated
  using (
    exists (
      select 1 from public.organisation_memberships om
      where om.organisation_id = organisations.id
        and om.identity_id = public.current_identity_id()
        and om.active_from <= now()
        and (om.revoked_at is null or om.revoked_at > now())
    )
  );

drop policy if exists "identity reads self" on public.users;
create policy "identity reads self" on public.users
  for select to authenticated using (id = public.current_identity_id());

drop policy if exists "member reads projects" on public.tugas_projects;
create policy "member reads projects" on public.tugas_projects
  for select to authenticated using (public.is_active_project_member(id));

drop policy if exists "member reads work threads" on public.work_threads;
create policy "member reads work threads" on public.work_threads
  for select to authenticated using (public.is_active_project_member(project_id));

drop policy if exists "member reads domain events" on public.domain_events;
create policy "member reads domain events" on public.domain_events
  for select to authenticated using (public.is_active_project_member(project_id));

create or replace function public.attach_authenticated_identity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.users
     set auth_user_id = new.id
   where lower(email) = lower(new.email)
     and (auth_user_id is null or auth_user_id = new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_attached_to_tugas on auth.users;
create trigger on_auth_user_attached_to_tugas
after insert or update of email on auth.users
for each row execute function public.attach_authenticated_identity();

revoke all on function public.attach_authenticated_identity() from public, anon, authenticated;

create or replace function public.startup_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  identity public.users%rowtype;
  result jsonb;
begin
  select * into identity from public.users where auth_user_id = auth.uid();
  if identity.id is null then
    raise exception using errcode = '42501', message = 'startup_access_denied';
  end if;

  select jsonb_build_object(
    'identity', jsonb_build_object('id', identity.id, 'email', identity.email),
    'projects', coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id,
      'code', p.code,
      'name', p.name,
      'organisationId', p.organisation_id,
      'organisationName', o.name,
      'permissions', (
        select coalesce(jsonb_agg(distinct rbp.permission_code), '[]'::jsonb)
        from public.project_role_assignments pra
        join public.role_bundle_permissions rbp on rbp.bundle_code = pra.bundle_code
        where pra.project_id = p.id
          and pra.identity_id = identity.id
          and (pra.revoked_at is null or pra.revoked_at > now())
      )
    )), '[]'::jsonb)
  ) into result
  from public.project_memberships pm
  join public.tugas_projects p on p.id = pm.project_id
  join public.organisations o on o.id = pm.organisation_id
  where pm.identity_id = identity.id
    and (pm.revoked_at is null or pm.revoked_at > now());

  return result;
end;
$$;

create or replace function public.create_work_thread(
  target_project_id uuid,
  work_title text,
  work_expected_outcome text,
  work_source_reference text
)
returns public.work_threads
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  target_organisation uuid;
  created public.work_threads%rowtype;
  accepted_event public.domain_events%rowtype;
begin
  if actor is null or not public.has_project_permission(target_project_id, 'work.create') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if length(trim(work_title)) = 0 or length(trim(work_expected_outcome)) = 0
     or length(trim(work_source_reference)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_work_thread_facts';
  end if;

  select organisation_id into target_organisation
  from public.tugas_projects where id = target_project_id;
  insert into public.work_threads (
    organisation_id, project_id, title, expected_outcome, source_reference,
    lifecycle, created_by, updated_by
  ) values (
    target_organisation, target_project_id, trim(work_title), trim(work_expected_outcome),
    trim(work_source_reference), 'Unassigned', actor, actor
  ) returning * into created;

  insert into public.domain_events (
    organisation_id, project_id, aggregate_type, aggregate_id, aggregate_version,
    event_type, actor_id, payload
  ) values (
    created.organisation_id, created.project_id, 'WorkThread', created.id, created.version,
    'WorkThreadCreated', actor, jsonb_build_object(
      'title', created.title,
      'expectedOutcome', created.expected_outcome,
      'sourceReference', created.source_reference
    )
  ) returning * into accepted_event;

  insert into public.outbox_messages (event_id, topic, payload)
  values (accepted_event.id, 'work-thread.created.v1', accepted_event.payload);
  return created;
end;
$$;

create or replace function public.assign_work(
  target_work_thread_id uuid,
  assignee_email text,
  commitment_due_at timestamptz,
  work_assignment_reason text,
  expected_record_version integer
)
returns public.work_threads
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  assignee uuid;
  current_record public.work_threads%rowtype;
  changed public.work_threads%rowtype;
  accepted_event public.domain_events%rowtype;
begin
  select * into current_record from public.work_threads where id = target_work_thread_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'work_thread_not_found';
  end if;
  if actor is null or not public.has_project_permission(current_record.project_id, 'work.assign') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if current_record.lifecycle <> 'Unassigned' then
    raise exception using errcode = '55000', message = 'work_thread_not_unassigned';
  end if;
  if commitment_due_at <= now() or length(trim(work_assignment_reason)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_assignment';
  end if;

  select u.id into assignee
  from public.users u
  join public.project_memberships pm on pm.identity_id = u.id
  where lower(u.email) = lower(assignee_email)
    and pm.project_id = current_record.project_id
    and (pm.revoked_at is null or pm.revoked_at > now());
  if assignee is null then
    raise exception using errcode = '42501', message = 'assignee_not_eligible';
  end if;

  update public.work_threads
     set lifecycle = 'AwaitingAcknowledgement', current_assignee_id = assignee,
         assigned_by = actor, assigned_at = now(), due_at = commitment_due_at,
         assignment_reason = trim(work_assignment_reason), updated_at = now(),
         updated_by = actor, version = version + 1
   where id = target_work_thread_id and version = expected_record_version
   returning * into changed;
  if changed.id is null then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;

  insert into public.domain_events (
    organisation_id, project_id, aggregate_type, aggregate_id, aggregate_version,
    event_type, actor_id, payload
  ) values (
    changed.organisation_id, changed.project_id, 'WorkThread', changed.id, changed.version,
    'WorkAssigned', actor, jsonb_build_object(
      'assigneeId', assignee, 'assignedBy', actor, 'dueAt', commitment_due_at,
      'reason', changed.assignment_reason
    )
  ) returning * into accepted_event;
  insert into public.outbox_messages (event_id, topic, payload)
  values (accepted_event.id, 'work-thread.assigned.v1', accepted_event.payload);
  return changed;
end;
$$;

create or replace function public.acknowledge_assignment(
  target_work_thread_id uuid,
  expected_record_version integer
)
returns public.work_threads
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.work_threads%rowtype;
  changed public.work_threads%rowtype;
  accepted_event public.domain_events%rowtype;
begin
  select * into current_record from public.work_threads where id = target_work_thread_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'work_thread_not_found';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if current_record.lifecycle <> 'AwaitingAcknowledgement' then
    raise exception using errcode = '55000', message = 'assignment_not_awaiting_acknowledgement';
  end if;
  if actor is null or current_record.current_assignee_id <> actor then
    raise exception using errcode = '42501', message = 'actor_not_current_assignee';
  end if;

  update public.work_threads
     set lifecycle = 'Assigned', acknowledged_at = now(), updated_at = now(),
         updated_by = actor, version = version + 1
   where id = target_work_thread_id and version = expected_record_version
   returning * into changed;
  if changed.id is null then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;

  insert into public.domain_events (
    organisation_id, project_id, aggregate_type, aggregate_id, aggregate_version,
    event_type, actor_id, payload
  ) values (
    changed.organisation_id, changed.project_id, 'WorkThread', changed.id, changed.version,
    'AssignmentAcknowledged', actor, jsonb_build_object('acknowledgedBy', actor)
  ) returning * into accepted_event;
  insert into public.outbox_messages (event_id, topic, payload)
  values (accepted_event.id, 'work-thread.assignment-acknowledged.v1', accepted_event.payload);
  return changed;
end;
$$;

revoke all on function public.startup_context() from public, anon;
revoke all on function public.create_work_thread(uuid, text, text, text) from public, anon;
revoke all on function public.assign_work(uuid, text, timestamptz, text, integer) from public, anon;
revoke all on function public.acknowledge_assignment(uuid, integer) from public, anon;
grant execute on function public.startup_context() to authenticated;
grant execute on function public.create_work_thread(uuid, text, text, text) to authenticated;
grant execute on function public.assign_work(uuid, text, timestamptz, text, integer) to authenticated;
grant execute on function public.acknowledge_assignment(uuid, integer) to authenticated;

insert into public.organisations (id, name)
values ('10000000-0000-4000-8000-000000000001', 'DPI Konsult Sdn Bhd')
on conflict (id) do update set name = excluded.name;

insert into public.tugas_projects (id, organisation_id, code, name)
values (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'DPIK-TUGAS',
  'DPIK Tugas'
)
on conflict (id) do update set name = excluded.name, code = excluded.code;

insert into public.users (id, email, display_name) values
  ('30000000-0000-4000-8000-000000000001', 'rahman@dpik.com.my', 'Rahman'),
  ('30000000-0000-4000-8000-000000000002', 'smoque@gmail.com', 'Smoque')
on conflict (email) do update set display_name = excluded.display_name;

update public.users u
set auth_user_id = au.id
from auth.users au
where lower(u.email) = lower(au.email)
  and (u.auth_user_id is null or u.auth_user_id = au.id);

insert into public.organisation_memberships (organisation_id, identity_id)
select '10000000-0000-4000-8000-000000000001', id
from public.users where email in ('rahman@dpik.com.my', 'smoque@gmail.com')
on conflict do nothing;

insert into public.project_memberships (project_id, organisation_id, identity_id)
select
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  id
from public.users where email in ('rahman@dpik.com.my', 'smoque@gmail.com')
on conflict do nothing;

insert into public.permissions (code) values
  ('work.create'), ('work.assign'), ('work.acknowledge'),
  ('administration.manage_users'), ('administration.manage_memberships'),
  ('administration.manage_roles')
on conflict do nothing;

insert into public.role_bundles (code, name) values
  ('startup_work_owner_admin', 'Startup Work Owner + Administration'),
  ('startup_assignee', 'Startup Assignee')
on conflict (code) do nothing;

insert into public.role_bundle_permissions (bundle_code, permission_code) values
  ('startup_work_owner_admin', 'work.create'),
  ('startup_work_owner_admin', 'work.assign'),
  ('startup_work_owner_admin', 'administration.manage_users'),
  ('startup_work_owner_admin', 'administration.manage_memberships'),
  ('startup_work_owner_admin', 'administration.manage_roles'),
  ('startup_assignee', 'work.acknowledge')
on conflict do nothing;

insert into public.project_role_assignments (
  project_id, organisation_id, identity_id, bundle_code, granted_by, basis
)
select
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  owner.id, 'startup_work_owner_admin', owner.id,
  'Operator-provided non-production startup fixture; not production approved'
from public.users owner where owner.email = 'rahman@dpik.com.my'
and not exists (
  select 1 from public.project_role_assignments pra
  where pra.project_id = '20000000-0000-4000-8000-000000000001'
    and pra.identity_id = owner.id and pra.bundle_code = 'startup_work_owner_admin'
);

insert into public.project_role_assignments (
  project_id, organisation_id, identity_id, bundle_code, granted_by, basis
)
select
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  assignee.id, 'startup_assignee', owner.id,
  'Operator-provided non-production startup fixture; not production approved'
from public.users assignee
cross join public.users owner
where assignee.email = 'smoque@gmail.com' and owner.email = 'rahman@dpik.com.my'
and not exists (
  select 1 from public.project_role_assignments pra
  where pra.project_id = '20000000-0000-4000-8000-000000000001'
    and pra.identity_id = assignee.id and pra.bundle_code = 'startup_assignee'
);
