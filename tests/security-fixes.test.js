/**
 * Security vulnerability fix tests
 * Tests that all identified vulnerabilities have been properly addressed
 */

const fs = require('fs');
const path = require('path');

// Helper: read file content
function readFile(relativePath) {
    return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

describe('CRITICAL: Socket Auth Callback Fix', () => {
    const socketClient = readFile('client/src/socket.js');

    test('should NOT pass a function wrapper to cb() - must pass object directly', () => {
        // The old broken pattern: cb(()=>({...})) - passes a function
        expect(socketClient).not.toMatch(/cb\s*\(\s*\(\s*\)\s*=>\s*\(/);
    });

    test('should pass an object with token to cb()', () => {
        // The fixed pattern: cb({ token: ... })
        expect(socketClient).toMatch(/cb\s*\(\s*\{/);
    });

    test('should handle null user data from localStorage', () => {
        // Should have a null/undefined check for user data
        expect(socketClient).toMatch(/getItem.*user/);
        // Should have defensive check (ternary or try/catch)
        expect(socketClient).toMatch(/user\s*\?\s*user\.token|try\s*\{|catch/);
    });
});

describe('CRITICAL: CORS Configuration Fix', () => {
    const serverFile = readFile('server.js');

    test('should NOT use wildcard CORS origin', () => {
        expect(serverFile).not.toMatch(/origin:\s*["']\*["']/);
    });

    test('should restrict CORS to specific origins', () => {
        expect(serverFile).toMatch(/allowedOrigins/);
    });

    test('should enable credentials for CORS', () => {
        expect(serverFile).toMatch(/credentials:\s*true/);
    });
});

describe('HIGH: Security Middleware', () => {
    const serverFile = readFile('server.js');

    test('should use helmet middleware', () => {
        expect(serverFile).toMatch(/require\s*\(\s*["']helmet["']\s*\)/);
        expect(serverFile).toMatch(/app\.use\s*\(\s*helmet\s*\(/);
    });

    test('should configure Content Security Policy', () => {
        expect(serverFile).toMatch(/contentSecurityPolicy/);
        expect(serverFile).toMatch(/defaultSrc.*'self'/);
        expect(serverFile).toMatch(/frameAncestors.*'none'/);
    });

    test('should configure HSTS', () => {
        expect(serverFile).toMatch(/hsts/);
        expect(serverFile).toMatch(/maxAge:\s*31536000/);
        expect(serverFile).toMatch(/includeSubDomains:\s*true/);
    });

    test('should limit JSON payload size', () => {
        // 2mb covers avatar base64 SVG payloads; still enforces an explicit limit
        expect(serverFile).toMatch(/limit:\s*["']\d+(?:kb|mb)["']/i);
    });
});

describe('HIGH: Disconnect Handler Cleanup', () => {
    const disconnectHandler = readFile('socket_handlers/extra/onDisconnect.js');

    test('should import Game and User models', () => {
        expect(disconnectHandler).toMatch(/require.*Game/);
        expect(disconnectHandler).toMatch(/require.*User/);
    });

    test('should handle user cleanup on disconnect', () => {
        expect(disconnectHandler).toMatch(/User\.findOne/);
        expect(disconnectHandler).toMatch(/gameroom/);
    });

    test('should notify room about disconnection', () => {
        expect(disconnectHandler).toMatch(/emit/);
        expect(disconnectHandler).toMatch(/room-message/);
        expect(disconnectHandler).toMatch(/disconnected/);
    });

    test('should handle admin disconnect by closing room', () => {
        expect(disconnectHandler).toMatch(/admin/);
        expect(disconnectHandler).toMatch(/Game\.findOneAndDelete/);
    });

    test('should remove player from game on disconnect', () => {
        expect(disconnectHandler).toMatch(/updatedPlayers|filter/);
    });
});

describe('HIGH: Race Condition on Room Join', () => {
    const joinRoom = readFile('socket_handlers/game_room/userJoinRoom.js');
    const gameRoomsRoute = readFile('routes/api/game-rooms.js');

    test('socket handler should use atomic MongoDB operation for capacity check', () => {
        // Should use $push instead of spread operator for atomic update
        expect(joinRoom).toMatch(/\$push/);
        expect(joinRoom).toMatch(/\$size/);
    });

    test('REST endpoint should use atomic MongoDB operation for capacity check', () => {
        expect(gameRoomsRoute).toMatch(/\$push/);
        expect(gameRoomsRoute).toMatch(/\$size/);
    });
});

describe('MEDIUM: Double Emit on Reconnect', () => {
    const joinRoom = readFile('socket_handlers/game_room/userJoinRoom.js');

    test('reconnect path should only emit once', () => {
        // Find the reconnect block (when playerInRoom is true)
        const reconnectBlock = joinRoom.split('playerInRoom')[1].split('return;')[0];

        // Count room-message emits in the reconnect block
        const emitCount = (reconnectBlock.match(/emit.*room-message/g) || []).length;
        expect(emitCount).toBeLessThanOrEqual(1);
    });

    test('should say "reconnected" instead of "created" on reconnect', () => {
        // Check the reconnect path uses "reconnected" instead of "created"
        // The reconnect path is in the playerInRoom block
        expect(joinRoom).toMatch(/reconnected/);
        // Make sure "created" is not used in the reconnect context
        const lines = joinRoom.split('\n');
        const reconnectLines = [];
        let inReconnectBlock = false;
        for (const line of lines) {
            if (line.includes('playerInRoom')) inReconnectBlock = true;
            if (inReconnectBlock) reconnectLines.push(line);
            if (inReconnectBlock && line.trim() === 'return;') break;
        }
        const reconnectBlock = reconnectLines.join('\n');
        expect(reconnectBlock).toMatch(/reconnected/);
        expect(reconnectBlock).not.toMatch(/\bcreated\b/);
    });
});

describe('HIGH: JWT Expiration Fix', () => {
    const authRoute = readFile('routes/api/auth.js');
    const usersRoute = readFile('routes/api/users.js');
    const oauthRoute = readFile('routes/api/oauth.js');

    test('auth route should use reasonable JWT expiration (not 360000)', () => {
        expect(authRoute).not.toMatch(/expiresIn:\s*360000/);
        expect(authRoute).toMatch(/expiresIn:\s*'30d'/);
    });

    test('users route should use reasonable JWT expiration (not 360000)', () => {
        expect(usersRoute).not.toMatch(/expiresIn:\s*360000/);
        expect(usersRoute).toMatch(/expiresIn:\s*'30d'/);
    });

    test('oauth route should use 30d JWT expiration', () => {
        expect(oauthRoute).not.toMatch(/expiresIn:\s*360000/);
        expect(oauthRoute).toMatch(/expiresIn:\s*'30d'/);
    });
});

describe('Token Refresh Endpoint', () => {
    const authRoute = readFile('routes/api/auth.js');

    test('should have a GET /refresh endpoint', () => {
        expect(authRoute).toMatch(/router\.get\s*\(\s*["']\/refresh["']/);
    });

    test('should be protected by auth middleware', () => {
        // auth middleware must appear in the /refresh route definition
        expect(authRoute).toMatch(/get\s*\(\s*["']\/refresh["'],\s*auth/);
    });

    test('should issue a new 30d token', () => {
        expect(authRoute).toMatch(/expiresIn:\s*["']30d["']/);
    });

    test('should return refreshed flag in response', () => {
        expect(authRoute).toMatch(/refreshed/);
    });
});

describe('Lobby Disconnect Grace Period', () => {
    const gracePeriod = readFile('socket_handlers/extra/lobbyGracePeriod.js');
    const disconnectHandler = readFile('socket_handlers/extra/onDisconnect.js');
    const connectHandler = readFile('socket_handlers/extra/onConnect.js');

    test('grace period module should export scheduleLobbyDisconnect', () => {
        expect(gracePeriod).toMatch(/scheduleLobbyDisconnect/);
    });

    test('grace period module should export cancelLobbyDisconnect', () => {
        expect(gracePeriod).toMatch(/cancelLobbyDisconnect/);
    });

    test('disconnect handler should use grace period for lobby', () => {
        expect(disconnectHandler).toMatch(/scheduleLobbyDisconnect/);
    });

    test('connect handler should cancel pending grace period on reconnect', () => {
        expect(connectHandler).toMatch(/cancelLobbyDisconnect/);
    });
});

describe('HIGH: Sensitive Data Logging Removal', () => {
    const authRoute = readFile('routes/api/auth.js');
    const usersRoute = readFile('routes/api/users.js');
    const gamesRoute = readFile('routes/api/games.js');
    const mygameRoute = readFile('routes/api/mygame.js');
    const gameRoomsRoute = readFile('routes/api/game-rooms.js');

    test('auth route should not log request body', () => {
        expect(authRoute).not.toMatch(/console\.log\s*\(\s*req\.body/);
    });

    test('users route should not log request body', () => {
        expect(usersRoute).not.toMatch(/console\.log\s*\(\s*req\.body/);
    });

    test('games route should not log request body', () => {
        expect(gamesRoute).not.toMatch(/console\.log\s*\(\s*req\.body/);
    });

    test('auth route should not log error.message', () => {
        expect(authRoute).not.toMatch(/console\.log\s*\(\s*error\.message/);
    });

    test('users route should not log error.message', () => {
        expect(usersRoute).not.toMatch(/console\.log\s*\(\s*error\.message/);
    });

    test('games route should not log error.message directly', () => {
        expect(gamesRoute).not.toMatch(/console\.log\s*\(\s*error\.message/);
    });

    test('game-rooms route should not log error.message', () => {
        expect(gameRoomsRoute).not.toMatch(/console\.(log|error)\s*\(\s*error\.message/);
    });

    test('mygame route should not log error.message', () => {
        expect(mygameRoute).not.toMatch(/console\.(log|error)\s*\(\s*error\.message/);
    });
});

describe('MEDIUM: XSS Prevention - Username Sanitization', () => {
    const setUsername = readFile('socket_handlers/extra/setSocketUsername.js');

    test('should validate username is a string', () => {
        expect(setUsername).toMatch(/typeof\s+username\s*!==?\s*['"]string['"]/);
    });

    test('should strip HTML tags from username', () => {
        expect(setUsername).toMatch(/replace.*<\[?\^?>?\]*>/);
    });

    test('should limit username length', () => {
        expect(setUsername).toMatch(/slice\s*\(\s*0\s*,\s*\d+\s*\)/);
    });
});

describe('MEDIUM: XSS Prevention - Message Sanitization', () => {
    const onMessage = readFile('socket_handlers/extra/onMessage.js');

    test('should validate message data is a string', () => {
        expect(onMessage).toMatch(/typeof\s+data\s*!==?\s*['"]string['"]/);
    });

    test('should strip HTML tags from message', () => {
        expect(onMessage).toMatch(/replace.*<\[?\^?>?\]*>/);
    });

    test('should limit message length', () => {
        expect(onMessage).toMatch(/slice\s*\(\s*0\s*,\s*\d+\s*\)/);
    });
});

describe('HIGH: Input Validation on Routes', () => {
    const usersRoute = readFile('routes/api/users.js');
    const gamesRoute = readFile('routes/api/games.js');
    const gameRoomsRoute = readFile('routes/api/game-rooms.js');
    const authRoute = readFile('routes/api/auth.js');

    test('users route should sanitize name input', () => {
        // .escape() is intentionally omitted on display names to prevent HTML-encoding
        // characters like apostrophes (O'Brien → O&#x27;Brien). XSS is handled by
        // React's JSX escaping at render time. trim() + isLength() is sufficient here.
        expect(usersRoute).toMatch(/check.*name.*trim/);
    });

    test('users route should normalize email', () => {
        expect(usersRoute).toMatch(/normalizeEmail/);
    });

    test('auth route should normalize email', () => {
        expect(authRoute).toMatch(/normalizeEmail/);
    });

    test('games route should sanitize room name', () => {
        expect(gamesRoute).toMatch(/check.*roomname.*trim|check.*roomname.*escape/);
    });

    test('games route should validate player count range', () => {
        expect(gamesRoute).toMatch(/isInt.*min.*max|isInt.*max.*min/);
    });

    test('game-rooms route should validate room ID format', () => {
        // Checks for MongoDB ObjectId format validation
        expect(gameRoomsRoute).toMatch(/0-9a-fA-F/);
        expect(gameRoomsRoute).toMatch(/match/);
    });
});

describe('HIGH: WebSocket Input Validation', () => {
    const createRoom = readFile('socket_handlers/game_room/userCreateRoom.js');
    const joinRoom = readFile('socket_handlers/game_room/userJoinRoom.js');

    test('createRoom should validate roomname', () => {
        expect(createRoom).toMatch(/!roomname|typeof roomname/);
    });

    test('createRoom should validate player_count range', () => {
        expect(createRoom).toMatch(/count\s*<\s*4|count.*13|isNaN/);
    });

    test('createRoom should sanitize room name', () => {
        expect(createRoom).toMatch(/sanitizedRoomname|replace.*<\[?\^?>?\]*>/);
    });

    test('joinRoom should validate code', () => {
        // Rooms are now joined by code, not roomname+password
        expect(joinRoom).toMatch(/!code|typeof code/);
    });
});

describe('MEDIUM: WebSocket Auth Middleware', () => {
    const wsAuth = readFile('middleware/ws_auth.js');

    test('should check for missing token', () => {
        expect(wsAuth).toMatch(/!token/);
    });

    test('should check for JWT_SECRET existence', () => {
        expect(wsAuth).toMatch(/!process\.env\.JWT_SECRET/);
    });
});

describe('MEDIUM: Database Error Handling', () => {
    const dbConfig = readFile('config/db.js');

    test('should NOT log raw error message on connection failure', () => {
        expect(dbConfig).not.toMatch(/console\.log\s*\(\s*error\.message\s*\)/);
    });

    test('should log a generic connection failure message', () => {
        expect(dbConfig).toMatch(/MongoDB connection failed|connection.*fail/i);
    });
});

describe('MEDIUM: Deprecated Dependencies Removed', () => {
    const packageJson = JSON.parse(readFile('package.json'));

    test('should not include deprecated request package', () => {
        expect(packageJson.dependencies).not.toHaveProperty('request');
    });
});

describe('HIGH: Environment Variable Validation', () => {
    const serverFile = readFile('server.js');

    test('should validate JWT_SECRET at startup', () => {
        expect(serverFile).toMatch(/JWT_SECRET/);
        expect(serverFile).toMatch(/requiredEnvVars|process\.env\[/);
    });

    test('should validate MONGO_HOST at startup', () => {
        expect(serverFile).toMatch(/MONGO_HOST/);
    });

    test('should exit process on missing env vars', () => {
        expect(serverFile).toMatch(/process\.exit\s*\(\s*1\s*\)/);
    });
});

describe('Socket Handler Error Safety', () => {
    const createRoom = readFile('socket_handlers/game_room/userCreateRoom.js');
    const joinRoom = readFile('socket_handlers/game_room/userJoinRoom.js');
    const leaveRoom = readFile('socket_handlers/game_room/userLeaveRoom.js');
    const toggleReady = readFile('socket_handlers/game_room/userToggleReady.js');

    test('handlers should not leak raw errors to clients', () => {
        // Should not pass raw error objects in callbacks
        expect(createRoom).not.toMatch(/callback\s*\(\s*error\s*\)/);
        expect(joinRoom).not.toMatch(/callback\s*\(\s*error\s*\)/);
        expect(leaveRoom).not.toMatch(/callback\s*\(\s*error\s*\)/);
        expect(toggleReady).not.toMatch(/callback\s*\(\s*error\s*\)/);
    });

    test('handlers should not log error.message', () => {
        expect(createRoom).not.toMatch(/console\.error\s*\(\s*error\.message\s*\)/);
        expect(joinRoom).not.toMatch(/console\.error\s*\(\s*error\.message\s*\)/);
        expect(leaveRoom).not.toMatch(/console\.error\s*\(\s*error\.message\s*\)/);
        expect(toggleReady).not.toMatch(/console\.error\s*\(\s*error\.message\s*\)/);
    });
});

describe('Console Logging Cleanup', () => {
    const onConnect = readFile('socket_handlers/extra/onConnect.js');
    const setUsername = readFile('socket_handlers/extra/setSocketUsername.js');

    test('onConnect should not log to console', () => {
        expect(onConnect).not.toMatch(/console\.log/);
    });

    test('setSocketUsername should not log sensitive socket data', () => {
        expect(setUsername).not.toMatch(/console\.log.*socket\.user/);
    });
});

describe('Password Validation', () => {
    const usersRoute = readFile('routes/api/users.js');
    const gamesRoute = readFile('routes/api/games.js');

    test('user password should have max length limit', () => {
        expect(usersRoute).toMatch(/max:\s*128/);
    });

    test('room password should have max length limit', () => {
        expect(gamesRoute).toMatch(/max:\s*128/);
    });
});

describe('Server Exports', () => {
    const serverFile = readFile('server.js');

    test('should export app, server, and io for testing', () => {
        expect(serverFile).toMatch(/module\.exports/);
    });
});
