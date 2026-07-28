import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

export const LOCATION_TASK_NAME = 'trekwar-background-location';

type LocationUpdateListener = (locations: Location.LocationObject[]) => void;

let listener: LocationUpdateListener | null = null;

/** The active Track session (if any) registers itself here to receive fixes
 *  reported by the background task, including while the app is backgrounded. */
export function setLocationUpdateListener(fn: LocationUpdateListener | null) {
  listener = fn;
}

// Must be defined at module scope so it's registered before the JS bundle's
// background launch path needs it, per expo-location's TaskManager contract.
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[locationTask] background location error', error);
    return;
  }
  const { locations } = (data ?? {}) as { locations?: Location.LocationObject[] };
  if (locations?.length) listener?.(locations);
});
