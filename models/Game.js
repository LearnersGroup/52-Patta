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
        default: null,  // null for public rooms
    },
    isPublic: {
        type: Boolean,
        default: false,
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
    bid_window: {
        type: Number,  // bidding window in seconds (null = use server default of 15)
        default: null,
    },
    game_count: {
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