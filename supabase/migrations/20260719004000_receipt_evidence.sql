-- Receipt Evidence module: uploader/verifier separation with an explicit
-- self-verified exception flag. Mirrors src/modules/receipt-evidence/domain
-- exactly. Not yet applied to any shared project.

create table if not exists public.receipt_evidence_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  dispatch_attempt_id uuid not null references public.dispatch_attempts(id),
  organisation_id uuid not null references public.organisations(id),
  project_id uuid not null references public.tugas_projects(id),
  status text not null check (
    status in ('Collecting', 'PendingVerification', 'Verified', 'Rejected', 'Withdrawn', 'Invalidated')
  ) default 'Collecting',
  verified_by uuid references public.users(id),
  verified_at timestamptz,
  verification_notes text,
  self_verified boolean not null default false,
  rejection_reason text,
  replaces_receipt_evidence_attempt_id uuid references public.receipt_evidence_attempts(id),
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references public.users(id),
  version integer not null default 1 check (version > 0)
);

create table if not exists public.receipt_evidence_items (
  id uuid primary key default extensions.gen_random_uuid(),
  receipt_evidence_attempt_id uuid not null references public.receipt_evidence_attempts(id),
  file_reference text not null,
  description text not null,
  uploaded_by uuid not null references public.users(id),
  uploaded_at timestamptz not null default now()
);

alter table public.receipt_evidence_attempts enable row level security;
alter table public.receipt_evidence_items enable row level security;
revoke all on table public.receipt_evidence_attempts from anon, authenticated;
revoke all on table public.receipt_evidence_items from anon, authenticated;
grant select on table public.receipt_evidence_attempts, public.receipt_evidence_items to authenticated;

drop policy if exists "member reads receipt evidence attempts" on public.receipt_evidence_attempts;
create policy "member reads receipt evidence attempts" on public.receipt_evidence_attempts
  for select to authenticated using (public.is_active_project_member(project_id));

drop policy if exists "member reads receipt evidence items" on public.receipt_evidence_items;
create policy "member reads receipt evidence items" on public.receipt_evidence_items
  for select to authenticated using (
    exists (
      select 1 from public.receipt_evidence_attempts r
      where r.id = receipt_evidence_items.receipt_evidence_attempt_id
        and public.is_active_project_member(r.project_id)
    )
  );

insert into public.permissions (code) values ('receipt.upload'), ('receipt.verify'), ('receipt.reject')
on conflict do nothing;

create or replace function public.record_receipt_evidence_event(
  changed public.receipt_evidence_attempts,
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
    changed.organisation_id, changed.project_id, 'ReceiptEvidenceAttempt', changed.id, changed.version,
    event_type, actor, payload
  ) returning * into accepted_event;
  insert into public.outbox_messages (event_id, topic, payload)
  values (accepted_event.id, topic, accepted_event.payload);
end;
$$;

revoke all on function public.record_receipt_evidence_event(public.receipt_evidence_attempts, text, text, jsonb)
  from public, anon, authenticated;

create or replace function public.create_receipt_evidence_attempt(
  target_dispatch_attempt_id uuid,
  replaces_receipt_evidence_attempt_id uuid
)
returns public.receipt_evidence_attempts
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  dispatch public.dispatch_attempts%rowtype;
  created public.receipt_evidence_attempts%rowtype;
begin
  select * into dispatch from public.dispatch_attempts where id = target_dispatch_attempt_id;
  if dispatch.id is null then
    raise exception using errcode = 'P0002', message = 'dispatch_not_found';
  end if;
  if actor is null or not public.has_project_permission(dispatch.project_id, 'receipt.upload') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;

  insert into public.receipt_evidence_attempts (
    dispatch_attempt_id, organisation_id, project_id, replaces_receipt_evidence_attempt_id,
    created_by, updated_by
  ) values (
    target_dispatch_attempt_id, dispatch.organisation_id, dispatch.project_id,
    replaces_receipt_evidence_attempt_id, actor, actor
  ) returning * into created;

  perform public.record_receipt_evidence_event(
    created,
    case when replaces_receipt_evidence_attempt_id is null then 'ReceiptEvidenceAttemptCreated' else 'ReplacementReceiptEvidenceCreated' end,
    'receipt-evidence.created.v1',
    jsonb_build_object('dispatchAttemptId', target_dispatch_attempt_id)
  );
  return created;
end;
$$;

create or replace function public.upload_receipt_evidence_item(
  target_receipt_evidence_attempt_id uuid,
  file_reference text,
  description text,
  expected_record_version integer
)
returns public.receipt_evidence_attempts
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.receipt_evidence_attempts%rowtype;
  changed public.receipt_evidence_attempts%rowtype;
begin
  select * into current_record from public.receipt_evidence_attempts where id = target_receipt_evidence_attempt_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'receipt_evidence_not_found';
  end if;
  if actor is null or not public.has_project_permission(current_record.project_id, 'receipt.upload') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if current_record.status <> 'Collecting' then
    raise exception using errcode = '55000', message = 'receipt_evidence_not_collecting';
  end if;
  if length(trim(file_reference)) = 0 or length(trim(description)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_evidence_item';
  end if;

  insert into public.receipt_evidence_items (receipt_evidence_attempt_id, file_reference, description, uploaded_by)
  values (target_receipt_evidence_attempt_id, trim(file_reference), trim(description), actor);

  update public.receipt_evidence_attempts
     set updated_at = now(), updated_by = actor, version = version + 1
   where id = target_receipt_evidence_attempt_id and version = expected_record_version
   returning * into changed;
  if changed.id is null then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;

  perform public.record_receipt_evidence_event(changed, 'ReceiptEvidenceItemUploaded',
    'receipt-evidence.item-uploaded.v1', jsonb_build_object('uploadedBy', actor));
  return changed;
end;
$$;

create or replace function public.submit_receipt_evidence_for_verification(
  target_receipt_evidence_attempt_id uuid,
  expected_record_version integer
)
returns public.receipt_evidence_attempts
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.receipt_evidence_attempts%rowtype;
  item_count integer;
  changed public.receipt_evidence_attempts%rowtype;
begin
  select * into current_record from public.receipt_evidence_attempts where id = target_receipt_evidence_attempt_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'receipt_evidence_not_found';
  end if;
  if actor is null or not public.has_project_permission(current_record.project_id, 'receipt.upload') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if current_record.status <> 'Collecting' then
    raise exception using errcode = '55000', message = 'receipt_evidence_not_collecting';
  end if;

  select count(*) into item_count from public.receipt_evidence_items where receipt_evidence_attempt_id = target_receipt_evidence_attempt_id;
  if item_count = 0 then
    raise exception using errcode = '55000', message = 'empty_evidence';
  end if;

  update public.receipt_evidence_attempts
     set status = 'PendingVerification', updated_at = now(), updated_by = actor, version = version + 1
   where id = target_receipt_evidence_attempt_id and version = expected_record_version
   returning * into changed;

  perform public.record_receipt_evidence_event(changed, 'ReceiptEvidenceSubmittedForVerification',
    'receipt-evidence.submitted.v1', jsonb_build_object('submittedBy', actor));
  return changed;
end;
$$;

create or replace function public.verify_receipt_evidence(
  target_receipt_evidence_attempt_id uuid,
  notes text,
  self_verified boolean,
  expected_record_version integer
)
returns public.receipt_evidence_attempts
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.receipt_evidence_attempts%rowtype;
  uploaded_by_actor boolean;
  changed public.receipt_evidence_attempts%rowtype;
begin
  select * into current_record from public.receipt_evidence_attempts where id = target_receipt_evidence_attempt_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'receipt_evidence_not_found';
  end if;
  if actor is null or not public.has_project_permission(current_record.project_id, 'receipt.verify') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if current_record.status <> 'PendingVerification' then
    raise exception using errcode = '55000', message = 'receipt_evidence_not_pending_verification';
  end if;

  select exists(
    select 1 from public.receipt_evidence_items
    where receipt_evidence_attempt_id = target_receipt_evidence_attempt_id and uploaded_by = actor
  ) into uploaded_by_actor;
  if uploaded_by_actor and not coalesce(self_verified, false) then
    raise exception using errcode = '42501', message = 'verifier_is_only_uploader_without_self_verified_flag';
  end if;
  if length(trim(notes)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_verification_notes';
  end if;

  update public.receipt_evidence_attempts
     set status = 'Verified', verified_by = actor, verified_at = now(), verification_notes = trim(notes),
         self_verified = coalesce(self_verified, false), updated_at = now(), updated_by = actor, version = version + 1
   where id = target_receipt_evidence_attempt_id and version = expected_record_version
   returning * into changed;

  perform public.record_receipt_evidence_event(changed, 'ReceiptEvidenceVerified', 'receipt-evidence.verified.v1',
    jsonb_build_object('verifiedBy', actor, 'selfVerified', changed.self_verified));
  return changed;
end;
$$;

create or replace function public.reject_receipt_evidence(
  target_receipt_evidence_attempt_id uuid,
  reason text,
  expected_record_version integer
)
returns public.receipt_evidence_attempts
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.receipt_evidence_attempts%rowtype;
  changed public.receipt_evidence_attempts%rowtype;
begin
  select * into current_record from public.receipt_evidence_attempts where id = target_receipt_evidence_attempt_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'receipt_evidence_not_found';
  end if;
  if actor is null or not public.has_project_permission(current_record.project_id, 'receipt.reject') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if current_record.status <> 'PendingVerification' then
    raise exception using errcode = '55000', message = 'receipt_evidence_not_pending_verification';
  end if;
  if length(trim(reason)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_reason';
  end if;

  update public.receipt_evidence_attempts
     set status = 'Rejected', rejection_reason = trim(reason), updated_at = now(), updated_by = actor, version = version + 1
   where id = target_receipt_evidence_attempt_id and version = expected_record_version
   returning * into changed;

  perform public.record_receipt_evidence_event(changed, 'ReceiptEvidenceRejected', 'receipt-evidence.rejected.v1',
    jsonb_build_object('rejectedBy', actor, 'reason', changed.rejection_reason));
  return changed;
end;
$$;

create or replace function public.withdraw_receipt_evidence(
  target_receipt_evidence_attempt_id uuid,
  reason text,
  expected_record_version integer
)
returns public.receipt_evidence_attempts
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.receipt_evidence_attempts%rowtype;
  changed public.receipt_evidence_attempts%rowtype;
begin
  select * into current_record from public.receipt_evidence_attempts where id = target_receipt_evidence_attempt_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'receipt_evidence_not_found';
  end if;
  if actor is null or not public.has_project_permission(current_record.project_id, 'receipt.upload') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if current_record.status not in ('Collecting', 'PendingVerification') then
    raise exception using errcode = '55000', message = 'receipt_evidence_not_withdrawable';
  end if;
  if length(trim(reason)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_reason';
  end if;

  update public.receipt_evidence_attempts
     set status = 'Withdrawn', updated_at = now(), updated_by = actor, version = version + 1
   where id = target_receipt_evidence_attempt_id and version = expected_record_version
   returning * into changed;

  perform public.record_receipt_evidence_event(changed, 'ReceiptEvidenceWithdrawn', 'receipt-evidence.withdrawn.v1',
    jsonb_build_object('withdrawnBy', actor, 'reason', trim(reason)));
  return changed;
end;
$$;

create or replace function public.invalidate_receipt_evidence_verification(
  target_receipt_evidence_attempt_id uuid,
  reason text,
  expected_record_version integer
)
returns public.receipt_evidence_attempts
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.receipt_evidence_attempts%rowtype;
  changed public.receipt_evidence_attempts%rowtype;
begin
  select * into current_record from public.receipt_evidence_attempts where id = target_receipt_evidence_attempt_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'receipt_evidence_not_found';
  end if;
  if actor is null or not public.has_project_permission(current_record.project_id, 'receipt.verify') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if current_record.status <> 'Verified' then
    raise exception using errcode = '55000', message = 'receipt_evidence_not_verified';
  end if;
  if length(trim(reason)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_reason';
  end if;

  update public.receipt_evidence_attempts
     set status = 'Invalidated', updated_at = now(), updated_by = actor, version = version + 1
   where id = target_receipt_evidence_attempt_id and version = expected_record_version
   returning * into changed;

  perform public.record_receipt_evidence_event(changed, 'ReceiptEvidenceVerificationInvalidated',
    'receipt-evidence.verification-invalidated.v1', jsonb_build_object('invalidatedBy', actor, 'reason', trim(reason)));
  return changed;
end;
$$;

revoke all on function
  public.create_receipt_evidence_attempt(uuid, uuid),
  public.upload_receipt_evidence_item(uuid, text, text, integer),
  public.submit_receipt_evidence_for_verification(uuid, integer),
  public.verify_receipt_evidence(uuid, text, boolean, integer),
  public.reject_receipt_evidence(uuid, text, integer),
  public.withdraw_receipt_evidence(uuid, text, integer),
  public.invalidate_receipt_evidence_verification(uuid, text, integer)
from public, anon;

grant execute on function
  public.create_receipt_evidence_attempt(uuid, uuid),
  public.upload_receipt_evidence_item(uuid, text, text, integer),
  public.submit_receipt_evidence_for_verification(uuid, integer),
  public.verify_receipt_evidence(uuid, text, boolean, integer),
  public.reject_receipt_evidence(uuid, text, integer),
  public.withdraw_receipt_evidence(uuid, text, integer),
  public.invalidate_receipt_evidence_verification(uuid, text, integer)
to authenticated;

insert into public.role_bundle_permissions (bundle_code, permission_code)
select 'startup_work_owner_admin', code
from public.permissions
where code in ('receipt.upload', 'receipt.verify', 'receipt.reject')
on conflict do nothing;
