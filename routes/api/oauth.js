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
    // If a mobile redirect_uri was stashed in state, use it instead of CLIENT_URL
    const mobileRedirect = req._oauthRedirectUri;

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
                const base = mobileRedirect || CLIENT_URL;
                return res.redirect(`${base}/login?error=token_failed`);
            }
            const userName = encodeURIComponent(user.name);
            const needsOnboarding = user.needsOnboarding ? '1' : '0';
            const params = `token=${token}&user_name=${userName}&needs_onboarding=${needsOnboarding}`;
            if (mobileRedirect) {
                // Deep link back to mobile app: patta52://oauth-callback?token=...
                return res.redirect(`${mobileRedirect}?${params}`);
            }
            res.redirect(`${CLIENT_URL}/oauth-callback?${params}`);
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

    // If mobile client passes redirect_uri, encode it in state so callback can use it
    const mobileRedirect = req.query.redirect_uri;
    const state = mobileRedirect ? `mobile:${mobileRedirect}` : undefined;
    passport.authenticate('google', { scope: ['profile', 'email'], session: false, state })(req, res, next);
});

// @route   GET /api/oauth/google/callback
// @desc    Google OAuth callback
router.get('/google/callback', (req, res, next) => {
    const state = decodeURIComponent(req.query.state || '');

    // Extract mobile redirect URI from state if present
    let mobileRedirect = null;
    if (state.startsWith('mobile:')) {
        mobileRedirect = state.slice(7); // e.g. patta52://oauth-callback
    } else if (state.startsWith('link:')) {
        const userId = linkNonce.consume(state.slice(5));
        if (!userId) {
            return res.redirect(`${CLIENT_URL}/profile?error=link_expired`);
        }
        req.linkingUserId = userId;
    }

    passport.authenticate('google', { session: false }, (err, user, info) => {
        if (err) return next(err);
        const errorBase = mobileRedirect || CLIENT_URL;
        if (!user) {
            if (info && info.message === 'email_exists_different_provider') {
                const ep = encodeURIComponent(info.existingProvider || '');
                return res.redirect(`${errorBase}/login?error=email_exists_different_provider&existing_provider=${ep}`);
            }

            if (req.linkingUserId) {
                return res.redirect(`${CLIENT_URL}/profile?error=oauth_failed`);
            }

            return res.redirect(`${errorBase}/login?error=oauth_failed`);
        }

        req.user = user;
        req._oauthRedirectUri = mobileRedirect; // Pass to handleOAuthCallback
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

    const mobileRedirect = req.query.redirect_uri;
    const state = mobileRedirect ? `mobile:${mobileRedirect}` : undefined;
    passport.authenticate('facebook', { scope: ['email'], session: false, state })(req, res, next);
});

// @route   GET /api/oauth/facebook/callback
// @desc    Facebook OAuth callback
router.get('/facebook/callback', (req, res, next) => {
    const state = decodeURIComponent(req.query.state || '');

    let mobileRedirect = null;
    if (state.startsWith('mobile:')) {
        mobileRedirect = state.slice(7);
    } else if (state.startsWith('link:')) {
        const userId = linkNonce.consume(state.slice(5));
        if (!userId) {
            return res.redirect(`${CLIENT_URL}/profile?error=link_expired`);
        }
        req.linkingUserId = userId;
    }

    passport.authenticate('facebook', { session: false }, (err, user, info) => {
        if (err) return next(err);
        const errorBase = mobileRedirect || CLIENT_URL;
        if (!user) {
            if (info && info.message === 'email_exists_different_provider') {
                const ep = encodeURIComponent(info.existingProvider || '');
                return res.redirect(`${errorBase}/login?error=email_exists_different_provider&existing_provider=${ep}`);
            }

            if (req.linkingUserId) {
                return res.redirect(`${CLIENT_URL}/profile?error=oauth_failed`);
            }

            return res.redirect(`${errorBase}/login?error=oauth_failed`);
        }

        req.user = user;
        req._oauthRedirectUri = mobileRedirect;
        if (req.linkingUserId) {
            return res.redirect(`${CLIENT_URL}/profile?linked=facebook`);
        }

        return handleOAuthCallback(req, res, 'facebook');
    })(req, res, next);
});

module.exports = router;
