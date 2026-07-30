import { Pedometer } from 'expo-sensors';

import { supabase } from './supabase';
import { stepsToMeters } from './geo';

// iOS's CMPedometer only retains ~7 days of history; stay well under that so
// a stale checkpoint (e.g. after a week away from the app) doesn't waste a
// query on a range Apple has already discarded.
const MAX_LOOKBACK_MS = 6 * 24 * 60 * 60 * 1000;

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

async function getCheckpoint(userId: string): Promise<Date> {
  const { data } = await supabase
    .from('passive_step_checkpoints')
    .select('last_checkpoint_at')
    .eq('user_id', userId)
    .maybeSingle();
  // First run ever: start from today rather than guessing further back —
  // there's no record of what "caught up" means before this point.
  return data ? new Date(data.last_checkpoint_at) : startOfLocalDay(new Date());
}

async function setCheckpoint(userId: string, at: Date): Promise<void> {
  await supabase
    .from('passive_step_checkpoints')
    .upsert({ user_id: userId, last_checkpoint_at: at.toISOString() });
}

/**
 * Credits whatever steps in [start, end) aren't already covered by a
 * recorded/imported session as a single 'passive' activity — reusing the
 * existing activities table and race fan-out trigger rather than a parallel
 * accounting system. Assumes [start, end) doesn't cross a local-day
 * boundary (the caller splits on that).
 */
async function reconcileWindow(userId: string, start: Date, end: Date): Promise<void> {
  if (end <= start) return;

  const { steps: windowSteps } = await Pedometer.getStepCountAsync(start, end);
  if (windowSteps <= 0) return;

  // Any session (native recording, or a future Strava/HealthKit import)
  // already has GPS- or device-reported steps for the time it covers —
  // subtract those out so the same physical steps aren't credited twice.
  const { data: sessions } = await supabase
    .from('activities')
    .select('steps')
    .eq('user_id', userId)
    .neq('source', 'passive')
    .gte('started_at', start.toISOString())
    .lt('started_at', end.toISOString());

  const sessionSteps = (sessions ?? []).reduce((sum, a) => sum + (a.steps ?? 0), 0);
  const passiveSteps = Math.max(0, windowSteps - sessionSteps);
  if (passiveSteps <= 0) return;

  await supabase.from('activities').insert({
    user_id: userId,
    type: 'walk',
    source: 'passive',
    distance_meters: stepsToMeters(passiveSteps),
    duration_seconds: Math.round((end.getTime() - start.getTime()) / 1000),
    steps: passiveSteps,
    started_at: start.toISOString(),
    ended_at: end.toISOString(),
  });
}

/**
 * Catches a user's passive step total up to now, since whenever it was last
 * reconciled. Safe to call often (e.g. every foreground) — it's a no-op if
 * there's nothing new. Callers should skip calling this while a Track
 * session is active/paused (see recordingGate) since that session's own
 * Save is the accurate source for its steps.
 */
export async function reconcilePassiveSteps(userId: string): Promise<void> {
  const now = new Date();
  let checkpoint = await getCheckpoint(userId);

  const earliestUseful = new Date(now.getTime() - MAX_LOOKBACK_MS);
  if (checkpoint < earliestUseful) checkpoint = earliestUseful;
  if (checkpoint >= now) return;

  const available = await Pedometer.isAvailableAsync();
  if (!available) return;

  // Segment by local calendar day so a window spanning midnight — the
  // common case, since the first reconciliation of a new day covers
  // "yesterday's last check-in through this morning" — attributes each
  // day's steps to the correct date instead of dumping them all on
  // whichever day the window started.
  let segmentStart = checkpoint;
  while (segmentStart < now) {
    const nextMidnight = new Date(
      segmentStart.getFullYear(),
      segmentStart.getMonth(),
      segmentStart.getDate() + 1
    );
    const segmentEnd = nextMidnight < now ? nextMidnight : now;
    await reconcileWindow(userId, segmentStart, segmentEnd);
    segmentStart = segmentEnd;
  }

  await setCheckpoint(userId, now);
}
