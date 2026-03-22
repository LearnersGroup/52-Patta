# Changelog — 52 Patta Mobile

## 1.0.1 (2026-03-22)

### Fixed
- App icon: replaced placeholder with 52 Patta card suits logo on dark green felt background
- Splash screen background updated to match app theme (`#0f2a16`)
- Winning card gold border now sits flush on the card (removed gap); added gold glow shadow matching web app
- Series finished panel now waits 1.5s after last trick sweep before appearing
- Judgement: round scoreboard shown for 5s between rounds with "Starting next round in X…" countdown

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
