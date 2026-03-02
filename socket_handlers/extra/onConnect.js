const User = require("../../models/User");

module.exports = (socket, io) => async () => {
    // Check if the user has an active game to rejoin
    try {
        const user = await User.findById(socket.user.id)
            .populate("gameroom", ["roomname", "state"]);

        if (user?.gameroom && user.gameroom.state && user.gameroom.state !== "lobby") {
            socket.emit("rejoin-available", {
                roomId: user.gameroom._id.toString(),
                roomname: user.gameroom.roomname,
                gamePhase: user.gameroom.state,
            });
        }
    } catch (err) {
        // Silent — don't break connection for rejoin check
        console.error("Rejoin check error:", err.message);
    }
}
