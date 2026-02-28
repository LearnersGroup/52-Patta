const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const gravatar = require('gravatar');
const User = require('../models/User');

function findOrCreateUser(provider, profile, done) {
    const email = profile.emails && profile.emails[0] && profile.emails[0].value;

    if (!email) {
        return done(null, false, { message: `No email returned from ${provider}` });
    }

    User.findOne({ email })
        .then(user => {
            if (user) {
                // User exists — link OAuth provider if not already set
                if (!user.providerId && user.provider === 'local') {
                    user.providerId = profile.id;
                }
                return done(null, user);
            }

            // New user — create from OAuth profile
            const avatar = (profile.photos && profile.photos[0] && profile.photos[0].value)
                || gravatar.url(email, { s: '200', r: 'pg', d: 'mm' });

            const newUser = new User({
                name: profile.displayName || email.split('@')[0],
                email,
                provider,
                providerId: profile.id,
                avatar,
            });

            return newUser.save().then(saved => done(null, saved));
        })
        .catch(err => done(err));
}

// Google OAuth 2.0
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/oauth/google/callback',
        scope: ['profile', 'email'],
    }, (accessToken, refreshToken, profile, done) => {
        findOrCreateUser('google', profile, done);
    }));
}

// Facebook OAuth
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: process.env.FACEBOOK_CALLBACK_URL || '/api/oauth/facebook/callback',
        profileFields: ['id', 'displayName', 'emails', 'photos'],
    }, (accessToken, refreshToken, profile, done) => {
        findOrCreateUser('facebook', profile, done);
    }));
}

module.exports = passport;
