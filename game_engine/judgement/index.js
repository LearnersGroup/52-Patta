const { computeJudgementConfig } = require("./config");
const { computeTrumpSuit, dealJudgementRound, getNextJudgementRound } = require("./rounds");
const { initJudgementBidding, placeJudgementBid } = require("./bidding");
const { calculateJudgementRoundResult, applyJudgementScoring } = require("./scoring");

module.exports = {
    computeJudgementConfig,
    computeTrumpSuit,
    dealJudgementRound,
    getNextJudgementRound,
    initJudgementBidding,
    placeJudgementBid,
    calculateJudgementRoundResult,
    applyJudgementScoring,
};
