import type { Database } from './database.types';
import { dayKey } from './activityStats';

type Activity = Database['public']['Tables']['activities']['Row'];

/**
 * Consecutive-day activity streak, ending today (or yesterday, if nothing's
 * logged yet today — that shouldn't zero out an otherwise-live streak).
 *
 * Allows exactly one gap day before the streak ends — a single
 * lifetime-per-run "streak freeze" (MVP.md §6), not an earn/spend economy:
 * the first gap encountered scanning backward is forgiven, the next one
 * ends the count. Simpler than tracking freeze inventory, and still means
 * one missed day never nukes an otherwise-consistent streak.
 */
export function currentStreakDays(activities: Activity[], today: Date = new Date()): number {
  const days = new Set(activities.map((a) => dayKey(new Date(a.started_at))));

  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  let freezeUsed = false;
  while (true) {
    const key = dayKey(cursor);
    if (days.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (!freezeUsed) {
      freezeUsed = true;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
