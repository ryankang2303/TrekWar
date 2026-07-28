import { Alert, Button, StyleSheet, Text, View } from 'react-native';

import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

export default function ProfileScreen() {
  const { session, profile, signOut, setProfile } = useAuth();

  const handleResetProfile = () => {
    Alert.alert(
      'Reset profile?',
      'Deletes your profile row so you can go through "Set up your profile" again. Your Apple sign-in stays connected — you will not need to re-authenticate.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            if (!session?.user) return;
            const { error } = await supabase.from('profiles').delete().eq('id', session.user.id);
            if (error) {
              Alert.alert('Could not reset profile', error.message);
              return;
            }
            setProfile(null);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{profile?.display_name ?? 'Profile'}</Text>
      <Text style={styles.username}>@{profile?.username}</Text>
      <Button title="Sign out" onPress={signOut} />
      {__DEV__ && (
        <Button title="Reset profile (dev)" color="#c0392b" onPress={handleResetProfile} />
      )}
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
