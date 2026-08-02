import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { reconcileFlightsClimbed } from '../lib/healthKitTracking';

/**
 * Keeps a signed-in user's HealthKit flights-climbed total caught up — on
 * mount and every time the app returns to the foreground. Same pattern as
 * usePassiveStepSync, but doesn't need recordingGate: a Track session
 * covers GPS distance/steps, never elevation, so there's nothing for a
 * HealthKit reconciliation pass to conflict with mid-session.
 */
export function useHealthKitSync(userId: string | undefined) {
  const runningRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

    const run = async () => {
      if (runningRef.current) return;
      runningRef.current = true;
      try {
        await reconcileFlightsClimbed(userId);
      } catch (error) {
        console.error('[useHealthKitSync] reconciliation failed', error);
      } finally {
        runningRef.current = false;
      }
    };

    run();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') run();
    });
    return () => subscription.remove();
  }, [userId]);
}
