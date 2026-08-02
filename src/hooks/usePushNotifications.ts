import { useEffect } from 'react';

import { ensureNotificationSetup } from '../lib/notifications';

/**
 * Requests notification permission and registers this device's push token
 * once a signed-in profile exists. Runs once per userId change — unlike
 * usePassiveStepSync, this doesn't need to re-run on every foreground
 * (permission state and the daily reminder don't change that often).
 */
export function usePushNotifications(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    ensureNotificationSetup(userId).catch((error) =>
      console.error('[usePushNotifications] setup failed', error)
    );
  }, [userId]);
}
