const { proceedFromTrumpAnnounce } = require('./helpers/autoNextJudgementRound');
const { clearJudgementAdvance } = require('./helpers/judgementTimers');
const { findGameForSocket } = require('./helpers/findGameForSocket');
const wrapHandler = require('../wrapHandler');

module.exports = wrapHandler('game-proceed-to-shuffle', async (socket, io, data, callback) => {
    const { gameState, error } = await findGameForSocket(socket);
    if (error) {
        if (callback) callback(error);
        return;
    }

    if (gameState.game_type !== 'judgement') {
        if (callback) callback('Not a Judgement game');
        return;
    }

    if (gameState.phase !== 'trump-announce') {
        if (callback) callback('Not in trump-announce phase');
        return;
    }

    if (gameState.dealer !== socket.user.id) {
        if (callback) callback('Only the dealer can proceed early');
        return;
    }

    clearJudgementAdvance(gameState.gameId);
    await proceedFromTrumpAnnounce(io, gameState.gameId);
});
