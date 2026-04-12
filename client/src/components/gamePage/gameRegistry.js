/**
 * Client-side game registry.
 *
 * Maps game_type → component overrides + UI config so GameBoard can render
 * game-specific components without scattered `isJudgement` conditionals.
 */

import BiddingPanel from "./BiddingPanel";
import JudgementBiddingPanel from "./JudgementBiddingPanel";
import ScoreBoard from "./ScoreBoard";
import JudgementScoreBoard from "./JudgementScoreBoard";
import TeamScoreHUD from "./TeamScoreHUD";
import MendikotHUD from "./MendikotHUD";
import MendikotScoreBoard from "./MendikotScoreBoard";

// Cards per player for each game config (mirrors server config.js)
const CARDS_PER_PLAYER = {
    "4P1D": 13, "5P1D": 10, "6P1D": 8, "6P2D": 17,
    "7P2D": 14, "8P2D": 13, "9P2D": 11, "10P2D": 10,
};

const registry = {
    kaliteri: {
        BiddingPanel,
        ScoreBoard,
        HUD: TeamScoreHUD,

        /** Whether this game type has the powerhouse (trump selection) phase. */
        hasPowerhouse: true,
        /** Whether this game type has partner cards / team reveal. */
        hasPartners: true,
        /** Whether this game type has a trump-announce phase. */
        hasTrumpAnnounce: false,
        /** Whether trick results include points. */
        trickHasPoints: true,
        /** Label for game/round counter in ShufflingPanel. */
        gameLabel: "Game",
        /** Default fallback for deal-reveal auto-close. */
        dealRevealFallbackMs: 7500,

        /** Compute card count for a player seat. */
        getCardCount(pid, { configKey, handSizes, currentRound, currentTrick, phase }) {
            const total = CARDS_PER_PLAYER[configKey] || 13;
            switch (phase) {
                case "shuffling":
                    return 0;
                case "dealing":
                    return handSizes?.[pid] ?? 0;
                case "bidding":
                case "powerhouse":
                    return total;
                case "playing": {
                    const trickPlays = currentTrick?.plays || [];
                    const hasPlayed = trickPlays.some((p) => p.playerId === pid);
                    return Math.max(0, total - (currentRound || 0) - (hasPlayed ? 1 : 0));
                }
                default:
                    return 0;
            }
        },

        /** Score displayed on player seat (trick points won so far). */
        getSeatScore(pid, { tricks }) {
            let total = 0;
            (tricks || []).forEach((t) => {
                if (t.winner === pid) total += (t.points || 0);
            });
            return total;
        },

        /** Round label for the play area. */
        getRoundLabel({ currentRound }) {
            return `Round ${(currentRound || 0) + 1}`;
        },

        /** Game/round counter values for ShufflingPanel. */
        getSeriesInfo({ currentGameNumber, totalGames }) {
            return { current: currentGameNumber, total: totalGames };
        },

        /** The trump/powerhouse suit to show as watermark during play. */
        getTrumpSuit({ powerHouseSuit }) {
            return powerHouseSuit;
        },
    },

    judgement: {
        BiddingPanel: JudgementBiddingPanel,
        ScoreBoard: JudgementScoreBoard,
        HUD: null, // Judgement uses inline HUD in GameBoard

        hasPowerhouse: false,
        hasPartners: false,
        hasTrumpAnnounce: true,
        trickHasPoints: false,
        gameLabel: "Round",
        dealRevealFallbackMs: 10000,

        getCardCount(pid, { handSizes }) {
            return handSizes?.[pid] ?? 0;
        },

        getSeatScore(pid, { tricksWon }) {
            return tricksWon?.[pid] || 0;
        },

        getRoundLabel({ seriesRoundIndex, totalRoundsInSeries, currentCardsPerRound }) {
            return `Round ${(seriesRoundIndex || 0) + 1}/${totalRoundsInSeries || 1} — ${currentCardsPerRound || 0} cards`;
        },

        getSeriesInfo({ seriesRoundIndex, totalRoundsInSeries }) {
            return { current: (seriesRoundIndex || 0) + 1, total: totalRoundsInSeries };
        },

        getTrumpSuit({ trumpSuit }) {
            return trumpSuit;
        },
    },

    mendikot: {
        BiddingPanel: null,
        ScoreBoard: MendikotScoreBoard,
        HUD: MendikotHUD,

        hasPowerhouse: false,
        hasPartners: false,
        hasTrumpAnnounce: false,
        trickHasPoints: false,
        gameLabel: "Round",
        dealRevealFallbackMs: 3000,

        getCardCount(pid, { handSizes }) {
            return handSizes?.[pid] ?? 0;
        },

        getSeatScore(pid, { tricks_by_team, teams }) {
            const team = (teams?.A || []).includes(pid)
                ? "A"
                : (teams?.B || []).includes(pid)
                ? "B"
                : null;
            return team ? (tricks_by_team?.[team] ?? 0) : 0;
        },

        getRoundLabel({ currentRound }) {
            return `Trick ${(currentRound || 0) + 1}`;
        },

        getSeriesInfo({ currentRoundNumber, totalRounds }) {
            return { current: currentRoundNumber || 1, total: totalRounds || 1 };
        },

        getTrumpSuit({ trump_suit }) {
            return trump_suit || null;
        },
    },
};

export function getGameConfig(gameType) {
    return registry[gameType || "kaliteri"] || registry.kaliteri;
}

export default registry;
