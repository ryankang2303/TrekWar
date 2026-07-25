-- Trekwar first-pass schema (Milestone 0)
-- Sketch, expected to evolve as later milestones land. See MVP.md and MILESTONES.md.

-- ── profiles ────────────────────────────────────────────────────────────
-- One row per auth.users, holding public-facing fields.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are viewable by any authenticated user"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- ── activities ──────────────────────────────────────────────────────────
-- A single completed walk/run session, from any source.
create type public.activity_type as enum ('walk', 'run');
create type public.activity_source as enum ('native', 'healthkit', 'strava');

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.activity_type not null,
  source public.activity_source not null default 'native',
  distance_meters numeric not null check (distance_meters >= 0),
  duration_seconds integer not null check (duration_seconds >= 0),
  steps integer check (steps >= 0),
  elevation_gain_meters numeric check (elevation_gain_meters >= 0),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  external_id text, -- e.g. Strava activity id, for de-duplication on import
  created_at timestamptz not null default now(),
  unique (source, external_id)
);

create index activities_user_id_started_at_idx on public.activities (user_id, started_at desc);

alter table public.activities enable row level security;

create policy "users can view their own activities"
  on public.activities for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can insert their own activities"
  on public.activities for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update their own activities"
  on public.activities for update
  to authenticated
  using (auth.uid() = user_id);

create policy "users can delete their own activities"
  on public.activities for delete
  to authenticated
  using (auth.uid() = user_id);

-- ── race_templates ──────────────────────────────────────────────────────
-- The tier catalog from MVP.md section 4.4 (Trailblazer .. Legend, plus Ascent).
create type public.race_tier as enum
  ('trailblazer', 'pacesetter', 'voyager', 'odyssey', 'mythic', 'legend', 'ascent');
create type public.race_category as enum ('distance', 'elevation');

create table public.race_templates (
  id uuid primary key default gen_random_uuid(),
  tier public.race_tier not null,
  category public.race_category not null default 'distance',
  name text not null,
  description text,
  target_meters numeric not null check (target_meters > 0),
  background_image_url text,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.race_templates enable row level security;

create policy "race templates are viewable by any authenticated user"
  on public.race_templates for select
  to authenticated
  using (true);

-- ── races ───────────────────────────────────────────────────────────────
-- A concrete race instance: either the always-open public lobby for a
-- template, or a private race a user created from one.
create table public.races (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.race_templates (id),
  is_private boolean not null default false,
  created_by uuid references public.profiles (id),
  name text, -- override display name, defaults to template name
  invite_code text unique,
  start_at timestamptz, -- private races: synced start; public: null (join-anytime)
  created_at timestamptz not null default now()
);

alter table public.races enable row level security;

create policy "public races are viewable by any authenticated user"
  on public.races for select
  to authenticated
  using (not is_private);

create policy "authenticated users can create races"
  on public.races for insert
  to authenticated
  with check (auth.uid() = created_by);

-- ── race_participants ──────────────────────────────────────────────────
create type public.race_participant_status as enum ('active', 'completed');

create table public.race_participants (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.races (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.race_participant_status not null default 'active',
  joined_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (race_id, user_id)
);

alter table public.race_participants enable row level security;

create policy "participants viewable by other participants in the same race"
  on public.race_participants for select
  to authenticated
  using (
    exists (
      select 1 from public.race_participants self
      where self.race_id = race_participants.race_id and self.user_id = auth.uid()
    )
  );

create policy "users can join races as themselves"
  on public.race_participants for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "private races are viewable by their participants"
  on public.races for select
  to authenticated
  using (
    is_private and exists (
      select 1 from public.race_participants rp
      where rp.race_id = races.id and rp.user_id = auth.uid()
    )
  );

create policy "users can update their own participation"
  on public.race_participants for update
  to authenticated
  using (auth.uid() = user_id);

-- ── race_progress ───────────────────────────────────────────────────────
-- Append-only ledger: one row per activity's contribution to a race a user
-- had joined at the time. Totals are derived via SUM, never mutated in place.
create table public.race_progress (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.races (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete cascade,
  contributed_meters numeric not null check (contributed_meters >= 0),
  recorded_at timestamptz not null default now()
);

create index race_progress_race_user_idx on public.race_progress (race_id, user_id);

alter table public.race_progress enable row level security;

create policy "progress viewable by other participants in the same race"
  on public.race_progress for select
  to authenticated
  using (
    exists (
      select 1 from public.race_participants rp
      where rp.race_id = race_progress.race_id and rp.user_id = auth.uid()
    )
  );

create policy "users can insert their own progress"
  on public.race_progress for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ── friendships ─────────────────────────────────────────────────────────
create type public.friendship_status as enum ('pending', 'accepted', 'blocked');

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status public.friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

alter table public.friendships enable row level security;

create policy "users can view friendships they're part of"
  on public.friendships for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "users can send friend requests"
  on public.friendships for insert
  to authenticated
  with check (auth.uid() = requester_id);

create policy "addressee can respond to a friend request"
  on public.friendships for update
  to authenticated
  using (auth.uid() = addressee_id or auth.uid() = requester_id);

-- ── badges ──────────────────────────────────────────────────────────────
create table public.badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  race_id uuid not null references public.races (id) on delete cascade,
  tier public.race_tier not null,
  awarded_at timestamptz not null default now(),
  unique (user_id, race_id)
);

alter table public.badges enable row level security;

create policy "badges are viewable by any authenticated user"
  on public.badges for select
  to authenticated
  using (true);

create policy "badges are inserted by the owning user"
  on public.badges for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ── kudos ───────────────────────────────────────────────────────────────
-- One-tap reaction on an activity or a race milestone (race_progress row).
create table public.kudos (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  activity_id uuid references public.activities (id) on delete cascade,
  race_progress_id uuid references public.race_progress (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (
    (activity_id is not null and race_progress_id is null) or
    (activity_id is null and race_progress_id is not null)
  ),
  unique (from_user_id, activity_id),
  unique (from_user_id, race_progress_id)
);

alter table public.kudos enable row level security;

create policy "kudos are viewable by any authenticated user"
  on public.kudos for select
  to authenticated
  using (true);

create policy "users can give kudos as themselves"
  on public.kudos for insert
  to authenticated
  with check (auth.uid() = from_user_id);
