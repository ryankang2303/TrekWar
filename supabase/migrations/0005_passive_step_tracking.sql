-- Passive, ambient step/distance tracking, layered on top of the existing
-- explicit-recording model from Milestone 1. Steps accrue all day via
-- iOS's CMPedometer with zero user action; a client-side reconciliation
-- pass periodically inserts a normal `activities` row (source = 'passive')
-- for whatever steps aren't already covered by a recorded/imported session,
-- so it flows through the *existing* race fan-out trigger and stats
-- aggregation unchanged — no parallel accounting system needed.

alter type public.activity_source add value 'passive';

-- Tracks, per user, how far the passive reconciliation has already caught
-- up to — the next reconciliation only asks CMPedometer for steps *since*
-- this timestamp, so the same physical steps are never credited twice.
create table public.passive_step_checkpoints (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  last_checkpoint_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.passive_step_checkpoints enable row level security;

create policy "users can view their own passive checkpoint"
  on public.passive_step_checkpoints for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can upsert their own passive checkpoint"
  on public.passive_step_checkpoints for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update their own passive checkpoint"
  on public.passive_step_checkpoints for update
  to authenticated
  using (auth.uid() = user_id);
