const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const gravatar = require('gravatar');
const User = require('../models/User');

async function findOrCreateUser(provider, profile, done, req) {
    const email = profile.emails && profile.emails[0] && profile.emails[0].value;

    if (!email) {
        return done(null, false, { message: `No email returned from ${provider}` });
    }

    const providerId = profile.id;
    const now = new Date();

    try {
        // Link flow: logged-in user is explicitly linking a new provider
        if (req && req.linkingUserId) {
            const linkingUser = await User.findById(req.linkingUserId);

            if (!linkingUser) {
                return done(null, false, { message: 'link_user_not_found' });
            }

            const alreadyLinked = (linkingUser.linkedProviders || [])
                .some((lp) => lp.provider === provider);

            if (!alreadyLinked) {
                linkingUser.linkedProviders.push({ provider, providerId, linkedAt: now });
                await linkingUser.save();
            }

            return done(null, linkingUser);
        }

        // Login flow: first resolve by explicit linked provider identity (fast path)
        let user = await User.findOne({
            linkedProviders: { $elemMatch: { provider, providerId } },
        });

        if (user) {
            return done(null, user);
        }

        // Resolve by email to detect provider collision (no silent merge)
        user = await User.findOne({ email });
        if (user) {
            const alreadyLinked = (user.linkedProviders || [])
                .some((lp) => lp.provider === provider);

            if (alreadyLinked) {
                return done(null, user);
            }

            const existingProvider =
                (user.linkedProviders && user.linkedProviders[0] && user.linkedProviders[0].provider)
                || (user.provider && user.provider !== 'local' ? user.provider : 'local');

            return done(null, false, {
                message: 'email_exists_different_provider',
                existingProvider,
            });
        }

        // New user from OAuth profile
        const avatar = (profile.photos && profile.photos[0] && profile.photos[0].value)
            || gravatar.url(email, { s: '200', r: 'pg', d: 'mm' });

        const newUser = new User({
            name: profile.displayName || email.split('@')[0],
            email,
            linkedProviders: [{ provider, providerId, linkedAt: now }],
            // @deprecated write-through for rollback compatibility during migration window
            provider,
            providerId,
            avatar,
        });

        const saved = await newUser.save();
        return done(null, saved);
    } catch (err) {
        return done(err);
    }
}

// Google OAuth 2.0
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/oauth/google/callback',
        scope: ['profile', 'email'],
        passReqToCallback: true,
    }, (req, accessToken, refreshToken, profile, done) => {
        findOrCreateUser('google', profile, done, req);
    }));
}

// Facebook OAuth
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: process.env.FACEBOOK_CALLBACK_URL || '/api/oauth/facebook/callback',
        profileFields: ['id', 'displayName', 'emails', 'photos'],
        passReqToCallback: true,
    }, (req, accessToken, refreshToken, profile, done) => {
        findOrCreateUser('facebook', profile, done, req);
    }));
}

module.exports = passport;
