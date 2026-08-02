import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useFriends } from '../hooks/useFriends';
import { metersToMiles } from '../lib/geo';
import { ProfileStackParamList } from '../types';

export default function FriendsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList, 'Friends'>>();
  const { incoming, outgoing, leaderboard, loading, refresh, sendRequest, respond, cancel } = useFriends();
  const [username, setUsername] = useState('');
  const [sending, setSending] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleAdd = async () => {
    if (!username.trim()) return;
    setSending(true);
    const error = await sendRequest(username);
    setSending(false);
    if (error) {
      Alert.alert('Could not send request', error);
      return;
    }
    setUsername('');
  };

  return (
    <FlatList
      contentContainerStyle={styles.container}
      data={leaderboard}
      keyExtractor={(entry) => entry.profile.id}
      refreshing={loading}
      onRefresh={refresh}
      ListHeaderComponent={
        <>
          {(incoming.length > 0 || outgoing.length > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Requests</Text>
              {incoming.map((req) => (
                <View key={req.friendship.id} style={styles.requestRow}>
                  <Text style={styles.requestName}>{req.profile.display_name}</Text>
                  <View style={styles.requestActions}>
                    <Pressable style={styles.acceptButton} onPress={() => respond(req.friendship.id, true)}>
                      <Text style={styles.acceptButtonText}>Accept</Text>
                    </Pressable>
                    <Pressable style={styles.declineButton} onPress={() => respond(req.friendship.id, false)}>
                      <Text style={styles.declineButtonText}>Decline</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
              {outgoing.map((req) => (
                <View key={req.friendship.id} style={styles.requestRow}>
                  <Text style={styles.requestName}>{req.profile.display_name}</Text>
                  <Pressable style={styles.declineButton} onPress={() => cancel(req.friendship.id)}>
                    <Text style={styles.declineButtonText}>Cancel</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Add friend</Text>
            <View style={styles.addRow}>
              <TextInput
                style={styles.input}
                placeholder="Username"
                autoCapitalize="none"
                autoCorrect={false}
                value={username}
                onChangeText={setUsername}
              />
              <Pressable style={styles.addButton} onPress={handleAdd} disabled={sending}>
                <Text style={styles.addButtonText}>{sending ? '…' : 'Add'}</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.sectionHeader}>Leaderboard</Text>
        </>
      }
      renderItem={({ item, index }) => (
        <Pressable
          style={styles.leaderRow}
          disabled={item.isMe}
          onPress={() =>
            navigation.navigate('FriendProfile', {
              userId: item.profile.id,
              displayName: item.profile.display_name,
              lifetimeMeters: item.lifetimeMeters,
            })
          }
        >
          <Text style={styles.leaderRank}>{index + 1}</Text>
          <Text style={[styles.leaderName, item.isMe && styles.leaderNameMe]} numberOfLines={1}>
            {item.isMe ? 'You' : item.profile.display_name}
          </Text>
          <Text style={styles.leaderDistance}>{metersToMiles(item.lifetimeMeters).toFixed(1)} mi</Text>
        </Pressable>
      )}
      ListEmptyComponent={
        !loading ? <Text style={styles.emptyText}>Add a friend to see the leaderboard.</Text> : null
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 8,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  requestName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#2c9c5f',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  declineButton: {
    backgroundColor: '#eee',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  declineButtonText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#2c3e50',
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
    gap: 10,
  },
  leaderRank: {
    width: 18,
    fontSize: 13,
    color: '#999',
    fontWeight: '600',
  },
  leaderName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  leaderNameMe: {
    fontWeight: '700',
    color: '#2c9c5f',
  },
  leaderDistance: {
    fontSize: 13,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 16,
  },
});
