const express = require("express");
var cors = require("cors");
const connectDB = require("./config/db");
const { Server } = require("socket.io");
const app = express();
const http = require("http");
const Game = require("./models/Game");
const User = require("./models/User");
const bcrypt = require("bcryptjs");
const ws_auth_middleware = require("./middleware/ws_auth");
const { userJoinRoom, userCreateRoom } = require("./ws_funcs");

// Connect DB
connectDB();

// Init Middleware
app.use(cors());
app.use(express.json({ extended: false }));

//define routes
app.use("/api/users", require("./routes/api/users")); //create user
app.use("/api/auth", require("./routes/api/auth")); //auth user
app.use("/api/games", require("./routes/api/games")); //create game-room
app.use("/api/game-rooms", require("./routes/api/game-rooms")); //
app.use("/api/mygame", require("./routes/api/mygame"));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    },
});
io.use(ws_auth_middleware);

// Websockets
io.on("connection", (socket) => {
    console.log("A user connected");

    socket.on("username", (username) => {
        socket.username = username;
        console.log("recieved user from middleware -> ", socket.user);
    });

    socket.on("user-join-room", userJoinRoom(socket, io));
    socket.on("user-create-room", userCreateRoom(socket, io));

    socket.on("move", (data) => {
        console.log(`Received message: ${data}`);
        //The received message is broadcasted to all connected clients using the emit() method of the io object.
        io.emit("message", data);
    });
    //an event listener is set up for when a client disconnects.
    socket.on("disconnect", () => {
        console.log("A user disconnected");
    });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => console.log(`server started on port ${PORT}`));
