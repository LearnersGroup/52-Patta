const { MATRIX, validateMendikotConfig, computeMendikotConfig } = require("./config");
const { pickClosedTrump, revealTrump, autoRevealIfNeeded } = require("./bandHukum");
const { classifyRoundResult, firstToNTricksWinner } = require("./scoring");
const { computeNextDealer } = require("./dealerRotation");
const tricks = require("./tricks");

module.exports = {
    MATRIX,
    validateMendikotConfig,
    computeMendikotConfig,
    pickClosedTrump,
    revealTrump,
    autoRevealIfNeeded,
    classifyRoundResult,
    firstToNTricksWinner,
    computeNextDealer,
    tricks,
};
