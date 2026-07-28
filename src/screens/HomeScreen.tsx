import { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useActivities } from '../hooks/useActivities';
import { activitiesOnDay, totalsForActivities } from '../lib/activityStats';
import { formatElapsed, metersToMiles } from '../lib/geo';

export default function HomeScreen() {
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

  return (
    <View style={styles.container}>
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
