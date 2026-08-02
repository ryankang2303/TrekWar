import * as Notifications from 'expo-notifications';

import { supabase } from './supabase';

const DAILY_REMINDER_ID = 'daily-reminder';

// Governs how a notification that arrives while the app is foregrounded is
// presented — without this, foreground notifications are silently dropped.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function registerPushToken(userId: string): Promise<void> {
  // projectId defaults to app.json's extra.eas.projectId — no need to pass it.
  const token = await Notifications.getExpoPushTokenAsync();
  await supabase.from('push_tokens').upsert({ user_id: userId, expo_push_token: token.data });
}

async function ensureDailyReminder(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  if (scheduled.some((n) => n.identifier === DAILY_REMINDER_ID)) return;

  // Static reminder, not conditioned on "no activity logged yet today" —
  // that would need a background task to check, which the project's own
  // decision log already rejected for battery/App-Review reasons (see
  // CLAUDE.md's all-day-background-GPS rejection; same tradeoff applies
  // here).
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: 'Trekwar',
      body: "Don't forget to get your steps in today!",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 18,
      minute: 0,
    },
  });
}

/**
 * Requests notification permission, registers this device's push token
 * (needed for server-triggered rival-overtake pushes — see migration
 * 0008's notify_rival_overtake), and ensures the daily reminder is
 * scheduled. Safe to call on every app start — every step is idempotent.
 */
export async function ensureNotificationSetup(userId: string): Promise<void> {
  const granted = await ensurePermission();
  if (!granted) return;
  await Promise.all([registerPushToken(userId), ensureDailyReminder()]);
}

/**
 * Fires an immediate local notification — used for milestone-crossing
 * alerts, fired the moment they're computed client-side (see
 * raceStats.ts's crossedMilestonesBetween), alongside the existing Alert.
 */
export async function notifyLocally(title: string, body: string): Promise<void> {
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;
  await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
}
