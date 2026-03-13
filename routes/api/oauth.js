const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const auth = require('../../middleware/auth');
const linkNonce = require('../../lib/linkNonce');
require('dotenv').config();

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

function handleOAuthCallback(req, res, provider) {
    const user = req.user;

    const payload = {
        user: {
            id: user.id,
            provider,
        },
    };

    jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '24h' },
        (err, token) => {
            if (err) {
                return res.redirect(`${CLIENT_URL}/login?error=token_failed`);
            }
            const userName = encodeURIComponent(user.name);
            res.redirect(`${CLIENT_URL}/oauth-callback?token=${token}&user_name=${userName}`);
        }
    );
}

// ──── Google OAuth ────

// @route   GET /api/oauth/google
// @desc    Initiate Google OAuth login
router.get('/google', (req, res, next) => {
    if (req.query.mode === 'link') {
        if (!req.headers['x-auth-token'] && req.query.token) {
            req.headers['x-auth-token'] = req.query.token;
        }

        return auth(req, res, () => {
            const nonce = linkNonce.create(req.user.id);
            passport.authenticate('google', {
                session: false,
                scope: ['profile', 'email'],
                state: `link:${nonce}`,
            })(req, res, next);
        });
    }

    passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

// @route   GET /api/oauth/google/callback
// @desc    Google OAuth callback
router.get('/google/callback', (req, res, next) => {
    const state = decodeURIComponent(req.query.state || '');
    if (state.startsWith('link:')) {
        const userId = linkNonce.consume(state.slice(5));
        if (!userId) {
            return res.redirect(`${CLIENT_URL}/profile?error=link_expired`);
        }
        req.linkingUserId = userId;
    }

    passport.authenticate('google', { session: false }, (err, user, info) => {
        if (err) return next(err);
        if (!user) {
            if (info && info.message === 'email_exists_different_provider') {
                const ep = encodeURIComponent(info.existingProvider || '');
                return res.redirect(`${CLIENT_URL}/login?error=email_exists_different_provider&existing_provider=${ep}`);
            }

            if (req.linkingUserId) {
                return res.redirect(`${CLIENT_URL}/profile?error=oauth_failed`);
            }

            return res.redirect(`${CLIENT_URL}/login?error=oauth_failed`);
        }

        req.user = user;
        if (req.linkingUserId) {
            return res.redirect(`${CLIENT_URL}/profile?linked=google`);
        }

        return handleOAuthCallback(req, res, 'google');
    })(req, res, next);
});

// ──── Facebook OAuth ────

// @route   GET /api/oauth/facebook
// @desc    Initiate Facebook OAuth login
router.get('/facebook', (req, res, next) => {
    if (req.query.mode === 'link') {
        if (!req.headers['x-auth-token'] && req.query.token) {
            req.headers['x-auth-token'] = req.query.token;
        }

        return auth(req, res, () => {
            const nonce = linkNonce.create(req.user.id);
            passport.authenticate('facebook', {
                session: false,
                scope: ['email'],
                state: `link:${nonce}`,
            })(req, res, next);
        });
    }

    passport.authenticate('facebook', { scope: ['email'], session: false })(req, res, next);
});

// @route   GET /api/oauth/facebook/callback
// @desc    Facebook OAuth callback
router.get('/facebook/callback', (req, res, next) => {
    const state = decodeURIComponent(req.query.state || '');
    if (state.startsWith('link:')) {
        const userId = linkNonce.consume(state.slice(5));
        if (!userId) {
            return res.redirect(`${CLIENT_URL}/profile?error=link_expired`);
        }
        req.linkingUserId = userId;
    }

    passport.authenticate('facebook', { session: false }, (err, user, info) => {
        if (err) return next(err);
        if (!user) {
            if (info && info.message === 'email_exists_different_provider') {
                const ep = encodeURIComponent(info.existingProvider || '');
                return res.redirect(`${CLIENT_URL}/login?error=email_exists_different_provider&existing_provider=${ep}`);
            }

            if (req.linkingUserId) {
                return res.redirect(`${CLIENT_URL}/profile?error=oauth_failed`);
            }

            return res.redirect(`${CLIENT_URL}/login?error=oauth_failed`);
        }

        req.user = user;
        if (req.linkingUserId) {
            return res.redirect(`${CLIENT_URL}/profile?linked=facebook`);
        }

        return handleOAuthCallback(req, res, 'facebook');
    })(req, res, next);
});

module.exports = router;
