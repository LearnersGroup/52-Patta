const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const gravatar = require("gravatar");
const bcrypt = require("bcryptjs");
const User = require("../../models/User");
const jwt = require("jsonwebtoken");
const { isValidSvgAvatarDataUri } = require("../../lib/avatarUtils");
require('dotenv').config()

// @route   POST api/users
// @desc    Register user
// @access  Public                                          // if token required then, Private
router.post(
    "/",
    [
        check("email", "Please include a valid email").isEmail().normalizeEmail(),
        check(
            "password",
            "Please enter a password with 6 or more characters"
        ).isLength({ min: 6, max: 128 }),
        check("name")
            .optional({ checkFalsy: true })
            .trim()
            .escape()
            .isLength({ max: 50 })
            .withMessage("Name can be at most 50 characters"),
        check("avatar")
            .optional({ checkFalsy: true })
            .custom((value) => {
                if (typeof value !== "string" || !isValidSvgAvatarDataUri(value)) {
                    throw new Error("Avatar must be a valid SVG data URI under 50KB");
                }
                return true;
            }),
    ],
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password, avatar } = req.body;

        try {
            //check if user exists
            let user = await User.findOne({ email: email });

            if (user) {
                return res
                    .status(400)
                    .json({ errors: [{ msg: "User Already exists" }] });
            }

            // Use custom avatar if provided, otherwise fallback to gravatar
            const resolvedAvatar = avatar || gravatar.url(email, {
                s: "200",
                r: "pg",
                d: "mm",
            });

            const fallbackName = `Player-${Math.random().toString(36).slice(2, 7)}`;

            user = new User({
                name: name || fallbackName,
                email,
                avatar: resolvedAvatar,
                password,
                needsOnboarding: true,
            });

            //encrypt creds & store
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);

            await user.save();

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
                    return res.json({
                        token,
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

module.exports = router;
