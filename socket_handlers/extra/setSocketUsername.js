module.exports = (socket, io) => (username) => {
    if (typeof username !== 'string') return;
    // Sanitize: strip HTML tags and limit length
    const sanitized = username.replace(/<[^>]*>/g, '').trim().slice(0, 50);
    socket.username = sanitized;
}
