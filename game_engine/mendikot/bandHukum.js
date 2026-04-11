const { cardsEqual } = require("../deck");

function pickClosedTrump(state, playerId, cardOrNull) {
    if (state.config?.trump_mode !== "band") {
        return { error: "Closed trump is only available in Band Hukum mode" };
    }

    if (state.closed_trump_card) {
        return { error: "Closed trump has already been picked" };
    }

    if (state.closed_trump_holder_id !== playerId) {
        return { error: "Only the designated picker can select closed trump" };
    }

    const hand = state.hands?.[playerId] || [];
    if (!hand.length) {
        return { error: "Picker has no cards in hand" };
    }

    let cardIndex = -1;
    if (cardOrNull) {
        cardIndex = hand.findIndex((c) => cardsEqual(c, cardOrNull));
        if (cardIndex === -1) {
            return { error: "Selected card is not in picker hand" };
        }
    } else {
        cardIndex = Math.floor(Math.random() * hand.length);
    }

    const [closedTrumpCard] = hand.splice(cardIndex, 1);

    state.closed_trump_card = closedTrumpCard;
    state.closed_trump_revealed = false;
    state.closed_trump_placeholder = {
        holderId: playerId,
        holderName: state.playerNames?.[playerId] || "",
    };
    state.trump_suit = null;
    state.trump_revealed_at_trick = null;
    state.trump_activation = null;
    state.trump_asker_id = null;

    return { state };
}

function revealTrump(state, askerId) {
    if (state.config?.trump_mode !== "band") {
        return { error: "Reveal trump is only available in Band Hukum mode" };
    }

    if (state.closed_trump_revealed || state.trump_suit) {
        return { error: "Trump has already been revealed" };
    }

    if (!state.closed_trump_card || !state.closed_trump_holder_id) {
        return { error: "Closed trump has not been picked yet" };
    }

    if (askerId === state.closed_trump_holder_id) {
        return { error: "Closed-trump holder cannot reveal trump" };
    }

    const trick = state.currentTrick;
    if (!trick?.ledSuit) {
        return { error: "Trump can only be revealed after a suit has been led" };
    }

    const currentTurn = state.seatOrder?.[trick.turnIndex];
    if (currentTurn !== askerId) {
        return { error: "Only current turn player can ask for reveal" };
    }

    const hand = state.hands?.[askerId] || [];
    const hasLedSuit = hand.some((c) => c.suit === trick.ledSuit);
    if (hasLedSuit) {
        return { error: `Must be void in led suit (${trick.ledSuit}) to reveal trump` };
    }

    const holderId = state.closed_trump_holder_id;
    if (!state.hands?.[holderId]) {
        state.hands[holderId] = [];
    }

    state.hands[holderId].push(state.closed_trump_card);
    state.closed_trump_revealed = true;
    state.trump_suit = state.closed_trump_card.suit;
    state.trump_revealed_at_trick = state.currentRound;
    state.trump_activation = {
        trickIndex: state.currentRound,
        playOrder: state.currentTrick?.plays?.length || 0,
    };
    state.trump_asker_id = askerId;

    return { state };
}

function autoRevealIfNeeded(state, currentTrickIndex, upcomingPlayerId) {
    if (state.config?.trump_mode !== "band") return false;
    if (state.closed_trump_revealed || state.trump_suit) return false;
    if (!state.closed_trump_card || !state.closed_trump_holder_id) return false;

    const lastTrickIndex = (state.config?.rounds || 0) - 1;
    if (currentTrickIndex !== lastTrickIndex) return false;
    if (upcomingPlayerId !== state.closed_trump_holder_id) return false;

    const holderId = state.closed_trump_holder_id;
    if (!state.hands?.[holderId]) {
        state.hands[holderId] = [];
    }

    state.hands[holderId].push(state.closed_trump_card);
    state.closed_trump_revealed = true;
    state.trump_suit = state.closed_trump_card.suit;
    state.trump_revealed_at_trick = state.currentRound;
    state.trump_activation = {
        trickIndex: state.currentRound,
        playOrder: state.currentTrick?.plays?.length || 0,
    };
    state.trump_asker_id = null;
    return true;
}

module.exports = {
    pickClosedTrump,
    revealTrump,
    autoRevealIfNeeded,
};
