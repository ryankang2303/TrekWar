@AGENTS.md
@MVP.md
@MILESTONES.md

## Project state (2026-07-25)

Milestone 0 (project foundation) is essentially done:

- Expo SDK 54 project (TypeScript), app renamed to **Trekwar** (`app.json`:
  bundle id `com.trekwar.app`, EAS project linked, `expo-apple-authentication`
  + `expo-font` plugins configured).
- Supabase Auth wired with **Sign in with Apple** ([src/screens/SignInScreen.tsx](src/screens/SignInScreen.tsx)
  → `supabase.auth.signInWithIdToken`). `AuthProvider`
  ([src/lib/AuthContext.tsx](src/lib/AuthContext.tsx)) drives which screen
  shows: signed out → SignInScreen, signed in but no `profiles` row →
  CreateProfileScreen, otherwise the tab navigator.
- Navigation shell: 5 tabs (Home, Track, Races, Stats, Profile) in
  [src/navigation/RootNavigator.tsx](src/navigation/RootNavigator.tsx) — screens
  currently placeholders.
- Supabase schema sketched in [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql):
  `profiles`, `activities`, `race_templates`, `races`, `race_participants`,
  `race_progress`, `friendships`, `badges`, `kudos` — all with RLS policies.
  Expected to evolve; not yet applied/tested against a live Supabase project.
- Supabase client at [src/lib/supabase.ts](src/lib/supabase.ts) reads
  `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` from
  `.env.local` (gitignored, not committed).

**Not yet verified working:** the Apple Sign-In → Supabase flow hasn't been
tested end-to-end on a device/dev client. Everything above is
implemented-but-untested until that happens.

**Next up (Milestone 1):** step/GPS tracking — expo-sensors Pedometer,
expo-location session recording, walk/run pace classification, GPS outlier
filtering, persisting activities to Supabase. See MILESTONES.md for the full
sequencing rationale.

**Notes:**
- AGENTS.md pins the Expo docs version to **v54.0.0** (not v57 — the repo is
  intentionally on SDK 54; see README.md for why not to bump `expo` without
  checking Expo Go's currently-supported SDK).
- HealthKit and background geolocation require an EAS dev client — Expo Go
  only covers what's built so far (auth + nav shell, no native tracking yet).
