# Changelog — 52 Patta Mobile

## 1.1.19 — 2026-04-25

### Changed
- **Mendikot round-end: auto-advance after 10s (mobile + web + server)**: rounds now advance automatically after 10 seconds — no need for all players to tap "Next Round". A countdown bar is shown; any player can tap "Skip" to advance early.
- **Mendikot round-end display: shows in-game scoreboard format (mobile + web)**: after each round ends, the scoreboard now shows the history table (rounds, tricks, tens cards per team, result) matching the format from the in-game HUD. The full session-totals summary is now only shown after the series ends.

## 1.1.18 — 2026-04-24

### Changed
- **Card reveal counter redesigned**: progress now shows `X / Y` as the primary text with `tap to reveal` as smaller subtext beneath, replacing the previous inline `Tap to reveal · X/Y` format.
- **Card-reveal is now a formal phase (all game modes)**: the server previously embedded the card-inspect window inside the `bidding` phase for Kaliteri/Judgement and skipped it entirely for Mendikot. All three modes now transition through an explicit `card-reveal` phase between dealing and their game-specific setup. The reveal overlay now opens on entering `card-reveal` and closes when the server advances to the next phase, rather than relying on a client-side timer.
- **Mendikot gains a card-reveal window**: Mendikot now includes a `card-reveal` phase (default 10s, configurable via `card_reveal_time`). In Band Hukum the order is `band-hukum-pick → card-reveal → playing`; in Cut Hukum it is `card-reveal → playing`.

## 1.1.16 — 2026-04-21

### Added
- **Mendikot rules content (mobile + web)**: added a full Mendikot rules reference (overview, trump modes, trick play, scoring, round/series result logic) so players can read game flow in-app before joining tables.

### Changed
- **Rules screen icon handling (mobile)**: rules pages now render dedicated game icon assets (`Kaliteri_Icon`, `Judgement_Icon`, `Mendi_Icon`) instead of only text glyphs, and route param normalization now safely handles encoded/array `game` values.

### Fixed
- **HUD scoreboard/menu overlap during deal reveal (mobile + web)**: when transitioning into bidding and triggering card-reveal, any open HUD scoreboard/menu modal is now force-closed first to prevent lingering overlays above the reveal sequence.

## 1.1.15 — 2026-04-21

### Fixed
- **Create Room (Mendikot)**: removed the incorrect hard-disable of the "2 Decks" option for mendikot. The game engine supports 1 or 2 decks for all mendikot player counts (4–12); only the mobile UI was blocking selection.

## 1.1.14 — 2026-04-20

### Fixed
- **CI**: set `"image": "latest"` on `preview` and `production` EAS build profiles so all future EAS-remote builds use the newest Xcode image (Xcode 26+ / iOS 26 SDK), satisfying Apple's April 28 2026 requirement (ITMS-90725).
- **CI**: updated `ship-ios-local-build` workflow to use `macos-26` runner and Xcode 26 for the same reason.

## 1.1.13 — 2026-04-19

### Fixed
- **CI**: patch expo-modules-core@55.0.22 post-install to remove `@MainActor` from three protocol conformances (`AnyExpoSwiftUIHostingView`, `ViewWrapper`, `AnyArgument`). These use Swift-6-only conformance annotation syntax that fails with "unknown attribute 'MainActor'" in Swift 5 mode. A `postinstall` Node script (`scripts/patch-expo-modules.js`) applies the changes idempotently after every `npm install` / `npm ci`.

## 1.1.12 — 2026-04-19

### Fixed
- **CI**: updated expo packages to latest patch versions (expo 55.0.8→55.0.15, expo-modules-core 55.0.8→55.0.22, expo-router 55.0.7→55.0.12, expo-splash-screen 55.0.12→55.0.18, and others). expo-modules-core@55.0.22 contains the Xcode 16.4 / Swift 6 compatibility fixes; the old version used `@MainActor` in protocol conformance position which is Swift-6-only syntax, making it impossible to compile in Swift 5 mode.
- **CI**: removed broken `prebuildCommand` from `eas.json` (EAS treats it as an expo CLI subcommand, not a shell command); wired `./plugins/withSwiftConcurrency` into `app.json` plugins.

## 1.1.11 — 2026-04-19

### Fixed
- **TeamScoreHUD (Kaliteri)**: added `minHeight: 44` to the HUD row so it always reserves the same vertical space across all game phases. Previously the row collapsed to ~0 height during shuffling/dealing/bidding (when neither side column had content), causing the table to bleed up behind the absolutely-positioned pill.

## 1.1.10 — 2026-04-18

### Changed
- **PowerHouse suit picker (Kaliteri)**: reordered the 2×2 grid to Spades/Diamonds (top row) and Clubs/Hearts (bottom row) using explicit row layout so exactly 2 buttons appear per row on all screen sizes. Tapping a suit fades in (500 ms) a full-screen Modal overlay with a centered confirm card; tapping it again confirms the suit; tapping anywhere else fades it out (300 ms) and returns to the 4-button grid.
- **TeamScoreHUD layout**: pill always stays centred — left side (score) and right side (partner cards) each get `flex: 1` so they balance each other regardless of which is visible. Score, pill, and partner cards all appear in the same row.

## 1.1.9 — 2026-04-18

### Changed
- **Game mode icons on homepage, create-room, lobby, and config editor**: replaced Unicode suit symbols (♠♦♣♥) with the dedicated PNG game mode icons (`Kaliteri_Icon`, `Judgement_Icon`, `Mendi_Icon`) for a more polished, branded look.
- **Homepage**: added Mendikot as a third game card alongside Kaliteri and Judgement.

## 1.1.8 — 2026-04-18

### Changed
- **Judgement deck count is now free**: removed the hard coupling that forced 1 deck for ≤6 players and 2 decks for 7+ players. Any deck count can now be used with any player count; "Max Cards / Round" is automatically clamped to the maximum dealable cards (`floor(52 × decks / players)`) to prevent running out of cards.

## 1.1.7 — 2026-04-18

### Fixed
- **Create-room → lobby settings override (Judgement)**: the "Trump Mode" setting selected on the create-room screen was silently dropped by the server because the form was sending `'cyclic'`, which is not a valid value (server accepts `'fixed'` or `'random'`). The lobby then fell back to its `'fixed'` default, making it appear as though the selection was overridden. Fixed by aligning the option value to `'fixed'`.
- **Mendikot trump mode not persisted to lobby**: `LobbyConfigEditor` was reading `roomData.mendikot_trump_mode` (a field that does not exist) instead of `roomData.trump_mode`, so the lobby always displayed the `'band'` default regardless of what was chosen at room creation. The save payload also sent `mendikot_trump_mode` instead of `trump_mode`, so updates from the lobby were silently ignored by the server. Both fields corrected.

### Changed
- **Create-room label alignment (Judgement)**: setting labels in the create-room form now match the lobby editor exactly — "Trump Mode" (was "Powerhouse Selection"), "Fixed (S→D→C→H)" option (was "Cyclic"), "Ascending Only" (was "Ascending"), "Scoreboard Display Time" (was "Scoreboard Time"), "Bidding Time Limit" (was "Bid Timer"), "Time Limit" option (was "Timed"), "Card Reveal Time" (was "Card Inspect Time").
- **Create-room label alignment (Kaliteri)**: "Bid Threshold for Extra Teammate" (was "Bid Threshold").

## 1.1.6 — 2026-04-18

### Fixed
- **Auto-play double-emit race condition**: when auto-play fired on the last card of a hand and the player also tapped confirm, both paths emitted `game-play-card` before Redux state updated — the second emit hit the server after the phase had already advanced, causing a `Game is not in playing phase` error. Added a `playEmittedRef` guard that is reset at the start of each turn; whichever path fires first (auto-play or manual confirm) sets the flag and the other becomes a no-op.
- **Avatar missing on HomeScreen after onboarding**: after completing avatar creation, the avatar now appears immediately on the HomeScreen. Previously, `completeOnboarding` called `router.replace('/')` right after `refreshProfile()`, racing against the profile state commit and causing HomeScreen to render before the avatar was available. Removed the explicit navigation — the `<Redirect>` in `create-user.js` now handles it after the profile (with avatar) is fully committed to context.

## 1.1.5 — 2026-04-17

### Changed
- **Judgement trump reveal**: removed `trump-announce` as a distinct server phase. Trump suit for the next round is now shown inline in the table center after a brief delay (allowing the last-trick sweep animation to complete) — a 3-second countdown is shown; tap anywhere to dismiss early, or it auto-dismisses. No full-screen overlay. Between-round inline result panel removed.

## 1.1.4 — 2026-04-17

### Changed
- **Judgement HUD pill**: redesigned `TeamScoreHUD` to match the Mendikot HUD pill style — dark green pill (`rgba(19,42,25,0.92)`) with gold border. Trump suit symbol is now inline inside the pill (coloured red for hearts/diamonds), separated by a gold divider from the round indicator. Round text uses the same compact font style as Mendikot (`Rd X/Y` cadence). Separate trump and scoreboard sections removed. Scoreboard icon replaced with hamburger (☰) button. Settings (⚙) icon moved inside the pill. Hamburger opens a SCOREBOARD modal with an END button (admin only, top-left), centred SCOREBOARD title, and ✕ close button (top-right), containing the full per-player score table.

### Fixed
- **Ready status ring**: fixed ready indicator around player avatars showing pink in Kaliteri/Judgement lobbies after switching from a Mendikot room. `colors.ready` is now green (`#4ade80`); Mendikot team colours remain separate.
- **Judgement round scoreboard**: converted between-round scoreboard from an absolute-positioned `View` to a `Modal` (`statusBarTranslucent`) so it covers the full screen including status bar and home indicator areas.
- **Judgement trump reveal timing**: scoreboard overlay now stays visible until the `bidding` phase begins, so the trump-announce and dealing animations of the next round are never obscured by the countdown.
- **Turn indicator glow**: blink rate doubled (1200 ms → 600 ms); shadow opacity raised to 0.95 and radius range widened to 10–22 px for a neon-gold intensity matching the lobby ready ring.

### Changed
- **App background**: switched to `background_soft.png` for all screens; active game screen retains `background_textured.png`; game lobby also uses `background_soft.png`. Added `variant` prop to `AppBackground` (`'soft'` | `'textured'`).
- **App icon**: updated launcher icon to `52_Patta_Icon.png`; loading screen (phase 2) logo changed to `52_Patta_Icon_Suits.png` with a single gold glow blink animation on entry.
- **Loading screen progress bar**: moved to bottom edge (15px margin), end-to-end width, height doubled to 12px. Added animated 0–100% label — white, bold (900 weight), 21px, black text shadow — centred on the bar and rendered above it.
- **Table shape**: removed rectangular table option; elliptical is now the only layout. Removed table shape toggle from in-game settings and cleaned up all conditional logic in `CircularTable`, `PlayArea`, `GameBoard`, and `preferences` slice.
- **Play table gold glow**: added gold shadow halo (`shadowRadius: 22`) beneath the elliptical felt table via a hidden glow layer in `CircularTable`.
- **Mendikot HUD pill**: border width increased to 3px; shadow/glow removed.
- **Trump placeholder**: when trump is not yet revealed, the table center shows `52_Patta_Icon_Suits_shadow.png` as a dark watermark (`tintColor: '#000'`, `opacity: 0.2`, 156×156) instead of being blank.

## 1.1.3 — 2026-04-16

### Changed
- **Mendikot HUD menu**: replaced the inline scoreboard toggle (⊞) and admin quit (✕) buttons in the HUD pill with a single hamburger (☰) button. Tapping it opens a modal overlay with a round-history scoreboard table showing round #, Team A (tricks badge + tens count), Team B (tricks badge + tens count), and Result columns. Winning team's row has a faint team-colour background; the winning team's column is more opaque, the losing team's column is slightly transparent. Result shows "win by" in small text above the win type. Admin players see an END button (top-left of modal) and all players see an X close button (top-right); tapping outside the modal also closes it.

## 1.1.2 — 2026-04-16

### Changed
- **Trump reveal announcement**: removed `TrumpRevealedSplash` full-screen modal overlay. The revealed card now floats above the table centre and the "{playerName} requested to reveal trump" message sits below the table centre, both visible for 3 seconds. Deleted orphaned `RevealTrumpPrompt.js`.
- **Mendikot HUD layout**: removed A vs B trick count from the pill. Team scores now flank the pill — Team A left, Team B right. Each side shows a card-back with a coloured circular trick-count badge, plus stacked tens cards (20% peek per card). Trump chip now shows suit symbol + rank (e.g. ♠K, ♦7) once revealed.
- **Server**: removed redundant `|| null` fallback on `closed_trump_card` in `revealTrump` socket handler — card is always set during the pick phase.

## 1.1.1 — 2026-04-16

### Changed
- **Hidden trump positioning**: `ClosedTrumpDisplay` is now anchored to the trump holder's seat on the circular table instead of a fixed top-right overlay. The card is rotated so its head faces the table centre and straddles the avatar edge 50 % inside / 50 % outside.
- **Hidden trump reveal UX**: removed the modal `RevealTrumpPrompt` dialog. When eligible to reveal, the hidden card bounces softly toward the table centre to signal interactivity. The player can tap either the hidden card or the holder's avatar to reveal, or simply play a card as usual.
- **`CircularTable`**: added `overlayContent` prop — a callback receiving `{ seatPositionMap, geo }` rendered as absolutely-positioned children directly inside the table wrapper.
- **`PlayerSeat`**: added `onPress` prop; wraps the seat in a `Pressable` when provided (used for the trump-holder avatar tap-to-reveal interaction).
- **Trump revealed splash** (`TrumpRevealedSplash`): when any player reveals the hidden trump, the card disappears from under the avatar and a full-screen overlay appears for 3 seconds showing the revealed card (4× play-card size) above the "X requested to reveal trump" message. The existing `TrumpRevealRequestAnnouncement` toast is suppressed while the splash is visible.

## 1.1.0 — 2026-04-12

### Added — Mendikot game mode
- **Create room**: Mendikot game type card in `new.js`; settings panel with Trump Mode (Band Hukum / Cut Hukum), Pick Phase toggle, and Rounds stepper; player stepper enforces even count ≥ 4
- **Lobby config editor**: Mendikot chip and config section in `LobbyConfigEditor.js`; syncs `mendikot_trump_mode`, `rounds_count`, `band_hukum_pick_phase`
- **Team lobby** (`MendikotTeamLobby.js`): Two-column sky-blue / pink team grid with player avatars, ready dots, Switch Team button (non-admin) and Randomize Teams button (admin)
- **Band-hukum pick phase**: `PlayerHand` renders face-down cards (`CardBack`) for the picker; tapping emits `pick-closed-trump` with position index; `GameBoard` shows instruction text in the center
- **Closed trump indicator** (`ClosedTrumpDisplay.js`): fixed top-right face-down card with holder name shown during playing when trump is still hidden
- **Reveal trump prompt** (`RevealTrumpPrompt.js`): modal overlay when player is void in led suit — "Reveal Trump" or "Play without revealing"
- **Mendikot HUD** (`MendikotHUD.js`): pill with Team A vs B trick counts, trump symbol, round counter; toggleable inline scoreboard with mini `CardFace` ten icons per team
- **Mendikot scoreboard** (`MendikotScoreBoard.js`): result banner (win-by-tricks / win-by-mendi / mendikot / 52-card mendikot), round summary, session totals table, round history, Next Round button
- **Team seat ring colors**: `PlayerSeat` now accepts `mendikotTeam` prop — sky-blue ring for Team A, pink for Team B
- **Redux slice**: added 14 mendikot-specific fields to `initialState` and `updateGameState`
- **Socket emitters**: `WsPickClosedTrump`, `WsRevealTrump`, `WsUserSwitchTeam`, `WsAdminRandomizeTeams`
- **Socket listeners**: `mendikot-team-update`, `mendikot-trump-revealed`; `band-hukum-pick` phase label

### Fixed
- **`game-request-state` error on room entry**: entering a lobby emitted `WsRequestGameState()` which the server rejected with "No active game found" (game state only exists after a game starts). Server now silently ignores this case instead of calling the error callback, preventing the noisy console error on every room entry.
- **Mendikot trump mode ignored on room creation**: `new.js` was sending `mendikot_trump_mode` in the create-room payload but the server destructures `trump_mode`, so the selection was silently discarded and Band Hukum was always forced. Key corrected to `trump_mode`.
- **Avatar crash on login for email/OAuth accounts**: `SvgUri` was used for all avatar rendering, but Gravatar URLs (assigned to email sign-up accounts) and Google/Facebook OAuth profile picture URLs return JPEG — not SVG. Passing a JPEG URL to `SvgUri` crashes with `Cannot read property 'length' of undefined` inside the SVG XML parser. Created a shared `AvatarImage` component that detects whether the URI is SVG (`data:image/svg+xml` data URI or a URL containing `/svg`) and picks `SvgUri` vs React Native `Image` accordingly. All 6 avatar render sites updated: `HomeScreen`, `Profile`, `PlayerSeat`, `LobbyPlayerList`, `SeriesFinishedPanel` (×2).
- **Judgement bidding: dealer trapped at 1**: when the dealer's forbidden bid was 0, the `JudgementBiddingPanel` useEffect re-ran on every `amount` change and force-reset the selection back to `1`, making it impossible to bid 2/3/4/5. The effect now only runs on turn/forbidden transitions; `+`/`-` freely move across 0–N and the submit button disables when the current selection is the forbidden value.

## 1.0.10 — 2026-04-08

### Changed
- **NC loading screen**: replaced text-based "Narsinh Creations" Phase 1 with `NC_LOGO_SCREEN.png` full-screen image

### Infrastructure
- **Android release setup**: added `versionCode: 1` to `app.json` (Play Store requires an integer build number); added Android submit config to `eas.json` for `internal` (preview) and `production` Play tracks
- **GitHub Actions workflow** (`.github/workflows/ship-android.yml`): manual trigger to build and submit Android app to Google Play — mirrors `ship-ios.yml` with choice of `preview`/`production` profile; requires `PLAY_SERVICE_ACCOUNT_KEY` secret (base64-encoded Google Play service account JSON)
## 1.0.9 — 2026-04-09

### Fixed
- **NC logo screen not displaying**: Phase 1 (Narsinh Creations) now starts at full opacity so it is immediately visible when the native splash hides — previously it faded in from invisible, and mixing `Animated.delay` (JS thread) with native-driver animations inside `Animated.sequence` could cause the hold to stall, skipping Phase 1 entirely. Replaced the `Animated.sequence` + `Animated.delay` hold with a plain `setTimeout` to eliminate the cross-thread race.

## 1.0.9 — 2026-04-06

### Added
- **Branded loading screen** (`AppLoadingScreen.js`): two-phase JS overlay replaces the bare native splash
  - Phase 1 (1.5 s): "Narsinh Creations" studio card — black bg, serif text, fade-in/hold/fade-out
  - Phase 2 (1.5 s min): "52 Patta" app title with card-suits logo and gold progress bar (0→100% in 1 s), using the same layered background as the lobby (dark base + green gradient + diagonal gold lines); gold glow radiates behind the logo
  - Crossfade between phases eliminates any flash of the underlying app
  - Screen fades out once fonts are loaded and minimum hold time has elapsed

### Infrastructure
- Added GitHub Actions workflow (`.github/workflows/ship-ios.yml`) for manual iOS builds and TestFlight submission via EAS — trigger anytime from the GitHub Actions tab with a choice of build profile and optional release notes
- **Versioning source of truth moved to git** (2026-04-05): `appVersionSource` switched from `"remote"` to `"local"` — version in `app.json` is now authoritative; bumping it in `app.json` + this changelog is required before triggering `ship-ios`
- **Preview builds now target staging** (2026-04-05): `preview` EAS profile connects to `https://staging.52patta.in`; `production` profile explicitly connects to `https://52patta.in` — test builds no longer hit the live backend
- **Preview builds now go to TestFlight** (2026-04-05): `preview` profile submits to "Internal Testers" group; `production` submits to "External Testers" group
- **Preview build number auto-increments** (2026-04-06): added `autoIncrement: true` to `preview` EAS profile — build numbers no longer need to be bumped manually between preview builds
- Added Terraform support for `staging.52patta.in` DNS record (`aws_route53_record`) — staging EC2 can now be assigned a proper subdomain via `staging.tfvars`
- **Terraform environment isolation** (2026-04-05): restructured into `terraform/environments/prod/` and `terraform/environments/staging/` with separate state files — `terraform destroy` on staging cannot affect production
- **Staging server** (2026-04-05): `nginx/nginx.staging.conf` added for `staging.52patta.in`; deploy workflows sync `JWT_SECRET`, `MONGO_HOST`, and `CORS_ORIGINS` to the server on every deploy
- **Production deploy workflow** (2026-04-05): `deploy-prod.yml` fixed — correctly finds prod EC2 by `52-patta-production` tag; all critical env vars synced on deploy
- **MongoDB isolation** (2026-04-05): staging and prod use separate Atlas databases (`52patta-staging` vs `52patta`) — test data never touches production

## 1.0.8 — 2026-03-26

### Fixed
- **Daily re-login**: JWT tokens now expire after 30 days instead of 24 hours — users stay logged in across sessions without needing to re-authenticate via Google every day
- **Screen lock desync**: The app now re-syncs state when returning from background (screen unlock): lobby players re-fetch room membership and game players re-request authoritative game state from the server
- **Stale lobby state after reconnect**: Players who briefly lose connection while in the lobby (e.g. screen lock < 30 s) are no longer removed from the room — a 30-second grace period cancels the removal if they reconnect in time
- **Missed reconnections**: Socket.io reconnection is now explicitly configured with `Infinity` retry attempts and up to 10-second backoff — previously relied on library defaults which could give up silently

### Changed
- Server socket ping timeout increased from 20 s → 30 s, giving iOS background-suspended apps more time before the server declares a connection dead
- Auth error detection on socket connection errors is now precise — only exact server-side error messages ("token expired", "no token provided", "invalid token") trigger logout, preventing false logouts on unrelated connection errors
- Token refresh happens silently in the background whenever the app returns to the foreground and the token expires within 7 days

### Added
- **Token refresh endpoint** (`GET /api/auth/refresh`): issues a fresh 30-day token without requiring a full re-login; called automatically when the app resumes
- **App lifecycle hook** (`useAppState`): globally manages socket reconnection and token refresh on foreground resume; game-room screen uses it to trigger state re-sync based on current phase

## 1.0.7 — 2026-03-26

### Added
- **Auto-play**: personal in-game setting (default ON) — automatically plays the card after a 2-second delay when it's the player's only legal move; toggle available in the in-game ⚙ settings panel (replaces the room-level auto-play setting)

### Changed
- Lobby settings editor: aligned all labels, option names, and option order with the web create-game page (e.g. "Round Order" with "Ascending Only"/"Up & Down", "Bidding Time Limit" with "Time Limit", "Fixed (S→D→C→H)", full labels for all steppers)
- **Inspect mode**: tapping the play area now persists the ordered card layout for the rest of the game — no automatic reset, no settings toggle needed; trick-sweep animation starts from inspected positions when active
- In-game ⚙ settings panel now shows Auto-Play On/Off toggle instead of Sticky Inspect toggle

### Fixed
- Intended card play area now sits higher to avoid overlapping the player avatar; shows a persistent dashed outline + arrow indicator even when no card is selected
- **Back navigation**: swiping back or tapping the back button in game rooms now shows a confirmation dialog instead of silently leaving without updating the server
- **Triple-swipe bug**: non-admin players no longer need to swipe back 3 times; fixed by using `router.replace` for rejoin/redirect to avoid stacking duplicate navigation entries
- **Admin back-nav**: admin swiping back no longer lands on the create-room page; `router.dismissAll()` clears the full stack back to home
- **Room closure toast**: other players now see a "The room was closed by the host" toast when the admin closes the room

### Removed
- Lobby chat feature removed (`LobbyChat` component + `WsUserSendMsgRoom` socket emitter)

### Performance
- `PlayerSeat`: wrapped with `memo()` — prevents re-renders when seat data is unchanged
- `LobbyPlayerList`: wrapped with `memo()` — prevents re-renders when parent re-renders without changed player data
- `GameBoard`: `getName` wrapped with `useCallback`; inner components `IntendedCardSlot`, `ScoreboardModal`, `RevealAnnouncement` wrapped with `memo()`

## 1.0.6 — 2026-03-26

### Fixed
- "Failed to fetch game room" error caused by rapid Ready/Not Ready button taps — client debounce disables the button for 500ms after each press; server-side rate limit rejects duplicate toggle events within the same window

## 1.0.5 — 2026-03-26

### Fixed
- Partner card display in 2-deck games now shows a `#1` / `#2` badge overlaid on the card face, matching the web app — previously the copy number was tracked but not shown

## 1.0.4 — 2026-03-23

### Added
- **Auto-play**: automatically plays the card when it's the player's only legal move; configurable room setting (default ON) for both Kaliteri and Judgement — toggle available in create-room and lobby config
- Relation badges now appear during the powerhouse phase (not just during play)
- 1-second haptic vibration when it becomes the player's turn

### Changed
- Round-end scoreboard now waits for trick sweep animation to finish before appearing; displays for 5 seconds with countdown — works for both Kaliteri and Judgement
- Bid value shown alongside team scores in the HUD during Kaliteri play
- Bidder badge ("B") shown on the bidder's player seat during Kaliteri play
- Card reveal phase now combines move + reveal into one tap: 1st tap reveals card, each subsequent tap moves it to hand and auto-reveals the next card
- Ported intelligent teammate inference logic from web client: players can now infer their own team membership by checking if they hold a partner card (1-deck: certain, 2-deck: certain/potential based on copy analysis)
- Full relation resolver ported from web: leader shows as teammate/opponent/potential-teammate; revealed partners display correctly; "Teammate?" badge for ambiguous 2-deck situations
- Inactive player avatar ring thinned to 50%; active-turn player shows full ring with coloured glow

## 1.0.3 — 2026-03-23

### Added
- In-game settings panel: tap ⚙ in the HUD to open a modal with table shape and sticky inspect mode toggles
- Table shape preference: Rectangular (seats on rect perimeter) or Elliptical (seats on ellipse with rounded table)
- Sticky inspect mode: keeps cards fanned out across moves, card positions adjust to match the selected table shape

### Changed
- Scoreboard: current player's column highlighted with gold border; Kaliteri layout changed to players-on-X / games-on-Y with totals row, matching Judgement layout
- Turn indicator: larger avatar (58 px), thicker border (3 px), heavy haptic feedback on player's turn

### Fixed
- 2-deck winning card logic: the second identical card now correctly shows as the winning card when played after the first copy

## 1.0.2 — 2026-03-22

### Added
- "Games" section on home screen with horizontal-scroll game cards (Kaliteri, Judgement); tapping a card opens a dedicated rules screen
- Full rules screens (`/rules/kaliteri`, `/rules/judgement`) with phased breakdown: Introduction, Shuffling & Dealing, Bidding, PowerHouse & Partner Selection, Playing Tricks, Scoring

### Fixed
- Intended card play area now sits higher to avoid overlapping the player avatar; shows a persistent dashed outline + arrow indicator even when no card is selected
- Back navigation: swiping back or tapping the back button in game rooms now shows a confirmation dialog instead of silently leaving without updating the server
- Triple-swipe bug: non-admin players no longer need to swipe back 3 times; fixed by using `router.replace` for rejoin/redirect to avoid stacking duplicate navigation entries
- Admin back-nav: admin swiping back no longer lands on the create-room page; `router.dismissAll()` clears the full stack back to home
- Room closure toast: other players now see a "The room was closed by the host" toast when the admin closes the room

### Removed
- Lobby chat feature removed (`LobbyChat` component + `WsUserSendMsgRoom` socket emitter)

### Performance
- `PlayerSeat`: wrapped with `memo()` — prevents re-renders when seat data is unchanged
- `LobbyPlayerList`: wrapped with `memo()` — prevents re-renders when parent re-renders without changed player data
- `GameBoard`: `getName` wrapped with `useCallback`; inner components `IntendedCardSlot`, `ScoreboardModal`, `RevealAnnouncement` wrapped with `memo()`

## 1.0.1 (build 4) — 2026-03-22

### Added
- Register page: matches login page styling exactly — AppBackground, title area,
  Google/Facebook buttons with proper logos and shadows; removed Name field
- create-user (onboarding): full-screen layout with header, editable username +
  Random button, flex avatar creator, Continue button pinned to bottom
- avatar-editor: editable display name field above avatar creator; saves both
  name and avatar together

### Fixed
- Missing profile avatar on home screen after first registration — `completeOnboarding`
  now awaits `refreshProfile()` before navigating so avatar is ready immediately
- Unplayable (illegal) cards now dimmed with dark overlay instead of opacity change,
  matching web app style
- PowerHouseSelector and BiddingPanel (kaliteri) removed box containers; content
  floats directly on the play table
- Card play delay: intended card slot now fires on `onPressIn` instead of `onPress`
  (removes ~100ms Pressable disambiguation delay)

### Changed
- Team score HUD layout: left column (controls row + team score row) + right column
  (partner cards spanning full height of both rows)
- App icon updated to 52 Patta card suits logo on dark green felt background
- Splash screen background updated to match app theme (`#0f2a16`)

## 1.0.0 (2026-03-22)
Initial TestFlight release.

### Auth & Onboarding
- Email/password login and registration
- Google & Facebook OAuth with deep-link callback (`patta52://oauth-callback`)
- Avatar creator with SVG avatar selection
- First-launch redirect to username/avatar setup screen

### Game Lobby
- Create and join game rooms (Judgement, Kaliteri, PowerHouse)
- Live lobby player list with avatars (3-column grid)
- Room config editor for admin (player count, game type)
- Kick player with confirmation dialog
- Lobby chat

### Game Board
- Circular table layout with player seats, avatars, and name badges
- Dealing animation — cards fly to each player's seat in round-robin order
- Card reveal phase — tap-to-flip individual cards with Reanimated 3 animations;
  last card waits for tap before dismissing backdrop
- Gesture-based card hand — tap-and-hold to preview cards (card rises 70%);
  tap to set intended card; tap intended card slot to play
- Dynamic card overlap — all cards fit on screen regardless of hand size
- Inspect mode — tap play table to slide played cards near their player's seat
- 2s hold after last card of round before scoreboard appears
- Strongest card on table shown with gold border (no bounce/glow)
- Haptic feedback on card tap, hold, and swipe

### Kaliteri Game Mode
- PowerHouse suit selector and partner card selection on play table (no box overlay)
- Team score HUD — blue vs red live trick points, partner cards in right column
- Partner cards stack when >1; tap to expand
- Partner reveal announcement toast
- Teammate / Opponent / Partner badges on player seats
- Bidding panel floats on table (no box)

### Judgement Game Mode
- Bidding panel with valid bid options
- Round-by-round score table with bid vs actual

### Series Finish
- Podium with player avatars (1st centre, 2nd left, 3rd right)
- Score table for both Judgement and Kaliteri
- Runners-up scores listed below podium
- Return to lobby button

### Infrastructure
- Bundle ID: `in.patta52.app`
- Production API: `https://52patta.in/api`
- Production WebSocket: `https://52patta.in`
- EAS Build configured for iOS production profile
