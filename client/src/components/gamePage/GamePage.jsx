import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { get_all_user_in_room } from "../../api/apiHandler";
import { useAuth } from "../hooks/useAuth";
import { socket } from "../../socket";
import { registerGameListeners } from "../../api/wsGameListeners";
import LobbyView from "./LobbyView";
import GameBoard from "./GameBoard";

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
    const navigate = useNavigate();
    const gamePhase = useSelector((state) => state.game.phase);

    const getRoomDetails = async () => {
        try {
            const res = await get_all_user_in_room(params.id);
            console.log("[GamePage] API response:", JSON.stringify({ admin: res?.admin, playerCount: res?.players?.length }));
            return res;
        } catch (err) {
            console.log("[GamePage] API error:", err);
        }
    };

    useEffect(() => {
        const onRoomMessage = (data) => {
            console.log(data);
        };
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

        socket.on("room-message", onRoomMessage);
        socket.on("fetch-users-in-room", onFetchUsersInRoom);
        socket.on("redirect-to-home-page", goToHomePage);
        socket.on("game-phase-change", onPhaseChange);

        // Register game listeners early so we receive game-state-update
        const cleanupGameListeners = registerGameListeners();

        // Initial fetch
        onFetchUsersInRoom();

        return () => {
            socket.off("room-message", onRoomMessage);
            socket.off("fetch-users-in-room", onFetchUsersInRoom);
            socket.off("redirect-to-home-page", goToHomePage);
            socket.off("game-phase-change", onPhaseChange);
            cleanupGameListeners();
        };
    }, []);

    const isAdmin =
        roomData?.admin?._id === userId ||
        roomData?.admin === userId;

    console.log("[GamePage] isAdmin:", isAdmin, "adminId:", roomData?.admin?._id, "userId:", userId, "roomData:", roomData);

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
                />
            )}
        </div>
    );
};

export default GamePage;
