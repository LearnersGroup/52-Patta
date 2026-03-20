# 52-Patta Mobile App — Phased Implementation Plan

> **Target:** React Native (Expo managed workflow) → TestFlight via EAS Build
> **Location:** `/mobile` directory in this repo
> **Backend:** Same existing Node.js/Socket.IO server (no backend changes needed)
> **Agent:** Cline (GPT 5.3 Codex, 400k context window)

---

## Architecture Overview

```
52-Patta/
├── client/              # existing React web app (reference only)
├── mobile/              # NEW — Expo React Native app
│   ├── app/             # Expo Router file-based routes
│   ├── src/
│   │   ├── api/         # REST + Socket.IO (ported from client/src/api/)
│   │   ├── redux/       # RTK store + slices (ported from client/src/redux/)
│   │   ├── components/  # RN components (rewritten from client/src/components/)
│   │   ├── hooks/       # useAuth, useLocalStorage → AsyncStorage
│   │   ├── styles/      # shared theme, colors, spacing
│   │   └── utils/       # card helpers, validators
│   ├── assets/          # card images, app icon, splash
│   ├── app.json         # Expo config
│   ├── eas.json         # EAS Build config
│   └── package.json
├── game_engine/         # shared (read-only reference)
├── server.js            # backend (unchanged)
└── ...
```

### Key Technology Mapping (Web → Mobile)

| Web (client/)                    | Mobile (mobile/)                        |
|----------------------------------|-----------------------------------------|
| React DOM                        | React Native                            |
| React Router v6                  | Expo Router (file-based)                |
| SCSS / CSS animations            | StyleSheet + react-native-reanimated    |
| localStorage                     | @react-native-async-storage             |
| `@letele/playing-cards` (SVG)    | react-native-svg + custom card components |
| `@dicebear/open-peeps`           | SvgUri from react-native-svg (URL-based) |
| Axios                            | Axios (same)                            |
| Socket.IO client                 | socket.io-client (same)                 |
| Redux Toolkit                    | Redux Toolkit (same)                    |
| CSS media queries                | Dimensions API / useWindowDimensions    |

---

## Phase 0 — Project Scaffolding & Core Infrastructure

**Goal:** Bootable Expo app with navigation, auth, socket connection, and Redux store.
**Estimated scope:** ~15 files, foundation for everything else.

### Tasks

#### 0.1 — Initialize Expo Project
```bash
cd /Users/prins203/code/52-Patta
npx create-expo-app mobile --template blank
cd mobile
```

#### 0.2 — Install Core Dependencies
```bash
npx expo install expo-router expo-linking expo-constants expo-status-bar
npx expo install @react-native-async-storage/async-storage
npx expo install react-native-svg react-native-svg-transformer
npm install @reduxjs/toolkit react-redux
npm install socket.io-client axios
npm install react-native-reanimated react-native-gesture-handler
npm install react-native-safe-area-context react-native-screens
```

#### 0.3 — Configure Expo Router
Set up file-based routing in `app/` directory:
```
mobile/app/
├── _layout.tsx          # Root layout (providers: Redux, Auth, SafeArea)
├── index.tsx            # Home/Lobby screen (redirect to login if unauthenticated)
├── login.tsx            # Login screen
├── register.tsx         # Register screen
├── create-user.tsx      # Onboarding (set username + avatar)
├── profile.tsx          # Profile/settings screen
├── oauth-callback.tsx   # OAuth deep link handler
└── game-room/
    ├── new.tsx          # Create game room screen
    └── [id].tsx         # Game room screen (lobby view + game board)
```

#### 0.4 — Port Redux Store
Port from `client/src/redux/` — these files are framework-agnostic and can be copied almost verbatim:

- `mobile/src/redux/store.js` — copy from `client/src/redux/store.js`
- `mobile/src/redux/slices/game.js` — copy from `client/src/redux/slices/game.js` (60+ fields, all game state)
- `mobile/src/redux/slices/alert.js` — copy from `client/src/redux/slices/alert.js` (toast notifications)

**No changes needed** — Redux slices are pure JS, no DOM dependencies.

#### 0.5 — Port API Layer
Port from `client/src/api/` — mostly framework-agnostic:

- `mobile/src/api/apiClient.js` — Axios instance, change BASE_URL to use env var or config
- `mobile/src/api/apiHandler.js` — all REST endpoints (auth, profile, rooms) — copy verbatim
- `mobile/src/api/wsEmitters.js` — all socket.emit wrappers — copy verbatim
- `mobile/src/api/wsGameListeners.js` — all socket.on handlers — copy verbatim

#### 0.6 — Port Socket.IO Client
Port from `client/src/socket.js`:
- Replace `localStorage` → `AsyncStorage` (async)
- Same auth callback pattern: pass JWT token
- Export socket instance + connect/disconnect helpers

```javascript
// mobile/src/api/socket.js
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_URL = __DEV__ ? 'http://localhost:4000' : 'https://your-prod-url.com';

const socket = io(SERVER_URL, {
  autoConnect: false,
  auth: async (cb) => {
    const user = JSON.parse(await AsyncStorage.getItem('user'));
    cb({ token: user?.token });
  },
});

export default socket;
```

#### 0.7 — Port Auth Context
Port from `client/src/components/hooks/useAuth.jsx`:
- Replace `useLocalStorage` hook → AsyncStorage (make it async)
- Same shape: `{ user, profile, login, logout, refreshProfile, updateUserName, completeOnboarding }`
- Wrap in AuthProvider at root layout

#### 0.8 — Create Theme/Style Constants
Extract from `client/src/styles/_variables.scss` into JS:

```javascript
// mobile/src/styles/theme.js
export const colors = { /* from _variables.scss */ };
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const typography = { /* font sizes, weights */ };
```

### Deliverable
- App launches in Expo Go
- Can navigate between screens (all show placeholder text)
- Redux store is initialized
- Socket connects on login
- Auth flow works: login → store token → socket connects → home screen

### Reference Files to Read
```
client/src/App.js
client/src/socket.js
client/src/redux/store.js
client/src/redux/slices/game.js
client/src/redux/slices/alert.js
client/src/api/apiClient.js
client/src/api/apiHandler.js
client/src/api/wsEmitters.js
client/src/api/wsGameListeners.js
client/src/components/hooks/useAuth.jsx
client/src/components/hooks/useLocalStorage.jsx
client/src/styles/_variables.scss
```

---

## Phase 1 — Authentication Screens

**Goal:** Fully functional login, register, onboarding, and profile screens.
**Estimated scope:** ~8 component files + styles.

### Tasks

#### 1.1 — Login Screen (`app/login.tsx`)
Port from `client/src/components/authPage/AuthPage.js`:
- Email + password form
- "Sign in with Google" / "Sign in with Facebook" buttons (use `expo-auth-session` for OAuth)
- On success: store token in AsyncStorage, connect socket, navigate to `/` or `/create-user`
- Link to register screen

**Note on OAuth:** Use `expo-auth-session` + `expo-web-browser` for Google/Facebook OAuth. The redirect URI will differ from web — configure in app.json and your OAuth provider dashboard.

#### 1.2 — Register Screen (`app/register.tsx`)
Port from `client/src/components/authPage/RegisterPage.jsx`:
- Username, email, password fields
- Calls `user_register()` from apiHandler
- On success: auto-login and navigate

#### 1.3 — Onboarding Screen (`app/create-user.tsx`)
Port from `client/src/components/authPage/CreateUserPage.jsx`:
- Username input
- Avatar creator (simplified — see below)
- Calls `completeOnboarding()` from auth context

#### 1.4 — Avatar Creator Component
Port from `client/src/components/shared/AvatarCreator.jsx`:
- Web version uses `@dicebear/core` + `@dicebear/open-peeps` to generate SVGs client-side
- **Mobile approach:** Use DiceBear HTTP API URLs instead of client-side generation
  - `https://api.dicebear.com/7.x/open-peeps/svg?seed=...&face=...&head=...`
  - Display with `SvgUri` from `react-native-svg`
- Same randomization controls (face, head, clothing)

#### 1.5 — Profile Screen (`app/profile.tsx`)
Port from `client/src/components/profilePage/ProfilePage.jsx`:
- Display current name + avatar
- Edit name, change avatar
- Unlink OAuth providers
- Logout button

### Deliverable
- Complete auth flow: register → login → onboarding → home
- OAuth with Google/Facebook working
- Profile editing works
- Avatar creation/customization works

### Reference Files to Read
```
client/src/components/authPage/AuthPage.js
client/src/components/authPage/RegisterPage.jsx
client/src/components/authPage/CreateUserPage.jsx
client/src/components/shared/AvatarCreator.jsx
client/src/components/profilePage/ProfilePage.jsx
client/src/api/apiHandler.js (auth endpoints)
```

---

## Phase 2 — Home Screen & Room Management

**Goal:** Lobby with room list, create room, join room, rejoin banner.
**Estimated scope:** ~6 component files.

### Tasks

#### 2.1 — Home Screen (`app/index.tsx`)
Port from `client/src/components/homePage/HomePage.jsx`:
- Room code input (join by code)
- "Create Room" button → navigates to `/game-room/new`
- Rejoin banner (listens for `rejoin-available` socket event)
- Socket connect/disconnect status indicator

**Web version features to port:**
- Room list from `GET /game-rooms` (shows public rooms)
- Each room card shows: room name, player count, game type
- Pull-to-refresh for room list (mobile native pattern)

#### 2.2 — Create Room Screen (`app/game-room/new.tsx`)
Port from `client/src/components/homePage/CreateGamePage.jsx`:
- Room name input
- Game type selector: "Kaliteri" / "Judgement"
- Player count picker (4–13)
- Deck count picker (1–2)
- Game-type-specific config:
  - **Kaliteri:** game_count, bid_window, inspect_time, bid_threshold
  - **Judgement:** max_cards_per_round, reverse_order, trump_mode, scoreboard_time, judgement_bid_time, card_reveal_time
- Emits `user-create-room` socket event
- On success: navigates to `/game-room/[id]`

#### 2.3 — Join Room Flow
- Join by code: emit `user-join-room { code }`
- Join from list: emit `user-join-room { id }`
- Handle errors (room full, game in progress)
- On success: navigate to `/game-room/[id]`

#### 2.4 — Rejoin Banner Component
- Listens for `rejoin-available` socket event on connect
- Shows banner: "You have an active game. Tap to rejoin."
- On tap: navigates to `/game-room/[id]`

### Deliverable
- Can see available rooms and join by code
- Can create rooms with all config options
- Rejoin works after app restart
- Navigation to game room works

### Reference Files to Read
```
client/src/components/homePage/HomePage.jsx
client/src/components/homePage/CreateGamePage.jsx
client/src/components/homePage/AllGameRooms.jsx
client/src/api/wsEmitters.js (room events)
```

---

## Phase 3 — Game Room Lobby View

**Goal:** Pre-game lobby inside a room — player list, ready toggle, admin controls, chat.
**Estimated scope:** ~8 component files.

### Tasks

#### 3.1 — Game Room Screen (`app/game-room/[id].tsx`)
Port from `client/src/components/gamePage/GamePage.jsx`:
- This is the master screen that switches between lobby view and game board based on `game.phase`
- Phase === null or "lobby" → show LobbyView
- Phase !== null → show GameBoard (Phase 4+)

#### 3.2 — Lobby View Component
Port from `client/src/components/gamePage/LobbyView.jsx`:
- Room code display (shareable)
- Player list with avatars, names, ready status
- Ready/Not Ready toggle button
- Admin controls: Start Game button (enabled when all ready), room config editor
- Leave room button
- Room chat messages

#### 3.3 — Admin Config Editor
Port from `client/src/components/gamePage/lobby/AdminConfigEditor.jsx`:
- Edit game settings before starting
- Emits `admin-update-config` on save
- Only visible to room admin

#### 3.4 — Admin Kick Player
Port from `client/src/components/gamePage/lobby/KickPlayerButton.jsx`:
- Admin can kick players
- Confirmation dialog before kicking
- Emits `admin-kick-player { playerId }`

#### 3.5 — Room Chat
- Display `room-message` events in a FlatList
- Text input to send messages via `user-message-room`

#### 3.6 — Share Room Code
- Mobile-native share sheet (`expo-sharing` or `Share` API from RN)
- Share room code or deep link

### Deliverable
- Full lobby experience: see players, toggle ready, admin controls
- Chat works
- Admin can edit config, kick players, start game
- Leave room works with proper cleanup

### Reference Files to Read
```
client/src/components/gamePage/GamePage.jsx
client/src/components/gamePage/LobbyView.jsx
client/src/components/gamePage/lobby/AdminConfigEditor.jsx
client/src/components/gamePage/lobby/KickPlayerButton.jsx
client/src/api/wsEmitters.js (room + admin events)
```

---

## Phase 4 — Card Components & Player Hand

**Goal:** Playing card rendering and the player's hand at the bottom of the screen.
**Estimated scope:** ~5 component files + card assets.

### Tasks

#### 4.1 — Card Component System
The web app uses `@letele/playing-cards` which provides React SVG components for each card.

**Mobile approach — choose one:**

**Option A (Recommended): SVG card components with react-native-svg**
- Create a `CardSVG` component that renders card faces using react-native-svg
- Map `{ suit, rank }` → appropriate visual
- Can use a playing card SVG sprite sheet or individual SVG files
- A good open-source option: standard playing card SVG set converted to RN components

**Option B: Card images (PNG)**
- Use a standard playing card image set (52 cards + back)
- Store in `mobile/assets/cards/`
- Map `{ suit, rank }` → `require('./assets/cards/S_A.png')`
- Simpler but larger bundle size

#### 4.2 — Card Mapper Utility
Port from `client/src/components/gamePage/utils/cardMapper.js`:
- `getCardComponent(card)` → returns RN card component/image
- `cardKey(card)` → unique key string
- `isCardInList(card, list)` → membership check
- `suitSymbol(suit)` → "♠", "♥", "♦", "♣"
- `isRedSuit(suit)` → boolean

#### 4.3 — Player Hand Component
Port from `client/src/components/gamePage/PlayerHand.jsx`:
- Horizontal scrollable row of cards at bottom of screen
- Cards overlap (fan layout)
- Tap to play a valid card (highlight valid plays)
- Invalid cards are dimmed/greyed
- Sort toggle (by suit or natural order)

**Mobile-specific considerations:**
- Use horizontal ScrollView or FlatList for the hand
- Card size: adapt to screen width
- Tap gesture (no hover states on mobile)
- Selected card lifts up slightly (Animated API)

#### 4.4 — Card Back Component
- Simple card back design for opponent hands and dealing animations

#### 4.5 — Sort Toggle
- Button to toggle hand sorting between natural order and suit-grouped

### Deliverable
- Cards render correctly for all 52 cards (both decks if 2-deck game)
- Player hand displays at bottom, scrollable if many cards
- Tapping a valid card plays it
- Invalid cards are visually distinct
- Sort toggle works

### Reference Files to Read
```
client/src/components/gamePage/PlayerHand.jsx
client/src/components/gamePage/utils/cardMapper.js
client/src/styles/_player-hand.scss
```

---

## Phase 5 — Game Board & Circular Table

**Goal:** The main game board with circular player seating and central play area.
**Estimated scope:** ~8 component files.

### Tasks

#### 5.1 — Game Board Container
Port from `client/src/components/gamePage/GameBoard.jsx`:
- Master component that renders based on current phase
- Reads from Redux store (60+ selectors)
- Manages phase-specific overlays and panels
- Game type routing (Kaliteri vs Judgement)

#### 5.2 — Circular Table Layout
Port from `client/src/components/gamePage/CircularTable.jsx`:
- Arrange player seats in a circle
- Current player always at bottom
- Use absolute positioning with trigonometric calculations
- Adapt radius to screen size using `useWindowDimensions`

#### 5.3 — Player Seat Component
Port from `client/src/components/gamePage/PlayerSeat.jsx`:
- Avatar image (SvgUri from DiceBear URL)
- Player name
- Card count badge (number of cards in hand)
- Turn indicator (highlight when it's their turn)
- Team indicator (Kaliteri: bid/oppose team color)
- Tricks won count (Judgement)
- "Dealer" badge

#### 5.4 — Play Area (Trick Display)
Port from `client/src/components/gamePage/PlayArea.jsx`:
- Central area showing cards played in current trick
- Cards appear near their player's seat position
- Shows who led and current plays
- Trick winner highlight

#### 5.5 — Game Info HUD
- Current phase indicator
- Trump suit display (when applicable)
- Current bid / leader info (Kaliteri)
- Round number (Judgement)

#### 5.6 — Team Score HUD (Kaliteri)
Port from `client/src/components/gamePage/TeamScoreHUD.jsx`:
- Persistent display showing bid team vs oppose team points
- Updates after each trick

#### 5.7 — Partner Card Display
Port from `client/src/components/gamePage/PartnerCardDisplay.jsx`:
- Shows partner cards once revealed
- Visual indicator of which partners have been found

#### 5.8 — Quit/Return Dialogs
- "Quit Game" confirmation modal
- "Return to Lobby" option after game ends

### Deliverable
- Full game board renders with circular table
- Player seats show all relevant info
- Play area shows current trick
- HUD displays game info
- Cards can be played from hand to trick area

### Reference Files to Read
```
client/src/components/gamePage/GameBoard.jsx
client/src/components/gamePage/CircularTable.jsx
client/src/components/gamePage/PlayerSeat.jsx
client/src/components/gamePage/PlayArea.jsx
client/src/components/gamePage/TeamScoreHUD.jsx
client/src/components/gamePage/PartnerCardDisplay.jsx
client/src/styles/_game-board.scss
client/src/styles/_circular-table.scss
client/src/styles/_play-area.scss
```

---

## Phase 6 — Game Phases: Shuffling & Dealing

**Goal:** Shuffling controls and dealing animation.
**Estimated scope:** ~4 component files.

### Tasks

#### 6.1 — Shuffling Panel
Port from `client/src/components/gamePage/ShufflingPanel.jsx`:
- **Dealer view:** 3 shuffle action buttons (Riffle, Hindu, Overhand) + Undo + Deal
- **Non-dealer view:** "Waiting for [dealer] to shuffle..." with shuffle count
- Shuffle queue display (shows sequence of shuffle actions)
- Max 5 shuffles enforced, min 1 before dealing
- Emits: `game-shuffle-action`, `game-undo-shuffle`, `game-deal`

#### 6.2 — Dealing Overlay
Port from `client/src/components/gamePage/DealingOverlay.jsx`:
- Fullscreen overlay during card distribution
- Countdown or progress animation (5 seconds)
- "Dealing cards..." message

#### 6.3 — Deal Reveal Overlay
Port from `client/src/components/gamePage/DealRevealOverlay.jsx`:
- Shows dealt hand to player
- For Kaliteri: reveals partner cards context
- Auto-dismisses or tap to dismiss
- Timer countdown (matches card_reveal_time config)

### Deliverable
- Dealer can shuffle (3 types), undo, and deal
- Non-dealer sees shuffle status
- Dealing animation plays
- Cards appear in player's hand after dealing

### Reference Files to Read
```
client/src/components/gamePage/ShufflingPanel.jsx
client/src/components/gamePage/DealingOverlay.jsx
client/src/components/gamePage/DealRevealOverlay.jsx
client/src/styles/_shuffling.scss
client/src/styles/_dealing.scss
client/src/styles/_deal-reveal.scss
```

---

## Phase 7 — Game Phases: Bidding

**Goal:** Both bidding systems — Kaliteri (open) and Judgement (sequential).
**Estimated scope:** ~4 component files.

### Tasks

#### 7.1 — Kaliteri Bidding Panel
Port from `client/src/components/gamePage/BiddingPanel.jsx`:
- Current bid display
- Bid amount selector (increment buttons or slider)
- Place Bid button + Pass button
- Timer display (bidding window countdown)
- Shows who has passed
- Emits: `game-place-bid { amount }`, `game-pass-bid`

#### 7.2 — Judgement Bidding Panel
Port from `client/src/components/gamePage/JudgementBiddingPanel.jsx`:
- Sequential turn-based bidding
- Shows current bidder and bid order
- Bid amount picker (0 to cards_in_round, with dealer restriction)
- All placed bids visible
- Timer per player (judgement_bid_time)
- Emits: `game-judgement-bid { amount }`

#### 7.3 — Trump Announce Phase (Judgement)
- Shows the trump card prominently
- Trump suit display with card visual
- Auto-advances after 5 seconds (or tap to proceed)
- Emits: `game-proceed-to-shuffle`

### Deliverable
- Kaliteri bidding works end-to-end
- Judgement bidding works with sequential turns
- Trump card reveal works
- Timers display correctly

### Reference Files to Read
```
client/src/components/gamePage/BiddingPanel.jsx
client/src/components/gamePage/JudgementBiddingPanel.jsx
client/src/styles/_bidding.scss
client/src/styles/_judgement.scss
```

---

## Phase 8 — Game Phases: PowerHouse (Kaliteri Only)

**Goal:** Trump suit selection and partner card selection.
**Estimated scope:** ~2 component files.

### Tasks

#### 8.1 — PowerHouse Selector
Port from `client/src/components/gamePage/PowerHouseSelector.jsx`:
- **Step 1:** Select trump suit (4 suit buttons: ♠ ♥ ♦ ♣)
- **Step 2:** Select partner cards
  - Card picker from remaining deck (not in hand)
  - Number of partner cards from config (usually 1-2, more if odd players + high bid)
  - Handle 2-deck duplicate disambiguation (whichCopy: "1st" / "2nd")
- Only visible to leader (bid winner)
- Non-leader sees "Waiting for [leader] to select..."
- Emits: `game-select-powerhouse { suit }`, `game-select-partners { cards, duplicateSpecs }`

### Deliverable
- Leader can select trump suit
- Leader can pick partner cards (with duplicate handling)
- Non-leaders see waiting state
- Transitions to playing phase on completion

### Reference Files to Read
```
client/src/components/gamePage/PowerHouseSelector.jsx
client/src/styles/_game-board.scss (powerhouse section)
```

---

## Phase 9 — Scoring & Game End

**Goal:** Score displays, series tracking, and end-of-game flow.
**Estimated scope:** ~6 component files.

### Tasks

#### 9.1 — Kaliteri Scoreboard
Port from `client/src/components/gamePage/ScoreBoard.jsx`:
- Team-based score display (bid team vs oppose team)
- Points breakdown per team
- Bid success/failure indicator
- Player individual score deltas
- Auto-closes after scoreboard_time (default 5s) or tap to dismiss
- "Ready for next game" toggle

#### 9.2 — Judgement Scoreboard
Port from `client/src/components/gamePage/JudgementScoreBoard.jsx`:
- Per-player display: bid vs tricks won
- Score delta (10 + bid if exact, 0 if not)
- Cumulative scores

#### 9.3 — Judgement Scoreboard Modal
Port from `client/src/components/gamePage/JudgementScoreboardModal.jsx`:
- Full round-by-round history table
- Scrollable for many rounds
- Accessible during gameplay via button

#### 9.4 — Series Finished Panel
Port from `client/src/components/gamePage/SeriesFinishedPanel.jsx`:
- Podium display (1st, 2nd, 3rd)
- Full rankings list
- Final scores
- "Return to Lobby" button

#### 9.5 — Next Round Flow
- "Ready" button to proceed to next game/round
- Shows who is ready / waiting for
- Auto-advances when all ready
- Emits: `game-next-round`

### Deliverable
- Scoreboards display correctly for both game types
- Series tracking works across multiple games/rounds
- Podium/rankings display at series end
- Return to lobby flow works

### Reference Files to Read
```
client/src/components/gamePage/ScoreBoard.jsx
client/src/components/gamePage/JudgementScoreBoard.jsx
client/src/components/gamePage/JudgementScoreboardModal.jsx
client/src/components/gamePage/SeriesFinishedPanel.jsx
client/src/styles/_scoreboard.scss
client/src/styles/_scoreboard-extra.scss
```

---

## Phase 10 — Animations & Polish

**Goal:** Smooth animations and native-feeling interactions.
**Estimated scope:** ~5 files (animation hooks + refinements).

### Tasks

#### 10.1 — Card Play Animation
Port from `client/src/components/gamePage/hooks/useCardAnimation.js`:
- Card flies from hand to play area when played
- Use `react-native-reanimated` for 60fps animations
- Shared element transitions if possible

#### 10.2 — Dealing Animation
- Cards animate from deck to player positions
- Staggered timing per card

#### 10.3 — Trick Win Animation
- Winning card highlights
- Cards sweep to winner after brief display

#### 10.4 — UI Micro-interactions
- Button press feedback (haptics via `expo-haptics`)
- Card tap lift animation
- Phase transition fades
- Toast notifications (port alert slice → RN toast)

#### 10.5 — Sound Effects (Optional)
- Card play sound
- Shuffle sound
- Win/lose sound
- Use `expo-av` for audio

### Deliverable
- Smooth card animations throughout gameplay
- Haptic feedback on key actions
- Polished transitions between game phases
- Optional sound effects

### Reference Files to Read
```
client/src/components/gamePage/hooks/useCardAnimation.js
client/src/styles/_play-area-animations.scss
```

---

## Phase 11 — TestFlight Deployment

**Goal:** Build and deploy to TestFlight for testing.
**Estimated scope:** Configuration only, no new components.

### Tasks

#### 11.1 — App Configuration
Update `app.json` / `app.config.js`:
```json
{
  "expo": {
    "name": "52 Patta",
    "slug": "52-patta",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": { "image": "./assets/splash.png" },
    "ios": {
      "bundleIdentifier": "com.yourname.fiftytwo-patta",
      "buildNumber": "1",
      "supportsTablet": true
    },
    "scheme": "52patta"
  }
}
```

#### 11.2 — EAS Build Configuration
Create `eas.json`:
```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "YOUR_TEAM_ID"
      }
    }
  }
}
```

#### 11.3 — App Icon & Splash Screen
- Create app icon (1024x1024 PNG)
- Create splash screen image
- Configure in app.json

#### 11.4 — Environment Configuration
- Production API URL configuration
- Socket.IO production URL

#### 11.5 — Build & Submit
```bash
# Login to EAS
eas login

# Build for iOS
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios --profile production
```

#### 11.6 — TestFlight Setup
- Add internal testers in App Store Connect
- Set up test groups
- Write test notes for each build

### Deliverable
- App available on TestFlight for internal testers
- Clean app icon and splash screen
- Connects to production backend

---

## Phase Dependency Graph

```
Phase 0 (Scaffolding)
  ├── Phase 1 (Auth Screens)
  ├── Phase 2 (Home & Rooms)
  │     └── Phase 3 (Lobby View)
  └── Phase 4 (Card Components)
        └── Phase 5 (Game Board & Table)
              ├── Phase 6 (Shuffling & Dealing)
              ├── Phase 7 (Bidding)
              ├── Phase 8 (PowerHouse)
              └── Phase 9 (Scoring & End)
                    └── Phase 10 (Animations)
                          └── Phase 11 (TestFlight)
```

**Parallelizable:** Phases 1, 2, and 4 can all be worked on independently after Phase 0.

---

## Per-Phase Cline Agent Instructions Template

When starting each phase with Cline, provide this context:

```
Project: 52-Patta mobile app (React Native / Expo)
Location: /Users/prins203/code/52-Patta/mobile/
Plan: See /Users/prins203/code/52-Patta/docs/MOBILE_APP_PLAN.md

Current phase: Phase [N] — [Name]

Reference web client files to read first:
[list from "Reference Files to Read" section of that phase]

Key rules:
1. This is a React Native app using Expo managed workflow with Expo Router
2. Port logic from the web client — do NOT modify any files outside /mobile/
3. Redux slices and API layer are framework-agnostic — copy and adapt
4. Replace localStorage with AsyncStorage (async)
5. Replace CSS/SCSS with StyleSheet.create()
6. Replace React Router with Expo Router (file-based routing in app/)
7. No DOM APIs — use React Native components only
8. The backend is unchanged — same Socket.IO events and REST endpoints
```

---

## Notes

- **No backend changes needed.** The mobile app is a new client connecting to the same server.
- **Game registry pattern** (`client/src/components/gamePage/gameRegistry.js`) should be ported to keep Kaliteri vs Judgement logic modular.
- **Deep linking** (`52patta://`) is needed for OAuth callbacks and room invites.
- **Offline handling:** Show connection status, auto-reconnect (Socket.IO handles this).
- **Screen lock:** Consider keeping screen awake during active games (`expo-keep-awake`).
