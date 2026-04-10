# 52 Patta — Deferred Work

## Skill-Based Scoring & Ranked Matchmaking (Kaliteri)

**Status:** Deferred. Game recording infrastructure is being built first so we
have a dataset to design the rating system against.

### Goal
Build a fair, skill-based rating system for Kaliteri that separates player
skill from the luck of the draw, and a ranked queue that matches players of
similar ability.

### Proposed approaches (see conversation in Git history for detailed analysis)
- **Approach A — Performance-Adjusted OpenSkill (recommended).**
  - Use the `openskill` npm package (Weng-Lin Bayesian, patent-free).
  - Layer a Hand Quality Index (HQI) residual on top of the team outcome:
    `residual = actual_points_captured - expected_points_given_hand_quality`.
  - Apply role multipliers (bidder 1.5×, partner/defender 1.0×).
  - Track `{ mu, sigma }` per player; matchmake on `mu - 3*sigma`.
- **Approach B — Dual-Rating Elo + IMP dampening.**
  - Separate Bidder Elo and Defender Elo.
  - Compress point margins through an IMP-style table so lucky landslides
    don't dominate.
  - Simpler but less accurate on luck/skill separation.
- **Approach C — Relative Performance Rating (bridge-inspired).**
  - Train a hand-strength regression on recorded games.
  - Rate each player on `actual - expected(hand_features)`.
  - Most accurate but needs ~1000+ games of recorded data to calibrate.

### Prerequisites
- [x] Game recording system capturing deals, bidding, plays, and outcomes
      with enough detail to compute HQI residuals and train regressions.
- [ ] Enough recorded games across varied player counts and deck counts
      (target: 500+ Kaliteri games before calibrating).
- [ ] Post-game feedback prompt (enjoyment, difficulty, self-assessed
      play quality) to validate rating signal against player perception.

### Ranked queue (once rating system is live)
- Tiers: Novice / Bronze / Silver / Gold / Platinum / Diamond / Master.
- Hidden MMR (from OpenSkill) drives matchmaking; visible tier + RP for
  player motivation.
- Placement games: first 10 ranked games use higher sigma / K-factor.
- Expanding-window matchmaker: start at ±100 MMR, grow by 50 every 10s,
  cap at ±500.
- Premade groups limited to within 3 tiers of each other.
- AFK/disconnect treated as worst-case outcome for rating.

### Implementation sketch (when we pick this up)
1. Install `openskill`, add `rating: { mu, sigma }` to the User model.
2. On Kaliteri `onRoundEnd`, read the fresh GameRecord, compute HQI
   residuals, apply role multipliers, feed into `rate([[bidTeam],[defendTeam]])`.
3. Add a `ranked` flag on Game; only ranked games update ratings.
4. Build a simple ranked-queue API backed by Redis (skill-bucketed sets).
5. Emit rating changes via Socket.IO so the scoreboard can animate them.
6. Analytics dashboard over GameRecord collection to monitor rating
   calibration and luck/skill separation quality.
