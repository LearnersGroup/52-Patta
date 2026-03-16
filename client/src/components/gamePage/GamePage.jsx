import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { get_all_user_in_room } from "../../api/apiHandler";
import { useAuth } from "../hooks/useAuth";
import { socket } from "../../socket";
import { registerGameListeners } from "../../api/wsGameListeners";
import { WsRequestGameState } from "../../api/wsEmitters";
import { setPlayerAvatars } from "../../redux/slices/game";
import LobbyView from "./LobbyView";
import GameBoard from "./GameBoard";

const AVATAR_CACHE_PREFIX = "avatars:";

/** Decode the user ID from the JWT stored in localStorage */
function getUserIdFromToken(user) {
    if (!user?.token) return null;
    try {
        const payload = JSON.parse(atob(user.token.split(".")[1]));
        return payload?.user?.id || null;
    } catch {
        return null;
    }
}

const GamePage = () => {
    const { user } = useAuth();
    let params = useParams();
    const userId = useMemo(() => getUserIdFromToken(user), [user]);
    const [roomData, setRoomData] = useState(null);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const gamePhase = useSelector((state) => state.game.phase);

    const getRoomDetails = async () => {
        try {
            return await get_all_user_in_room(params.id);
        } catch {
            // handled by caller
        }
    };

    useEffect(() => {
        const onRoomMessage = () => {};
        const onFetchUsersInRoom = async () => {
            const res = await getRoomDetails();
            setRoomData(res);
        };
        const goToHomePage = (callback) => {
            navigate(`/`);
            if (typeof callback === "function") {
                let res = {};
                res.status = 200;
                callback(res);
            }
        };
        const onPhaseChange = () => {
            // Phase changes are handled by game-state-update via Redux
        };
        const onGameAvatars = (avatars) => {
            const nextAvatars = avatars && typeof avatars === "object" ? avatars : {};
            dispatch(setPlayerAvatars(nextAvatars));

            try {
                const currentGameId = params.id;
                if (!currentGameId) return;

                const currentCacheKey = `${AVATAR_CACHE_PREFIX}${currentGameId}`;
                window.localStorage.setItem(currentCacheKey, JSON.stringify(nextAvatars));

                // Keep only the current game's avatar cache.
                for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
                    const key = window.localStorage.key(i);
                    if (
                        key &&
                        key.startsWith(AVATAR_CACHE_PREFIX) &&
                        key !== currentCacheKey
                    ) {
                        window.localStorage.removeItem(key);
                    }
                }
            } catch {
                // Best effort cache only.
            }
        };

        socket.on("room-message", onRoomMessage);
        socket.on("fetch-users-in-room", onFetchUsersInRoom);
        socket.on("redirect-to-home-page", goToHomePage);
        socket.on("game-phase-change", onPhaseChange);
        socket.on("game-avatars", onGameAvatars);

        // Register game listeners early so we receive game-state-update
        const cleanupGameListeners = registerGameListeners();

        // Safety net: if the socket (re)connects while GamePage is mounted,
        // request the game state explicitly. This covers the race condition where
        // onConnect.js pushes game-state-update before our listener is registered,
        // and also handles reconnect events during gameplay.
        let stateRequested = false;
        const requestStateOnce = () => {
            if (!stateRequested) {
                stateRequested = true;
                WsRequestGameState();
            }
        };
        const onSocketConnect = () => {
            stateRequested = false; // reset on reconnect
            requestStateOnce();
        };
        socket.on("connect", onSocketConnect);

        // Initial fetch
        onFetchUsersInRoom();

        // If the socket is already connected, request game state now
        // (onConnect.js already fired before this effect ran)
        if (socket.connected) {
            requestStateOnce();
        }

        return () => {
            socket.off("room-message", onRoomMessage);
            socket.off("fetch-users-in-room", onFetchUsersInRoom);
            socket.off("redirect-to-home-page", goToHomePage);
            socket.off("game-phase-change", onPhaseChange);
            socket.off("game-avatars", onGameAvatars);
            socket.off("connect", onSocketConnect);
            cleanupGameListeners();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const isAdmin =
        roomData?.admin?._id === userId ||
        roomData?.admin === userId;

    // If a game phase is active, show the game board
    const isGameActive = gamePhase !== null;

    return (
        <div className="game-page">
            {isGameActive ? (
                <GameBoard userId={userId} isAdmin={isAdmin} />
            ) : (
                <LobbyView
                    roomId={params.id}
                    roomData={roomData}
                    isAdmin={isAdmin}
                    userId={userId}
                />
            )}
        </div>
    );
};

export default GamePage;
