const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const gravatar = require("gravatar");
const bcrypt = require("bcryptjs");
const config = require("config");
const User = require("../../models/User");
const jwt = require("jsonwebtoken");
require('dotenv').config()

// @route   POST api/users
// @desc    Register user
// @access  Public                                          // if token required then, Private
router.post(
    "/",
    [
        check("name", "Name is required").not().isEmpty().trim().escape().isLength({ max: 50 }),
        check("email", "Please include a valid email").isEmail().normalizeEmail(),
        check(
            "password",
            "Please enter a password with 6 or more characters"
        ).isLength({ min: 6, max: 128 }),
    ],
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password } = req.body;

        try {
            //check if user exists
            let user = await User.findOne({ email: email });

            if (user) {
                return res
                    .status(400)
                    .json({ errors: [{ msg: "User Already exists" }] });
            }

            //get gravitar avatar
            const avatar = gravatar.url(email, {
                s: "200",
                r: "pg",
                d: "mm",
            });

            user = new User({
                name,
                email,
                avatar,
                password,
            });

            //encrypt creds & store
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);

            await user.save();

            // return jwt
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
                    if (err) throw err;
                    return res.json({ token, user_name: user.name });
                }
            );

        } catch (error) {
            res.status(500).send("server error");
        }
    }
);

module.exports = router;
