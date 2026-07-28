-- Bugfix: the original race_participants SELECT policy (0001_init.sql)
-- checks "am I a participant of this race" via a subquery against
-- race_participants itself, which re-triggers the same RLS policy on the
-- inner scan — Postgres reports "infinite recursion detected in policy for
-- relation race_participants". This transitively broke every other policy
-- that also checks participation via a race_participants subquery (races'
-- private-race policy, race_progress's policy), even though only
-- race_participants itself is self-referential.
--
-- Fix: move the check into a SECURITY DEFINER function. As the owning
-- role (which is not subject to RLS on tables it owns, since none of these
-- tables have FORCE ROW LEVEL SECURITY set), the function's internal query
-- bypasses RLS entirely, breaking the recursion.

create or replace function public.is_race_participant(p_race_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.race_participants
    where race_id = p_race_id and user_id = p_user_id
  );
$$;

drop policy if exists "participants viewable by other participants in the same race" on public.race_participants;
create policy "participants viewable by other participants in the same race"
  on public.race_participants for select
  to authenticated
  using (public.is_race_participant(race_id, auth.uid()));

drop policy if exists "private races are viewable by their participants" on public.races;
create policy "private races are viewable by their participants"
  on public.races for select
  to authenticated
  using (is_private and public.is_race_participant(id, auth.uid()));

drop policy if exists "progress viewable by other participants in the same race" on public.race_progress;
create policy "progress viewable by other participants in the same race"
  on public.race_progress for select
  to authenticated
  using (public.is_race_participant(race_id, auth.uid()));
