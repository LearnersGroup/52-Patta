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

    // Build the partner tracking state.
    // Use a consumed-specs list so that when the same card is selected twice
    // (e.g. both copies of Ace of Clubs), each entry gets its own distinct
    // whichCopy ("1st" then "2nd") instead of both receiving the first match.
    const remainingSpecs = [...duplicateSpecs];

    const partnerCardSpecs = cards.map((card) => {
        const inHand = leaderHand.filter((c) => cardsMatch(c, card));

        let whichCopy = null;
        if (inHand.length === 0) {
            const specIdx = remainingSpecs.findIndex(
                (s) => s.card.suit === card.suit && s.card.rank === card.rank
            );
            if (specIdx !== -1) {
                whichCopy = remainingSpecs[specIdx].whichCopy;
                remainingSpecs.splice(specIdx, 1); // consume so next duplicate gets the next spec
            }
        }

        return {
            card: { suit: card.suit, rank: card.rank },
            whichCopy,
            playCount: 0, // track how many times this card has been played
            revealed: false,
            partnerId: null,
        };
    });

    console.log(`[SelectPartners] Leader ${playerId.substring(0, 6)} — cards:`, JSON.stringify(cards));
    console.log(`[SelectPartners] duplicateSpecs:`, JSON.stringify(duplicateSpecs));
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
 *
 * playCount tracks only NON-LEADER plays (leader can't be their own partner).
 * For whichCopy matching, we use a GLOBAL play count across all partner-card
 * entries that share the same {suit, rank}, so "1st"/"2nd" refer to the
 * 1st/2nd time ANY non-leader plays that card, across all entries.
 */
function checkPartnerReveal(gameState, playerId, card) {
    const partnerCards = gameState.partnerCards;
    if (!partnerCards || partnerCards.length === 0) return null;

    // Check if any unrevealed partner card matches the played card
    const hasMatch = partnerCards.some(
        (pc) => !pc.revealed && cardsMatch(card, pc.card)
    );
    if (!hasMatch) return null;

    console.log(`[PartnerReveal] Played: ${card.suit}${card.rank} by ${playerId.substring(0, 6)}, isLeader: ${playerId === gameState.leader}`);

    // Leader can't be their own partner — don't track their plays
    if (playerId === gameState.leader) {
        console.log(`[PartnerReveal] Leader played partner card — no reveal, no playCount change`);
        return gameState;
    }

    // Compute GLOBAL non-leader play count for this card BEFORE this play
    // (across ALL partner entries with the same suit+rank)
    const globalPreviousPlays = partnerCards
        .filter((pc) => cardsMatch(pc.card, card))
        .reduce((sum, pc) => sum + pc.playCount, 0);
    const thisPlayNumber = globalPreviousPlays + 1;

    console.log(`[PartnerReveal] globalPreviousPlays=${globalPreviousPlays}, thisPlayNumber=${thisPlayNumber}`);

    // Find the first unrevealed matching entry to increment its playCount
    let updateIndex = -1;
    for (let i = 0; i < partnerCards.length; i++) {
        if (!partnerCards[i].revealed && cardsMatch(partnerCards[i].card, card)) {
            updateIndex = i;
            break;
        }
    }

    // Increment playCount on that entry
    const newPartnerCards = [...partnerCards];
    newPartnerCards[updateIndex] = {
        ...partnerCards[updateIndex],
        playCount: partnerCards[updateIndex].playCount + 1,
    };

    // Determine which partner entry this play reveals (if any)
    let revealIndex = -1;
    for (let i = 0; i < partnerCards.length; i++) {
        const pc = partnerCards[i];
        if (pc.revealed) continue;
        if (!cardsMatch(pc.card, card)) continue;

        if (pc.whichCopy === null) {
            // Single-deck or leader holds one copy — any non-leader play reveals
            revealIndex = i;
            break;
        } else if (pc.whichCopy === "1st" && thisPlayNumber === 1) {
            revealIndex = i;
            break;
        } else if (pc.whichCopy === "2nd" && thisPlayNumber === 2) {
            revealIndex = i;
            break;
        }
    }

    console.log(`[PartnerReveal] revealIndex=${revealIndex}, entries: ${partnerCards.map((pc) => `${pc.card.suit}${pc.card.rank}:wc=${pc.whichCopy},pc=${pc.playCount},rev=${pc.revealed}`).join("; ")}`);

    if (revealIndex >= 0) {
        console.log(`[PartnerReveal] *** PARTNER REVEALED: ${playerId.substring(0, 6)} (play #${thisPlayNumber}, whichCopy=${partnerCards[revealIndex].whichCopy}) ***`);
        newPartnerCards[revealIndex] = {
            ...newPartnerCards[revealIndex],
            revealed: true,
            partnerId: playerId,
        };

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
    }

    // Play count updated but no reveal this time
    console.log(`[PartnerReveal] No reveal — play #${thisPlayNumber} doesn't match any whichCopy`);
    return { ...gameState, partnerCards: newPartnerCards };
}

module.exports = {
    selectPowerHouse,
    selectPartnerCards,
    getPartnerCardCount,
    determineTeams,
    checkPartnerReveal,
};
