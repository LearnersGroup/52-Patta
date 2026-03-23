# Changelog — 52 Patta Mobile

## Unreleased

### Added
- "Games" section on home page with horizontal-scroll game cards (Kaliteri, Judgement); tapping a card opens a dedicated rules screen
- Full rules screens (`/rules/kaliteri`, `/rules/judgement`) with phased breakdown: Introduction, Shuffling & Dealing, Bidding, PowerHouse & Partner Selection, Playing Tricks, Scoring
- **Auto-play**: optional room setting (default ON) that automatically plays the card when it's the player's only legal move; toggle available in room config for both Kaliteri and Judgement

### Changed
- Card reveal phase now combines move + reveal into one tap: 1st tap reveals card, each subsequent tap moves it to hand and auto-reveals the next card
- Round-end scoreboard now waits for trick sweep animation to finish before appearing; displays for 5 seconds with countdown — works for both Kaliteri and Judgement
- Bid value shown alongside team scores in the HUD during Kaliteri play
- Bidder badge ("B") shown on the bidder's player seat during Kaliteri play
- Ported intelligent teammate inference logic from web client: players can now infer their own team membership by checking if they hold a partner card (1-deck: certain, 2-deck: certain/potential based on copy analysis)
- Full relation resolver ported from web: leader shows as teammate/opponent/potential-teammate; revealed partners display correctly; "Teammate?" badge for ambiguous 2-deck situations
- Relation badges now appear during powerhouse phase (not just playing)

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
