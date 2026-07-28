import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChartGranularity, bucketActivities } from '../lib/activityStats';
import { metersToMiles } from '../lib/geo';
import type { Database } from '../lib/database.types';

type Activity = Database['public']['Tables']['activities']['Row'];

const GRANULARITIES: { key: ChartGranularity; label: string; count: number }[] = [
  { key: 'daily', label: 'Day', count: 7 },
  { key: 'weekly', label: 'Week', count: 8 },
  { key: 'monthly', label: 'Month', count: 12 },
  { key: 'yearly', label: 'Year', count: 5 },
];

const CHART_HEIGHT = 160;

export default function ActivityBarChart({ activities }: { activities: Activity[] }) {
  const [granularity, setGranularity] = useState<ChartGranularity>('daily');
  const config = GRANULARITIES.find((g) => g.key === granularity)!;

  const buckets = useMemo(
    () => bucketActivities(activities, granularity, config.count),
    [activities, granularity, config.count]
  );

  const maxMiles = Math.max(0.01, ...buckets.map((b) => metersToMiles(b.distanceMeters)));

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        {GRANULARITIES.map((g) => (
          <Pressable key={g.key} onPress={() => setGranularity(g.key)}>
            <Text style={[styles.tabLabel, granularity === g.key && styles.tabLabelActive]}>
              {g.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.chart}>
        {buckets.map((b, i) => {
          const miles = metersToMiles(b.distanceMeters);
          const barHeight = miles > 0 ? Math.max(2, (miles / maxMiles) * CHART_HEIGHT) : 0;
          return (
            <View key={i} style={styles.barColumn}>
              <Text style={styles.barValue}>{miles > 0 ? miles.toFixed(1) : ''}</Text>
              <View style={[styles.bar, { height: barHeight }]} />
              <Text style={styles.barLabel}>{b.label}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.unit}>miles</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  tabRow: { flexDirection: 'row', gap: 20, marginBottom: 32 },
  tabLabel: { color: '#999', fontSize: 14 },
  tabLabelActive: { color: '#2c3e50', fontWeight: '700' },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT + 40,
    justifyContent: 'space-between',
  },
  barColumn: { alignItems: 'center', flex: 1 },
  bar: { width: 14, backgroundColor: '#2c9c5f', borderRadius: 4 },
  barValue: { fontSize: 10, color: '#666', marginBottom: 2 },
  barLabel: { fontSize: 10, color: '#666', marginTop: 4 },
  unit: { textAlign: 'center', color: '#999', marginTop: 8 },
});
