-- Claim module: readiness is always derived from requirement state, never
-- set directly. Mirrors src/modules/claim/domain exactly, including
-- recomputing readiness server-side after every requirement-affecting
-- mutation rather than trusting a client-supplied value. Not yet applied to
-- any shared project.

create table if not exists public.claim_packages (
  id uuid primary key default extensions.gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  project_id uuid not null references public.tugas_projects(id),
  reference text not null check (length(trim(reference)) > 0),
  description text not null check (length(trim(description)) > 0),
  lifecycle text not null check (lifecycle in ('Open', 'Submitted', 'Closed', 'Cancelled')) default 'Open',
  readiness text not null check (readiness in ('EvidenceIncomplete', 'ReadyForQSReview', 'QSVerified')) default 'EvidenceIncomplete',
  qs_verified_by uuid references public.users(id),
  qs_verified_at timestamptz,
  qs_verification_notes text,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references public.users(id),
  version integer not null default 1 check (version > 0)
);

create table if not exists public.claim_requirements (
  id uuid primary key default extensions.gen_random_uuid(),
  claim_package_id uuid not null references public.claim_packages(id),
  description text not null check (length(trim(description)) > 0),
  status text not null check (status in ('Unsatisfied', 'Satisfied', 'Waived', 'Invalidated')) default 'Unsatisfied',
  evidence_kind text check (evidence_kind in ('receipt_evidence', 'deliverable')),
  evidence_id uuid,
  gap_note text,
  waiver_requested_by uuid references public.users(id),
  waiver_requested_at timestamptz,
  waiver_request_reason text,
  waiver_approved_by uuid references public.users(id),
  waiver_approved_at timestamptz,
  added_by uuid not null references public.users(id),
  added_at timestamptz not null default now()
);

alter table public.claim_packages enable row level security;
alter table public.claim_requirements enable row level security;
revoke all on table public.claim_packages from anon, authenticated;
revoke all on table public.claim_requirements from anon, authenticated;
grant select on table public.claim_packages, public.claim_requirements to authenticated;

drop policy if exists "member reads claim packages" on public.claim_packages;
create policy "member reads claim packages" on public.claim_packages
  for select to authenticated using (public.is_active_project_member(project_id));

drop policy if exists "member reads claim requirements" on public.claim_requirements;
create policy "member reads claim requirements" on public.claim_requirements
  for select to authenticated using (
    exists (
      select 1 from public.claim_packages c
      where c.id = claim_requirements.claim_package_id
        and public.is_active_project_member(c.project_id)
    )
  );

insert into public.permissions (code) values
  ('claim.create'), ('claim.configure_requirements'), ('claim.evaluate'), ('claim.verify'),
  ('claim.waive_requirement'), ('claim.submit')
on conflict do nothing;

-- Single source of truth for readiness, called after every requirement
-- mutation. Mirrors deriveReadiness() in claim.ts exactly.
create or replace function public.recompute_claim_readiness(target_claim_package_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  total integer;
  qualifying integer;
  current_readiness text;
  next_readiness text;
begin
  select count(*), count(*) filter (where status in ('Satisfied', 'Waived'))
    into total, qualifying
  from public.claim_requirements where claim_package_id = target_claim_package_id;

  select readiness into current_readiness from public.claim_packages where id = target_claim_package_id;

  if total = 0 or qualifying < total then
    next_readiness := 'EvidenceIncomplete';
  elsif current_readiness = 'QSVerified' then
    next_readiness := 'QSVerified';
  else
    next_readiness := 'ReadyForQSReview';
  end if;

  update public.claim_packages set readiness = next_readiness where id = target_claim_package_id;
end;
$$;

revoke all on function public.recompute_claim_readiness(uuid) from public, anon, authenticated;

create or replace function public.record_claim_event(
  changed public.claim_packages,
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
    changed.organisation_id, changed.project_id, 'ClaimPackage', changed.id, changed.version,
    event_type, actor, payload
  ) returning * into accepted_event;
  insert into public.outbox_messages (event_id, topic, payload)
  values (accepted_event.id, topic, accepted_event.payload);
end;
$$;

revoke all on function public.record_claim_event(public.claim_packages, text, text, jsonb)
  from public, anon, authenticated;

create or replace function public.create_claim_package(
  target_project_id uuid,
  claim_reference text,
  claim_description text
)
returns public.claim_packages
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  target_organisation uuid;
  created public.claim_packages%rowtype;
begin
  if actor is null or not public.has_project_permission(target_project_id, 'claim.create') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if length(trim(claim_reference)) = 0 or length(trim(claim_description)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_claim_facts';
  end if;

  select organisation_id into target_organisation from public.tugas_projects where id = target_project_id;
  insert into public.claim_packages (organisation_id, project_id, reference, description, created_by, updated_by)
  values (target_organisation, target_project_id, trim(claim_reference), trim(claim_description), actor, actor)
  returning * into created;

  perform public.record_claim_event(created, 'ClaimPackageCreated', 'claim.created.v1',
    jsonb_build_object('reference', created.reference));
  return created;
end;
$$;

create or replace function public.add_claim_requirement(
  target_claim_package_id uuid,
  requirement_description text,
  expected_record_version integer
)
returns public.claim_packages
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.claim_packages%rowtype;
  changed public.claim_packages%rowtype;
begin
  select * into current_record from public.claim_packages where id = target_claim_package_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'claim_not_found';
  end if;
  if actor is null or not public.has_project_permission(current_record.project_id, 'claim.configure_requirements') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if current_record.lifecycle <> 'Open' then
    raise exception using errcode = '55000', message = 'claim_not_open';
  end if;
  if length(trim(requirement_description)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_description';
  end if;

  insert into public.claim_requirements (claim_package_id, description, added_by)
  values (target_claim_package_id, trim(requirement_description), actor);

  perform public.recompute_claim_readiness(target_claim_package_id);

  update public.claim_packages
     set updated_at = now(), updated_by = actor, version = version + 1
   where id = target_claim_package_id and version = expected_record_version
   returning * into changed;
  if changed.id is null then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;

  perform public.record_claim_event(changed, 'ClaimRequirementAdded', 'claim.requirement-added.v1',
    jsonb_build_object('addedBy', actor));
  return changed;
end;
$$;

create or replace function public.link_claim_evidence(
  target_requirement_id uuid,
  evidence_kind text,
  target_evidence_id uuid
)
returns public.claim_requirements
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  requirement public.claim_requirements%rowtype;
  claim_project uuid;
  changed public.claim_requirements%rowtype;
begin
  select r.*, c.project_id into requirement, claim_project
  from public.claim_requirements r join public.claim_packages c on c.id = r.claim_package_id
  where r.id = target_requirement_id;
  if requirement.id is null then
    raise exception using errcode = 'P0002', message = 'requirement_not_found';
  end if;
  if actor is null or not public.has_project_permission(claim_project, 'claim.evaluate') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if evidence_kind not in ('receipt_evidence', 'deliverable') then
    raise exception using errcode = '22023', message = 'invalid_evidence_reference';
  end if;

  update public.claim_requirements
     set evidence_kind = evidence_kind, evidence_id = target_evidence_id
   where id = target_requirement_id
   returning * into changed;

  return changed;
end;
$$;

-- outcome: 'satisfied' | 'gap'
create or replace function public.evaluate_claim_requirement(
  target_requirement_id uuid,
  outcome text,
  notes text,
  expected_record_version integer
)
returns public.claim_packages
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  requirement public.claim_requirements%rowtype;
  current_record public.claim_packages%rowtype;
  changed public.claim_packages%rowtype;
begin
  select * into requirement from public.claim_requirements where id = target_requirement_id;
  if requirement.id is null then
    raise exception using errcode = 'P0002', message = 'requirement_not_found';
  end if;
  select * into current_record from public.claim_packages where id = requirement.claim_package_id;
  if actor is null or not public.has_project_permission(current_record.project_id, 'claim.evaluate') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if requirement.status <> 'Unsatisfied' then
    raise exception using errcode = '55000', message = 'requirement_not_unsatisfied';
  end if;
  if outcome not in ('satisfied', 'gap') then
    raise exception using errcode = '22023', message = 'invalid_outcome';
  end if;
  if length(trim(notes)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_notes';
  end if;

  if outcome = 'satisfied' then
    update public.claim_requirements set status = 'Satisfied', gap_note = null where id = target_requirement_id;
  else
    update public.claim_requirements set status = 'Unsatisfied', gap_note = trim(notes) where id = target_requirement_id;
  end if;

  perform public.recompute_claim_readiness(requirement.claim_package_id);

  update public.claim_packages
     set updated_at = now(), updated_by = actor, version = version + 1
   where id = requirement.claim_package_id and version = expected_record_version
   returning * into changed;
  if changed.id is null then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;

  perform public.record_claim_event(
    changed,
    case when outcome = 'satisfied' then 'RequirementSatisfied' else 'GapRecorded' end,
    'claim.requirement-evaluated.v1',
    jsonb_build_object('requirementId', target_requirement_id, 'evaluatedBy', actor, 'notes', trim(notes))
  );
  return changed;
end;
$$;

create or replace function public.request_claim_requirement_waiver(
  target_requirement_id uuid,
  reason text
)
returns public.claim_requirements
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  requirement public.claim_requirements%rowtype;
  claim_project uuid;
  changed public.claim_requirements%rowtype;
begin
  select r.*, c.project_id into requirement, claim_project
  from public.claim_requirements r join public.claim_packages c on c.id = r.claim_package_id
  where r.id = target_requirement_id;
  if requirement.id is null then
    raise exception using errcode = 'P0002', message = 'requirement_not_found';
  end if;
  if actor is null or not public.has_project_permission(claim_project, 'claim.waive_requirement') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if requirement.status <> 'Unsatisfied' then
    raise exception using errcode = '55000', message = 'requirement_not_unsatisfied';
  end if;
  if requirement.waiver_requested_by is not null and requirement.waiver_approved_by is null then
    raise exception using errcode = '55000', message = 'waiver_already_pending';
  end if;
  if length(trim(reason)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_reason';
  end if;

  update public.claim_requirements
     set waiver_requested_by = actor, waiver_requested_at = now(), waiver_request_reason = trim(reason),
         waiver_approved_by = null, waiver_approved_at = null
   where id = target_requirement_id
   returning * into changed;
  return changed;
end;
$$;

create or replace function public.approve_claim_requirement_waiver(
  target_requirement_id uuid,
  expected_record_version integer
)
returns public.claim_packages
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  requirement public.claim_requirements%rowtype;
  current_record public.claim_packages%rowtype;
  changed public.claim_packages%rowtype;
begin
  select * into requirement from public.claim_requirements where id = target_requirement_id;
  if requirement.id is null then
    raise exception using errcode = 'P0002', message = 'requirement_not_found';
  end if;
  select * into current_record from public.claim_packages where id = requirement.claim_package_id;
  if actor is null or not public.has_project_permission(current_record.project_id, 'claim.waive_requirement') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if requirement.waiver_requested_by is null or requirement.waiver_approved_by is not null then
    raise exception using errcode = '55000', message = 'no_pending_waiver';
  end if;
  if requirement.waiver_requested_by = actor then
    raise exception using errcode = '42501', message = 'actor_is_waiver_requester';
  end if;

  update public.claim_requirements
     set status = 'Waived', waiver_approved_by = actor, waiver_approved_at = now()
   where id = target_requirement_id;

  perform public.recompute_claim_readiness(requirement.claim_package_id);

  update public.claim_packages
     set updated_at = now(), updated_by = actor, version = version + 1
   where id = requirement.claim_package_id and version = expected_record_version
   returning * into changed;
  if changed.id is null then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;

  perform public.record_claim_event(changed, 'ClaimRequirementWaived', 'claim.requirement-waived.v1',
    jsonb_build_object('requirementId', target_requirement_id, 'approvedBy', actor));
  return changed;
end;
$$;

create or replace function public.verify_claim_package(
  target_claim_package_id uuid,
  notes text,
  expected_record_version integer
)
returns public.claim_packages
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.claim_packages%rowtype;
  changed public.claim_packages%rowtype;
begin
  select * into current_record from public.claim_packages where id = target_claim_package_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'claim_not_found';
  end if;
  if actor is null or not public.has_project_permission(current_record.project_id, 'claim.verify') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if current_record.readiness <> 'ReadyForQSReview' then
    raise exception using errcode = '55000', message = 'claim_not_ready_for_qs_review';
  end if;
  if length(trim(notes)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_notes';
  end if;

  update public.claim_packages
     set readiness = 'QSVerified', qs_verified_by = actor, qs_verified_at = now(),
         qs_verification_notes = trim(notes), updated_at = now(), updated_by = actor, version = version + 1
   where id = target_claim_package_id and version = expected_record_version
   returning * into changed;

  perform public.record_claim_event(changed, 'ClaimPackageQSVerified', 'claim.qs-verified.v1',
    jsonb_build_object('verifiedBy', actor));
  return changed;
end;
$$;

create or replace function public.record_claim_submission(
  target_claim_package_id uuid,
  expected_record_version integer
)
returns public.claim_packages
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.claim_packages%rowtype;
  changed public.claim_packages%rowtype;
begin
  select * into current_record from public.claim_packages where id = target_claim_package_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'claim_not_found';
  end if;
  if actor is null or not public.has_project_permission(current_record.project_id, 'claim.submit') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if current_record.lifecycle <> 'Open' then
    raise exception using errcode = '55000', message = 'claim_not_open';
  end if;
  if current_record.readiness <> 'QSVerified' then
    raise exception using errcode = '55000', message = 'claim_not_qs_verified';
  end if;

  update public.claim_packages
     set lifecycle = 'Submitted', updated_at = now(), updated_by = actor, version = version + 1
   where id = target_claim_package_id and version = expected_record_version
   returning * into changed;

  perform public.record_claim_event(changed, 'ClaimSubmissionRecorded', 'claim.submitted.v1',
    jsonb_build_object('recordedBy', actor));
  return changed;
end;
$$;

create or replace function public.close_claim_package(
  target_claim_package_id uuid,
  expected_record_version integer
)
returns public.claim_packages
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.claim_packages%rowtype;
  changed public.claim_packages%rowtype;
begin
  select * into current_record from public.claim_packages where id = target_claim_package_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'claim_not_found';
  end if;
  if actor is null or not public.has_project_permission(current_record.project_id, 'claim.submit') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if current_record.lifecycle <> 'Submitted' then
    raise exception using errcode = '55000', message = 'claim_not_submitted';
  end if;

  update public.claim_packages
     set lifecycle = 'Closed', updated_at = now(), updated_by = actor, version = version + 1
   where id = target_claim_package_id and version = expected_record_version
   returning * into changed;

  perform public.record_claim_event(changed, 'ClaimPackageClosed', 'claim.closed.v1',
    jsonb_build_object('closedBy', actor));
  return changed;
end;
$$;

create or replace function public.invalidate_claim_evidence(
  target_requirement_id uuid,
  reason text,
  expected_record_version integer
)
returns public.claim_packages
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  requirement public.claim_requirements%rowtype;
  current_record public.claim_packages%rowtype;
  changed public.claim_packages%rowtype;
begin
  select * into requirement from public.claim_requirements where id = target_requirement_id;
  if requirement.id is null then
    raise exception using errcode = 'P0002', message = 'requirement_not_found';
  end if;
  select * into current_record from public.claim_packages where id = requirement.claim_package_id;
  if actor is null or not public.has_project_permission(current_record.project_id, 'claim.evaluate') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if requirement.status not in ('Satisfied', 'Waived') then
    raise exception using errcode = '55000', message = 'requirement_not_qualifying';
  end if;
  if length(trim(reason)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_reason';
  end if;

  update public.claim_requirements set status = 'Invalidated' where id = target_requirement_id;
  perform public.recompute_claim_readiness(requirement.claim_package_id);

  update public.claim_packages
     set updated_at = now(), updated_by = actor, version = version + 1
   where id = requirement.claim_package_id and version = expected_record_version
   returning * into changed;
  if changed.id is null then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;

  perform public.record_claim_event(changed, 'ClaimRequirementInvalidated', 'claim.requirement-invalidated.v1',
    jsonb_build_object('requirementId', target_requirement_id, 'invalidatedBy', actor, 'reason', trim(reason)));
  return changed;
end;
$$;

create or replace function public.reopen_claim_package_for_correction(
  target_claim_package_id uuid,
  reason text,
  expected_record_version integer
)
returns public.claim_packages
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.claim_packages%rowtype;
  changed public.claim_packages%rowtype;
begin
  select * into current_record from public.claim_packages where id = target_claim_package_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'claim_not_found';
  end if;
  if actor is null or not public.has_project_permission(current_record.project_id, 'claim.submit') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if current_record.lifecycle not in ('Submitted', 'Closed') then
    raise exception using errcode = '55000', message = 'claim_not_correctable';
  end if;
  if length(trim(reason)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_reason';
  end if;

  update public.claim_packages
     set lifecycle = 'Open', readiness = 'EvidenceIncomplete', qs_verified_by = null,
         qs_verified_at = null, qs_verification_notes = null,
         updated_at = now(), updated_by = actor, version = version + 1
   where id = target_claim_package_id and version = expected_record_version
   returning * into changed;

  perform public.record_claim_event(changed, 'ClaimPackageReopenedForCorrection', 'claim.reopened.v1',
    jsonb_build_object('reopenedBy', actor, 'reason', trim(reason)));
  return changed;
end;
$$;

create or replace function public.cancel_claim_package(
  target_claim_package_id uuid,
  reason text,
  expected_record_version integer
)
returns public.claim_packages
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.claim_packages%rowtype;
  changed public.claim_packages%rowtype;
begin
  select * into current_record from public.claim_packages where id = target_claim_package_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'claim_not_found';
  end if;
  if actor is null or not public.has_project_permission(current_record.project_id, 'claim.create') then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  if current_record.lifecycle <> 'Open' then
    raise exception using errcode = '55000', message = 'claim_not_cancellable';
  end if;
  if length(trim(reason)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_reason';
  end if;

  update public.claim_packages
     set lifecycle = 'Cancelled', updated_at = now(), updated_by = actor, version = version + 1
   where id = target_claim_package_id and version = expected_record_version
   returning * into changed;

  perform public.record_claim_event(changed, 'ClaimPackageCancelled', 'claim.cancelled.v1',
    jsonb_build_object('cancelledBy', actor, 'reason', trim(reason)));
  return changed;
end;
$$;

revoke all on function
  public.create_claim_package(uuid, text, text),
  public.add_claim_requirement(uuid, text, integer),
  public.link_claim_evidence(uuid, text, uuid),
  public.evaluate_claim_requirement(uuid, text, text, integer),
  public.request_claim_requirement_waiver(uuid, text),
  public.approve_claim_requirement_waiver(uuid, integer),
  public.verify_claim_package(uuid, text, integer),
  public.record_claim_submission(uuid, integer),
  public.close_claim_package(uuid, integer),
  public.invalidate_claim_evidence(uuid, text, integer),
  public.reopen_claim_package_for_correction(uuid, text, integer),
  public.cancel_claim_package(uuid, text, integer)
from public, anon;

grant execute on function
  public.create_claim_package(uuid, text, text),
  public.add_claim_requirement(uuid, text, integer),
  public.link_claim_evidence(uuid, text, uuid),
  public.evaluate_claim_requirement(uuid, text, text, integer),
  public.request_claim_requirement_waiver(uuid, text),
  public.approve_claim_requirement_waiver(uuid, integer),
  public.verify_claim_package(uuid, text, integer),
  public.record_claim_submission(uuid, integer),
  public.close_claim_package(uuid, integer),
  public.invalidate_claim_evidence(uuid, text, integer),
  public.reopen_claim_package_for_correction(uuid, text, integer),
  public.cancel_claim_package(uuid, text, integer)
to authenticated;

insert into public.role_bundle_permissions (bundle_code, permission_code)
select 'startup_work_owner_admin', code
from public.permissions
where code in (
  'claim.create', 'claim.configure_requirements', 'claim.evaluate', 'claim.verify',
  'claim.waive_requirement', 'claim.submit'
)
on conflict do nothing;
