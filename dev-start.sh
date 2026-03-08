#!/usr/bin/env bash
# dev-start.sh — Kill ports 3000-3003 & 4000, then launch backend + 4 clients

set -e

PORTS=(3000 3001 3002 3003 4000)

echo "🔪  Freeing ports ${PORTS[*]}..."
for PORT in "${PORTS[@]}"; do
  PIDS=$(lsof -ti :"$PORT" 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "    killing PID(s) $PIDS on :$PORT"
    echo "$PIDS" | xargs kill -9
  fi
done
echo "✅  Ports cleared."
echo ""

# Give the OS a moment to release sockets
sleep 0.5

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "🚀  Starting backend on :4000..."
PORT=4000 npx nodemon "$REPO_ROOT/server" &
BACKEND_PID=$!

echo "🃏  Starting client-3000..."
PORT=3000 npm start --prefix "$REPO_ROOT/client" &

echo "🃏  Starting client-3001..."
PORT=3001 npm start --prefix "$REPO_ROOT/client" &

echo "🃏  Starting client-3002..."
PORT=3002 npm start --prefix "$REPO_ROOT/client" &

echo "🃏  Starting client-3003..."
PORT=3003 npm start --prefix "$REPO_ROOT/client" &

echo ""
echo "All processes started. Press Ctrl+C to stop everything."
echo "  Backend  → http://localhost:4000"
echo "  Client 1 → http://localhost:3000"
echo "  Client 2 → http://localhost:3001"
echo "  Client 3 → http://localhost:3002"
echo "  Client 4 → http://localhost:3003"

# Wait for all background jobs; Ctrl+C kills them all
trap 'echo ""; echo "Stopping all servers..."; kill $(jobs -p) 2>/dev/null; exit 0' INT TERM
wait
