@AGENTS.md
@MVP.md
@MILESTONES.md

## Project state (2026-07-27)

Milestones 0–3 are implemented; 0 and 1 are **verified working on a real
device** (iPhone, via EAS dev client). 2 and 3 are implemented and
type-checked but not yet walked through end-to-end by the user.

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
any non-passive `activities` row in that window (a recorded session *or* a
future Strava/HealthKit import — the subtraction only cares about
`started_at`/`source`, not which source it was), and inserts one ordinary
`activities` row (`source = 'passive'`, distance estimated via
`stepsToMeters` — a flat 0.762m stride length, not per-user calibrated) for
whatever's left. That row flows through the *unmodified* race trigger and
Home/Stats aggregation, since both already just `SUM` over `activities`
regardless of source. [recordingGate](src/lib/recordingGate.ts) is a shared
flag Track sets while active/paused so reconciliation skips itself entirely
during a session — that session's own Save is the accurate source for its
steps, credited via GPS distance rather than the stride-length guess.
Passive windows are split at local-midnight boundaries before crediting
(the common case — the first reconciliation of a new day spans "yesterday's
last check-in through this morning" — would otherwise misattribute a whole
day's steps to the wrong calendar date). Known simplifications: first-ever
checkpoint for a user starts at "today," not further back (no multi-day
backfill); lookback is capped just under iOS's ~7-day pedometer retention.

**Strava import will need the same treatment, and one real gap to know
about:** Strava's API has **no step-count field** — confirmed against their
API docs, only `average_cadence` (one foot's strikes/min). Per-user
decision: approximate steps for Strava-sourced activities from
distance/stride length instead of cadence math. Real-time auto-import (the
moment an activity saves on Strava, not on a delay) is feasible via
Strava's **Webhook Events API** — subscribe once per app, Strava POSTs to a
public HTTPS endpoint (a Supabase Edge Function would fit) on
create/update/delete for any authorized athlete; this is already what
MVP.md's decision log scoped for Milestone 6, just confirmed here as
concretely buildable. Not yet implemented — Milestone 6 territory.

- **Milestone 0 — foundation.** Expo SDK 54 (TypeScript), bundle id
  `com.trekwar.app`. Sign in with Apple → Supabase Auth
  ([src/screens/SignInScreen.tsx](src/screens/SignInScreen.tsx)) confirmed
  working on-device. `AuthProvider` ([src/lib/AuthContext.tsx](src/lib/AuthContext.tsx))
  drives routing: signed out → SignInScreen, no `profiles` row →
  CreateProfileScreen, otherwise the tab navigator. Profile creation uses
  `upsert(...).select().single()` + `setProfile()` directly (not a second
  `select` round-trip) — the original `insert` + separate refetch could
  leave the user stuck on CreateProfileScreen after a successful insert.
  A `__DEV__`-only "Reset profile" button on the Profile tab deletes the
  caller's own profile row (needs the `users can delete their own profile`
  policy, migration 0002) so the create-profile flow can be re-tested
  without a fresh Apple ID each time.
- **Milestone 1 — tracking.** [useActivityTracker](src/hooks/useActivityTracker.ts)
  drives Start/Pause/Resume/Save. GPS via `expo-location`
  `startLocationUpdatesAsync` + a module-scope TaskManager task
  ([src/lib/locationTask.ts](src/lib/locationTask.ts), registered at
  `index.ts` import time so it survives background launches) — confirmed
  tracking continues correctly through backgrounding/app-switching. Steps
  via `expo-sensors` `Pedometer.watchStepCount`. Outlier filter + pace/walk-run
  classification in [src/lib/geo.ts](src/lib/geo.ts): rejects fixes with
  >50m accuracy or implied speed >15mph, run/walk cutoff is 10 min/mi, and
  pace displays `--:--` below 15m of accumulated distance (a real bug: a few
  meters of GPS jitter over several elapsed seconds otherwise produces
  nonsense paces like `564837:23/mi`). The "background location not granted"
  banner re-checks on `AppState` → `active` and clears itself once granted,
  since iOS shows the "Always Allow" upgrade dialog on its own schedule, not
  synchronously in response to the permission request.
- **Milestone 2 — personal stats.** Home shows today/lifetime stats (no
  quick-start button — removed per user request). Stats is a single
  scrollable screen: Calendar ([src/components/CalendarView.tsx](src/components/CalendarView.tsx))
  on top, Charts ([src/components/ActivityBarChart.tsx](src/components/ActivityBarChart.tsx))
  below. Charts are hand-built with plain `View` bars, **not**
  `react-native-gifted-charts`/`react-native-svg` — deliberate, to avoid
  a second native rebuild in the same session; revisit if real chart
  polish is wanted later (would need a rebuild anyway, so bundle it with
  another native-dependency milestone rather than doing it solo).
- **Milestone 3 — solo races.** 8 public races seeded across 4 tiers
  (migration 0003). An `activities` insert trigger
  (`fan_out_activity_to_races`) auto-credits every currently-active
  `race_participants` row with the new activity's full distance —
  deliberately server-side so future sources (HealthKit/Strava) get this
  for free. Race Hub/Detail under a native-stack nested in the Races tab
  ([src/navigation/RacesStackNavigator.tsx](src/navigation/RacesStackNavigator.tsx)).
  Progress visual is plain `View`s, same no-SVG reasoning as Stats charts.
  **Found and fixed a real bug** (migration 0004): the original
  `race_participants` SELECT policy checked "am I a participant?" by
  querying itself, which is genuinely recursive under Postgres RLS —
  `infinite recursion detected in policy for relation "race_participants"`.
  This silently would have broken Race Detail and milestone-progress reads
  too, not just the Hub list, since both check participation the same way.
  Fixed with a `SECURITY DEFINER` helper function
  (`public.is_race_participant`) that bypasses RLS on the inner check.
- Tab order: Home, Races, Track, Stats, Profile.

**Not yet done:** Milestone 4 (friends, private races, kudos) is next — see
MILESTONES.md.

**Notes:**
- AGENTS.md pins the Expo docs version to **v54.0.0** (not v57 — the repo is
  intentionally on SDK 54; see README.md for why not to bump `expo` without
  checking Expo Go's currently-supported SDK).
- **No local Supabase CLI/Docker.** Migrations are applied by hand: temp-install
  `pg` (`npm install pg --no-save`), connect with `SUPABASE_DB_POOLER_URL`
  from `.secrets/supabase-env.sh`, run the migration file's SQL, then
  `npm uninstall pg --no-save`. `src/lib/database.types.ts` is hand-maintained
  to match the migrations for the same reason (regenerate via
  `supabase gen types typescript` once Docker is available).
  `.secrets/supabase-env.sh` and `.secrets/eas-env.sh` (gitignored) hold DB
  and EAS credentials for this — source before running CLI commands.
- **Dev client, not Expo Go**, from here on — location background modes,
  Pedometer, and TaskManager all require it. Start the server with
  `npx expo start --dev-client --tunnel` (tunnel needed on public/guest
  Wi-Fi). When entering the URL manually in the dev client's "no
  development servers" screen, use the `https://` tunnel URL, not `exp://`
  — the latter is for OS-level tap-to-open links only and fails with
  "Failed to connect" if typed into that field. The ngrok tunnel can drop
  (`ERR_NGROK_3200`, endpoint offline) if the server process dies; restart
  with the same command — the `*.exp.direct` subdomain has stayed stable
  across restarts for this project so far.
- Adding a new native module (expo-location/expo-sensors/expo-task-manager
  this session) requires a fresh EAS dev client build before it's usable —
  `eas build --profile development --platform ios`, using the credentials
  in `.secrets/eas-env.sh` (`EXPO_TOKEN` + Apple ASC API key) to run
  non-interactively. Confirmed EAS Build includes uncommitted *and*
  untracked working-directory files by default (respecting `.gitignore`),
  so committing first isn't required before triggering a build.
