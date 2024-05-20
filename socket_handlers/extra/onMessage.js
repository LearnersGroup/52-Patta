module.exports = (socket, io) => (data) => {
    console.log(`Received message: ${data}`);
    io.emit("message", data);
}