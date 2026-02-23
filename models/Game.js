const mongoose = require("mongoose");

const GameSchema = new mongoose.Schema({
    admin: {
        type: mongoose.Schema.Types.ObjectId, // foreign key
        ref: "user",
    },
    roomname: {
        type: String,
        required: true,
        unique: true,
    },
    roompass: {
        type: String,
        required: true
    },
    player_count: {
        type: Number,
        required: true,
    },
    deck_count: {
        type: Number,
        default: null,
    },
    bid_threshold: {
        type: Number,
        default: null,
    },
    players: [{
        playerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user"
        },
        ready: {
            type: Boolean,
            default: false
        }
    }],
    messages: {
        type: [String],
        default: []
    },
    state: {
        type: String,
        default: "lobby"
    },
    gameState: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    }
});

module.exports = Game = mongoose.model("game", GameSchema);