-- Repair WP-110 first-divergence lint failure: the original RPC parameter name
-- collided with work_threads.assignment_reason. Drop/recreate changes only the
-- exposed parameter name; the command contract and stored data are unchanged.

drop function if exists public.assign_work(uuid, text, timestamptz, text, integer);

create function public.assign_work(
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

revoke all on function public.assign_work(uuid, text, timestamptz, text, integer)
  from public, anon;
grant execute on function public.assign_work(uuid, text, timestamptz, text, integer)
  to authenticated;
