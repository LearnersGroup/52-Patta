const mongoose = require("mongoose");
const Game = require("../../models/Game");
const User = require("../../models/User");
const wrapHandler = require('../wrapHandler');

// Per-user timestamp of their last toggle. Used to enforce server-side rate
// limiting independently of client-side debounce.
const lastToggleMap = new Map();
const TOGGLE_COOLDOWN_MS = 500;

module.exports = wrapHandler('user-toggle-ready', async (socket, io, data, callback) => {
    const userId = socket.user.id;
    const now = Date.now();

    if (now - (lastToggleMap.get(userId) || 0) < TOGGLE_COOLDOWN_MS) {
        callback("Too many requests. Please wait before toggling again.");
        return;
    }
    lastToggleMap.set(userId, now);

    const user = await User.findOne({ _id: userId });
    if (!user?.gameroom) {
        callback("Room does not exist");
        return;
    }

    // Atomically toggle the ready flag for this player using an aggregation
    // pipeline update — no separate read-modify-write, eliminates lost-update
    // race condition when rapid toggles overlap.
    const updatedGame = await Game.findOneAndUpdate(
        { _id: user.gameroom },
        [{
            $set: {
                players: {
                    $map: {
                        input: "$players",
                        as: "p",
                        in: {
                            $mergeObjects: [
                                "$$p",
                                {
                                    ready: {
                                        $cond: [
                                            { $eq: ["$$p.playerId", new mongoose.Types.ObjectId(userId)] },
                                            { $not: "$$p.ready" },
                                            "$$p.ready"
                                        ]
                                    }
                                }
                            ]
                        }
                    }
                }
            }
        }],
        { new: true }
    );

    if (!updatedGame) {
        callback("Room does not exist");
        return;
    }

    io.to(updatedGame.roomname).emit("fetch-users-in-room");
});
