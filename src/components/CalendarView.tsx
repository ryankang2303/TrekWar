import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { dayKey, groupActivitiesByLocalDay } from '../lib/activityStats';
import { formatElapsed, metersToMiles } from '../lib/geo';
import type { Database } from '../lib/database.types';

type Activity = Database['public']['Tables']['activities']['Row'];

export default function CalendarView({ activities }: { activities: Activity[] }) {
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date());

  const byDay = useMemo(() => groupActivitiesByLocalDay(activities), [activities]);

  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();

  const cells: (Date | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  const selectedActivities = byDay.get(dayKey(selectedDay)) ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.monthHeader}>
        <Pressable onPress={() => setMonthCursor(new Date(year, month - 1, 1))} hitSlop={12}>
          <Text style={styles.monthNav}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>
          {monthCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </Text>
        <Pressable onPress={() => setMonthCursor(new Date(year, month + 1, 1))} hitSlop={12}>
          <Text style={styles.monthNav}>›</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {cells.map((date, i) => {
          if (!date) return <View key={i} style={styles.cell} />;
          const hasActivity = byDay.has(dayKey(date));
          const isSelected = dayKey(date) === dayKey(selectedDay);
          return (
            <Pressable key={i} style={styles.cell} onPress={() => setSelectedDay(date)}>
              <View style={[styles.dayCircle, isSelected && styles.dayCircleSelected]}>
                <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                  {date.getDate()}
                </Text>
              </View>
              {hasActivity && <View style={styles.dot} />}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.detail}>
        <Text style={styles.detailTitle}>
          {selectedDay.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
        </Text>
        {selectedActivities.length === 0 && <Text style={styles.empty}>No activities logged.</Text>}
        {selectedActivities.map((a) => (
          <View key={a.id} style={styles.activityRow}>
            <Text style={styles.activityType}>
              {a.source === 'passive' ? 'Steps' : a.type === 'run' ? 'Run' : 'Walk'}
            </Text>
            <Text style={styles.activityField}>{metersToMiles(a.distance_meters).toFixed(2)} mi</Text>
            <Text style={styles.activityField}>{formatElapsed(a.duration_seconds)}</Text>
            <Text style={styles.activityField}>{a.steps ?? 0} steps</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  monthNav: { fontSize: 24, paddingHorizontal: 12 },
  monthLabel: { fontSize: 16, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 6 },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dayCircleSelected: { backgroundColor: '#2c3e50' },
  dayText: { fontSize: 14 },
  dayTextSelected: { color: 'white', fontWeight: '700' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#2c9c5f', marginTop: 2 },
  detail: { paddingHorizontal: 24, paddingTop: 12 },
  detailTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  empty: { color: '#666' },
  activityRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  activityType: { fontWeight: '600', width: 50 },
  activityField: { color: '#333' },
});
