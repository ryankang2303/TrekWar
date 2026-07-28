import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useActivities } from '../hooks/useActivities';
import CalendarView from '../components/CalendarView';
import ActivityBarChart from '../components/ActivityBarChart';

export default function StatsScreen() {
  const { activities, refresh } = useActivities();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <CalendarView activities={activities} />
      <Text style={styles.sectionTitle}>Charts</Text>
      <ActivityBarChart activities={activities} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: 60,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 24,
    marginTop: 8,
  },
});
