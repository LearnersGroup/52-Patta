#!/bin/bash
# Restart all 52-Patta servers (backend + 6 React dev servers)
# Usage: ./scripts/restart-all.sh

PROJECT_DIR="/Users/prins203/code/52-Patta"
LOG_DIR="/tmp/52patta-logs"
CLIENT_PORTS="3000 3001 3002 3003 3004 3005"
mkdir -p "$LOG_DIR"

echo "=== Stopping all servers ==="

# Kill backend server on port 4000
BACKEND_PID=$(lsof -i :4000 -sTCP:LISTEN -t 2>/dev/null)
if [ -n "$BACKEND_PID" ]; then
    kill $BACKEND_PID 2>/dev/null
    echo "  Killed backend (PID $BACKEND_PID)"
fi

# Kill React dev servers
for PORT in $CLIENT_PORTS; do
    PID=$(lsof -i :$PORT -sTCP:LISTEN -t 2>/dev/null)
    if [ -n "$PID" ]; then
        kill $PID 2>/dev/null
        echo "  Killed client on port $PORT (PID $PID)"
    fi
done

# Wait for ports to free up
sleep 2

echo "=== Starting backend server ==="
cd "$PROJECT_DIR"
nohup node server.js > "$LOG_DIR/server.log" 2>&1 &
echo "  Backend started (PID $!) -> $LOG_DIR/server.log"

echo "=== Starting React dev servers ==="
cd "$PROJECT_DIR/client"
for PORT in $CLIENT_PORTS; do
    PORT=$PORT nohup npx react-scripts start > "$LOG_DIR/client-$PORT.log" 2>&1 &
    echo "  Client :$PORT started (PID $!) -> $LOG_DIR/client-$PORT.log"
done

echo "=== Waiting for servers to be ready ==="
sleep 10

# Check all ports
ALL_UP=true
for PORT in 4000 $CLIENT_PORTS; do
    if lsof -i :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "  :$PORT ✓"
    else
        echo "  :$PORT ✗ (not ready yet)"
        ALL_UP=false
    fi
done

if [ "$ALL_UP" = true ]; then
    echo "=== All servers running! ==="
else
    echo "=== Some servers still starting... check logs in $LOG_DIR ==="
fi

echo ""
echo "=== Cleaning up DB (clearing rooms) ==="
cd "$PROJECT_DIR"
node -e "
const mongoose = require('mongoose');
const connectDB = require('./config/db');
connectDB().then(async () => {
    const Game = require('./models/Game');
    const User = require('./models/User');
    const deleted = await Game.deleteMany({});
    await User.updateMany({}, { \\\$set: { gameroom: null } });
    console.log('  Cleared ' + deleted.deletedCount + ' game rooms');
    process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
" 2>/dev/null

echo "=== Done! ==="
