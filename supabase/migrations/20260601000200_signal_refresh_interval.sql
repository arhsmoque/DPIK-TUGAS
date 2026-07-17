-- Add per-user refresh interval to signal filters.
-- Valid values: 5, then 15-min increments up to 180 (enforced by app UI; DB stores the integer).

alter table public.user_signal_filters
  add column if not exists refresh_interval_min integer not null default 30;

-- Constrain to allowed values: 5 or any multiple of 15 from 15 to 180.
alter table public.user_signal_filters
  drop constraint if exists signal_filters_interval_check;

alter table public.user_signal_filters
  add constraint signal_filters_interval_check
    check (
      refresh_interval_min = 5
      or (refresh_interval_min % 15 = 0 and refresh_interval_min between 15 and 180)
    );

-- Update RLS update policy to also gate interval range (redundant with check but explicit).
drop policy if exists "owner update signal filters" on public.user_signal_filters;
create policy "owner update signal filters" on public.user_signal_filters
  for update to anon using (true)
  with check (
    array_length(phrases, 1) <= 25
    and (
      refresh_interval_min = 5
      or (refresh_interval_min % 15 = 0 and refresh_interval_min between 15 and 180)
    )
  );
