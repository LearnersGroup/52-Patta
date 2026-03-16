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
 * Admin creates a room. Returns { gameId, code } once everything is settled.
 */
async function adminCreatesRoom(adminSocket, roomname, playerCount = 4) {
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
            player_count: playerCount,
        }, (error) => {
            if (error) reject(new Error(error));
        });
    });

    await msgPromise;
    await fetchPromise;

    // Fetch the code from DB
    const Game = mongoose.model('game');
    const game = await Game.findById(gameId);
    return { gameId, code: game.code };
}

/**
 * Player joins a room by code. Returns the game ID once everything is settled.
 */
async function playerJoinsRoom(playerSocket, adminSocket, code) {
    const adminMsgPromise = waitForMessage(adminSocket, (msg) => msg.includes('has joined'));
    const adminFetchPromise = waitForEvent(adminSocket, 'fetch-users-in-room');

    const gameId = await new Promise((resolve, reject) => {
        playerSocket.on('redirect-to-game-room', (gameId, ackCallback) => {
            ackCallback({ status: 200 });
            playerSocket.off('redirect-to-game-room');
            resolve(gameId);
        });

        playerSocket.emit('user-join-room', { code }, (error) => {
            if (error) reject(new Error(error));
        });
    });

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

        const { gameId, code } = await adminCreatesRoom(adminSocket, roomname);

        expect(gameId).toBeTruthy();
        expect(typeof gameId).toBe('string');
        expect(code).toMatch(/^[A-Z0-9]{6}$/);

        const Game = mongoose.model('game');
        const game = await Game.findById(gameId);
        expect(game).toBeTruthy();
        expect(game.roomname).toBe(roomname);
        expect(game.players).toHaveLength(1);
        expect(game.code).toBe(code);
    });
});

describe('Suite 2: Player joins the room', () => {
    it('should let a player join by code and notify the admin', async () => {
        const { socket: adminSocket } = await setupUser('admin');
        const { socket: playerSocket } = await setupUser('player');
        const roomname = uniqueRoomName();

        const { gameId, code } = await adminCreatesRoom(adminSocket, roomname);
        const joinedGameId = await playerJoinsRoom(playerSocket, adminSocket, code);
        expect(joinedGameId).toBe(gameId);

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

        const { gameId, code } = await adminCreatesRoom(adminSocket, roomname);
        await playerJoinsRoom(playerSocket, adminSocket, code);

        const fetchPromise = waitForEvent(adminSocket, 'fetch-users-in-room');
        playerSocket.emit('user-toggle-ready', () => {});
        await fetchPromise;

        await new Promise((r) => setTimeout(r, 100));

        const Game = mongoose.model('game');
        let game = await Game.findById(gameId);
        const playerEntry = game.players.find(
            (p) => p.playerId.toString() !== game.admin.toString()
        );
        expect(playerEntry.ready).toBe(true);

        const fetchPromise2 = waitForEvent(adminSocket, 'fetch-users-in-room');
        playerSocket.emit('user-toggle-ready', () => {});
        await fetchPromise2;

        await new Promise((r) => setTimeout(r, 100));

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

        const { gameId, code } = await adminCreatesRoom(adminSocket, roomname);
        await playerJoinsRoom(playerSocket, adminSocket, code);

        const adminMsgPromise = waitForMessage(adminSocket, (msg) => msg.includes('has left'));
        const adminFetchPromise = waitForEvent(adminSocket, 'fetch-users-in-room');

        const playerRedirectPromise = new Promise((resolve) => {
            playerSocket.on('redirect-to-home-page', (ackCallback) => {
                if (typeof ackCallback === 'function') {
                    ackCallback({ status: 200 });
                }
                resolve();
            });
        });

        playerSocket.emit('user-leave-room', () => {});

        await playerRedirectPromise;

        const adminMsg = await adminMsgPromise;
        expect(adminMsg).toContain('has left');

        await adminFetchPromise;

        const Game = mongoose.model('game');
        const game = await Game.findById(gameId);
        expect(game.players).toHaveLength(1);

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

        const { code } = await adminCreatesRoom(adminSocket, roomname, 4);
        await playerJoinsRoom(player1Socket, adminSocket, code);
        await playerJoinsRoom(player2Socket, adminSocket, code);

        const player1RedirectPromise = waitForEvent(player1Socket, 'redirect-to-home-page');
        const player2RedirectPromise = waitForEvent(player2Socket, 'redirect-to-home-page');

        adminSocket.emit('user-leave-room', () => {});

        await player1RedirectPromise;
        await player2RedirectPromise;

        await new Promise((r) => setTimeout(r, 200));

        const Game = mongoose.model('game');
        const game = await Game.findById((await adminCreatesRoom(adminSocket, uniqueRoomName())).gameId);
        // The original room should be deleted; fetch by roomname
        const deletedRoom = await Game.findOne({ roomname });
        expect(deletedRoom).toBeNull();

        const User = mongoose.model('user');
        const p1 = await User.findOne({ email: player1User.email });
        const p2 = await User.findOne({ email: player2User.email });
        expect(p1.gameroom).toBeNull();
        expect(p2.gameroom).toBeNull();
    });
});

describe('Suite 6: Player disconnect cleans up', () => {
    it('should remove disconnected player and notify admin', async () => {
        const { socket: adminSocket } = await setupUser('admin');
        const { socket: playerSocket } = await setupUser('player');
        const roomname = uniqueRoomName();

        const { gameId, code } = await adminCreatesRoom(adminSocket, roomname);
        await playerJoinsRoom(playerSocket, adminSocket, code);

        const adminMsgPromise = waitForMessage(adminSocket, (msg) => msg.includes('disconnected'));
        const adminFetchPromise = waitForEvent(adminSocket, 'fetch-users-in-room');

        playerSocket.disconnect();

        const adminMsg = await adminMsgPromise;
        expect(adminMsg).toContain('disconnected');

        await adminFetchPromise;

        await new Promise((r) => setTimeout(r, 200));

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

        const { gameId, code } = await adminCreatesRoom(adminSocket, roomname);
        await playerJoinsRoom(playerSocket, adminSocket, code);

        const playerMsgPromise = waitForMessage(playerSocket, (msg) => msg.includes('disconnected'));
        const playerRedirectPromise = waitForEvent(playerSocket, 'redirect-to-home-page');

        adminSocket.disconnect();

        const playerMsg = await playerMsgPromise;
        expect(playerMsg).toContain('disconnected');

        await playerRedirectPromise;

        await new Promise((r) => setTimeout(r, 200));

        const Game = mongoose.model('game');
        const game = await Game.findById(gameId);
        expect(game).toBeNull();

        const User = mongoose.model('user');
        const user = await User.findOne({ email: playerUser.email });
        expect(user.gameroom).toBeNull();
    });
});

describe('Suite 8: Join with wrong code is rejected', () => {
    it('should reject join attempt with invalid code', async () => {
        const { socket: playerSocket } = await setupUser('player');

        const result = await new Promise((resolve) => {
            playerSocket.emit('user-join-room', {
                code: 'XXXXXX',
            }, (callbackResult) => {
                resolve(callbackResult);
            });
        });

        expect(result).toBe('Room does not exists');
    });
});

describe('Suite 9: Join full room is rejected', () => {
    it('should reject join when room is at capacity', async () => {
        const { socket: adminSocket } = await setupUser('admin');
        const { socket: player1Socket } = await setupUser('player1');
        const { socket: player2Socket } = await setupUser('player2');
        const { socket: player3Socket } = await setupUser('player3');
        const { socket: player4Socket } = await setupUser('player4');
        const roomname = uniqueRoomName();

        // Create minimum room (4 players)
        const { gameId, code } = await adminCreatesRoom(adminSocket, roomname, 4);

        // Fill remaining 3 spots
        await playerJoinsRoom(player1Socket, adminSocket, code);
        await playerJoinsRoom(player2Socket, adminSocket, code);
        await playerJoinsRoom(player3Socket, adminSocket, code);

        // 5th player tries to join full room
        const result = await new Promise((resolve) => {
            player4Socket.emit('user-join-room', { code }, (callbackResult) => {
                resolve(callbackResult);
            });
        });

        expect(result).toBe('Room is full');

        const Game = mongoose.model('game');
        const game = await Game.findById(gameId);
        expect(game.players).toHaveLength(4);
    });
});
