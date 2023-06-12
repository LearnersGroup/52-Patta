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
    players: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "user" 
    },
    state: {
        type: String,
        required: true,
    }
});

module.exports = Game = mongoose.model("game", GameSchema);