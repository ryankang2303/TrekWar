export type RootTabParamList = {
  Home: undefined;
  Track: undefined;
  Races: undefined;
  Stats: undefined;
  Profile: undefined;
};

export type RacesStackParamList = {
  RaceHub: undefined;
  RaceDetail: { raceId: string };
  CreatePrivateRace: undefined;
  JoinPrivateRace: undefined;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  Friends: undefined;
  Badges: undefined;
  FriendProfile: { userId: string; displayName: string; lifetimeMeters: number };
};
