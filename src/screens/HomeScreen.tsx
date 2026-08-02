import { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../lib/AuthContext';
import { useActivities } from '../hooks/useActivities';
import { activitiesOnDay, totalsForActivities } from '../lib/activityStats';
import { currentStreakDays } from '../lib/streaks';
import { formatElapsed, metersToMiles } from '../lib/geo';

const ONBOARDING_WINDOW_DAYS = 3;

export default function HomeScreen() {
  const { profile } = useAuth();
  const { activities, refresh } = useActivities();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const todayTotals = useMemo(
    () => totalsForActivities(activitiesOnDay(activities, new Date())),
    [activities]
  );
  const lifetimeTotals = useMemo(() => totalsForActivities(activities), [activities]);
  const streakDays = useMemo(() => currentStreakDays(activities), [activities]);

  const showOnboardingBanner = useMemo(() => {
    if (!profile || lifetimeTotals.count > 0) return false;
    const ageMs = Date.now() - new Date(profile.created_at).getTime();
    return ageMs <= ONBOARDING_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  }, [profile, lifetimeTotals.count]);

  return (
    <View style={styles.container}>
      {showOnboardingBanner && (
        <View style={styles.onboardingBanner}>
          <Text style={styles.onboardingText}>
            Log your first activity to join your starter race and kick off your streak!
          </Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Today</Text>
      <View style={styles.row}>
        <Stat label="distance" value={`${metersToMiles(todayTotals.distanceMeters).toFixed(2)} mi`} />
        <Stat label="steps" value={String(todayTotals.steps)} />
        <Stat label="time" value={formatElapsed(todayTotals.durationSeconds)} />
      </View>

      <Text style={styles.sectionTitle}>Lifetime</Text>
      <View style={styles.row}>
        <Stat label="distance" value={`${metersToMiles(lifetimeTotals.distanceMeters).toFixed(1)} mi`} />
        <Stat label="steps" value={String(lifetimeTotals.steps)} />
        <Stat label="activities" value={String(lifetimeTotals.count)} />
      </View>

      <Text style={styles.sectionTitle}>Streak</Text>
      <View style={styles.row}>
        <Stat label={streakDays === 1 ? 'day' : 'days'} value={`🔥 ${streakDays}`} />
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 72,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  onboardingBanner: {
    backgroundColor: '#eaf4ee',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  onboardingText: {
    fontSize: 13,
    color: '#2c9c5f',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
});
