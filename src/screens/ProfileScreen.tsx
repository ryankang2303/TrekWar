import { Alert, Button, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { ProfileStackParamList } from '../types';

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList, 'ProfileHome'>>();
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
      <Pressable style={styles.friendsButton} onPress={() => navigation.navigate('Friends')}>
        <Text style={styles.friendsButtonText}>Friends</Text>
      </Pressable>
      <Pressable style={styles.friendsButton} onPress={() => navigation.navigate('Badges')}>
        <Text style={styles.friendsButtonText}>Trophy case</Text>
      </Pressable>
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
  friendsButton: {
    backgroundColor: '#2c3e50',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  friendsButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});
