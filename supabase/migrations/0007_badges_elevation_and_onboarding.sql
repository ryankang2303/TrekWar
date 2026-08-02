-- Milestone 5/6 prep: badge awarding on race completion, and making the
-- fan-out trigger elevation-aware so Ascent-tier races actually accrue
-- progress (from flights-climbed, once Milestone 6's HealthKit reconciler
-- starts feeding elevation_gain_meters — this migration just makes the
-- plumbing correct ahead of that).

-- ── award a badge (and mark the participant completed) once a race's
--    target is reached ─────────────────────────────────────────────────
-- Mirrors fan_out_activity_to_races's server-side philosophy: this reacts
-- to race_progress inserts regardless of source, so HealthKit/Strava-fed
-- progress earns badges the same way native/passive does, with no
-- client-side completion-checking logic needed anywhere.
create or replace function public.award_badge_on_race_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target numeric;
  v_tier public.race_tier;
  v_total numeric;
begin
  select rt.target_meters, rt.tier into v_target, v_tier
  from public.races r
  join public.race_templates rt on rt.id = r.template_id
  where r.id = new.race_id;

  select coalesce(sum(contributed_meters), 0) into v_total
  from public.race_progress
  where race_id = new.race_id and user_id = new.user_id;

  if v_total >= v_target then
    insert into public.badges (user_id, race_id, tier)
    values (new.user_id, new.race_id, v_tier)
    on conflict (user_id, race_id) do nothing;

    update public.race_participants
    set status = 'completed', completed_at = now()
    where race_id = new.race_id and user_id = new.user_id and status <> 'completed';
  end if;

  return new;
end;
$$;

create trigger race_progress_award_badge
  after insert on public.race_progress
  for each row execute function public.award_badge_on_race_completion();

-- ── elevation-aware fan-out ──────────────────────────────────────────────
-- Previously always credited distance_meters. Elevation-category races
-- (Ascent tier) need elevation_gain_meters instead, and should get no
-- progress row at all from an activity that carries no elevation reading
-- (distinct from a real zero-gain reading, which still records).
create or replace function public.fan_out_activity_to_races()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.race_progress (race_id, user_id, activity_id, contributed_meters)
  select
    rp.race_id,
    new.user_id,
    new.id,
    case when rt.category = 'elevation' then new.elevation_gain_meters else new.distance_meters end
  from public.race_participants rp
  join public.races r on r.id = rp.race_id
  join public.race_templates rt on rt.id = r.template_id
  where rp.user_id = new.user_id
    and rp.status = 'active'
    and (r.start_at is null or new.started_at >= r.start_at)
    and (rt.category <> 'elevation' or new.elevation_gain_meters is not null);
  return new;
end;
$$;

-- ── seed Ascent-tier races ───────────────────────────────────────────────
insert into public.race_templates (tier, category, name, description, target_meters) values
  ('ascent', 'elevation', 'Climb Kilimanjaro', 'Africa''s tallest peak, base to summit.', 5895),
  ('ascent', 'elevation', 'Climb Everest', 'Sea level to the roof of the world.', 8849);

insert into public.races (template_id, is_private, name)
select id, false, name from public.race_templates where tier = 'ascent';
