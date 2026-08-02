@AGENTS.md
@MVP.md
@MILESTONES.md

## Project state (2026-08-01)

Milestones 0–7 are all implemented (Milestone 7 partially — see below).
0 and 1 are **verified working on a real device** (iPhone, via EAS dev
client). 2 and 3 are implemented and type-checked but not yet walked
through end-to-end by the user. 4–6 are implemented, type-checked, and the
dev client build that includes 6's native modules (HealthKit, push
notifications) is installed on-device — but no feature in 4–6 has actually
been exercised by the user yet, only the install/connect plumbing itself.

**Tracking model: hybrid, not pure record-only.** Originally Milestone 1
was record-only (Start/Pause/Save), matching a pure running-log app. Revised
after realizing that's the wrong default for *steps* — steps should accrue
all day with zero user action, the way Apple Health/Fitbit do, not only
when someone remembers to press Start. The two "pure" options considered
and rejected:
- **All-day background GPS tracking** — technically possible but a real
  battery cost and an "Always" location justification Apple review scrutinizes
  hard. No major fitness app does continuous all-day GPS for this reason.
- **Record-only, running-app-only** — simple, but under-serves anyone who
  just wants ambient daily-step credit without treating every walk as a
  deliberate "workout" to start and stop.

The resolution: **steps are always passive** (iOS's `CMPedometer` counts
them regardless of what the app is doing, at near-zero battery cost via a
dedicated motion coprocessor — `Pedometer.getStepCountAsync(start, end)`
can pull any historical range without an active session at all). **GPS
recording stays session-based** — Start/Pause/Save — because that's what
actually benefits from an explicit session: live pace/route feedback while
moving, and GPS-precise (not stride-length-estimated) distance for race
standings. This mirrors how Strava/Nike Run Club (session recording)
coexist with Apple Health (passive steps) on the same phone already — not
a novel pattern users need to learn.

**The double-counting problem this created, and the fix (migration 0005):**
if passive steps and a recorded session's steps were both summed into daily
totals, the same physical steps would be counted twice — `CMPedometer`
doesn't know or care that Track was open. Rather than build a second
parallel accounting system, passive tracking reuses the existing
`activities` table and race fan-out trigger:
[reconcilePassiveSteps](src/lib/passiveStepTracking.ts) periodically (on
every foreground, via [usePassiveStepSync](src/hooks/usePassiveStepSync.ts))
asks `getStepCountAsync` for steps since a per-user checkpoint
(`passive_step_checkpoints` table), subtracts out steps already covered by
any non-passive `activities` row in that window, and inserts one ordinary
`activities` row (`source = 'passive'`, distance estimated via
`stepsToMeters` — a flat 0.762m stride length, not per-user calibrated) for
whatever's left. That row flows through the *unmodified* race fan-out
trigger and Home/Stats aggregation, since both already just `SUM` over
`activities` regardless of source. [recordingGate](src/lib/recordingGate.ts)
is a shared flag Track sets while active/paused so reconciliation skips
itself entirely during a session. Passive windows are split at
local-midnight boundaries before crediting. Known simplifications:
first-ever checkpoint for a user starts at "today," not further back (no
multi-day backfill); lookback is capped just under iOS's ~7-day pedometer
retention. HealthKit's flights-climbed reconciliation (Milestone 6) reuses
this exact same checkpoint/midnight-split pattern against its own
`healthkit_checkpoints` table.

- **Milestone 0 — foundation.** Expo SDK 54 (TypeScript), bundle id
  `com.trekwar.app`. Sign in with Apple → Supabase Auth
  ([src/screens/SignInScreen.tsx](src/screens/SignInScreen.tsx)) confirmed
  working on-device. `AuthProvider` ([src/lib/AuthContext.tsx](src/lib/AuthContext.tsx))
  drives routing: signed out → SignInScreen, no `profiles` row →
  CreateProfileScreen, otherwise the tab navigator. A `__DEV__`-only "Reset
  profile" button on the Profile tab deletes the caller's own profile row
  so the create-profile flow can be re-tested without a fresh Apple ID.
- **Milestone 1 — tracking.** [useActivityTracker](src/hooks/useActivityTracker.ts)
  drives Start/Pause/Resume/Save. GPS via `expo-location`
  `startLocationUpdatesAsync` + a module-scope TaskManager task
  ([src/lib/locationTask.ts](src/lib/locationTask.ts)) — confirmed tracking
  continues through backgrounding/app-switching. Steps via `expo-sensors`
  `Pedometer.watchStepCount`. Outlier filter + pace/walk-run classification
  in [src/lib/geo.ts](src/lib/geo.ts): rejects fixes with >50m accuracy or
  implied speed >15mph, run/walk cutoff is 10 min/mi, pace displays `--:--`
  below 15m of accumulated distance.
- **Milestone 2 — personal stats.** Home shows today/lifetime stats. Stats
  is a single scrollable screen: Calendar
  ([src/components/CalendarView.tsx](src/components/CalendarView.tsx)) on
  top, Charts ([src/components/ActivityBarChart.tsx](src/components/ActivityBarChart.tsx))
  below. Charts are hand-built with plain `View` bars, **not**
  `react-native-gifted-charts`/`react-native-svg` — deliberate, to avoid an
  extra native rebuild; Race progress visuals and Badge chips (Milestone 5)
  follow the same no-SVG convention for consistency.
- **Milestone 3 — solo races.** 8 public races seeded across 4 tiers
  (migration 0003), plus 2 Ascent-tier races added in migration 0007 (see
  Milestone 6). An `activities` insert trigger (`fan_out_activity_to_races`)
  auto-credits every currently-active `race_participants` row —
  deliberately server-side so every future data source gets this for free.
  It's been revised twice since: migration 0006 added a synced-start gate
  (skip crediting activities dated before a private race's `start_at`), and
  migration 0007 made it elevation-aware (credit `elevation_gain_meters`
  instead of `distance_meters` for `category = 'elevation'` races, and skip
  the insert entirely when there's no elevation reading at all rather than
  recording a meaningless zero). Race Hub/Detail under a native-stack
  nested in the Races tab
  ([src/navigation/RacesStackNavigator.tsx](src/navigation/RacesStackNavigator.tsx)).
  **Found and fixed a real bug** (migration 0004): the original
  `race_participants` SELECT policy was self-referentially recursive under
  Postgres RLS. Fixed with a `SECURITY DEFINER` helper function
  (`public.is_race_participant`) that bypasses RLS on the inner check —
  reused by later migrations' policies too.
- **Milestone 4 — friends & private races** (migration 0006). Friend
  add/accept is username-search based, not QR/deep-link — reuses the
  already-open `profiles` SELECT policy, no new schema; if the other
  person already sent you a pending request, adding them back auto-accepts
  it instead of creating a duplicate ([useFriends](src/hooks/useFriends.ts)).
  Private races: creator picks a template + start-time preset (`now` /
  `1hour` / `tomorrow` / `3days` — no native date picker, to avoid another
  rebuild), gets an invite code, auto-joins; `join_race_by_invite_code` is
  a `SECURITY DEFINER` RPC because a non-participant can't otherwise
  `SELECT` a private race to find it by code. Race Detail gained a
  "Standings" section (ranked rivals, "you're X mi from catching {name}")
  and one-tap kudos on each rival's latest contribution row. Friends
  leaderboard (Profile → Friends) ranks by lifetime distance via
  `get_friends_lifetime_distance`, a `SECURITY DEFINER` RPC that returns
  only the aggregate — deliberately more private than a blanket
  cross-user RLS policy on `activities` would be.
- **Milestone 5 — badges, profile, retention** (migration 0007 for
  badges/onboarding, 0008 for notifications). Badge awarding
  (`award_badge_on_race_completion`) is a trigger on `race_progress`
  inserts, same server-side philosophy as fan-out — fires regardless of
  source, flips `race_participants.status` to `completed`. Trophy case
  (Profile → "Trophy case") and friend profile views
  ([BadgesScreen](src/screens/BadgesScreen.tsx),
  [FriendProfileScreen](src/screens/FriendProfileScreen.tsx)) share one
  [useBadges](src/hooks/useBadges.ts) hook. Streak counter
  ([src/lib/streaks.ts](src/lib/streaks.ts)) is client-computed from
  already-fetched activities, no new schema — allows exactly one gap day
  per streak run (a single lifetime-per-run "freeze," not an earn/spend
  economy). 3-day onboarding hook: a Home banner shown while
  `lifetimeTotals.count === 0` and the account is <3 days old; the
  starter-race auto-join in `TrackScreen.saveActivity` happens *before*
  the activity insert (not after), so the fan-out trigger credits that
  very first activity toward it. Notifications: local milestone alerts +
  a static daily 6pm reminder (not conditioned on "logged today yet" —
  that would need a background task, same battery/App-Review tradeoff the
  passive-tracking design already rejected). Rival-proximity push
  ("X just passed you," MVP.md's highest-leverage notification) is a
  `race_progress` trigger (`notify_rival_overtake`) that calls Expo's push
  API directly via Postgres's `pg_net` extension — **not** a deployed Edge
  Function. Confirmed `pg_net` is available on this hosted Supabase
  project (migration 0008 applied clean). This was a deliberate pivot from
  the original plan to deploy an Edge Function: same outcome, one fewer
  deployment surface, and verifiable by just running the migration and
  watching it succeed, rather than hoping a blind Deno deploy worked.
- **Milestone 6 — integrations, partial.** HealthKit read-only,
  flights-climbed only (`@kingstinct/react-native-healthkit`) — feeds the
  Ascent-tier races via [healthKitTracking.ts](src/lib/healthKitTracking.ts).
  Flights→meters via the ~3m/flight approximation Apple's own Health app
  uses. No steps/distance/workout-level HealthKit import — deliberately
  out of scope this pass (real double-counting/dedup complexity vs. the
  one concrete thing Milestone 6 needed: unblocking Ascent races). No
  write scope requested (`NSHealthUpdateUsageDescription: false` in
  app.json). **Strava is not implemented.** Needs the user's own Strava
  API app (client_id/secret from strava.com/settings/api) — can't be
  created on their behalf. When picked up: MVP.md's decision log already
  scoped it (light-connect-only, no backfill, Webhook Events API for
  real-time import), and Strava's API has no step-count field, so
  Strava-sourced steps would need to be approximated from distance/stride
  rather than their `average_cadence` field.
- **Milestone 7 — polish, partial.** Location/motion permission strings
  reviewed and still accurate. HealthKit's own usage string added
  alongside them. **Not done**: TestFlight submission (consequential
  external-distribution action, needs its own explicit go-ahead, not
  bundled into a general "build everything"), App Privacy label (an App
  Store Connect web form, not code — data types actually collected:
  Location [precise, linked, app-functionality-only], Health & Fitness
  [steps/distance/elevation, linked], Identifiers [user ID + device push
  token, linked]; no contact info, user content, or analytics data
  collected anywhere in the codebase, but verify against the code before
  submitting), battery/accuracy QA pass (needs real multi-day device
  usage, nothing to build).
- Tab order: Home, Races, Track, Stats, Profile.

**Not yet done / needs the user:**
- Feature-testing Milestones 2–6 on-device — nothing beyond install/connect
  plumbing has actually been exercised yet.
- Strava (needs the user's API app credentials — see Milestone 6 above).
- TestFlight submission, App Privacy label, battery QA (see Milestone 7
  above).

**Notes:**
- AGENTS.md pins the Expo docs version to **v54.0.0** (not v57 — the repo is
  intentionally on SDK 54; see README.md for why not to bump `expo` without
  checking Expo Go's currently-supported SDK). Note Expo Go itself can't run
  this app at all past Milestone 1 regardless of SDK match — expo-location
  background mode, Pedometer, and TaskManager (and now HealthKit,
  notifications) all require the dev client. A `exp://` link opened via the
  system Camera app can get intercepted by Expo Go instead of the dev
  client if both are installed, producing a Sign-in-with-Apple "Unacceptable
  audience in id_token: [host.exp.Exponent]" error — always use the dev
  client's own "Enter URL manually" with the `https://` tunnel URL, never
  Camera-scan an `exp://` link, for this project.
- **No local Supabase CLI/Docker.** Migrations are applied by hand: temp-install
  `pg` (`npm install pg --no-save`), connect with `SUPABASE_DB_POOLER_URL`
  from `.secrets/supabase-env.sh`, run the migration file's SQL, then
  `npm uninstall pg --no-save`. `src/lib/database.types.ts` is hand-maintained
  to match the migrations for the same reason. `.secrets/supabase-env.sh`
  also now holds `SUPABASE_ACCESS_TOKEN` (a personal access token, not just
  DB credentials) — not currently used by any script (the rival-overtake
  push uses `pg_net` directly, not a deployed Edge Function) but kept for a
  future real Edge Function (e.g. an eventual Strava webhook handler).
  `.secrets/eas-env.sh` holds EAS/Apple credentials.
- **Dev client, not Expo Go.** Start the server with `npx expo start
  --dev-client --tunnel` (tunnel needed on public/guest Wi-Fi; the
  `*.exp.direct` subdomain has stayed stable across restarts). When
  entering the URL manually, use the `https://` tunnel URL, not `exp://`.
- **Adding a new native module requires a fresh EAS dev client build**:
  `eas build --profile development --platform ios --non-interactive`,
  using `.secrets/eas-env.sh`'s `EXPO_TOKEN` + Apple ASC API key.
  **Non-obvious gotcha hit this session**: adding a *new capability*
  (HealthKit, Push Notifications) isn't enough on its own — a
  non-interactive build reuses the existing provisioning profile as-is and
  fails with "Provisioning profile ... doesn't support the HealthKit and
  Push Notifications capability" even after passing
  `--refresh-ad-hoc-provisioning-profile` (that flag only regenerates the
  *profile* from whatever capabilities the *App ID* already has — it
  doesn't add new ones). The App ID itself needs the capability enabled
  first. Fixed by calling the App Store Connect API directly
  (`POST /v1/bundleIdCapabilities` with a JWT signed using
  `EXPO_ASC_API_KEY_PATH`/`KEY_ID`/`ISSUER_ID` from `.secrets/eas-env.sh`,
  ES256, `aud: appstoreconnect-v1`) to add `HEALTHKIT` and
  `PUSH_NOTIFICATIONS` to the Bundle ID's capabilities, *then* rebuilding
  with `--refresh-ad-hoc-provisioning-profile`. `eas credentials` can also
  do this but is menu-driven/interactive only, not scriptable here. Worth
  checking `eas build:view <id> --json`'s `.error.message` first on any
  future build failure — it names the exact missing capability/entitlement
  rather than requiring a log dig.
