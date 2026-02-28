const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: false
    },
    avatar: {
        type: String,
    },
    provider: {
        type: String,
        enum: ['local', 'google', 'facebook'],
        default: 'local'
    },
    providerId: {
        type: String,
        default: null
    },
    date: {
        type: Date,
        default: Date.now
    },
    gameroom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "game",
        default: null
    }
});

module.exports = User = mongoose.model('user', UserSchema);