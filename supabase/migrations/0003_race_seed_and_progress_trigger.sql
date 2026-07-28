-- Milestone 3: seed an initial public race catalog (a handful across tiers,
-- per MILESTONES.md — not the full MVP.md 4.4 table) and wire activities to
-- automatically credit every race a user has joined, server-side, so future
-- data sources (HealthKit/Strava) get this for free without duplicating
-- client-side logic.

insert into public.race_templates (tier, category, name, description, target_meters) values
  ('trailblazer', 'distance', 'Length of the Las Vegas Strip', 'The full stretch of Las Vegas Boulevard''s casino corridor.', 6759),
  ('trailblazer', 'distance', 'Loop Central Park', 'One lap of the park''s outer loop road.', 9817),
  ('pacesetter', 'distance', 'Half Marathon', 'The classic 13.1 mile distance.', 21097.5),
  ('pacesetter', 'distance', 'Full Marathon', 'The classic 26.2 mile distance.', 42195),
  ('voyager', 'distance', 'Grand Canyon Rim-to-Rim-and-Back', 'Down to the Colorado River and back up both rims.', 77249),
  ('odyssey', 'distance', 'Length of the Grand Canyon', 'End to end along its 277-mile span.', 445843),
  ('mythic', 'distance', 'Land''s End to John o''Groats', 'The classic end-to-end trek across Great Britain.', 1406566),
  ('legend', 'distance', 'Coast to Coast USA', 'From the Atlantic to the Pacific.', 4506163);

-- One always-open public lobby per seeded template.
insert into public.races (template_id, is_private, name)
select id, false, name from public.race_templates;

create or replace function public.fan_out_activity_to_races()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.race_progress (race_id, user_id, activity_id, contributed_meters)
  select rp.race_id, new.user_id, new.id, new.distance_meters
  from public.race_participants rp
  where rp.user_id = new.user_id
    and rp.status = 'active';
  return new;
end;
$$;

create trigger activities_fan_out_to_races
  after insert on public.activities
  for each row execute function public.fan_out_activity_to_races();
