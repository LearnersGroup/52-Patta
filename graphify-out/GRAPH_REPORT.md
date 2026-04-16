# Graph Report - game_engine  (2026-04-15)

## Corpus Check
- Corpus is ~14,826 words - fits in a single context window. You may not need a graph.

## Summary
- 173 nodes · 238 edges · 16 communities detected
- Extraction: 77% EXTRACTED · 23% INFERRED · 0% AMBIGUOUS · INFERRED: 54 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Judgement Bidding & Config|Judgement Bidding & Config]]
- [[_COMMUNITY_Mendikot Tricks & Validation|Mendikot Tricks & Validation]]
- [[_COMMUNITY_Core Config & Recording|Core Config & Recording]]
- [[_COMMUNITY_Deck & Dealer Rotation|Deck & Dealer Rotation]]
- [[_COMMUNITY_Kaliteri Bidding & Shuffle|Kaliteri Bidding & Shuffle]]
- [[_COMMUNITY_Mendikot Strategy & Scoring|Mendikot Strategy & Scoring]]
- [[_COMMUNITY_Scoring & Kaliteri Strategy|Scoring & Kaliteri Strategy]]
- [[_COMMUNITY_Base Game Strategy Interface|Base Game Strategy Interface]]
- [[_COMMUNITY_Powerhouse & Partner Logic|Powerhouse & Partner Logic]]
- [[_COMMUNITY_State Manager|State Manager]]
- [[_COMMUNITY_Game Registry|Game Registry]]
- [[_COMMUNITY_Band Hukum (Closed Trump)|Band Hukum (Closed Trump)]]
- [[_COMMUNITY_Engine Entry Point|Engine Entry Point]]
- [[_COMMUNITY_Judgement Entry Point|Judgement Entry Point]]
- [[_COMMUNITY_Strategies Index|Strategies Index]]
- [[_COMMUNITY_Mendikot Entry Point|Mendikot Entry Point]]

## God Nodes (most connected - your core abstractions)
1. `GameStrategy` - 14 edges
2. `playCard()` - 11 edges
3. `completeTrick()` - 11 edges
4. `createDeck()` - 7 edges
5. `nextRound()` - 7 edges
6. `removeTwos()` - 6 edges
7. `findWinnerInGroup()` - 6 edges
8. `nextRound()` - 6 edges
9. `randomInt()` - 5 edges
10. `onRoundEnd()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `playCard()` --calls--> `checkPartnerReveal()`  [INFERRED]
  game_engine/mendikot/tricks.js → game_engine/powerhouse.js
- `playCard()` --calls--> `isPlayersTurn()`  [INFERRED]
  game_engine/mendikot/tricks.js → game_engine/validators.js
- `computeCurrentTrickLeader()` --calls--> `cardsMatch()`  [INFERRED]
  game_engine/recording.js → game_engine/deck.js
- `onRoundEnd()` --calls--> `finalizeJudgementResult()`  [INFERRED]
  game_engine/strategies/judgement.js → game_engine/recording.js
- `buildInitialState()` --calls--> `createDeck()`  [INFERRED]
  game_engine/strategies/judgement.js → game_engine/deck.js

## Communities

### Community 0 - "Judgement Bidding & Config"
Cohesion: 0.09
Nodes (13): initJudgementBidding(), computeJudgementConfig(), validateJudgementConfig(), buildInitialState(), computeConfig(), deal(), onRoundEnd(), finalizeJudgementResult() (+5 more)

### Community 1 - "Mendikot Tricks & Validation"
Cohesion: 0.19
Nodes (18): autoRevealIfNeeded(), transitionToBidding(), calculateTrickPoints(), completeTrick(), findWinnerInGroup(), getNextTurnIndex(), getTeamByPlayerId(), getValidPlays() (+10 more)

### Community 2 - "Core Config & Recording"
Cohesion: 0.14
Nodes (11): checkConfig(), compareRanks(), computeConfig(), getCardPoints(), getConfig(), computeConfig(), computeAllHandMetrics(), computeCurrentTrickLeader() (+3 more)

### Community 3 - "Deck & Dealer Rotation"
Cohesion: 0.22
Nodes (12): computeNextDealer(), getTeamForPlayer(), createDeck(), dealCards(), removeTwos(), shuffleDeck(), buildInitialState(), nextRound() (+4 more)

### Community 4 - "Kaliteri Bidding & Shuffle"
Cohesion: 0.17
Nodes (10): initBidding(), deal(), deal(), cutDeck(), dealFromDealer(), hinduShuffle(), overhandShuffle(), processShuffleBatch() (+2 more)

### Community 5 - "Mendikot Strategy & Scoring"
Cohesion: 0.15
Nodes (7): computeMendikotConfig(), validateMendikotConfig(), computeConfig(), onRoundEnd(), classifyRoundResult(), countTeamTricks(), firstToNTricksWinner()

### Community 6 - "Scoring & Kaliteri Strategy"
Cohesion: 0.15
Nodes (8): afterRoundEnd(), afterRoundEnd(), onRoundEnd(), finalizeKaliteriResult(), persistRecording(), applyScoring(), calculateGameResult(), sumPointsForTeam()

### Community 7 - "Base Game Strategy Interface"
Cohesion: 0.13
Nodes (1): GameStrategy

### Community 8 - "Powerhouse & Partner Logic"
Cohesion: 0.29
Nodes (5): cardsMatch(), buildPublicView(), checkPartnerReveal(), getPartnerCardCount(), selectPartnerCards()

### Community 9 - "State Manager"
Cohesion: 0.25
Nodes (0): 

### Community 10 - "Game Registry"
Cohesion: 0.5
Nodes (0): 

### Community 11 - "Band Hukum (Closed Trump)"
Cohesion: 0.67
Nodes (0): 

### Community 12 - "Engine Entry Point"
Cohesion: 1.0
Nodes (0): 

### Community 13 - "Judgement Entry Point"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Strategies Index"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Mendikot Entry Point"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Engine Entry Point`** (1 nodes): `index.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Judgement Entry Point`** (1 nodes): `index.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Strategies Index`** (1 nodes): `index.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Mendikot Entry Point`** (1 nodes): `index.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createDeck()` connect `Deck & Dealer Rotation` to `Judgement Bidding & Config`?**
  _High betweenness centrality (0.198) - this node is a cross-community bridge._
- **Why does `buildInitialState()` connect `Judgement Bidding & Config` to `Deck & Dealer Rotation`?**
  _High betweenness centrality (0.152) - this node is a cross-community bridge._
- **Why does `nextRound()` connect `Deck & Dealer Rotation` to `Kaliteri Bidding & Shuffle`, `Scoring & Kaliteri Strategy`?**
  _High betweenness centrality (0.133) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `playCard()` (e.g. with `isPlayersTurn()` and `findCardInHand()`) actually correct?**
  _`playCard()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `completeTrick()` (e.g. with `firstToNTricksWinner()` and `autoRevealIfNeeded()`) actually correct?**
  _`completeTrick()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `createDeck()` (e.g. with `buildInitialState()` and `buildInitialState()`) actually correct?**
  _`createDeck()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `nextRound()` (e.g. with `createDeck()` and `removeTwos()`) actually correct?**
  _`nextRound()` has 6 INFERRED edges - model-reasoned connections that need verification._