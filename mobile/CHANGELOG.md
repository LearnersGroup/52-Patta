# Changelog — 52 Patta Mobile

## 1.0.7 — 2026-03-26

### Added
- **Auto-play**: personal in-game setting (default ON) — automatically plays the card after a 2-second delay when it's the player's only legal move; toggle available in the in-game ⚙ settings panel (replaces the room-level auto-play setting)

### Changed
- **Inspect mode**: tapping the play area now persists the ordered card layout for the rest of the game — no automatic reset, no settings toggle needed; trick-sweep animation starts from inspected positions when active
- In-game ⚙ settings panel now shows Auto-Play On/Off toggle instead of Sticky Inspect toggle

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
