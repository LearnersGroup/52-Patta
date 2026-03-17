const config = require("./config");
const deck = require("./deck");
const bidding = require("./bidding");
const powerhouse = require("./powerhouse");
const tricks = require("./tricks");
const scoring = require("./scoring");
const validators = require("./validators");
const stateManager = require("./stateManager");
const judgement = require("./judgement");

module.exports = {
    config,
    deck,
    bidding,
    powerhouse,
    tricks,
    scoring,
    validators,
    stateManager,
    judgement,
};
