-- Deliverable module: exact revision identity, internal review, self-approval
-- exception. Mirrors src/modules/deliverable/domain exactly. Not yet applied
-- to any shared project.

create table if not exists public.deliverables (
  id uuid primary key default extensions.gen_random_uuid(),
  work_thread_id uuid not null references public.work_threads(id),
  organisation_id uuid not null references public.organisations(id),
  project_id uuid not null references public.tugas_projects(id),
  title text not null check (length(trim(title)) > 0),
  status text not null check (
    status in ('Draft', 'InReview', 'RevisionRequired', 'Approved', 'Rejected', 'Withdrawn')
  ) default 'Draft',
  current_revision_id uuid,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references public.users(id),
  version integer not null default 1 check (version > 0)
);

create table if not exists public.deliverable_revisions (
  id uuid primary key default extensions.gen_random_uuid(),
  deliverable_id uuid not null references public.deliverables(id),
  sequence integer not null check (sequence > 0),
  label text not null check (length(trim(label)) > 0),
  repository_reference text not null check (length(trim(repository_reference)) > 0),
  change_summary text not null check (length(trim(change_summary)) > 0),
  fingerprint text,
  prepared_by uuid not null references public.users(id),
  prepared_at timestamptz not null,
  superseded_by uuid references public.deliverable_revisions(id),
  created_at timestamptz not null default now(),
  unique (deliverable_id, sequence)
);

alter table public.deliverables add constraint deliverables_current_revision_fkey
  foreign key (current_revision_id) references public.deliverable_revisions(id);

alter table public.deliverables enable row level security;
alter table public.deliverable_revisions enable row level security;
revoke all on table public.deliverables from anon, authenticated;
revoke all on table public.deliverable_revisions from anon, authenticated;
grant select on table public.deliverables, public.deliverable_revisions to authenticated;

drop policy if exists "member reads deliverables" on public.deliverables;
create policy "member reads deliverables" on public.deliverables
  for select to authenticated using (public.is_active_project_member(project_id));

drop policy if exists "member reads deliverable revisions" on public.deliverable_revisions;
create policy "member reads deliverable revisions" on public.deliverable_revisions
  for select to authenticated using (
    exists (
      select 1 from public.deliverables d
      where d.id = deliverable_revisions.deliverable_id
        and public.is_active_project_member(d.project_id)
    )
  );

insert into public.permissions (code) values
  ('deliverable.create'), ('deliverable.submit'), ('deliverable.review'),
  ('deliverable.approve'), ('deliverable.reject')
on conflict do nothing;

create or replace function public.create_deliverable(
  target_work_thread_id uuid,
  deliverable_title text
)
returns public.deliverables
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  work_thread public.work_threads%rowtype;
  created public.deliverables%rowtype;
  accepted_event public.domain_events%rowtype;
begin
  select * into work_thread from public.work_threads where id = target_work_thread_id;
  if work_thread.id is null then
    raise exception using errcode = 'P0002', message = 'work_thread_not_found';
  end if;
  if actor is null or not public.has_project_permission(work_thread.project_id, 'deliverable.create') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if length(trim(deliverable_title)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_title';
  end if;

  insert into public.deliverables (
    work_thread_id, organisation_id, project_id, title, created_by, updated_by
  ) values (
    target_work_thread_id, work_thread.organisation_id, work_thread.project_id,
    trim(deliverable_title), actor, actor
  ) returning * into created;

  insert into public.domain_events (
    organisation_id, project_id, aggregate_type, aggregate_id, aggregate_version,
    event_type, actor_id, payload
  ) values (
    created.organisation_id, created.project_id, 'Deliverable', created.id, created.version,
    'DeliverableCreated', actor, jsonb_build_object('title', created.title, 'workThreadId', target_work_thread_id)
  ) returning * into accepted_event;
  insert into public.outbox_messages (event_id, topic, payload)
  values (accepted_event.id, 'deliverable.created.v1', accepted_event.payload);
  return created;
end;
$$;

create or replace function public.submit_revision(
  target_deliverable_id uuid,
  revision_label text,
  revision_repository_reference text,
  revision_change_summary text,
  revision_fingerprint text,
  expected_record_version integer
)
returns public.deliverables
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.deliverables%rowtype;
  next_sequence integer;
  new_revision public.deliverable_revisions%rowtype;
  changed public.deliverables%rowtype;
  accepted_event public.domain_events%rowtype;
begin
  select * into current_record from public.deliverables where id = target_deliverable_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'deliverable_not_found';
  end if;
  if actor is null or not public.has_project_permission(current_record.project_id, 'deliverable.submit') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if current_record.status not in ('Draft', 'RevisionRequired') then
    raise exception using errcode = '55000', message = 'deliverable_not_open_for_submission';
  end if;
  if length(trim(revision_label)) = 0 or length(trim(revision_repository_reference)) = 0
     or length(trim(revision_change_summary)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_revision_facts';
  end if;

  select coalesce(max(sequence), 0) + 1 into next_sequence
  from public.deliverable_revisions where deliverable_id = target_deliverable_id;

  insert into public.deliverable_revisions (
    deliverable_id, sequence, label, repository_reference, change_summary,
    fingerprint, prepared_by, prepared_at
  ) values (
    target_deliverable_id, next_sequence, trim(revision_label), trim(revision_repository_reference),
    trim(revision_change_summary), nullif(trim(coalesce(revision_fingerprint, '')), ''), actor, now()
  ) returning * into new_revision;

  if current_record.current_revision_id is not null then
    update public.deliverable_revisions set superseded_by = new_revision.id
    where id = current_record.current_revision_id;
  end if;

  update public.deliverables
     set status = 'InReview', current_revision_id = new_revision.id,
         updated_at = now(), updated_by = actor, version = version + 1
   where id = target_deliverable_id and version = expected_record_version
   returning * into changed;
  if changed.id is null then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;

  insert into public.domain_events (
    organisation_id, project_id, aggregate_type, aggregate_id, aggregate_version,
    event_type, actor_id, payload
  ) values (
    changed.organisation_id, changed.project_id, 'Deliverable', changed.id, changed.version,
    'RevisionSubmitted', actor, jsonb_build_object(
      'revisionId', new_revision.id, 'sequence', new_revision.sequence, 'label', new_revision.label,
      'preparedBy', actor
    )
  ) returning * into accepted_event;
  insert into public.outbox_messages (event_id, topic, payload)
  values (accepted_event.id, 'deliverable.revision-submitted.v1', accepted_event.payload);
  return changed;
end;
$$;

-- outcome: 'approved' | 'revision_required' | 'rejected'
create or replace function public.review_revision(
  target_deliverable_id uuid,
  outcome text,
  comments text,
  self_approved boolean,
  expected_record_version integer
)
returns public.deliverables
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.deliverables%rowtype;
  current_revision public.deliverable_revisions%rowtype;
  required_permission text;
  new_status text;
  event_type text;
  changed public.deliverables%rowtype;
  accepted_event public.domain_events%rowtype;
begin
  select * into current_record from public.deliverables where id = target_deliverable_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'deliverable_not_found';
  end if;
  if outcome not in ('approved', 'revision_required', 'rejected') then
    raise exception using errcode = '22023', message = 'invalid_outcome';
  end if;
  required_permission := case outcome
    when 'approved' then 'deliverable.approve'
    when 'rejected' then 'deliverable.reject'
    else 'deliverable.review'
  end;
  if actor is null or not public.has_project_permission(current_record.project_id, required_permission) then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if current_record.status <> 'InReview' then
    raise exception using errcode = '55000', message = 'deliverable_not_in_review';
  end if;
  if current_record.current_revision_id is null then
    raise exception using errcode = '55000', message = 'no_current_revision';
  end if;
  if length(trim(comments)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_review_comments';
  end if;

  select * into current_revision from public.deliverable_revisions where id = current_record.current_revision_id;
  if current_revision.prepared_by = actor and not coalesce(self_approved, false) then
    raise exception using errcode = '42501', message = 'actor_is_preparer_without_self_approval_flag';
  end if;

  new_status := case outcome
    when 'approved' then 'Approved'
    when 'rejected' then 'Rejected'
    else 'RevisionRequired'
  end;
  event_type := case outcome
    when 'approved' then 'RevisionApproved'
    when 'rejected' then 'RevisionRejected'
    else 'RevisionRequired'
  end;

  update public.deliverables
     set status = new_status, updated_at = now(), updated_by = actor, version = version + 1
   where id = target_deliverable_id and version = expected_record_version
   returning * into changed;
  if changed.id is null then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;

  insert into public.domain_events (
    organisation_id, project_id, aggregate_type, aggregate_id, aggregate_version,
    event_type, actor_id, payload
  ) values (
    changed.organisation_id, changed.project_id, 'Deliverable', changed.id, changed.version,
    event_type, actor, jsonb_build_object(
      'revisionId', current_revision.id, 'decidedBy', actor, 'comments', trim(comments),
      'selfApproved', coalesce(self_approved, false)
    )
  ) returning * into accepted_event;
  insert into public.outbox_messages (event_id, topic, payload)
  values (accepted_event.id, 'deliverable.revision-reviewed.v1', accepted_event.payload);
  return changed;
end;
$$;

create or replace function public.withdraw_deliverable(
  target_deliverable_id uuid,
  reason text,
  expected_record_version integer
)
returns public.deliverables
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.deliverables%rowtype;
  changed public.deliverables%rowtype;
  accepted_event public.domain_events%rowtype;
begin
  select * into current_record from public.deliverables where id = target_deliverable_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'deliverable_not_found';
  end if;
  if actor is null or not public.has_project_permission(current_record.project_id, 'deliverable.create') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if current_record.status = 'Withdrawn' then
    raise exception using errcode = '55000', message = 'deliverable_already_terminal';
  end if;
  if length(trim(reason)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_reason';
  end if;

  update public.deliverables
     set status = 'Withdrawn', updated_at = now(), updated_by = actor, version = version + 1
   where id = target_deliverable_id and version = expected_record_version
   returning * into changed;

  insert into public.domain_events (
    organisation_id, project_id, aggregate_type, aggregate_id, aggregate_version,
    event_type, actor_id, payload
  ) values (
    changed.organisation_id, changed.project_id, 'Deliverable', changed.id, changed.version,
    'DeliverableWithdrawn', actor, jsonb_build_object('reason', trim(reason))
  ) returning * into accepted_event;
  insert into public.outbox_messages (event_id, topic, payload)
  values (accepted_event.id, 'deliverable.withdrawn.v1', accepted_event.payload);
  return changed;
end;
$$;

revoke all on function
  public.create_deliverable(uuid, text),
  public.submit_revision(uuid, text, text, text, text, integer),
  public.review_revision(uuid, text, text, boolean, integer),
  public.withdraw_deliverable(uuid, text, integer)
from public, anon;

grant execute on function
  public.create_deliverable(uuid, text),
  public.submit_revision(uuid, text, text, text, text, integer),
  public.review_revision(uuid, text, text, boolean, integer),
  public.withdraw_deliverable(uuid, text, integer)
to authenticated;

insert into public.role_bundle_permissions (bundle_code, permission_code)
select 'startup_work_owner_admin', code
from public.permissions
where code in ('deliverable.create', 'deliverable.submit', 'deliverable.review', 'deliverable.approve', 'deliverable.reject')
on conflict do nothing;

insert into public.role_bundle_permissions (bundle_code, permission_code)
select 'startup_assignee', code
from public.permissions
where code in ('deliverable.submit')
on conflict do nothing;
