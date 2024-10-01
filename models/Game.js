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
        default: "State"
    }
});

module.exports = Game = mongoose.model("game", GameSchema);