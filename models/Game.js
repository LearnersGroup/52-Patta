const mongoose = require("mongoose");

const GameSchema = new mongoose.Schema({
    code: {
        type: String,
        unique: true,
        sparse: true,
    },
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
    game_type: {
        type: String,
        enum: ["kaliteri", "judgement", "mendikot"],
        default: "kaliteri",
    },
    max_cards_per_round: {
        type: Number,
        default: null,
    },
    reverse_order: {
        type: Boolean,
        default: true,
    },
    trump_mode: {
        type: String,
        enum: ["fixed", "random", "band", "cut"],
        default: "random",
    },
    band_hukum_pick_phase: {
        type: Boolean,
        default: null,
    },
    rounds_count: {
        type: Number,
        default: null,
    },
    scoreboard_time: {
        type: Number,
        default: null,
    },
    judgement_bid_time: {
        type: Number,
        default: null,
    },
    card_reveal_time: {
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
    inspect_time: {
        type: Number,  // card inspect time in seconds (null = use server default of 15)
        default: null,
    },
    autoplay: {
        type: Boolean,
        default: true,
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
    team_a_players: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
    }],
    team_b_players: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
    }],
    messages: {
        type: [String],
        default: []
    },
    state: {
        type: String,
        enum: [
            "lobby",
            "shuffling",
            "dealing",
            "bidding",
            "powerhouse",
            "band-hukum-pick",
            "playing",
            "scoring",
            "finished",
            "series-finished",
        ],
        default: "lobby"
    },
    gameState: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    }
});

module.exports = Game = mongoose.model("game", GameSchema);