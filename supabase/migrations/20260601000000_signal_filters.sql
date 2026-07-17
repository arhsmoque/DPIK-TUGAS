-- Per-user signal filter phrases for the WhatsApp bridge.
-- Each staff member starts with the 19 default phrases; they can add/remove via the app.

-- 1. Extend match_reason to accept 'signal' ──────────────────────────────────
-- Cannot drop/recreate a check constraint in place; alter the column via a new constraint.
alter table public.task_candidates
  drop constraint if exists task_candidates_match_reason_check;

alter table public.task_candidates
  add constraint task_candidates_match_reason_check
    check (match_reason in ('name', 'project', 'signal'));

-- 2. Per-user signal filter table ────────────────────────────────────────────
create table if not exists public.user_signal_filters (
  staff_email  text primary key,
  phrases      text[] not null default '{}',
  updated_at   timestamptz not null default now()
);

alter table public.user_signal_filters enable row level security;

-- Owner can read and update their own row. Service role has full access.
drop policy if exists "owner read signal filters"   on public.user_signal_filters;
drop policy if exists "owner update signal filters"  on public.user_signal_filters;
drop policy if exists "service_role signal filters"  on public.user_signal_filters;

create policy "owner read signal filters" on public.user_signal_filters
  for select to anon using (true);

create policy "owner update signal filters" on public.user_signal_filters
  for update to anon using (true) with check (array_length(phrases, 1) <= 25);

create policy "service_role signal filters" on public.user_signal_filters
  for all to service_role using (true) with check (true);

-- updated_at trigger
drop trigger if exists trg_signal_filters_touch on public.user_signal_filters;
create trigger trg_signal_filters_touch before update on public.user_signal_filters
  for each row execute function public.touch_updated_at();

-- 3. Seed defaults for all staff ─────────────────────────────────────────────
insert into public.user_signal_filters (staff_email, phrases) values
  ('rahman@dpik.com.my', array[
    'tolong','mohon','sila ','please','urgent','segera','asap','deadline',
    'follow up','follow-up','followup','hantar','submit','siapkan','prepare',
    'confirm','confirmkan','kena buat','perlu buat','minta tolong'
  ]),
  ('aizat@dpik.com.my', array[
    'tolong','mohon','sila ','please','urgent','segera','asap','deadline',
    'follow up','follow-up','followup','hantar','submit','siapkan','prepare',
    'confirm','confirmkan','kena buat','perlu buat','minta tolong'
  ]),
  ('hamid@dpik.com.my', array[
    'tolong','mohon','sila ','please','urgent','segera','asap','deadline',
    'follow up','follow-up','followup','hantar','submit','siapkan','prepare',
    'confirm','confirmkan','kena buat','perlu buat','minta tolong'
  ])
on conflict (staff_email) do nothing;
