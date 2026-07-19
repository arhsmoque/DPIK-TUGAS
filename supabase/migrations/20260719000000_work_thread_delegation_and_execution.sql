-- Work Thread delegation, negotiation, and execution-reporting extension.
-- Adds the transitions specified in 03_DOMAIN_AND_STATE_MODEL.md and
-- 06_WORK_AND_REVIEW_SURFACES.md beyond the WP-100 reference slice
-- (Create/Assign/Acknowledge only). Mirrors src/modules/work-thread/domain
-- exactly: each RPC is the guard for one command already proven in the pure
-- decide/evolve unit tests. Not yet applied to any shared project.

alter table public.work_threads drop constraint if exists work_threads_lifecycle_check;
alter table public.work_threads
  add constraint work_threads_lifecycle_check check (
    lifecycle in (
      'Unassigned', 'AwaitingAcknowledgement', 'Assigned', 'InProgress',
      'AwaitingAcceptance', 'Closed', 'Cancelled'
    )
  );

alter table public.work_threads
  add column if not exists assignment_sequence integer not null default 0,
  add column if not exists blocked_outcome text,
  add column if not exists blocker_reason text,
  add column if not exists blocker_required_resolver uuid references public.users(id),
  add column if not exists blocker_effect text,
  add column if not exists blocker_needed_by_at timestamptz,
  add column if not exists blocker_raised_by uuid references public.users(id),
  add column if not exists blocker_raised_at timestamptz,
  add column if not exists recall_requested_by uuid references public.users(id),
  add column if not exists recall_requested_at timestamptz,
  add column if not exists recall_reason text,
  add column if not exists renegotiation_requested_by uuid references public.users(id),
  add column if not exists renegotiation_requested_at timestamptz,
  add column if not exists renegotiation_reason text;

update public.work_threads set assignment_sequence = 1 where lifecycle <> 'Unassigned' and assignment_sequence = 0;

insert into public.permissions (code) values
  ('work.update'), ('work.change_due_date'), ('work.accept'), ('work.reopen'), ('work.claim'),
  ('work.request_recall'), ('work.confirm_recall'), ('work.retract_recall'),
  ('work.request_renegotiation'), ('work.adjust_terms'), ('work.cancel_delegation'),
  ('work.release_to_open_pool'), ('work.escalate_for_reassignment')
on conflict do nothing;

-- Shared guard: raises unless the work thread exists, the caller holds the given
-- project permission, and the optimistic version matches. Returns the current row.
create or replace function public.lock_work_thread_for_command(
  target_work_thread_id uuid,
  required_permission text,
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
begin
  select * into current_record from public.work_threads where id = target_work_thread_id;
  if current_record.id is null then
    raise exception using errcode = 'P0002', message = 'work_thread_not_found';
  end if;
  if actor is null or not public.has_project_permission(current_record.project_id, required_permission) then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;
  if current_record.version <> expected_record_version then
    raise exception using errcode = '40001', message = 'stale_record_version';
  end if;
  return current_record;
end;
$$;

revoke all on function public.lock_work_thread_for_command(uuid, text, integer) from public, anon, authenticated;

-- event_version is explicit (not always changed.version) because several
-- commands emit more than one domain event per call (e.g. ConfirmRecall emits
-- RecallConfirmed then WorkAssigned). domain_events has a unique constraint on
-- (aggregate_type, aggregate_id, aggregate_version), so multi-event RPCs bump
-- the row version by the event count and assign each event a distinct step.
create or replace function public.record_work_thread_event(
  changed public.work_threads,
  event_version integer,
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
    changed.organisation_id, changed.project_id, 'WorkThread', changed.id, event_version,
    event_type, actor, payload
  ) returning * into accepted_event;
  insert into public.outbox_messages (event_id, topic, payload)
  values (accepted_event.id, topic, accepted_event.payload);
end;
$$;

revoke all on function public.record_work_thread_event(public.work_threads, integer, text, text, jsonb)
  from public, anon, authenticated;

create or replace function public.start_work(
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
  current_record public.work_threads;
  changed public.work_threads%rowtype;
begin
  current_record := public.lock_work_thread_for_command(target_work_thread_id, 'work.update', expected_record_version);
  if current_record.lifecycle <> 'Assigned' then
    raise exception using errcode = '55000', message = 'work_thread_not_assigned';
  end if;
  if current_record.current_assignee_id <> actor then
    raise exception using errcode = '42501', message = 'actor_not_current_assignee';
  end if;

  update public.work_threads
     set lifecycle = 'InProgress', updated_at = now(), updated_by = actor, version = version + 1
   where id = target_work_thread_id and version = expected_record_version
   returning * into changed;

  perform public.record_work_thread_event(changed, changed.version, 'WorkStarted', 'work-thread.started.v1',
    jsonb_build_object('startedBy', actor));
  return changed;
end;
$$;

create or replace function public.record_structured_update(
  target_work_thread_id uuid,
  update_type text,
  note text,
  expected_record_version integer
)
returns public.work_threads
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.work_threads;
begin
  current_record := public.lock_work_thread_for_command(target_work_thread_id, 'work.update', expected_record_version);
  if current_record.lifecycle not in ('Assigned', 'InProgress', 'AwaitingAcceptance') then
    raise exception using errcode = '55000', message = 'work_thread_not_active';
  end if;
  if update_type not in ('Progress', 'Question', 'Clarification', 'Decision', 'CommitmentNote') then
    raise exception using errcode = '22023', message = 'invalid_update_type';
  end if;
  if length(trim(note)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_note';
  end if;

  update public.work_threads
     set updated_at = now(), updated_by = actor, version = version + 1
   where id = target_work_thread_id and version = expected_record_version
   returning * into current_record;

  perform public.record_work_thread_event(current_record, current_record.version, 'StructuredUpdateRecorded',
    'work-thread.structured-update-recorded.v1',
    jsonb_build_object('updateType', update_type, 'note', trim(note), 'recordedBy', actor));
  return current_record;
end;
$$;

create or replace function public.raise_blocker(
  target_work_thread_id uuid,
  blocked_outcome text,
  reason text,
  required_resolver_email text,
  effect text,
  needed_by_at timestamptz,
  expected_record_version integer
)
returns public.work_threads
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.work_threads;
  resolver uuid;
  changed public.work_threads%rowtype;
begin
  current_record := public.lock_work_thread_for_command(target_work_thread_id, 'work.update', expected_record_version);
  if current_record.lifecycle not in ('Assigned', 'InProgress', 'AwaitingAcceptance') then
    raise exception using errcode = '55000', message = 'work_thread_not_active';
  end if;
  if current_record.current_assignee_id <> actor then
    raise exception using errcode = '42501', message = 'actor_not_current_assignee';
  end if;
  if current_record.blocked_outcome is not null then
    raise exception using errcode = '55000', message = 'blocker_already_open';
  end if;
  if length(trim(blocked_outcome)) = 0 or length(trim(reason)) = 0 or length(trim(effect)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_blocker';
  end if;

  select id into resolver from public.users where lower(email) = lower(required_resolver_email);
  if resolver is null then
    raise exception using errcode = '42501', message = 'resolver_not_eligible';
  end if;

  update public.work_threads
     set blocked_outcome = trim(blocked_outcome), blocker_reason = trim(reason),
         blocker_required_resolver = resolver, blocker_effect = trim(effect),
         blocker_needed_by_at = needed_by_at, blocker_raised_by = actor, blocker_raised_at = now(),
         updated_at = now(), updated_by = actor, version = version + 1
   where id = target_work_thread_id and version = expected_record_version
   returning * into changed;

  perform public.record_work_thread_event(changed, changed.version, 'BlockerRaised', 'work-thread.blocker-raised.v1',
    jsonb_build_object(
      'blockedOutcome', changed.blocked_outcome, 'reason', changed.blocker_reason,
      'requiredResolver', resolver, 'effect', changed.blocker_effect,
      'neededByAt', changed.blocker_needed_by_at, 'raisedBy', actor
    ));
  return changed;
end;
$$;

create or replace function public.resolve_blocker(
  target_work_thread_id uuid,
  resolution_note text,
  expected_record_version integer
)
returns public.work_threads
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.work_threads;
  changed public.work_threads%rowtype;
begin
  current_record := public.lock_work_thread_for_command(target_work_thread_id, 'work.update', expected_record_version);
  if current_record.blocked_outcome is null then
    raise exception using errcode = '55000', message = 'no_open_blocker';
  end if;
  if current_record.blocker_required_resolver <> actor then
    raise exception using errcode = '42501', message = 'actor_not_required_resolver';
  end if;
  if length(trim(resolution_note)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_resolution_note';
  end if;

  update public.work_threads
     set blocked_outcome = null, blocker_reason = null, blocker_required_resolver = null,
         blocker_effect = null, blocker_needed_by_at = null, blocker_raised_by = null,
         blocker_raised_at = null, updated_at = now(), updated_by = actor, version = version + 1
   where id = target_work_thread_id and version = expected_record_version
   returning * into changed;

  perform public.record_work_thread_event(changed, changed.version, 'BlockerResolved', 'work-thread.blocker-resolved.v1',
    jsonb_build_object('resolvedBy', actor, 'resolutionNote', trim(resolution_note)));
  return changed;
end;
$$;

create or replace function public.change_due_date(
  target_work_thread_id uuid,
  new_due_at timestamptz,
  reason text,
  expected_record_version integer
)
returns public.work_threads
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.work_threads;
  previous_due_at timestamptz;
  changed public.work_threads%rowtype;
begin
  current_record := public.lock_work_thread_for_command(target_work_thread_id, 'work.change_due_date', expected_record_version);
  if current_record.current_assignee_id is null then
    raise exception using errcode = '55000', message = 'no_current_assignment';
  end if;
  if length(trim(reason)) = 0 or new_due_at <= now() then
    raise exception using errcode = '22023', message = 'invalid_due_commitment';
  end if;
  previous_due_at := current_record.due_at;

  update public.work_threads
     set due_at = new_due_at, updated_at = now(), updated_by = actor, version = version + 1
   where id = target_work_thread_id and version = expected_record_version
   returning * into changed;

  perform public.record_work_thread_event(changed, changed.version, 'DueDateChanged', 'work-thread.due-date-changed.v1',
    jsonb_build_object(
      'previousDueAt', previous_due_at, 'newDueAt', new_due_at, 'approvedBy', actor,
      'reason', trim(reason)
    ));
  return changed;
end;
$$;

create or replace function public.offer_outcome(
  target_work_thread_id uuid,
  summary text,
  expected_record_version integer
)
returns public.work_threads
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.work_threads;
  changed public.work_threads%rowtype;
begin
  current_record := public.lock_work_thread_for_command(target_work_thread_id, 'work.update', expected_record_version);
  if current_record.lifecycle <> 'InProgress' then
    raise exception using errcode = '55000', message = 'work_thread_not_in_progress';
  end if;
  if current_record.current_assignee_id <> actor then
    raise exception using errcode = '42501', message = 'actor_not_current_assignee';
  end if;
  if length(trim(summary)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_note';
  end if;

  update public.work_threads
     set lifecycle = 'AwaitingAcceptance', updated_at = now(), updated_by = actor, version = version + 1
   where id = target_work_thread_id and version = expected_record_version
   returning * into changed;

  perform public.record_work_thread_event(changed, changed.version, 'OutcomeOffered', 'work-thread.outcome-offered.v1',
    jsonb_build_object('offeredBy', actor, 'summary', trim(summary)));
  return changed;
end;
$$;

create or replace function public.accept_outcome(
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
  current_record public.work_threads;
  changed public.work_threads%rowtype;
begin
  current_record := public.lock_work_thread_for_command(target_work_thread_id, 'work.accept', expected_record_version);
  if current_record.lifecycle <> 'AwaitingAcceptance' then
    raise exception using errcode = '55000', message = 'work_thread_not_awaiting_acceptance';
  end if;

  update public.work_threads
     set lifecycle = 'Closed', updated_at = now(), updated_by = actor, version = version + 1
   where id = target_work_thread_id and version = expected_record_version
   returning * into changed;

  perform public.record_work_thread_event(changed, changed.version, 'OutcomeAccepted', 'work-thread.outcome-accepted.v1',
    jsonb_build_object('acceptedBy', actor));
  return changed;
end;
$$;

create or replace function public.request_rework(
  target_work_thread_id uuid,
  reason text,
  expected_record_version integer
)
returns public.work_threads
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.work_threads;
  changed public.work_threads%rowtype;
begin
  current_record := public.lock_work_thread_for_command(target_work_thread_id, 'work.accept', expected_record_version);
  if current_record.lifecycle <> 'AwaitingAcceptance' then
    raise exception using errcode = '55000', message = 'work_thread_not_awaiting_acceptance';
  end if;
  if length(trim(reason)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_reason';
  end if;

  update public.work_threads
     set lifecycle = 'InProgress', updated_at = now(), updated_by = actor, version = version + 1
   where id = target_work_thread_id and version = expected_record_version
   returning * into changed;

  perform public.record_work_thread_event(changed, changed.version, 'ReworkRequested', 'work-thread.rework-requested.v1',
    jsonb_build_object('requestedBy', actor, 'reason', trim(reason)));
  return changed;
end;
$$;

create or replace function public.reopen_work(
  target_work_thread_id uuid,
  reason text,
  expected_record_version integer
)
returns public.work_threads
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.work_threads;
  changed public.work_threads%rowtype;
begin
  current_record := public.lock_work_thread_for_command(target_work_thread_id, 'work.reopen', expected_record_version);
  if current_record.lifecycle <> 'Closed' then
    raise exception using errcode = '55000', message = 'work_thread_not_closed';
  end if;
  if length(trim(reason)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_reason';
  end if;

  update public.work_threads
     set lifecycle = 'InProgress', updated_at = now(), updated_by = actor, version = version + 1
   where id = target_work_thread_id and version = expected_record_version
   returning * into changed;

  perform public.record_work_thread_event(changed, changed.version, 'WorkReopened', 'work-thread.reopened.v1',
    jsonb_build_object('reopenedBy', actor, 'reason', trim(reason)));
  return changed;
end;
$$;

create or replace function public.cancel_work_thread(
  target_work_thread_id uuid,
  reason text,
  expected_record_version integer
)
returns public.work_threads
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.work_threads;
  changed public.work_threads%rowtype;
begin
  current_record := public.lock_work_thread_for_command(target_work_thread_id, 'work.update', expected_record_version);
  if current_record.lifecycle in ('Closed', 'Cancelled') then
    raise exception using errcode = '55000', message = 'work_thread_already_terminal';
  end if;
  if length(trim(reason)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_reason';
  end if;

  update public.work_threads
     set lifecycle = 'Cancelled', updated_at = now(), updated_by = actor, version = version + 1
   where id = target_work_thread_id and version = expected_record_version
   returning * into changed;

  perform public.record_work_thread_event(changed, changed.version, 'WorkThreadCancelled', 'work-thread.cancelled.v1',
    jsonb_build_object('cancelledBy', actor, 'reason', trim(reason)));
  return changed;
end;
$$;

create or replace function public.request_recall(
  target_work_thread_id uuid,
  reason text,
  expected_record_version integer
)
returns public.work_threads
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.work_threads;
  changed public.work_threads%rowtype;
begin
  current_record := public.lock_work_thread_for_command(target_work_thread_id, 'work.request_recall', expected_record_version);
  if current_record.current_assignee_id is null then
    raise exception using errcode = '55000', message = 'no_current_assignment';
  end if;
  if current_record.recall_requested_by is not null then
    raise exception using errcode = '55000', message = 'recall_already_pending';
  end if;
  if length(trim(reason)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_reason';
  end if;

  update public.work_threads
     set recall_requested_by = actor, recall_requested_at = now(), recall_reason = trim(reason),
         updated_at = now(), updated_by = actor, version = version + 1
   where id = target_work_thread_id and version = expected_record_version
   returning * into changed;

  perform public.record_work_thread_event(changed, changed.version, 'RecallRequested', 'work-thread.recall-requested.v1',
    jsonb_build_object('requestedBy', actor, 'reason', changed.recall_reason));
  return changed;
end;
$$;

create or replace function public.retract_recall(
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
  current_record public.work_threads;
  changed public.work_threads%rowtype;
begin
  current_record := public.lock_work_thread_for_command(target_work_thread_id, 'work.retract_recall', expected_record_version);
  if current_record.recall_requested_by is null then
    raise exception using errcode = '55000', message = 'no_pending_recall';
  end if;
  if current_record.recall_requested_by <> actor then
    raise exception using errcode = '42501', message = 'actor_not_recall_requester';
  end if;

  update public.work_threads
     set recall_requested_by = null, recall_requested_at = null, recall_reason = null,
         updated_at = now(), updated_by = actor, version = version + 1
   where id = target_work_thread_id and version = expected_record_version
   returning * into changed;

  perform public.record_work_thread_event(changed, changed.version, 'RecallRetracted', 'work-thread.recall-retracted.v1',
    jsonb_build_object('retractedBy', actor));
  return changed;
end;
$$;

create or replace function public.confirm_recall(
  target_work_thread_id uuid,
  new_assignee_email text,
  new_due_at timestamptz,
  reason text,
  expected_record_version integer
)
returns public.work_threads
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.work_threads;
  new_assignee uuid;
  changed public.work_threads%rowtype;
begin
  current_record := public.lock_work_thread_for_command(target_work_thread_id, 'work.confirm_recall', expected_record_version);
  if current_record.recall_requested_by is null then
    raise exception using errcode = '55000', message = 'no_pending_recall';
  end if;
  if new_due_at <= now() then
    raise exception using errcode = '22023', message = 'invalid_due_commitment';
  end if;

  select u.id into new_assignee
  from public.users u
  join public.project_memberships pm on pm.identity_id = u.id
  where lower(u.email) = lower(new_assignee_email)
    and pm.project_id = current_record.project_id
    and (pm.revoked_at is null or pm.revoked_at > now());
  if new_assignee is null then
    raise exception using errcode = '42501', message = 'assignee_not_eligible';
  end if;

  update public.work_threads
     set lifecycle = 'AwaitingAcknowledgement', current_assignee_id = new_assignee,
         assigned_by = actor, assigned_at = now(), due_at = new_due_at,
         assignment_reason = coalesce(nullif(trim(reason), ''), 'Reassigned following confirmed recall'),
         acknowledged_at = null, assignment_sequence = current_record.assignment_sequence + 1,
         recall_requested_by = null, recall_requested_at = null, recall_reason = null,
         updated_at = now(), updated_by = actor, version = version + 2
   where id = target_work_thread_id and version = expected_record_version
   returning * into changed;

  perform public.record_work_thread_event(changed, changed.version - 1, 'RecallConfirmed', 'work-thread.recall-confirmed.v1',
    jsonb_build_object('confirmedBy', actor));
  perform public.record_work_thread_event(changed, changed.version, 'WorkAssigned', 'work-thread.assigned.v1',
    jsonb_build_object(
      'sequence', changed.assignment_sequence, 'assigneeId', new_assignee, 'assignedBy', actor,
      'dueAt', new_due_at, 'reason', changed.assignment_reason
    ));
  return changed;
end;
$$;

create or replace function public.request_renegotiation(
  target_work_thread_id uuid,
  reason text,
  expected_record_version integer
)
returns public.work_threads
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.work_threads;
  changed public.work_threads%rowtype;
begin
  current_record := public.lock_work_thread_for_command(target_work_thread_id, 'work.request_renegotiation', expected_record_version);
  if current_record.current_assignee_id <> actor then
    raise exception using errcode = '42501', message = 'actor_not_current_assignee';
  end if;
  if current_record.renegotiation_requested_by is not null then
    raise exception using errcode = '55000', message = 'renegotiation_already_pending';
  end if;
  if length(trim(reason)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_reason';
  end if;

  update public.work_threads
     set renegotiation_requested_by = actor, renegotiation_requested_at = now(),
         renegotiation_reason = trim(reason), updated_at = now(), updated_by = actor, version = version + 1
   where id = target_work_thread_id and version = expected_record_version
   returning * into changed;

  perform public.record_work_thread_event(changed, changed.version, 'RenegotiationRequested', 'work-thread.renegotiation-requested.v1',
    jsonb_build_object('requestedBy', actor, 'reason', changed.renegotiation_reason));
  return changed;
end;
$$;

create or replace function public.adjust_terms(
  target_work_thread_id uuid,
  new_due_at timestamptz,
  note text,
  expected_record_version integer
)
returns public.work_threads
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.work_threads;
  previous_due_at timestamptz;
  changed public.work_threads%rowtype;
begin
  current_record := public.lock_work_thread_for_command(target_work_thread_id, 'work.adjust_terms', expected_record_version);
  if current_record.renegotiation_requested_by is null then
    raise exception using errcode = '55000', message = 'no_pending_renegotiation';
  end if;
  if new_due_at <= now() then
    raise exception using errcode = '22023', message = 'invalid_due_commitment';
  end if;
  previous_due_at := current_record.due_at;

  update public.work_threads
     set due_at = new_due_at, renegotiation_requested_by = null, renegotiation_requested_at = null,
         renegotiation_reason = null, updated_at = now(), updated_by = actor, version = version + 1
   where id = target_work_thread_id and version = expected_record_version
   returning * into changed;

  perform public.record_work_thread_event(changed, changed.version, 'TermsAdjusted', 'work-thread.terms-adjusted.v1',
    jsonb_build_object(
      'previousDueAt', previous_due_at, 'newDueAt', new_due_at, 'adjustedBy', actor, 'note', trim(note)
    ));
  return changed;
end;
$$;

-- resolution: 'reassign' | 'release_to_pool' | 'escalate'
create or replace function public.cancel_delegation(
  target_work_thread_id uuid,
  resolution text,
  reason_code text,
  reason_detail text,
  new_assignee_email text,
  new_due_at timestamptz,
  escalate_to_email text,
  expected_record_version integer
)
returns public.work_threads
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.work_threads;
  new_assignee uuid;
  escalate_to uuid;
  changed public.work_threads%rowtype;
begin
  current_record := public.lock_work_thread_for_command(target_work_thread_id, 'work.cancel_delegation', expected_record_version);
  if current_record.renegotiation_requested_by is null then
    raise exception using errcode = '55000', message = 'no_pending_renegotiation';
  end if;
  if resolution not in ('reassign', 'release_to_pool', 'escalate') then
    raise exception using errcode = '22023', message = 'invalid_resolution';
  end if;
  if reason_code = 'other' and length(trim(reason_detail)) = 0 then
    raise exception using errcode = '22023', message = 'reason_detail_required_for_other';
  end if;

  if resolution = 'reassign' then
    if new_due_at <= now() then
      raise exception using errcode = '22023', message = 'invalid_due_commitment';
    end if;
    select u.id into new_assignee
    from public.users u
    join public.project_memberships pm on pm.identity_id = u.id
    where lower(u.email) = lower(new_assignee_email)
      and pm.project_id = current_record.project_id
      and (pm.revoked_at is null or pm.revoked_at > now());
    if new_assignee is null then
      raise exception using errcode = '42501', message = 'assignee_not_eligible';
    end if;

    update public.work_threads
       set lifecycle = 'AwaitingAcknowledgement', current_assignee_id = new_assignee,
           assigned_by = actor, assigned_at = now(), due_at = new_due_at,
           assignment_reason = 'Reassigned after cancelled delegation (' || reason_code || ')',
           acknowledged_at = null, assignment_sequence = current_record.assignment_sequence + 1,
           renegotiation_requested_by = null, renegotiation_requested_at = null, renegotiation_reason = null,
           updated_at = now(), updated_by = actor, version = version + 2
     where id = target_work_thread_id and version = expected_record_version
     returning * into changed;

    perform public.record_work_thread_event(changed, changed.version - 1, 'DelegationCancelled', 'work-thread.delegation-cancelled.v1',
      jsonb_build_object('resolution', resolution, 'reasonCode', reason_code, 'reasonDetail', trim(reason_detail), 'cancelledBy', actor));
    perform public.record_work_thread_event(changed, changed.version, 'WorkAssigned', 'work-thread.assigned.v1',
      jsonb_build_object(
        'sequence', changed.assignment_sequence, 'assigneeId', new_assignee, 'assignedBy', actor,
        'dueAt', new_due_at, 'reason', changed.assignment_reason
      ));
    return changed;
  end if;

  if resolution = 'release_to_pool' then
    update public.work_threads
       set lifecycle = 'Unassigned', current_assignee_id = null, assigned_by = null, assigned_at = null,
           due_at = null, assignment_reason = null, acknowledged_at = null,
           renegotiation_requested_by = null, renegotiation_requested_at = null, renegotiation_reason = null,
           updated_at = now(), updated_by = actor, version = version + 2
     where id = target_work_thread_id and version = expected_record_version
     returning * into changed;

    perform public.record_work_thread_event(changed, changed.version - 1, 'DelegationCancelled', 'work-thread.delegation-cancelled.v1',
      jsonb_build_object('resolution', resolution, 'reasonCode', reason_code, 'reasonDetail', trim(reason_detail), 'cancelledBy', actor));
    perform public.record_work_thread_event(changed, changed.version, 'ReleasedToOpenPool', 'work-thread.released-to-open-pool.v1',
      jsonb_build_object('releasedAt', now()));
    return changed;
  end if;

  select id into escalate_to from public.users where lower(email) = lower(escalate_to_email);
  if escalate_to is null then
    raise exception using errcode = '42501', message = 'escalation_target_not_eligible';
  end if;

  update public.work_threads
     set renegotiation_requested_by = null, renegotiation_requested_at = null, renegotiation_reason = null,
         updated_at = now(), updated_by = actor, version = version + 2
   where id = target_work_thread_id and version = expected_record_version
   returning * into changed;

  perform public.record_work_thread_event(changed, changed.version - 1, 'DelegationCancelled', 'work-thread.delegation-cancelled.v1',
    jsonb_build_object('resolution', resolution, 'reasonCode', reason_code, 'reasonDetail', trim(reason_detail), 'cancelledBy', actor));
  perform public.record_work_thread_event(changed, changed.version, 'EscalatedForReassignment', 'work-thread.escalated-for-reassignment.v1',
    jsonb_build_object('escalatedTo', escalate_to, 'escalatedAt', now()));
  return changed;
end;
$$;

create or replace function public.claim_work(
  target_work_thread_id uuid,
  commitment_due_at timestamptz,
  reason text,
  expected_record_version integer
)
returns public.work_threads
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := public.current_identity_id();
  current_record public.work_threads;
  changed public.work_threads%rowtype;
begin
  current_record := public.lock_work_thread_for_command(target_work_thread_id, 'work.claim', expected_record_version);
  if current_record.lifecycle <> 'Unassigned' then
    raise exception using errcode = '55000', message = 'work_thread_not_unassigned';
  end if;
  if commitment_due_at <= now() or length(trim(reason)) = 0 then
    raise exception using errcode = '22023', message = 'invalid_assignment';
  end if;
  if actor is null or not public.is_active_project_member(current_record.project_id) then
    raise exception using errcode = '42501', message = 'permission_denied';
  end if;

  update public.work_threads
     set lifecycle = 'Assigned', current_assignee_id = actor, assigned_by = actor, assigned_at = now(),
         due_at = commitment_due_at, assignment_reason = trim(reason), acknowledged_at = now(),
         assignment_sequence = 1, updated_at = now(), updated_by = actor, version = version + 2
   where id = target_work_thread_id and version = expected_record_version
   returning * into changed;

  perform public.record_work_thread_event(changed, changed.version - 1, 'WorkAssigned', 'work-thread.assigned.v1',
    jsonb_build_object('sequence', 1, 'assigneeId', actor, 'assignedBy', actor, 'dueAt', commitment_due_at, 'reason', changed.assignment_reason));
  perform public.record_work_thread_event(changed, changed.version, 'AssignmentAcknowledged', 'work-thread.assignment-acknowledged.v1',
    jsonb_build_object('sequence', 1, 'acknowledgedBy', actor));
  return changed;
end;
$$;

revoke all on function
  public.start_work(uuid, integer),
  public.record_structured_update(uuid, text, text, integer),
  public.raise_blocker(uuid, text, text, text, text, timestamptz, integer),
  public.resolve_blocker(uuid, text, integer),
  public.change_due_date(uuid, timestamptz, text, integer),
  public.offer_outcome(uuid, text, integer),
  public.accept_outcome(uuid, integer),
  public.request_rework(uuid, text, integer),
  public.reopen_work(uuid, text, integer),
  public.cancel_work_thread(uuid, text, integer),
  public.request_recall(uuid, text, integer),
  public.retract_recall(uuid, integer),
  public.confirm_recall(uuid, text, timestamptz, text, integer),
  public.request_renegotiation(uuid, text, integer),
  public.adjust_terms(uuid, timestamptz, text, integer),
  public.cancel_delegation(uuid, text, text, text, text, timestamptz, text, integer),
  public.claim_work(uuid, timestamptz, text, integer)
from public, anon;

grant execute on function
  public.start_work(uuid, integer),
  public.record_structured_update(uuid, text, text, integer),
  public.raise_blocker(uuid, text, text, text, text, timestamptz, integer),
  public.resolve_blocker(uuid, text, integer),
  public.change_due_date(uuid, timestamptz, text, integer),
  public.offer_outcome(uuid, text, integer),
  public.accept_outcome(uuid, integer),
  public.request_rework(uuid, text, integer),
  public.reopen_work(uuid, text, integer),
  public.cancel_work_thread(uuid, text, integer),
  public.request_recall(uuid, text, integer),
  public.retract_recall(uuid, integer),
  public.confirm_recall(uuid, text, timestamptz, text, integer),
  public.request_renegotiation(uuid, text, integer),
  public.adjust_terms(uuid, timestamptz, text, integer),
  public.cancel_delegation(uuid, text, text, text, text, timestamptz, text, integer),
  public.claim_work(uuid, timestamptz, text, integer)
to authenticated;

insert into public.role_bundle_permissions (bundle_code, permission_code)
select 'startup_work_owner_admin', code
from public.permissions
where code in (
  'work.update', 'work.change_due_date', 'work.accept', 'work.reopen', 'work.claim',
  'work.request_recall', 'work.confirm_recall', 'work.retract_recall',
  'work.request_renegotiation', 'work.adjust_terms', 'work.cancel_delegation'
)
on conflict do nothing;

insert into public.role_bundle_permissions (bundle_code, permission_code)
select 'startup_assignee', code
from public.permissions
where code in (
  'work.update', 'work.claim', 'work.request_renegotiation'
)
on conflict do nothing;
