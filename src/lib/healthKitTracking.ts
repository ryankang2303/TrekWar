import {
  isHealthDataAvailableAsync,
  requestAuthorization,
  queryStatisticsForQuantity,
} from '@kingstinct/react-native-healthkit';

import { supabase } from './supabase';

// Apple Health's own approximation for its flights-climbed → elevation
// display; matched here for consistency with what the Health app shows.
const METERS_PER_FLIGHT = 3;

let authorizationRequested = false;

async function ensureAuthorized(): Promise<boolean> {
  const available = await isHealthDataAvailableAsync();
  if (!available) return false;

  if (!authorizationRequested) {
    // HealthKit deliberately never reports back whether *read* access was
    // actually granted (Apple's own privacy design for read scopes) — this
    // resolving just means the prompt was shown or already decided. A real
    // query below is the only way to find out whether it returns data.
    await requestAuthorization({ toRead: ['HKQuantityTypeIdentifierFlightsClimbed'] });
    authorizationRequested = true;
  }
  return true;
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

async function getCheckpoint(userId: string): Promise<Date> {
  const { data } = await supabase
    .from('healthkit_checkpoints')
    .select('last_checkpoint_at')
    .eq('user_id', userId)
    .maybeSingle();
  // First run ever: start from today, same reasoning as passiveStepTracking
  // — there's no record of what "caught up" means before this point.
  return data ? new Date(data.last_checkpoint_at) : startOfLocalDay(new Date());
}

async function setCheckpoint(userId: string, at: Date): Promise<void> {
  await supabase
    .from('healthkit_checkpoints')
    .upsert({ user_id: userId, last_checkpoint_at: at.toISOString() });
}

/**
 * Credits flights climbed in [start, end) as a single 'healthkit' activity
 * with elevation_gain_meters set. Unlike passive step reconciliation, there's
 * no "subtract what's already covered" step — nothing else in the app
 * currently produces elevation data, so there's no double-counting risk to
 * guard against. Assumes [start, end) doesn't cross a local-day boundary
 * (the caller splits on that).
 */
async function reconcileWindow(userId: string, start: Date, end: Date): Promise<void> {
  if (end <= start) return;

  const stats = await queryStatisticsForQuantity(
    'HKQuantityTypeIdentifierFlightsClimbed',
    ['cumulativeSum'],
    { filter: { date: { startDate: start, endDate: end } }, unit: 'count' }
  );
  const flights = stats.sumQuantity?.quantity ?? 0;
  if (flights <= 0) return;

  await supabase.from('activities').insert({
    user_id: userId,
    type: 'walk',
    source: 'healthkit',
    distance_meters: 0,
    duration_seconds: Math.round((end.getTime() - start.getTime()) / 1000),
    steps: 0,
    elevation_gain_meters: flights * METERS_PER_FLIGHT,
    started_at: start.toISOString(),
    ended_at: end.toISOString(),
  });
}

/**
 * Catches a user's HealthKit flights-climbed total up to now, since
 * whenever it was last reconciled. Safe to call often (e.g. every
 * foreground) — it's a no-op if there's nothing new or HealthKit isn't
 * available/authorized.
 */
export async function reconcileFlightsClimbed(userId: string): Promise<void> {
  const canProceed = await ensureAuthorized();
  if (!canProceed) return;

  const now = new Date();
  const checkpoint = await getCheckpoint(userId);
  if (checkpoint >= now) return;

  // Segment by local calendar day, same reasoning as passiveStepTracking —
  // attributes each day's climbing to the correct date on Home/Stats
  // instead of dumping a multi-day window onto a single day.
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
