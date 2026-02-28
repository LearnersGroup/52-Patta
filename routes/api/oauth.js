const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

function handleOAuthCallback(req, res) {
    const user = req.user;

    const payload = {
        user: {
            id: user.id,
        },
    };

    jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: 3600 },
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
router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// @route   GET /api/oauth/google/callback
// @desc    Google OAuth callback
router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: `${CLIENT_URL}/login?error=oauth_failed` }),
    handleOAuthCallback
);

// ──── Facebook OAuth ────

// @route   GET /api/oauth/facebook
// @desc    Initiate Facebook OAuth login
router.get('/facebook',
    passport.authenticate('facebook', { scope: ['email'], session: false })
);

// @route   GET /api/oauth/facebook/callback
// @desc    Facebook OAuth callback
router.get('/facebook/callback',
    passport.authenticate('facebook', { session: false, failureRedirect: `${CLIENT_URL}/login?error=oauth_failed` }),
    handleOAuthCallback
);

module.exports = router;
