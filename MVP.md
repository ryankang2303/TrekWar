# Trekwar — Distance Race App — Final Plan (v1, ready for build)

Working name used throughout this doc: Trekwar (placeholder — swap freely). React Native + Expo, iOS-first, coded via Claude in VS Code.

All open questions from the draft have been resolved — decisions are called out inline below and summarized in section 9.

## 0. Strava research — what we're borrowing

Strava's retention doesn't come from tracking accuracy, it comes from turning tracking into social competition at the right scale:

- Segments over global leaderboards. A single global leaderboard only motivates the tiny fraction of users who could realistically place on it. Strava instead creates thousands of small, contextually relevant leaderboards (one per road/trail segment), so wins are frequent, not rare. This is the single biggest transferable lesson: our races need to feel winnable, not just enterable.
- Kudos = near-zero-effort social validation. 14B+ kudos given in 2025 alone. The lesson: build in a one-tap way for friends to react to your progress, not just view it.
- Clubs drive outsized retention — club members are 3.5x more likely to stay active after 12 months. Group identity outperforms solo goal-tracking.
- Challenges create fresh reasons to return even for users who've plateaued on personal bests — this maps directly onto our race system.
- Badges/trophies as permanent, visible status objects on a profile — this is exactly the badge-case mechanic already in your spec, and Strava's data backs it as a strong retention lever.
- Heatmaps and progress bars as the core visual reward — validates the "animated progress along a route" reward moment for our core loop.

Net takeaway: your race concept is structurally very close to Strava's segment model, but leveled up — instead of "fastest on this half-mile of road," it's "who finishes walking across the Grand Canyon first." That's a stronger, more shareable hook than Strava's own segments, because the goalpost (a real, famous landmark distance) is instantly meme-able and requires zero local context to understand — good for TikTok.

## 1. Core Function

One sentence: Turn your everyday steps and miles into progress in real-world distance races against your friends (or the world).

Everything else in this app — calendar, stats, charts, integrations — exists to feed this one loop. If a feature doesn't make the race more compelling, it doesn't belong in v1.

## 2. Core Loop (action → reward, target under 30 seconds)

**Primary loop — finishing an activity:**

Tap Start → walk/run (background tracking) → tap Stop → within 30 seconds the app converts the new distance into race progress and shows an animated reward: progress bar/route-avatar advances, a milestone banner fires if you crossed a threshold ("Halfway there!" / "You just out-paced the Nile's flow — that's 2,341 miles down"), and a one-tap kudos-style react goes out to anyone racing with you.

**Secondary loop — the daily glance** (this is the one that drives habitual opens, not just workout logging):

Open app → home screen instantly shows "you're 2.3 mi from catching Jake in the Grand Canyon Race" or "you're 41% done — 3 days ahead of pace" → tap to see the route visual → close. This is the sub-30-second loop that doesn't require a workout at all, and it's the one that should fire push notifications to trigger.

Both loops end in the same place: a visible, animated shift on a race progress visual. That single asset (the route/progress view) is the emotional core of the app and deserves the most design polish.

## 3. Accessory Features

Everything below is justified by whether it feeds the core loop. Cut anything that doesn't.

**Directly supports racing (core):**

- Start/Stop activity recording (walk or run, auto-classified by pace, manual override available)
- Live in-session stats: time, distance, pace, step count
- Race Hub: browse public races by tier, create/join private races via invite code or link
- Race Detail view: illustrated route/progress visual, current standing vs. rivals, milestone markers, fun-fact callouts
- Progress milestones with fun facts (10%, 25%, 1/3, halfway, 75%, 90%, finish) — pulled from a curated real-world distance-comparison table
- Public vs. private race creation; private races invite specific friends
- Badges awarded per completed race, tiered to match race difficulty; shown on profile in a trophy case
- Friends leaderboard (lifetime distance + active race standings)
- Kudos-style one-tap reaction on a friend's activity or race milestone

**Supports the habit but is one step removed:**

- Calendar view — tap any day to see that day's steps, distance, and activities
- Analysis/Stats page — charts for daily / weekly / monthly / yearly views of steps, distance, and (optional) elevation
- Profile page — badge case, stats summary, race history, friend list, settings
- Strava / Apple Health integration — auto-import so users don't have to double-track
- Push notifications — milestones, "you've been passed," race-ending-soon nudges

**Deferred to v2 (confirmed):**

- Global leaderboard — a single global ranking is a magnet for fabricated GPS data (teleport-walking, spoofed speeds), and it undercuts trust in the whole product if the #1 spot is obviously fake. Decision: v1 ships with friends-only leaderboards only. When a global leaderboard is added later, gate it behind "verified" activities only (GPS-track sanity checks: reject impossible pace, require continuous GPS samples, prefer Strava/HealthKit-sourced activities over manual entry) rather than trusting raw self-reported totals.
- Social feed / comments — Strava has this, but it's a second core loop, not an accessory to yours. Skip it; kudos-style reactions give you 80% of the social payoff for a fraction of the surface area.
- Route mapping of the user's actual real-world location — see Race System below; races are an illustrated abstraction of a landmark distance, not a literal GPS map of e.g. the actual Grand Canyon trail. This is a deliberate scope cut that also sidesteps needing real trail-routing data.

## 4. Race System

### 4.1 How a race works mechanically

A race is: a target distance (based on a real-world landmark or path) + a start point (whenever a user joins) + a shared progress visual. Every qualifying activity (walk/run, from native tracking, HealthKit, or Strava import) automatically adds its distance to every race the user has currently joined. There is no "clock" forcing a pace — races are asynchronous and can take hours or months; the only competitive dimension is who accumulates the distance first.

- Public races are always-open lobbies (e.g., "Cross the Grand Canyon") — anyone can join anytime, progress is tracked from their individual join date, and they compete against everyone else currently in that lobby.
- Private races are created by a user, who picks a distance/theme, sets a start time (immediate or scheduled), and invites specific friends via code/link. Decision: every participant in a private race starts at 0 by default, all beginning from the same moment — no mid-race joins with a pace handicap. Keeps head-to-head standings simple to read and fair.
- Elevation-based races are a separate category using cumulative elevation gain (flights climbed / elevation data from HealthKit or barometer) instead of horizontal distance — this is what makes "stair-master the height of Everest" work.

### 4.2 Progress visual (the core reward asset)

Rather than a literal GPS map (which would require real trail-routing data per landmark and wouldn't work for abstract races like "the Great Wall of China"), use an illustrated horizontal path per race — a stylized route graphic with the landmark's silhouette/scenery at the finish line, mile markers along the way, and an avatar (yours + rivals') that moves along it as distance accrues. This is dramatically cheaper to build than real mapping, works identically for every race regardless of real-world geography, and is more shareable/screenshot-friendly for TikTok than a real map would be.

Decision: v1 ships with one generic template path (a single well-designed route graphic — mile markers, background parallax, avatar animation) that gets re-skinned per race with a different landmark background/finish-line image and distance scale. This lets you launch with dozens of races on day one without commissioning custom art for each. Treat fully custom per-landmark illustration (a Grand Canyon-specific path vs. a Great Wall-specific path) as a v2 visual upgrade once you know which races actually get traction — build the template with that upgrade path in mind (swappable background layer, not a hardcoded asset).

### 4.3 Milestone + fun-fact engine

Maintain a curated lookup table of real-world reference distances (e.g., "length of Central Park = 2.5 mi," "Manhattan tip-to-tip = 13.4 mi," "marathon = 26.2 mi," "London Underground Circle line = 17 mi"). Whenever a user's race progress (or lifetime total) crosses one of these values, surface a fun-fact toast: "Did you know? You've now walked the length of the Las Vegas Strip." This is independent of which race they're in — it can also fire off lifetime cumulative totals, giving a reason to keep logging even between races.

### 4.4 Race tiers (creative names — avoid trademarked terms like "Avengers")

| Tier | Nickname | Distance range | Example race themes |
|---|---|---|---|
| 1 | Trailblazer | 1–10 mi | Cross the Golden Gate Bridge and back, loop Central Park, length of the Las Vegas Strip, width of Disney World |
| 2 | Pacesetter | 13.1–26.2 mi | Half-marathon, full marathon, tip-to-tip Manhattan, Circle Line loop (London) |
| 3 | Voyager | 50–100 mi | Grand Canyon rim-to-rim-and-back (~48 mi), shoreline of Lake Tahoe (~72 mi), Big Sur coastline (~90 mi) |
| 4 | Odyssey | 100s of miles | Length of the Grand Canyon (277 mi), Florida north-south (~450 mi), a full state crossing (localized, see below) |
| 5 | Mythic | upper 100s of miles | Land's End to John o'Groats (874 mi), California coastline via Hwy 1 (~655–840 mi), Appalachian Trail (partial) |
| 6 | Legend (thousands) | 1,000s of miles | Coast-to-coast USA (~2,800 mi), Amazon River length (~4,000 mi), full Great Wall of China (~5,500 mi main wall), full Appalachian Trail (2,190 mi), Route 66 (2,448 mi) |
| — | Ascent (elevation, separate axis) | vertical feet | Height of the Eiffel Tower (1,083 ft) x N climbs, Burj Khalifa (2,717 ft), Kilimanjaro (19,341 ft), Everest (29,032 ft) |

Localized races, generated per user based on device locale/GPS: "Cross [your state]," "Walk the length of [your city]," using a precomputed lookup table of state/city span distances rather than live routing — keeps this cheap to build and avoids needing a mapping API for something that's ultimately flavor text.

### 4.5 Progress markers & fun-fact triggers per race

10% · 25% · 1/3 · Halfway · 75% · 90% · Finish — each with a distinct visual (progress bar pulse, confetti burst, avatar animation) scaled up in intensity as the race tier increases (a Trailblazer finish gets a nice animation; a Legend-tier finish should feel like a genuine achievement — bigger animation, shareable card, badge ceremony screen).

### 4.6 Badges & profile

Every completed race awards a badge visually tied to its tier (bronze-style for Trailblazer scaling up to a distinct "Legend" badge treatment). Badges live in a trophy case on the user's profile — visible to friends, which is what lets users "size up" who they're racing, per your spec. This is directly modeled on Strava's trophy case, which their own data shows drives return visits.

## 5. Surface Area Check (target 5–7 primary screens)

Primary tab bar (5 destinations):

- Home — today's stats, active race quick-status ("2.3 mi from catching Jake"), Start button
- Track — live activity recording (start/pause/stop, live stats)
- Races — browse/join public races, view active races, create private race
- Stats — charts (daily/weekly/monthly/yearly toggle) + calendar view as a secondary tab within this screen (not a separate nav destination)
- Profile — badge case, friends list, race history, integrations, settings

Everything else (Race Detail, Race Creation flow, Friend's Profile, individual Badge detail, Notification settings) is a drill-down from these five, not a new nav destination — keeps the tab bar at 5 and total "top-level" surface area within the 5–7 guideline.

## 6. Retention Hook

The framework calls for an "unfinished state" the user has to come back for. This app has that built in structurally, which is a real advantage over a habit tracker:

- The race itself is the unfinished state. As long as a race is active (which can be weeks or months), there's a standing, visible reason to open the app — no separate mechanic needs to be invented.
- Rival-proximity notifications: "Sarah just passed you in the Grand Canyon race" is the single highest-leverage push notification in the app — it converts a passive race into an active one.
- Onboarding hook: first 3 days, log any activity to unlock your first race entry + starter badge — mirrors the "3-day challenge" pattern.
- Milestone push notifications at each progress threshold, timed to pull users back in with a fun fact, not just a number.
- Daily streak counter for logging any activity, Duolingo-style, with a "streak freeze" so one missed day doesn't nuke months of consistency (this reduces the app feeling punishing, which matters for casual/social users, not just competitive ones).
- Limited-time seasonal public races ("Summer Sprint: Cross the English Channel by August 1") to create FOMO on top of evergreen races.

## 7. Technical Plan (React Native + Expo, iOS)

### 7.1 Step & distance tracking

- Walk vs. run classification: decided — pace thresholds, no manual mode picker. Classify automatically from live pace during a session (e.g., faster than ~10 min/mi reads as a run; slower reads as a walk — tune the exact cutoff during testing). One less tap on the Start flow, which matters for keeping the core loop fast; the "manual override" listed in section 3 remains as a rare-case correction, not the default path.
- Steps: expo-sensors Pedometer (wraps iOS CMPedometer) for live step counts. Note: iOS only retains 7 days of historical pedometer data on-device, so daily totals must be persisted to your own backend as they're generated — don't rely on querying historical device data beyond a week back.
- GPS/distance during an active session: expo-location with foreground + background permissions for MVP. If battery drain or GPS jitter becomes a problem in testing, upgrade to react-native-background-geolocation (Transistorsoft) — it's the industry-standard paid SDK for this exact use case (motion-detection-gated GPS, sensor fusion, built-in Kalman-style filtering to smooth noisy paths) and is what most serious run-tracking apps use under the hood.
- Distance smoothing: apply a basic outlier filter at minimum (discard GPS points implying an impossible speed given elapsed time) even before adding a full Kalman filter — this alone eliminates most of the classic "GPS spike adds a fake half-mile" bug.
- Note on Expo Go: HealthKit and most background-geolocation native modules are not available in Expo Go. You'll need an EAS development build (custom dev client) from early on — factor this into setup, not as a later migration.

### 7.2 Apple Health / HealthKit integration

Use react-native-health (or @kingstinct/react-native-healthkit as a modern alternative) to read steps, distance, and flights-climbed (for Ascent-tier races) directly from HealthKit. This is valuable beyond just "another data source" — HealthKit is the aggregation point for Apple Watch workouts, Nike Run Club, and any other app the user has, so reading from HealthKit can capture activity even from apps you never directly integrate with. Recommend making this the primary integration, with Strava as a secondary/optional one.

### 7.3 Strava integration

Use Strava API v3 with OAuth 2.0 (activity:read_all scope) to let users connect their account and auto-import runs/rides/walks. Set up a webhook subscription so new Strava activities push into your app in near-real-time rather than requiring polling.

Decision: light connect only for v1. Strava is an optional toggle in Profile/Settings — connecting does not backfill historical activity. Only activities logged after connecting flow into races and lifetime stats. This keeps the integration to auth + webhook handling, with no pagination/rate-limit/backfill-mapping logic to build or debug. Full history import (retroactively crediting old Strava activities toward races, so a new user could land partway through a race on day one) is a real onboarding upgrade worth revisiting once the core loop is validated — flagged as a v2 candidate, not a v1 requirement.

### 7.4 Backend

Supabase is the better fit here over Firebase: the data (races, participants, progress entries, friendships, leaderboards) is fundamentally relational, benefits from SQL for leaderboard queries, and Supabase's realtime layer (via Postgres replication) covers the "live race standings update" need. It also integrates more smoothly with the Expo managed workflow than react-native-firebase, which requires its own native config.

### 7.5 Charts

react-native-gifted-charts or Victory Native for the Stats screen's daily/weekly/monthly/yearly toggle views — both have good Expo compatibility; Gifted Charts is generally faster to implement for standard bar/line views, Victory Native gives more customization if the race progress visuals need custom charting later.

### 7.6 Race progress visuals

Custom-built with react-native-svg or react-native-skia rather than a mapping library — since races are illustrated abstractions (see 4.2), no react-native-maps or real routing data is needed for the core experience. Save real maps for a possible future feature, not v1.

### 7.7 Notifications

expo-notifications for milestone alerts, rival-proximity pushes, and streak reminders.

### 7.8 Auth

Supabase Auth. Since Strava OAuth is offered as a connect option, note that Apple requires Sign in with Apple to be offered if any other third-party social login is provided — plan for this from the start rather than retrofitting it before submission.

### 7.9 App Store / privacy considerations to plan for now

- Background location requires NSLocationAlwaysAndWhenInUseUsageDescription (and the when-in-use variant) with a clear, specific justification string — Apple reviewers check that the stated reason matches actual use.
- HealthKit requires its own entitlement and usage-description strings, and read/write scopes should be requested individually (don't request broad access "just in case").
- App Privacy label (Nutrition Label) must accurately list every data type collected (location, health/fitness, contacts if friend-finding is built) — Apple's 2026 review has gotten stricter about labels matching actual behavior.
- Since this sits in the Health & Fitness category, Apple's 2026 guidance allows optionally declaring regulatory status — not required for a step/race app, but worth a read before submission.

## 9. Decisions log

| # | Question | Decision |
|---|---|---|
| 1 | Route visual: custom per-landmark art vs. generic template | Generic template path, re-skinned per race with a swappable background/finish-line image. Custom per-landmark art is a v2 upgrade once traction data shows which races are worth the art spend. |
| 2 | Private races: synced start vs. join-mid-race | All participants start at 0 by default, together, no mid-race pace handicap. |
| 3 | Global leaderboard / social feed for v1 | Deferred to v2. v1 ships friends-only leaderboards; global gets built later behind anti-cheat verification. |
| 4 | Strava integration depth on signup | Light connect only — no historical backfill. Only activities logged after connecting count. Full-history import is a v2 onboarding upgrade to revisit later. |
| 5 | Walk vs. run classification | Pace-threshold auto-classification, no manual mode picker on Start (manual override stays as a rare-case correction). |
