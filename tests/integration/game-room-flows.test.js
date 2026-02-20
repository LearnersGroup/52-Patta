const mongoose = require('mongoose');
const {
    startTestServer,
    stopTestServer,
    registerUser,
    createSocketClient,
    waitForEvent,
    waitForMessage,
    cleanupSockets,
} = require('./helpers');

let testEnv;
let sockets = [];

beforeAll(async () => {
    testEnv = await startTestServer();
});

afterEach(() => {
    cleanupSockets(...sockets);
    sockets = [];
});

afterAll(async () => {
    await stopTestServer(testEnv);
});

// Counter to generate unique users per test
let userCounter = 0;
function uniqueUser(prefix) {
    userCounter++;
    return {
        name: `${prefix}${userCounter}`,
        email: `${prefix}${userCounter}@test.com`,
        password: 'password123',
    };
}

// Helper: register + connect a socket client
async function setupUser(prefix) {
    const user = uniqueUser(prefix);
    const token = await registerUser(testEnv.port, user);
    const socket = await createSocketClient(testEnv.port, token, user.name);
    sockets.push(socket);
    return { socket, user, token };
}

/**
 * Admin creates a room. Waits for the full cycle:
 * redirect-to-game-room -> ack -> room-message + fetch-users-in-room
 * Returns the game ID once everything is settled.
 */
async function adminCreatesRoom(adminSocket, roomname, roompass = 'secret123', playerCount = 4) {
    const msgPromise = waitForMessage(adminSocket, (msg) => msg.includes('created'));
    const fetchPromise = waitForEvent(adminSocket, 'fetch-users-in-room');

    const gameId = await new Promise((resolve, reject) => {
        adminSocket.on('redirect-to-game-room', (gameId, ackCallback) => {
            ackCallback({ status: 200 });
            adminSocket.off('redirect-to-game-room');
            resolve(gameId);
        });

        adminSocket.emit('user-create-room', {
            roomname,
            roompass,
            player_count: playerCount,
        }, (error) => {
            if (error) reject(new Error(error));
        });
    });

    // Wait for broadcasts to be received before returning
    await msgPromise;
    await fetchPromise;

    return gameId;
}

/**
 * Player joins a room. Waits for the full cycle including broadcasts.
 * Returns the game ID once everything is settled.
 */
async function playerJoinsRoom(playerSocket, adminSocket, roomname, roompass = 'secret123') {
    const adminMsgPromise = waitForMessage(adminSocket, (msg) => msg.includes('has joined'));
    const adminFetchPromise = waitForEvent(adminSocket, 'fetch-users-in-room');

    const gameId = await new Promise((resolve, reject) => {
        playerSocket.on('redirect-to-game-room', (gameId, ackCallback) => {
            ackCallback({ status: 200 });
            playerSocket.off('redirect-to-game-room');
            resolve(gameId);
        });

        playerSocket.emit('user-join-room', {
            roomname,
            roompass,
        }, (error) => {
            if (error) reject(new Error(error));
        });
    });

    // Wait for admin to receive the join broadcasts
    await adminMsgPromise;
    await adminFetchPromise;

    return gameId;
}

let roomCounter = 0;
function uniqueRoomName() {
    roomCounter++;
    return `TestRoom${roomCounter}`;
}

describe('Suite 1: Admin creates a room', () => {
    it('should create a room and receive redirect + broadcast events', async () => {
        const { socket: adminSocket } = await setupUser('admin');
        const roomname = uniqueRoomName();

        const gameId = await adminCreatesRoom(adminSocket, roomname);

        // Assert: received a valid game ID
        expect(gameId).toBeTruthy();
        expect(typeof gameId).toBe('string');

        // Assert: Game document exists in DB
        const Game = mongoose.model('game');
        const game = await Game.findById(gameId);
        expect(game).toBeTruthy();
        expect(game.roomname).toBe(roomname);
        expect(game.players).toHaveLength(1);
    });
});

describe('Suite 2: Player joins the room', () => {
    it('should let a player join and notify the admin', async () => {
        const { socket: adminSocket } = await setupUser('admin');
        const { socket: playerSocket } = await setupUser('player');
        const roomname = uniqueRoomName();

        // Admin creates room (waits for all broadcasts to settle)
        const gameId = await adminCreatesRoom(adminSocket, roomname);

        // Player joins room (waits for admin to receive join broadcasts)
        const joinedGameId = await playerJoinsRoom(playerSocket, adminSocket, roomname);
        expect(joinedGameId).toBe(gameId);

        // Assert: Game document now has 2 players
        const Game = mongoose.model('game');
        const game = await Game.findById(gameId);
        expect(game.players).toHaveLength(2);
    });
});

describe('Suite 3: Players toggle ready status', () => {
    it('should toggle ready status and broadcast to room', async () => {
        const { socket: adminSocket } = await setupUser('admin');
        const { socket: playerSocket } = await setupUser('player');
        const roomname = uniqueRoomName();

        const gameId = await adminCreatesRoom(adminSocket, roomname);
        await playerJoinsRoom(playerSocket, adminSocket, roomname);

        // Set up listener before toggling
        const fetchPromise = waitForEvent(adminSocket, 'fetch-users-in-room');

        // Player toggles ready (pass a no-op callback to satisfy handler signature)
        playerSocket.emit('user-toggle-ready', () => {});

        // Wait for broadcast
        await fetchPromise;

        // Small delay for DB write to complete
        await new Promise((r) => setTimeout(r, 100));

        // Assert: player's ready status is true in DB
        const Game = mongoose.model('game');
        let game = await Game.findById(gameId);
        const playerEntry = game.players.find(
            (p) => p.playerId.toString() !== game.admin.toString()
        );
        expect(playerEntry.ready).toBe(true);

        // Toggle back
        const fetchPromise2 = waitForEvent(adminSocket, 'fetch-users-in-room');
        playerSocket.emit('user-toggle-ready', () => {});
        await fetchPromise2;

        await new Promise((r) => setTimeout(r, 100));

        // Assert: player's ready status is back to false
        game = await Game.findById(gameId);
        const playerEntry2 = game.players.find(
            (p) => p.playerId.toString() !== game.admin.toString()
        );
        expect(playerEntry2.ready).toBe(false);
    });
});

describe('Suite 4: Player leaves the room', () => {
    it('should remove the player and notify admin', async () => {
        const { socket: adminSocket } = await setupUser('admin');
        const { socket: playerSocket, user: playerUser } = await setupUser('player');
        const roomname = uniqueRoomName();

        const gameId = await adminCreatesRoom(adminSocket, roomname);
        await playerJoinsRoom(playerSocket, adminSocket, roomname);

        // Set up listeners for leave-specific events
        const adminMsgPromise = waitForMessage(adminSocket, (msg) => msg.includes('has left'));
        const adminFetchPromise = waitForEvent(adminSocket, 'fetch-users-in-room');

        // Player leaves: server emits redirect-to-home-page with ack callback
        const playerRedirectPromise = new Promise((resolve) => {
            playerSocket.on('redirect-to-home-page', (ackCallback) => {
                if (typeof ackCallback === 'function') {
                    ackCallback({ status: 200 });
                }
                resolve();
            });
        });

        playerSocket.emit('user-leave-room', () => {});

        // Assert: player receives redirect-to-home-page
        await playerRedirectPromise;

        // Assert: admin receives "has left" message
        const adminMsg = await adminMsgPromise;
        expect(adminMsg).toContain('has left');

        // Assert: admin receives fetch-users-in-room
        await adminFetchPromise;

        // Assert: Game has 1 player (admin only)
        const Game = mongoose.model('game');
        const game = await Game.findById(gameId);
        expect(game.players).toHaveLength(1);

        // Assert: Player's user document has gameroom null
        const User = mongoose.model('user');
        const user = await User.findOne({ email: playerUser.email });
        expect(user.gameroom).toBeNull();
    });
});

describe('Suite 5: Admin leaves — all players get kicked', () => {
    it('should delete room and redirect all players to home', async () => {
        const { socket: adminSocket, user: adminUser } = await setupUser('admin');
        const { socket: player1Socket, user: player1User } = await setupUser('player1');
        const { socket: player2Socket, user: player2User } = await setupUser('player2');
        const roomname = uniqueRoomName();

        const gameId = await adminCreatesRoom(adminSocket, roomname, 'secret123', 4);
        await playerJoinsRoom(player1Socket, adminSocket, roomname);
        await playerJoinsRoom(player2Socket, adminSocket, roomname);

        // Set up listeners on players for redirect
        const player1RedirectPromise = waitForEvent(player1Socket, 'redirect-to-home-page');
        const player2RedirectPromise = waitForEvent(player2Socket, 'redirect-to-home-page');

        // Admin leaves
        adminSocket.emit('user-leave-room', () => {});

        // Assert: both players receive redirect-to-home-page
        await player1RedirectPromise;
        await player2RedirectPromise;

        // Small delay for DB operations to complete
        await new Promise((r) => setTimeout(r, 200));

        // Assert: Game document is deleted
        const Game = mongoose.model('game');
        const game = await Game.findById(gameId);
        expect(game).toBeNull();

        // Assert: All user documents have gameroom null
        const User = mongoose.model('user');
        const admin = await User.findOne({ email: adminUser.email });
        const p1 = await User.findOne({ email: player1User.email });
        const p2 = await User.findOne({ email: player2User.email });
        expect(admin.gameroom).toBeNull();
        expect(p1.gameroom).toBeNull();
        expect(p2.gameroom).toBeNull();
    });
});

describe('Suite 6: Player disconnect cleans up', () => {
    it('should remove disconnected player and notify admin', async () => {
        const { socket: adminSocket } = await setupUser('admin');
        const { socket: playerSocket } = await setupUser('player');
        const roomname = uniqueRoomName();

        const gameId = await adminCreatesRoom(adminSocket, roomname);
        await playerJoinsRoom(playerSocket, adminSocket, roomname);

        // Set up listeners on admin for disconnect-specific events
        const adminMsgPromise = waitForMessage(adminSocket, (msg) => msg.includes('disconnected'));
        const adminFetchPromise = waitForEvent(adminSocket, 'fetch-users-in-room');

        // Player disconnects (simulating browser close)
        playerSocket.disconnect();

        // Assert: admin receives "disconnected" message
        const adminMsg = await adminMsgPromise;
        expect(adminMsg).toContain('disconnected');

        // Assert: admin receives fetch-users-in-room
        await adminFetchPromise;

        // Small delay for DB ops
        await new Promise((r) => setTimeout(r, 200));

        // Assert: Game has 1 player (admin only)
        const Game = mongoose.model('game');
        const game = await Game.findById(gameId);
        expect(game.players).toHaveLength(1);
    });
});

describe('Suite 7: Admin disconnect kicks everyone', () => {
    it('should delete room and redirect players when admin disconnects', async () => {
        const { socket: adminSocket, user: adminUser } = await setupUser('admin');
        const { socket: playerSocket, user: playerUser } = await setupUser('player');
        const roomname = uniqueRoomName();

        const gameId = await adminCreatesRoom(adminSocket, roomname);
        await playerJoinsRoom(playerSocket, adminSocket, roomname);

        // Set up listeners on player for disconnect-specific events
        const playerMsgPromise = waitForMessage(playerSocket, (msg) => msg.includes('disconnected'));
        const playerRedirectPromise = waitForEvent(playerSocket, 'redirect-to-home-page');

        // Admin disconnects (simulating browser close)
        adminSocket.disconnect();

        // Assert: player receives "disconnected" message
        const playerMsg = await playerMsgPromise;
        expect(playerMsg).toContain('disconnected');

        // Assert: player receives redirect-to-home-page
        await playerRedirectPromise;

        // Small delay for DB ops
        await new Promise((r) => setTimeout(r, 200));

        // Assert: Game document is deleted
        const Game = mongoose.model('game');
        const game = await Game.findById(gameId);
        expect(game).toBeNull();

        // Assert: Player user document has gameroom null
        const User = mongoose.model('user');
        const user = await User.findOne({ email: playerUser.email });
        expect(user.gameroom).toBeNull();
    });
});

describe('Suite 8: Join with wrong password is rejected', () => {
    it('should reject join attempt with wrong password', async () => {
        const { socket: adminSocket } = await setupUser('admin');
        const { socket: playerSocket } = await setupUser('player');
        const roomname = uniqueRoomName();

        const gameId = await adminCreatesRoom(adminSocket, roomname);

        // Player tries to join with wrong password
        const result = await new Promise((resolve) => {
            playerSocket.emit('user-join-room', {
                roomname,
                roompass: 'wrongpassword',
            }, (callbackResult) => {
                resolve(callbackResult);
            });
        });

        expect(result).toBe('Invalid Credentials');

        // Assert: Game still has 1 player
        const Game = mongoose.model('game');
        const game = await Game.findById(gameId);
        expect(game.players).toHaveLength(1);
    });
});

describe('Suite 9: Join full room is rejected', () => {
    it('should reject join when room is at capacity', async () => {
        const { socket: adminSocket } = await setupUser('admin');
        const { socket: player1Socket } = await setupUser('player1');
        const { socket: player2Socket } = await setupUser('player2');
        const roomname = uniqueRoomName();

        // Create room with max 2 players
        const gameId = await adminCreatesRoom(adminSocket, roomname, 'secret123', 2);

        // Player 1 joins (fills the room: admin + player1 = 2)
        await playerJoinsRoom(player1Socket, adminSocket, roomname);

        // Player 2 tries to join full room
        const result = await new Promise((resolve) => {
            player2Socket.emit('user-join-room', {
                roomname,
                roompass: 'secret123',
            }, (callbackResult) => {
                resolve(callbackResult);
            });
        });

        expect(result).toBe('Room is full');

        // Assert: Game still has 2 players
        const Game = mongoose.model('game');
        const game = await Game.findById(gameId);
        expect(game.players).toHaveLength(2);
    });
});
