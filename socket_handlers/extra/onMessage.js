module.exports = (socket, io) => (data) => {
    if (typeof data !== 'string') return;
    // Sanitize: strip HTML tags and limit length
    const sanitized = data.replace(/<[^>]*>/g, '').trim().slice(0, 1000);
    if (sanitized.length === 0) return;
    io.emit("message", sanitized);
}
