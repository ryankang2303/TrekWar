import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { reconcilePassiveSteps } from '../lib/passiveStepTracking';
import { isRecordingInProgress } from '../lib/recordingGate';

/**
 * Keeps a signed-in user's passive step/distance total caught up — on
 * mount and every time the app returns to the foreground. Skips itself
 * while a Track session is active/paused (see recordingGate) so that
 * session's own Save remains the single source of truth for its steps.
 */
export function usePassiveStepSync(userId: string | undefined) {
  const runningRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

    const run = async () => {
      if (runningRef.current || isRecordingInProgress()) return;
      runningRef.current = true;
      try {
        await reconcilePassiveSteps(userId);
      } catch (error) {
        console.error('[usePassiveStepSync] reconciliation failed', error);
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
