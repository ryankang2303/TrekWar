-- Milestone 5/6: rival-proximity push ("Sarah just passed you") and
-- HealthKit flights-climbed reconciliation checkpoints.
--
-- The push send uses pg_net to call Expo's push API directly from a
-- trigger, rather than a separately-deployed Edge Function — same outcome
-- (MVP.md §6's "single highest-leverage push notification"), one fewer
-- deployment surface, and it's verifiable the same way every other
-- trigger in this schema is: by actually running this SQL and watching it
-- succeed or fail, not by hoping a blind deploy worked.

create extension if not exists pg_net;

-- ── push token registry ──────────────────────────────────────────────────
create table public.push_tokens (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  expo_push_token text not null,
  updated_at timestamptz not null default now()
);

alter table public.push_tokens enable row level security;

create policy "users can manage their own push token"
  on public.push_tokens for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── rival-overtake notification ──────────────────────────────────────────
-- Fires after every race_progress insert (any source — native, passive,
-- future HealthKit/Strava — same "server-side so every source gets it for
-- free" reasoning as fan_out_activity_to_races). Compares the inserting
-- user's race total just before vs. just after this row to find rivals who
-- were ahead and no longer are, and pushes each of them a heads-up.
-- SECURITY DEFINER so it can read every participant's push_tokens row
-- regardless of that table's owner-only RLS.
create or replace function public.notify_rival_overtake()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prior_total numeric;
  v_new_total numeric;
  v_inserter_name text;
  v_race_name text;
  v_rival record;
begin
  select coalesce(sum(contributed_meters), 0) into v_prior_total
  from public.race_progress
  where race_id = new.race_id and user_id = new.user_id and id <> new.id;

  v_new_total := v_prior_total + new.contributed_meters;

  -- No one to overtake if this insert didn't move the inserter's total.
  if v_new_total <= v_prior_total then
    return new;
  end if;

  select display_name into v_inserter_name from public.profiles where id = new.user_id;
  select coalesce(r.name, rt.name) into v_race_name
  from public.races r join public.race_templates rt on rt.id = r.template_id
  where r.id = new.race_id;

  for v_rival in
    select rp.user_id, coalesce(sum(prog.contributed_meters), 0) as total, pt.expo_push_token
    from public.race_participants rp
    join public.push_tokens pt on pt.user_id = rp.user_id
    left join public.race_progress prog on prog.race_id = rp.race_id and prog.user_id = rp.user_id
    where rp.race_id = new.race_id
      and rp.status = 'active'
      and rp.user_id <> new.user_id
    group by rp.user_id, pt.expo_push_token
    having coalesce(sum(prog.contributed_meters), 0) > v_prior_total
       and coalesce(sum(prog.contributed_meters), 0) <= v_new_total
  loop
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'to', v_rival.expo_push_token,
        'title', 'Trekwar',
        'body', coalesce(v_inserter_name, 'Someone') || ' just passed you in ' || coalesce(v_race_name, 'a race') || '!'
      )
    );
  end loop;

  return new;
end;
$$;

create trigger race_progress_notify_rival_overtake
  after insert on public.race_progress
  for each row execute function public.notify_rival_overtake();

-- ── HealthKit reconciliation checkpoint ─────────────────────────────────
-- Structurally identical to passive_step_checkpoints (0005) — same
-- per-user checkpoint pattern, separate table since it tracks a distinct
-- source/cursor (flights-climbed via HealthKit, not steps via CMPedometer).
create table public.healthkit_checkpoints (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  last_checkpoint_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.healthkit_checkpoints enable row level security;

create policy "users can manage their own healthkit checkpoint"
  on public.healthkit_checkpoints for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
