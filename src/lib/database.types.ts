// Hand-written to match supabase/migrations/0001_init.sql (plus later
// migrations layered on top — see supabase/migrations/0005_passive_step_tracking.sql
// for the 'passive' source and passive_step_checkpoints table,
// supabase/migrations/0006_friends_and_private_races.sql for the RPCs below,
// and supabase/migrations/0007_badges_elevation_and_onboarding.sql / 0008
// for triggers that don't add new tables/columns beyond push_tokens and
// healthkit_checkpoints).
// `supabase gen types typescript` normally derives this automatically, but
// that path requires a local Docker/Podman daemon (unavailable here) to spin
// up postgres-meta. Regenerate with the CLI once Docker is available:
//   npx supabase gen types typescript --db-url "$SUPABASE_DB_POOLER_URL" > src/lib/database.types.ts

export type ActivityType = 'walk' | 'run';
export type ActivitySource = 'native' | 'healthkit' | 'strava' | 'passive';
export type RaceTier =
  | 'trailblazer'
  | 'pacesetter'
  | 'voyager'
  | 'odyssey'
  | 'mythic'
  | 'legend'
  | 'ascent';
export type RaceCategory = 'distance' | 'elevation';
export type RaceParticipantStatus = 'active' | 'completed';
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      activities: {
        Row: {
          id: string;
          user_id: string;
          type: ActivityType;
          source: ActivitySource;
          distance_meters: number;
          duration_seconds: number;
          steps: number | null;
          elevation_gain_meters: number | null;
          started_at: string;
          ended_at: string;
          external_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: ActivityType;
          source?: ActivitySource;
          distance_meters: number;
          duration_seconds: number;
          steps?: number | null;
          elevation_gain_meters?: number | null;
          started_at: string;
          ended_at: string;
          external_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['activities']['Insert']>;
        Relationships: [];
      };
      race_templates: {
        Row: {
          id: string;
          tier: RaceTier;
          category: RaceCategory;
          name: string;
          description: string | null;
          target_meters: number;
          background_image_url: string | null;
          is_public: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          tier: RaceTier;
          category?: RaceCategory;
          name: string;
          description?: string | null;
          target_meters: number;
          background_image_url?: string | null;
          is_public?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['race_templates']['Insert']>;
        Relationships: [];
      };
      races: {
        Row: {
          id: string;
          template_id: string;
          is_private: boolean;
          created_by: string | null;
          name: string | null;
          invite_code: string | null;
          start_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          is_private?: boolean;
          created_by?: string | null;
          name?: string | null;
          invite_code?: string | null;
          start_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['races']['Insert']>;
        Relationships: [];
      };
      race_participants: {
        Row: {
          id: string;
          race_id: string;
          user_id: string;
          status: RaceParticipantStatus;
          joined_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          race_id: string;
          user_id: string;
          status?: RaceParticipantStatus;
          joined_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['race_participants']['Insert']>;
        Relationships: [];
      };
      race_progress: {
        Row: {
          id: string;
          race_id: string;
          user_id: string;
          activity_id: string;
          contributed_meters: number;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          race_id: string;
          user_id: string;
          activity_id: string;
          contributed_meters: number;
          recorded_at?: string;
        };
        Update: Partial<Database['public']['Tables']['race_progress']['Insert']>;
        Relationships: [];
      };
      friendships: {
        Row: {
          id: string;
          requester_id: string;
          addressee_id: string;
          status: FriendshipStatus;
          created_at: string;
          responded_at: string | null;
        };
        Insert: {
          id?: string;
          requester_id: string;
          addressee_id: string;
          status?: FriendshipStatus;
          created_at?: string;
          responded_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['friendships']['Insert']>;
        Relationships: [];
      };
      badges: {
        Row: {
          id: string;
          user_id: string;
          race_id: string;
          tier: RaceTier;
          awarded_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          race_id: string;
          tier: RaceTier;
          awarded_at?: string;
        };
        Update: Partial<Database['public']['Tables']['badges']['Insert']>;
        Relationships: [];
      };
      kudos: {
        Row: {
          id: string;
          from_user_id: string;
          activity_id: string | null;
          race_progress_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          from_user_id: string;
          activity_id?: string | null;
          race_progress_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['kudos']['Insert']>;
        Relationships: [];
      };
      passive_step_checkpoints: {
        Row: {
          user_id: string;
          last_checkpoint_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          last_checkpoint_at: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['passive_step_checkpoints']['Insert']>;
        Relationships: [];
      };
      healthkit_checkpoints: {
        Row: {
          user_id: string;
          last_checkpoint_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          last_checkpoint_at: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['healthkit_checkpoints']['Insert']>;
        Relationships: [];
      };
      push_tokens: {
        Row: {
          user_id: string;
          expo_push_token: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          expo_push_token: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['push_tokens']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      join_race_by_invite_code: {
        Args: { p_code: string };
        Returns: Database['public']['Tables']['races']['Row'];
      };
      get_friends_lifetime_distance: {
        Args: Record<string, never>;
        Returns: { user_id: string; lifetime_meters: number }[];
      };
    };
  };
}
