-- Submission module: frozen manifest of approved Deliverable revisions,
-- gated behind the Authorized Signatory before dispatch. Mirrors
-- src/modules/submission/domain exactly. Not yet applied to any shared
-- project.

create table if not exists public.submissions (
  id uuid primary key default extensions.gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  project_id uuid not null references public.tugas_projects(id),
  reference text not null check (length(trim(reference)) > 0),
  recipient_type text not null check (recipient_type in ('client', 'authority')),
  recipient_name text not null check (length(trim(recipient_name)) > 0),
  package_summary text not null check (length(trim(package_summary)) > 0),
  status text not null check (
    status in ('Draft', 'Prepared', 'ReadyForDispatch', 'Cancelled', 'Superseded')
  ) default 'Draft',
  dispatch_approved_by uuid references public.users(id),
  dispatch_approved_at timestamptz,
  dispatch_credential_reference text,
  superseded_by_submission_id uuid references public.submissions(id),
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references public.users(id),
  version integer not null default 1 check (version > 0)
);

create table if not exists public.submission_manifest_items (
  id uuid primary key default extensions.gen_random_uuid(),
  submission_id uuid not null references public.submissions(id),
  deliverable_id uuid not null references public.deliverables(id),
  revision_id uuid not null references public.deliverable_revisions(id),
  label text not null,
  repository_reference text not null,
  added_by uuid not null references public.users(id),
  added_at timestamptz not null default now()
);

alter table public.submissions enable row level security;
alter table public.submission_manifest_items enable row level security;
revoke all on table public.submissions from anon, authenticated;
revoke all on table public.submission_manifest_items from anon, authenticated;
grant select on table public.submissions, public.submission_manifest_items to authenticated;

drop policy if exists "member reads submissions" on public.submissions;
create policy "member reads submissions" on public.submissions
  for select to authenticated using (public.is_active_project_member(project_id));

drop policy if exists "member reads submission manifest items" on public.submission_manifest_items;
create policy "member reads submission manifest items" on public.submission_manifest_items
  for select to authenticated using (
    exists (
      select 1 from public.submissions s
      where s.id = submission_manifest_items.submission_id
        and public.is_active_project_member(s.project_id)
    )
  );

insert into public.permissions (code) values
  ('submission.prepare'), ('submission.approve_dispatch'), ('submission.cancel'), ('submission.supersede')
on conflict do nothing;

create or replace function public.create_submission(
  target_project_id uuid,
  submission_reference text,
  submission_recipient_type text,
  submission_recipient_name text,
  submission_package_summary text
)
returns public.submissions
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  target_organisation uuid;
  created public.submissions%rowtype;
  accepted_event public.domain_events%rowtype;
begin
  if actor is null or not public.has_project_permission(target_project_id, 'submission.prepare') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if submission_recipient_type not in ('client', 'authority') then
    raise exception using errcode = '22023', message = 'invalid_recipient_type';
  end if;
  if length(trim(submission_reference)) = 0 or length(trim(submission_recipient_name)) = 0
     or length(trim(submission_package_summary)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_submission_facts';
  end if;

  select organisation_id into target_organisation from public.tugas_projects where id = target_project_id;
  insert into public.submissions (
    organisation_id, project_id, reference, recipient_type, recipient_name, package_summary,
    created_by, updated_by
  ) values (
    target_organisation, target_project_id, trim(submission_reference), submission_recipient_type,
    trim(submission_recipient_name), trim(submission_package_summary), actor, actor
  ) returning * into created;

  insert into public.domain_events (
    organisation_id, project_id, aggregate_type, aggregate_id, aggregate_version,
    event_type, actor_id, payload
  ) values (
    created.organisation_id, created.project_id, 'Submission', created.id, created.version,
    'SubmissionCreated', actor, jsonb_build_object('reference', created.reference)
  ) returning * into accepted_event;
  insert into public.outbox_messages (event_id, topic, payload)
  values (accepted_event.id, 'submission.created.v1', accepted_event.payload);
  return created;
end;
$$;

create or replace function public.add_manifest_item(
  target_submission_id uuid,
  target_deliverable_id uuid,
  target_revision_id uuid,
  expected_record_version integer
)
returns public.submissions
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.submissions%rowtype;
  revision public.deliverable_revisions%rowtype;
  changed public.submissions%rowtype;
  accepted_event public.domain_events%rowtype;
begin
  select * into current_record from public.submissions where id = target_submission_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'submission_not_found';
  end if;
  if actor is null or not public.has_project_permission(current_record.project_id, 'submission.prepare') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if current_record.status <> 'Draft' then
    raise exception using errcode = '55000', message = 'submission_not_draft';
  end if;

  select * into revision from public.deliverable_revisions
  where id = target_revision_id and deliverable_id = target_deliverable_id;
  if revision.id is null then
    raise exception using errcode = 'P0002', message = 'revision_not_found';
  end if;

  insert into public.submission_manifest_items (
    submission_id, deliverable_id, revision_id, label, repository_reference, added_by
  ) values (
    target_submission_id, target_deliverable_id, target_revision_id, revision.label,
    revision.repository_reference, actor
  );

  update public.submissions
     set updated_at = now(), updated_by = actor, version = version + 1
   where id = target_submission_id and version = expected_record_version
   returning * into changed;
  if changed.id is null then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;

  insert into public.domain_events (
    organisation_id, project_id, aggregate_type, aggregate_id, aggregate_version,
    event_type, actor_id, payload
  ) values (
    changed.organisation_id, changed.project_id, 'Submission', changed.id, changed.version,
    'SubmissionManifestItemAdded', actor,
    jsonb_build_object('deliverableId', target_deliverable_id, 'revisionId', target_revision_id)
  ) returning * into accepted_event;
  insert into public.outbox_messages (event_id, topic, payload)
  values (accepted_event.id, 'submission.manifest-item-added.v1', accepted_event.payload);
  return changed;
end;
$$;

create or replace function public.prepare_submission(
  target_submission_id uuid,
  expected_record_version integer
)
returns public.submissions
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.submissions%rowtype;
  item_count integer;
  changed public.submissions%rowtype;
  accepted_event public.domain_events%rowtype;
begin
  select * into current_record from public.submissions where id = target_submission_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'submission_not_found';
  end if;
  if actor is null or not public.has_project_permission(current_record.project_id, 'submission.prepare') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if current_record.status <> 'Draft' then
    raise exception using errcode = '55000', message = 'submission_not_draft';
  end if;

  select count(*) into item_count from public.submission_manifest_items where submission_id = target_submission_id;
  if item_count = 0 then
    raise exception using errcode = '55000', message = 'empty_manifest';
  end if;

  update public.submissions
     set status = 'Prepared', updated_at = now(), updated_by = actor, version = version + 1
   where id = target_submission_id and version = expected_record_version
   returning * into changed;

  insert into public.domain_events (
    organisation_id, project_id, aggregate_type, aggregate_id, aggregate_version,
    event_type, actor_id, payload
  ) values (
    changed.organisation_id, changed.project_id, 'Submission', changed.id, changed.version,
    'SubmissionPrepared', actor, jsonb_build_object('preparedBy', actor)
  ) returning * into accepted_event;
  insert into public.outbox_messages (event_id, topic, payload)
  values (accepted_event.id, 'submission.prepared.v1', accepted_event.payload);
  return changed;
end;
$$;

create or replace function public.return_submission_to_draft(
  target_submission_id uuid,
  reason text,
  expected_record_version integer
)
returns public.submissions
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.submissions%rowtype;
  changed public.submissions%rowtype;
  accepted_event public.domain_events%rowtype;
begin
  select * into current_record from public.submissions where id = target_submission_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'submission_not_found';
  end if;
  if actor is null or not public.has_project_permission(current_record.project_id, 'submission.prepare') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if current_record.status <> 'Prepared' then
    raise exception using errcode = '55000', message = 'submission_not_prepared';
  end if;
  if length(trim(reason)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_reason';
  end if;

  update public.submissions
     set status = 'Draft', updated_at = now(), updated_by = actor, version = version + 1
   where id = target_submission_id and version = expected_record_version
   returning * into changed;

  insert into public.domain_events (
    organisation_id, project_id, aggregate_type, aggregate_id, aggregate_version,
    event_type, actor_id, payload
  ) values (
    changed.organisation_id, changed.project_id, 'Submission', changed.id, changed.version,
    'SubmissionReturnedToDraft', actor, jsonb_build_object('reason', trim(reason))
  ) returning * into accepted_event;
  insert into public.outbox_messages (event_id, topic, payload)
  values (accepted_event.id, 'submission.returned-to-draft.v1', accepted_event.payload);
  return changed;
end;
$$;

create or replace function public.approve_submission_for_dispatch(
  target_submission_id uuid,
  credential_reference text,
  expected_record_version integer
)
returns public.submissions
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.submissions%rowtype;
  changed public.submissions%rowtype;
  accepted_event public.domain_events%rowtype;
begin
  select * into current_record from public.submissions where id = target_submission_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'submission_not_found';
  end if;
  -- Not delegable through the ordinary capability grant: BOM-SUB-003 / role
  -- matrix "the one bundle that is not like the others". A future
  -- Configuration-backed authorized_signatory check belongs here once that
  -- module exists; today this is has_project_permission like everything
  -- else, which is a known, flagged gap, not a silent shortcut.
  if actor is null or not public.has_project_permission(current_record.project_id, 'submission.approve_dispatch') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if current_record.status <> 'Prepared' then
    raise exception using errcode = '55000', message = 'submission_not_prepared';
  end if;
  if length(trim(credential_reference)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_credential_reference';
  end if;

  update public.submissions
     set status = 'ReadyForDispatch', dispatch_approved_by = actor, dispatch_approved_at = now(),
         dispatch_credential_reference = trim(credential_reference),
         updated_at = now(), updated_by = actor, version = version + 1
   where id = target_submission_id and version = expected_record_version
   returning * into changed;

  insert into public.domain_events (
    organisation_id, project_id, aggregate_type, aggregate_id, aggregate_version,
    event_type, actor_id, payload
  ) values (
    changed.organisation_id, changed.project_id, 'Submission', changed.id, changed.version,
    'SubmissionApprovedForDispatch', actor,
    jsonb_build_object('approvedBy', actor, 'credentialReference', changed.dispatch_credential_reference)
  ) returning * into accepted_event;
  insert into public.outbox_messages (event_id, topic, payload)
  values (accepted_event.id, 'submission.approved-for-dispatch.v1', accepted_event.payload);
  return changed;
end;
$$;

create or replace function public.cancel_submission(
  target_submission_id uuid,
  reason text,
  expected_record_version integer
)
returns public.submissions
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.submissions%rowtype;
  changed public.submissions%rowtype;
  accepted_event public.domain_events%rowtype;
begin
  select * into current_record from public.submissions where id = target_submission_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'submission_not_found';
  end if;
  if actor is null or not public.has_project_permission(current_record.project_id, 'submission.cancel') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if current_record.status not in ('Draft', 'Prepared', 'ReadyForDispatch') then
    raise exception using errcode = '55000', message = 'submission_not_cancellable';
  end if;
  if length(trim(reason)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_reason';
  end if;

  update public.submissions
     set status = 'Cancelled', updated_at = now(), updated_by = actor, version = version + 1
   where id = target_submission_id and version = expected_record_version
   returning * into changed;

  insert into public.domain_events (
    organisation_id, project_id, aggregate_type, aggregate_id, aggregate_version,
    event_type, actor_id, payload
  ) values (
    changed.organisation_id, changed.project_id, 'Submission', changed.id, changed.version,
    'SubmissionCancelled', actor, jsonb_build_object('reason', trim(reason))
  ) returning * into accepted_event;
  insert into public.outbox_messages (event_id, topic, payload)
  values (accepted_event.id, 'submission.cancelled.v1', accepted_event.payload);
  return changed;
end;
$$;

create or replace function public.supersede_submission(
  target_submission_id uuid,
  reason text,
  target_replacement_submission_id uuid,
  expected_record_version integer
)
returns public.submissions
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.submissions%rowtype;
  changed public.submissions%rowtype;
  accepted_event public.domain_events%rowtype;
begin
  select * into current_record from public.submissions where id = target_submission_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'submission_not_found';
  end if;
  if actor is null or not public.has_project_permission(current_record.project_id, 'submission.supersede') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if current_record.status not in ('Prepared', 'ReadyForDispatch') then
    raise exception using errcode = '55000', message = 'submission_not_supersedable';
  end if;
  if length(trim(reason)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_reason';
  end if;

  update public.submissions
     set status = 'Superseded', superseded_by_submission_id = target_replacement_submission_id,
         updated_at = now(), updated_by = actor, version = version + 1
   where id = target_submission_id and version = expected_record_version
   returning * into changed;

  insert into public.domain_events (
    organisation_id, project_id, aggregate_type, aggregate_id, aggregate_version,
    event_type, actor_id, payload
  ) values (
    changed.organisation_id, changed.project_id, 'Submission', changed.id, changed.version,
    'SubmissionSuperseded', actor,
    jsonb_build_object('reason', trim(reason), 'replacementSubmissionId', target_replacement_submission_id)
  ) returning * into accepted_event;
  insert into public.outbox_messages (event_id, topic, payload)
  values (accepted_event.id, 'submission.superseded.v1', accepted_event.payload);
  return changed;
end;
$$;

revoke all on function
  public.create_submission(uuid, text, text, text, text),
  public.add_manifest_item(uuid, uuid, uuid, integer),
  public.prepare_submission(uuid, integer),
  public.return_submission_to_draft(uuid, text, integer),
  public.approve_submission_for_dispatch(uuid, text, integer),
  public.cancel_submission(uuid, text, integer),
  public.supersede_submission(uuid, text, uuid, integer)
from public, anon;

grant execute on function
  public.create_submission(uuid, text, text, text, text),
  public.add_manifest_item(uuid, uuid, uuid, integer),
  public.prepare_submission(uuid, integer),
  public.return_submission_to_draft(uuid, text, integer),
  public.approve_submission_for_dispatch(uuid, text, integer),
  public.cancel_submission(uuid, text, integer),
  public.supersede_submission(uuid, text, uuid, integer)
to authenticated;

insert into public.role_bundle_permissions (bundle_code, permission_code)
select 'startup_work_owner_admin', code
from public.permissions
where code in ('submission.prepare', 'submission.approve_dispatch', 'submission.cancel', 'submission.supersede')
on conflict do nothing;
