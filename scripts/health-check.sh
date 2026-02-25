#!/bin/bash
# Simple uptime health check script.
# Can be used with cron, UptimeRobot, or any monitoring tool.
#
# Usage:
#   ./scripts/health-check.sh                    # checks localhost:4000
#   ./scripts/health-check.sh https://yourdomain.com  # checks production
#
# Returns exit code 0 if healthy, 1 if degraded/down.

URL="${1:-http://localhost:4000/health}"

response=$(curl -sf --max-time 5 "$URL" 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "CRITICAL: Health check failed - server unreachable at $URL"
    exit 1
fi

status=$(echo "$response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
database=$(echo "$response" | grep -o '"database":"[^"]*"' | cut -d'"' -f4)

if [ "$status" = "ok" ] && [ "$database" = "connected" ]; then
    echo "OK: Server healthy | DB connected"
    exit 0
elif [ "$status" = "degraded" ]; then
    echo "WARNING: Server degraded | DB: $database"
    exit 1
else
    echo "CRITICAL: Unexpected status=$status db=$database"
    exit 1
fi
