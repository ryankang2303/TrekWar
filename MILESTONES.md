# Trekwar — Build Milestones

Sequenced so every milestone ends in something you can actually run and test on a device — no milestone depends on unbuilt UI from a later one. General rule followed throughout: tracking before races, solo races before social, integrations last — each layer needs the one below it working first, and integrations (HealthKit/Strava) are additive data sources that shouldn't block anything else from being testable.

To be followed loosely, not rigidly, as development proceeds.

## Milestone 0 — Project foundation

- `npx create-expo-app` (TypeScript template), set up EAS and build your first development client immediately — HealthKit and background location won't run in Expo Go, so get off Expo Go on day one rather than migrating later.
- Supabase project: initialize, define the first-pass schema (users, activities, races, race_participants, race_progress, friendships, badges — can evolve, but sketch it now so later milestones aren't blocked).
- Supabase Auth wired up with Sign in with Apple (build this in from the start, not before submission — every other milestone needs a logged-in user).
- Navigation shell: the 5 tabs (Home, Track, Races, Stats, Profile) as empty placeholder screens.

**Done when:** you can install the dev build on your phone, sign in, and see 5 empty tabs.

## Milestone 1 — Core tracking (the engine behind the core loop)

- expo-sensors Pedometer for live step counts.
- expo-location foreground + background permission flow; live GPS session recording.
- Track screen: Start / Pause / Stop with live stats (time, distance, pace, steps).
- Pace-threshold walk/run auto-classification.
- Basic GPS outlier filter (discard points implying impossible speed).
- Persist completed activities to Supabase.

**Done when:** you can record a real walk around the block, stop it, and see accurate distance/steps saved — this is the single most important milestone to get right before anything else, since every later feature consumes this data.

## Milestone 2 — Personal stats (single-player, fully usable app)

- Home screen: today's stats + lifetime totals (no race widget yet).
- Calendar view: tap a day, see that day's activities/stats.
- Stats/Analysis charts: daily / weekly / monthly / yearly toggle (react-native-gifted-charts).

**Done when:** the app is a complete, useful step/distance tracker on its own — a good internal checkpoint since it's demoable even before racing exists.

## Milestone 3 — Solo race experience

- Race data model: races, race_templates (the tier catalog from MVP.md section 4.4), race_participants, race_progress.
- Seed the initial public race catalog (start with a handful across tiers, not all of them).
- Race Hub: browse public races by tier, join one.
- Race Detail: the generic template progress visual (MVP.md section 4.2) wired to real activity distance.
- Milestone/fun-fact engine firing toasts (10%, 25%, half, etc.).

**Done when:** you can join a public race solo and watch your avatar move down the path as you log activities — validates the core reward loop before any social complexity is layered on.

## Milestone 4 — Friends & private races

- Friends system: add/accept via invite code or link.
- Private race creation: pick theme/distance, invite friends, synced start-at-0 (per decision log).
- Race Detail upgraded to show rival avatars/positions, "you're X mi from catching Jake."
- Friends leaderboard (lifetime distance + active race standings).
- Kudos-style one-tap reaction.

**Done when:** you and one test friend account can race each other and see each other's live progress.

## Milestone 5 — Badges, profile, and retention system

- Badge awarding on race completion, tiered visuals; profile trophy case.
- Friend profile view (badge case visible to others, per spec).
- expo-notifications: milestone alerts, rival-proximity pushes, streak reminders.
- Daily streak counter with streak freeze.
- 3-day onboarding challenge hook.

**Done when:** the retention loop is fully wired — this is the milestone that turns "a working app" into "an app with a reason to reopen tomorrow."

## Milestone 6 — Integrations (HealthKit + Strava)

- HealthKit read integration (react-native-health or @kingstinct/react-native-healthkit) for steps/distance/flights-climbed.
- Ascent-tier (elevation) races enabled once flights-climbed data is flowing.
- Strava OAuth connect (light-connect-only, no backfill, per decision log) + webhook subscription for new activities.

**Done when:** a run logged in the stock Health app or on Strava shows up in your race progress without manual entry.

## Milestone 7 — Polish & App Store readiness

- Permission strings finalized (location always/when-in-use, HealthKit usage descriptions) with justifications that match actual use.
- App Privacy label filled out accurately.
- Battery/accuracy pass on background location — this is the decision point for whether expo-location is holding up or you need to upgrade to react-native-background-geolocation (MVP.md section 7.1).
- Empty states, error states, onboarding flow polish.
- TestFlight build for real-device testing with friends before submission.

## Suggested order of operations if you want it even more incremental

Milestones 0–2 are the ones to get rock-solid before touching races at all — bad GPS/step data quietly poisons every race, badge, and leaderboard built on top of it, and it's much cheaper to fix at the source (Milestone 1) than to patch symptoms later.
