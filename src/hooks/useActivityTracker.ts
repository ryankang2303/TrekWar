import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { Pedometer } from 'expo-sensors';

import { LOCATION_TASK_NAME, setLocationUpdateListener } from '../lib/locationTask';
import { GeoPoint, classifyActivityType, evaluateFix } from '../lib/geo';

export type ActivityStatus = 'idle' | 'active' | 'paused';

export interface ActivitySnapshot {
  status: ActivityStatus;
  elapsedSeconds: number;
  distanceMeters: number;
  steps: number;
  type: 'walk' | 'run';
}

export interface CompletedActivity {
  distanceMeters: number;
  durationSeconds: number;
  steps: number;
  type: 'walk' | 'run';
  startedAt: Date;
  endedAt: Date;
}

const INITIAL_SNAPSHOT: ActivitySnapshot = {
  status: 'idle',
  elapsedSeconds: 0,
  distanceMeters: 0,
  steps: 0,
  type: 'walk',
};

export function useActivityTracker() {
  const [snapshot, setSnapshot] = useState<ActivitySnapshot>(INITIAL_SNAPSHOT);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const lastFixRef = useRef<GeoPoint | null>(null);
  const distanceMetersRef = useRef(0);
  const stepsBaselineRef = useRef(0);
  const stepsRef = useRef(0);
  const activeMsAccumulatedRef = useRef(0);
  const activeStartedAtRef = useRef<number | null>(null);
  const startedAtRef = useRef<Date | null>(null);
  const stepsSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentElapsedMs = () =>
    activeMsAccumulatedRef.current +
    (activeStartedAtRef.current ? Date.now() - activeStartedAtRef.current : 0);

  const publish = useCallback((status: ActivityStatus) => {
    const elapsedSeconds = currentElapsedMs() / 1000;
    setSnapshot({
      status,
      elapsedSeconds,
      distanceMeters: distanceMetersRef.current,
      steps: stepsRef.current,
      type: classifyActivityType(distanceMetersRef.current, elapsedSeconds),
    });
  }, []);

  // Register once: the background task (defined at module scope in
  // locationTask.ts) forwards every fix it receives, foreground or
  // background, to whichever tracker instance is currently mounted.
  useEffect(() => {
    setLocationUpdateListener((locations) => {
      for (const loc of locations) {
        const point: GeoPoint = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestampMs: loc.timestamp,
          accuracyMeters: loc.coords.accuracy ?? null,
        };
        const { accepted, distanceMeters } = evaluateFix(lastFixRef.current, point);
        if (accepted) {
          distanceMetersRef.current += distanceMeters;
          lastFixRef.current = point;
        }
      }
    });
    return () => setLocationUpdateListener(null);
  }, []);

  useEffect(
    () => () => {
      if (tickRef.current) clearInterval(tickRef.current);
      stepsSubscriptionRef.current?.remove();
      Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).then((started) => {
        if (started) Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      });
    },
    []
  );

  // iOS shows the "Always Allow" upgrade dialog on its own schedule, not
  // synchronously in response to requestBackgroundPermissionsAsync() — so a
  // one-time check at start() can go stale. Re-check whenever the app
  // returns to the foreground (i.e. right after the user would have
  // responded to that dialog) and clear the warning once it's actually granted.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState !== 'active') return;
      const background = await Location.getBackgroundPermissionsAsync();
      if (background.status === 'granted') setPermissionError(null);
    });
    return () => subscription.remove();
  }, []);

  const beginStepWatch = useCallback(async () => {
    const available = await Pedometer.isAvailableAsync();
    if (!available) return;
    stepsBaselineRef.current = stepsRef.current;
    stepsSubscriptionRef.current = Pedometer.watchStepCount(({ steps }) => {
      stepsRef.current = stepsBaselineRef.current + steps;
    });
  }, []);

  const beginLocationWatch = useCallback(async () => {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 2000,
      distanceInterval: 5,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Trekwar is tracking your activity',
        notificationBody: 'Recording distance for your current session.',
      },
    });
  }, []);

  const start = useCallback(async () => {
    setPermissionError(null);

    const foreground = await Location.requestForegroundPermissionsAsync();
    if (foreground.status !== 'granted') {
      setPermissionError('Location permission is required to track a session.');
      return;
    }
    const background = await Location.requestBackgroundPermissionsAsync();
    if (background.status !== 'granted') {
      setPermissionError(
        'Background location was not granted — tracking will pause if you leave the app.'
      );
    }

    lastFixRef.current = null;
    distanceMetersRef.current = 0;
    stepsRef.current = 0;
    stepsBaselineRef.current = 0;
    activeMsAccumulatedRef.current = 0;
    activeStartedAtRef.current = Date.now();
    startedAtRef.current = new Date();

    await beginLocationWatch();
    await beginStepWatch();

    tickRef.current = setInterval(() => publish('active'), 1000);
    publish('active');
  }, [beginLocationWatch, beginStepWatch, publish]);

  const pause = useCallback(async () => {
    if (tickRef.current) clearInterval(tickRef.current);
    stepsSubscriptionRef.current?.remove();
    stepsSubscriptionRef.current = null;
    const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (started) await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);

    if (activeStartedAtRef.current) {
      activeMsAccumulatedRef.current += Date.now() - activeStartedAtRef.current;
      activeStartedAtRef.current = null;
    }
    publish('paused');
  }, [publish]);

  const resume = useCallback(async () => {
    activeStartedAtRef.current = Date.now();
    await beginLocationWatch();
    await beginStepWatch();
    tickRef.current = setInterval(() => publish('active'), 1000);
    publish('active');
  }, [beginLocationWatch, beginStepWatch, publish]);

  const stop = useCallback(async (): Promise<CompletedActivity | null> => {
    if (tickRef.current) clearInterval(tickRef.current);
    stepsSubscriptionRef.current?.remove();
    stepsSubscriptionRef.current = null;
    const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (started) await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);

    if (activeStartedAtRef.current) {
      activeMsAccumulatedRef.current += Date.now() - activeStartedAtRef.current;
      activeStartedAtRef.current = null;
    }

    const durationSeconds = Math.round(activeMsAccumulatedRef.current / 1000);
    const startedAt = startedAtRef.current;
    if (!startedAt || durationSeconds <= 0) {
      setSnapshot(INITIAL_SNAPSHOT);
      return null;
    }

    const completed: CompletedActivity = {
      distanceMeters: distanceMetersRef.current,
      durationSeconds,
      steps: stepsRef.current,
      type: classifyActivityType(distanceMetersRef.current, durationSeconds),
      startedAt,
      endedAt: new Date(),
    };

    setSnapshot(INITIAL_SNAPSHOT);
    return completed;
  }, []);

  return { snapshot, permissionError, start, pause, resume, stop };
}
