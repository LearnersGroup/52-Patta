const Game = require("../../models/Game");
const User = require("../../models/User");
const bcrypt = require("bcryptjs");

module.exports = (socket, io) => async (data, callback) => {
    const { roomname, roompass, player_count } = data;

    try {
        //check if player already in room
        let player = await User.findOne({ _id: socket.user.id });
        if (
            player["gameroom"] !== null &&
            typeof player["gameroom"] === "object"
        ) {
            callback("Player Already in a room");
            return
        }
        let game = await Game.findOne({ roomname: roomname });
        if (game) {
            callback("Gameroom Already exists");
            return
        }
        
        game = new Game({
            roomname: roomname,
            roompass: roompass,
            player_count: player_count,
            players: [{playerId: socket.user.id}],
            admin: socket.user.id,
        });
        
        //encrypt creds & store
        const salt = await bcrypt.genSalt(10);
        game.roompass = await bcrypt.hash(roompass, salt);
        game = await game.save();
        player = await User.findOneAndUpdate(
            { _id: socket.user.id },
            { gameroom: game.id }
        );
        
        await socket.join(roomname)
        socket.emit("redirect-to-game-room", game.id, (res) => {
            if(res.status === 200){
                io.to(roomname).emit("room-message", `${socket.username} created ${roomname}!`);
                io.to(roomname).emit("fetch-users-in-room");
            }
        })
        
    } catch (error) {
        callback(error);
        console.error(error.message);
    }
};