# Changelog — 52 Patta Mobile

## 1.0.9 — 2026-04-01

### Infrastructure
- Added GitHub Actions workflow (`.github/workflows/ship-ios.yml`) for manual iOS builds and TestFlight submission via EAS — trigger anytime from the GitHub Actions tab with a choice of build profile and optional release notes
- **Versioning source of truth moved to git** (2026-04-05): `appVersionSource` switched from `"remote"` to `"local"` — version in `app.json` is now authoritative; bumping it in `app.json` + this changelog is required before triggering `ship-ios`
- **Preview builds now target staging** (2026-04-05): `preview` EAS profile connects to `https://staging.52patta.in`; `production` profile explicitly connects to `https://52patta.in` — test builds no longer hit the live backend
- **Submit gated to production profile** (2026-04-05): `eas submit` (TestFlight) only runs when `ship-ios` is triggered with profile `production`; preview builds produce an internal `.ipa` only
- Added Terraform support for `staging.52patta.in` DNS record (`aws_route53_record`) — staging EC2 can now be assigned a proper subdomain via `staging.tfvars`
- **Preview builds now go to TestFlight** (2026-04-05): `preview` profile changed from `internal` to `store` distribution — both profiles submit to TestFlight; `preview` → "Internal Testers" group (staging backend), `production` → "External Testers" group

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
