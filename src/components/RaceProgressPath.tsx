import { StyleSheet, Text, View } from 'react-native';

import { MILESTONE_THRESHOLDS } from '../lib/raceStats';

/**
 * The v1 generic template route visual (MVP.md 4.2): a single stylized path
 * re-skinned per race by swapping the theme colors/emoji, rather than
 * requiring custom per-landmark art. Built with plain Views (no SVG) so it
 * doesn't add a native dependency.
 */
export default function RaceProgressPath({ fraction }: { fraction: number }) {
  const pct = Math.min(1, Math.max(0, fraction));
  // Clamp so the avatar glyph doesn't visually overflow the track at 100%.
  const avatarLeft = Math.min(pct * 100, 94);

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
        {MILESTONE_THRESHOLDS.map((t) => (
          <View key={t.label} style={[styles.tick, { left: `${t.fraction * 100}%` }]} />
        ))}
        <Text style={[styles.avatar, { left: `${avatarLeft}%` }]}>🚶</Text>
        <Text style={styles.finishFlag}>🏁</Text>
      </View>
    </View>
  );
}

const TRACK_HEIGHT = 16;

const styles = StyleSheet.create({
  container: {
    paddingVertical: 24,
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: '#e0e6ea',
    overflow: 'visible',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#2c9c5f',
    borderRadius: TRACK_HEIGHT / 2,
  },
  tick: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  avatar: {
    position: 'absolute',
    top: -18,
    fontSize: 26,
  },
  finishFlag: {
    position: 'absolute',
    right: -10,
    top: -18,
    fontSize: 26,
  },
});
