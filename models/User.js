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
    needsOnboarding: {
        type: Boolean,
        default: false,
    },
    linkedProviders: [{
        provider: {
            type: String,
            enum: ['google', 'facebook'],
            required: true,
        },
        providerId: {
            type: String,
            required: true,
        },
        linkedAt: {
            type: Date,
            default: Date.now,
        },
    }],
    // @deprecated — remove after migration
    provider: {
        type: String,
        enum: ['local', 'google', 'facebook'],
        default: 'local'
    },
    // @deprecated — remove after migration
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

UserSchema.index({ 'linkedProviders.provider': 1, 'linkedProviders.providerId': 1 });

module.exports = User = mongoose.model('user', UserSchema);