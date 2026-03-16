const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const { check, validationResult } = require("express-validator");
const User = require("../../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { isValidSvgAvatarDataUri } = require("../../lib/avatarUtils");
require('dotenv').config()

// @route   GET api/auth
// @desc    Test route
// @access  Private                                          // if token required then, Private
router.get("/", auth, async (req, res) => {
    try {
        const doc = await User.findById(req.user.id).lean();

        if (!doc) {
            return res.status(404).json({ errors: [{ msg: "User not found" }] });
        }

        const { password, provider, providerId, linkedProviders = [], ...rest } = doc;
        res.json({
            ...rest,
            needsOnboarding: !!rest.needsOnboarding,
            linkedProviders,
            hasPassword: !!password,
        });
    } catch (error) {
        res.status(500).json({ errors: [{ msg: "Server error" }] })
    }
});

// @route   POST api/auth
// @desc    Login user
// @access  Public                                          // if token required then, Public
router.post(
    "/",
    [
        check("email", "Please include a valid email").isEmail().normalizeEmail(),
        check(
            "password",
            "Please enter a password with 6 or more characters"
        ).isLength({ min: 6 }),
    ],
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        try {
            //check if user exists
            let user = await User.findOne({ email: email });

            if (!user) {
                return res
                    .status(400)
                    .json({ errors: [{ msg: "Invalid Credentials" }] });
            }

            // OAuth-only users cannot login with password
            if (!user.password) {
                const providerList = [
                    ...new Set(
                        (user.linkedProviders || [])
                            .map((lp) => lp.provider)
                            .filter(Boolean)
                    ),
                ];

                if (providerList.length === 0 && user.provider && user.provider !== 'local') {
                    providerList.push(user.provider);
                }

                const providerText = providerList
                    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
                    .join(' or ');

                return res
                    .status(400)
                    .json({ errors: [{ msg: `This account uses ${providerText || 'OAuth'} sign-in. Please use the ${providerText || 'OAuth'} button to log in.` }] });
            }

            //verify credentials
            const isMatch = await bcrypt.compare(password, user.password);

            if(!isMatch) {
                return res
                    .status(400)
                    .json({ errors: [{ msg: "Invalid Credentials" }] });
            }

            // return jwt
            const payload = {
                user: {
                    id: user.id,
                    provider: 'local',
                },
            };

            jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: '24h' },
                (err, token) => {
                    if (err) throw err;
                    res.json({
                        token: token,
                        user_name: user.name,
                        needs_onboarding: !!user.needsOnboarding,
                    });
                }
            );

        } catch (error) {
            res.status(500).json({ errors: [{ msg: "Server error" }] });
        }
    }
);

// @route   PUT api/auth/profile
// @desc    Update current user's profile (name/avatar)
// @access  Private
router.put(
    '/profile',
    [
        auth,
        check('name')
            .optional()
            .trim()
            .isLength({ min: 1, max: 50 })
            .withMessage('Name must be between 1 and 50 characters'),
        check('avatar')
            .optional()
            .custom((value) => {
                if (typeof value !== 'string' || !isValidSvgAvatarDataUri(value)) {
                    throw new Error('Avatar must be a valid SVG data URI under 50KB');
                }
                return true;
            }),
    ],
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, avatar } = req.body;

        if (typeof name === 'undefined' && typeof avatar === 'undefined') {
            return res.status(400).json({ errors: [{ msg: 'No profile changes provided' }] });
        }

        try {
            const user = await User.findById(req.user.id);

            if (!user) {
                return res.status(404).json({ errors: [{ msg: 'User not found' }] });
            }

            if (typeof name !== 'undefined') {
                user.name = name;
            }

            if (typeof avatar !== 'undefined') {
                user.avatar = avatar;
            }

            if (user.needsOnboarding && (typeof name !== 'undefined' || typeof avatar !== 'undefined')) {
                user.needsOnboarding = false;
            }

            await user.save();

            const doc = user.toObject();
            const { password, provider, providerId, linkedProviders = [], ...rest } = doc;

            return res.json({
                ...rest,
                needsOnboarding: !!rest.needsOnboarding,
                linkedProviders,
                hasPassword: !!password,
            });
        } catch (error) {
            return res.status(500).json({ errors: [{ msg: 'Server error' }] });
        }
    }
);

// @route   DELETE api/auth/providers/:provider
// @desc    Unlink an OAuth provider from current user
// @access  Private
router.delete('/providers/:provider', auth, async (req, res) => {
    try {
        const provider = (req.params.provider || '').toLowerCase();
        if (!['google', 'facebook'].includes(provider)) {
            return res.status(400).json({ errors: [{ msg: 'invalid provider' }] });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ errors: [{ msg: 'User not found' }] });
        }

        const linkedProviders = user.linkedProviders || [];
        const isLinked = linkedProviders.some((lp) => lp.provider === provider);
        if (!isLinked) {
            return res.status(400).json({ errors: [{ msg: 'provider not linked' }] });
        }

        const hasPassword = !!user.password;
        if (!hasPassword && linkedProviders.length <= 1) {
            return res.status(400).json({ errors: [{ msg: 'only login method' }] });
        }

        user.linkedProviders = linkedProviders.filter((lp) => lp.provider !== provider);
        await user.save();

        return res.json({ linkedProviders: user.linkedProviders });
    } catch (error) {
        return res.status(500).json({ errors: [{ msg: 'Server error' }] });
    }
});

module.exports = router;
