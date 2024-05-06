const express = require("express");
const connectDB = require("./config/db");
const { Server } = require("socket.io");
const app = express();
const http = require("http");
// var expressWs = require('express-ws')(app);

// Connect DB
connectDB();

// Init Middleware
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

// Websockets
io.on("connection", (socket) => {
    console.log("A user connected");

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
