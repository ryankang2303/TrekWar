import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ProfileScreen from '../screens/ProfileScreen';
import FriendsScreen from '../screens/FriendsScreen';
import BadgesScreen from '../screens/BadgesScreen';
import FriendProfileScreen from '../screens/FriendProfileScreen';
import { ProfileStackParamList } from '../types';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerTitleAlign: 'center' }}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} options={{ title: 'Profile' }} />
      <Stack.Screen name="Friends" component={FriendsScreen} options={{ title: 'Friends' }} />
      <Stack.Screen name="Badges" component={BadgesScreen} options={{ title: 'Trophy case' }} />
      <Stack.Screen
        name="FriendProfile"
        component={FriendProfileScreen}
        options={({ route }) => ({ title: route.params.displayName })}
      />
    </Stack.Navigator>
  );
}
