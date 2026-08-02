-- Milestone 4: friends & private races. The tables/columns this needs
-- (friendships, races.is_private/invite_code/created_by/start_at) were
-- already sketched in 0001_init.sql — this migration only closes real gaps.

-- ── join a private race by invite code ─────────────────────────────────
-- A non-participant can't SELECT a private race under existing RLS (see
-- 0004's "private races are viewable by their participants" policy) — a
-- chicken-and-egg problem for someone who only has an invite code. This
-- function bypasses RLS (same SECURITY DEFINER pattern as
-- is_race_participant) to look the race up by code and join the caller.
create or replace function public.join_race_by_invite_code(p_code text)
returns public.races
language plpgsql
security definer
set search_path = public
as $$
declare
  v_race public.races;
begin
  select * into v_race from public.races
  where invite_code = p_code and is_private = true;

  if not found then
    raise exception 'No private race found for that invite code';
  end if;

  insert into public.race_participants (race_id, user_id)
  values (v_race.id, auth.uid())
  on conflict (race_id, user_id) do nothing;

  return v_race;
end;
$$;

-- ── synced-start fairness fix ───────────────────────────────────────────
-- MVP.md's decision log: private-race participants "start at 0 by default,
-- all beginning from the same moment — no mid-race pace handicap." The
-- original trigger (0003) credited any active participant's activity
-- regardless of the race's start_at, so an activity logged before a private
-- race's scheduled start would have incorrectly counted. Public races always
-- have start_at is null (0003's seed), so this is a no-op for them.
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
  join public.races r on r.id = rp.race_id
  where rp.user_id = new.user_id
    and rp.status = 'active'
    and (r.start_at is null or new.started_at >= r.start_at);
  return new;
end;
$$;

-- ── friends-only lifetime distance aggregate ────────────────────────────
-- The friends leaderboard needs each friend's lifetime distance, but
-- activities' RLS only allows viewing your own rows (correctly — that table
-- holds granular session data). Rather than relaxing that, expose only the
-- aggregate to accepted friends.
create or replace function public.get_friends_lifetime_distance()
returns table(user_id uuid, lifetime_meters numeric)
language sql
stable
security definer
set search_path = public
as $$
  select a.user_id, sum(a.distance_meters) as lifetime_meters
  from public.activities a
  where a.user_id = auth.uid()
     or a.user_id in (
       select case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
       from public.friendships f
       where f.status = 'accepted'
         and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
     )
  group by a.user_id;
$$;

-- ── decline / cancel a friend request ───────────────────────────────────
-- No "declined" status in the friendship_status enum — deleting the row is
-- simpler than adding one, and covers both declining an incoming request
-- and cancelling one you sent.
create policy "users can delete friendships they're part of"
  on public.friendships for delete
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
