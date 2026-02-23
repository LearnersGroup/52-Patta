const { SUITS } = require("./config");
const { cardsMatch, cardsEqual } = require("./deck");

/**
 * Select the PowerHouse (trump) suit.
 * Only the leader can call this.
 */
function selectPowerHouse(gameState, playerId, suit) {
    if (gameState.leader !== playerId) {
        return { error: "Only the bid winner can select PowerHouse" };
    }

    if (!SUITS.includes(suit)) {
        return { error: `Invalid suit: ${suit}` };
    }

    return {
        state: {
            ...gameState,
            powerHouseSuit: suit,
        },
    };
}

/**
 * Select partner card(s).
 * cards: array of { suit, rank } — the cards chosen as partner cards.
 * duplicateSpecs: array of { card: { suit, rank }, whichCopy: "1st" | "2nd" }
 *   — only required for 2-deck games when leader holds no copy of a chosen card.
 */
function selectPartnerCards(gameState, playerId, cards, duplicateSpecs = []) {
    if (gameState.leader !== playerId) {
        return { error: "Only the bid winner can select partner cards" };
    }

    const config = gameState.config;
    const expectedCount = getPartnerCardCount(gameState);

    if (cards.length !== expectedCount) {
        return { error: `Must select exactly ${expectedCount} partner card(s)` };
    }

    const leaderHand = gameState.hands[playerId];

    // Validate each partner card
    for (const card of cards) {
        // Validate card is not in leader's hand (by suit+rank)
        const inHand = leaderHand.filter((c) => cardsMatch(c, card));

        if (config.decks === 1) {
            // Single deck: card must not be in leader's hand
            if (inHand.length > 0) {
                return { error: `Cannot choose a card in your own hand: ${card.rank} of ${card.suit}` };
            }
        } else {
            // Two decks: leader may hold one copy
            if (inHand.length >= 2) {
                return { error: `You hold both copies of ${card.rank} of ${card.suit}` };
            }

            // If leader holds zero copies, must specify which copy (1st or 2nd played)
            if (inHand.length === 0) {
                const spec = duplicateSpecs.find(
                    (s) => s.card.suit === card.suit && s.card.rank === card.rank
                );
                if (!spec || !["1st", "2nd"].includes(spec.whichCopy)) {
                    return {
                        error: `Must specify 1st or 2nd for ${card.rank} of ${card.suit} (you hold no copies)`,
                    };
                }
            }
            // If leader holds one copy, the other is unambiguous — no spec needed
        }
    }

    // Build the partner tracking state
    const partnerCardSpecs = cards.map((card) => {
        const inHand = leaderHand.filter((c) => cardsMatch(c, card));
        const spec = duplicateSpecs.find(
            (s) => s.card.suit === card.suit && s.card.rank === card.rank
        );

        return {
            card: { suit: card.suit, rank: card.rank },
            whichCopy: inHand.length === 0 && spec ? spec.whichCopy : null,
            playCount: 0, // track how many times this card has been played
            revealed: false,
            partnerId: null,
        };
    });

    console.log(`[SelectPartners] Partner card specs:`, JSON.stringify(partnerCardSpecs));

    return {
        state: {
            ...gameState,
            partnerCards: partnerCardSpecs,
        },
    };
}

/**
 * Determine how many partner cards the leader gets.
 * Accounts for odd-player threshold: if bid >= threshold, extra partner.
 */
function getPartnerCardCount(gameState) {
    const config = gameState.config;
    const bidAmount = gameState.bidding.currentBid;

    let count = config.partnerCards;

    // Odd-player advantage: if bid >= threshold, extra partner
    if (config.bidThreshold && bidAmount >= config.bidThreshold) {
        count += 1;
    }

    return count;
}

/**
 * Determine the teams based on config and bid threshold.
 */
function determineTeams(gameState) {
    const config = gameState.config;
    const bidAmount = gameState.bidding.currentBid;

    if (config.bidThreshold && bidAmount >= config.bidThreshold && config.advantageTeams) {
        return config.advantageTeams;
    }
    return config.defaultTeams;
}

/**
 * Check if a played card is a partner card and handle reveal.
 * Called during trick play.
 * Returns updated gameState if partner revealed, or null if not a partner card.
 */
function checkPartnerReveal(gameState, playerId, card) {
    const partnerCards = gameState.partnerCards;
    if (!partnerCards || partnerCards.length === 0) return null;

    for (let i = 0; i < partnerCards.length; i++) {
        const pc = partnerCards[i];
        if (pc.revealed) continue;

        // Check if the played card matches this partner card by suit and rank
        const matches = cardsMatch(card, pc.card);
        console.log(`[PartnerReveal] Played: ${card.suit}${card.rank} by ${playerId.substring(0,6)}, partner card: ${pc.card.suit}${pc.card.rank}, match: ${matches}, whichCopy: ${pc.whichCopy}, playCount: ${pc.playCount}`);
        if (!matches) continue;

        // Track play count for this partner card type (ALL players, including leader)
        const updatedPC = { ...pc, playCount: pc.playCount + 1 };

        // Leader can't be their own partner — just update play count
        if (playerId === gameState.leader) {
            const newPartnerCards = [...partnerCards];
            newPartnerCards[i] = updatedPC;
            return { ...gameState, partnerCards: newPartnerCards };
        }

        // Determine if this play reveals the partner
        let isReveal = false;

        if (pc.whichCopy === null) {
            // Either single-deck or leader holds one copy (unambiguous)
            isReveal = true;
        } else if (pc.whichCopy === "1st" && updatedPC.playCount === 1) {
            isReveal = true;
        } else if (pc.whichCopy === "2nd" && updatedPC.playCount === 2) {
            isReveal = true;
        }

        console.log(`[PartnerReveal] After increment: playCount=${updatedPC.playCount}, whichCopy=${pc.whichCopy}, isLeader=${playerId === gameState.leader}, isReveal=${isReveal}`);

        if (isReveal) {
            console.log(`[PartnerReveal] *** PARTNER REVEALED: ${playerId.substring(0,6)} ***`);
            const newPartnerCards = [...partnerCards];
            newPartnerCards[i] = { ...updatedPC, revealed: true, partnerId: playerId };

            const newBidTeam = [...(gameState.teams.bid || [])];
            if (!newBidTeam.includes(playerId)) {
                newBidTeam.push(playerId);
            }

            const newOpposeTeam = (gameState.teams.oppose || []).filter(
                (id) => id !== playerId
            );

            return {
                ...gameState,
                partnerCards: newPartnerCards,
                teams: {
                    bid: newBidTeam,
                    oppose: newOpposeTeam,
                },
                revealedPartners: [...(gameState.revealedPartners || []), playerId],
            };
        } else {
            // Update play count but no reveal
            const newPartnerCards = [...partnerCards];
            newPartnerCards[i] = updatedPC;
            return { ...gameState, partnerCards: newPartnerCards };
        }
    }

    return null; // not a partner card
}

module.exports = {
    selectPowerHouse,
    selectPartnerCards,
    getPartnerCardCount,
    determineTeams,
    checkPartnerReveal,
};
