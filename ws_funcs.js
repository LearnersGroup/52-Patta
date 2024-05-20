const Game = require("./models/Game");
const User = require("./models/User");
const bcrypt = require("bcryptjs");

const userJoinRoom = (socket, io) => async (data, callback) => {
    const { roomname, roompass } = data;

    try {
        let game = await Game.findOne({ roomname: roomname });

        if (!game) {
            callback("Room does not exists");
            return
        }

        //verify player not already in the room
        const playerInRoom = game.players.includes(socket.user.id);
        if (playerInRoom) {
            await socket.join(roomname);
            socket.emit("redirect-to-game-room", game.id);
            io.to(roomname).emit("room-message", `${socket.username} has joined!`)
            io.to(roomname).emit("fetch-users-in-room")
            return;
        }

        //check if player already in room
        let player = await User.findOne({ _id: socket.user.id });
        if (
            player["gameroom"] !== null &&
            typeof player["gameroom"] === "object"
        ) {
            callback("Player Already in a room");
            return
        }

        //Check if room full
        if (game.players.length >= game.player_count) {
            callback("Room is full");
            return
        }

        //verify credentials
        const isMatch = await bcrypt.compare(roompass, game.roompass);

        if (!isMatch) {
            callback("Invalid Credentials");
            return
        }

        //Update game room
        let gameroom = await Game.findOneAndUpdate(
            { _id: game.id },
            { players: [...game.players, socket.user.id] }
        );
        //Update user game-room
        await User.findOneAndUpdate(
            { _id: socket.user.id },
            { gameroom: gameroom.id }
        );
        await socket.join(roomname)
        socket.emit("redirect-to-game-room", game.id)
        io.to(roomname).emit("room-message", `${socket.username} has joined!`)
        io.to(roomname).emit("fetch-users-in-room")
    } catch (error) {
        callback(error);
        console.error(error.message);
    }
};

const userCreateRoom = (socket, io) => async (data, callback) => {
    const { roomname, roompass, player_count } = data;

    try {
        //check if player already in room
        console.log("1")
        let player = await User.findOne({ _id: socket.user.id });
        if (
            player["gameroom"] !== null &&
            typeof player["gameroom"] === "object"
        ) {
            callback("Player Already in a room");
            return
        }
        console.log("2")

        let game = await Game.findOne({ roomname: roomname });
        if (game) {
            callback("Gameroom Already exists");
            return
        }
        console.log("3")

        game = new Game({
            roomname: roomname,
            roompass: roompass,
            player_count: player_count,
            players: [socket.user.id],
            admin: socket.user.id,
        });
        console.log("4")

        //encrypt creds & store
        const salt = await bcrypt.genSalt(10);
        game.roompass = await bcrypt.hash(roompass, salt);
        game = await game.save();
        player = await User.findOneAndUpdate(
            { _id: socket.user.id },
            { gameroom: game.id }
        );
        
        console.log("5")
        await socket.join(roomname)
        console.log("6")
        socket.emit("redirect-to-game-room", game.id)
        console.log("7")
        io.to(roomname).emit("room-message", `${socket.username} created ${roomname}!`)
        io.to(roomname).emit("fetch-users-in-room")
    } catch (error) {
        callback(error);
        console.error(error.message);
    }
};

module.exports = {
    userJoinRoom,
    userCreateRoom,
}