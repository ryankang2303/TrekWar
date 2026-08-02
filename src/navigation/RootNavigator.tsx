import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from '../screens/HomeScreen';
import TrackScreen from '../screens/TrackScreen';
import RacesStackNavigator from './RacesStackNavigator';
import StatsScreen from '../screens/StatsScreen';
import ProfileStackNavigator from './ProfileStackNavigator';
import SignInScreen from '../screens/SignInScreen';
import CreateProfileScreen from '../screens/CreateProfileScreen';
import { AuthProvider, useAuth } from '../lib/AuthContext';
import { usePassiveStepSync } from '../hooks/usePassiveStepSync';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useHealthKitSync } from '../hooks/useHealthKitSync';
import { RootTabParamList } from '../types';

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_ICONS: Record<keyof RootTabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Track: 'walk',
  Races: 'flag',
  Stats: 'stats-chart',
  Profile: 'person',
};

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name]} color={color} size={size} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name="Races"
        component={RacesStackNavigator}
        options={{ headerShown: false }}
      />
      <Tab.Screen name="Track" component={TrackScreen} />
      <Tab.Screen name="Stats" component={StatsScreen} />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
}

function RootContent() {
  const { session, profile, loading } = useAuth();
  // Gated on `profile`, not just `session` — activities.user_id has an FK
  // to profiles(id), so reconciling before CreateProfileScreen completes
  // would just fail on that constraint every time.
  usePassiveStepSync(profile?.id);
  usePushNotifications(profile?.id);
  useHealthKitSync(profile?.id);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) return <SignInScreen />;
  if (!profile) return <CreateProfileScreen />;
  return <TabNavigator />;
}

export default function RootNavigator() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootContent />
      </NavigationContainer>
    </AuthProvider>
  );
}
