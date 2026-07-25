import { Button, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../lib/AuthContext';

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{profile?.display_name ?? 'Profile'}</Text>
      <Text style={styles.username}>@{profile?.username}</Text>
      <Button title="Sign out" onPress={signOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  text: {
    fontSize: 20,
    fontWeight: '600',
  },
  username: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
});
