import React, { useEffect, useState } from "react";
import { useQuery } from "react-query";
import { get_all_rooms } from "../../../api/apiHandler";
import { useNavigate } from "react-router-dom";
import { socket } from "../../../socket";
import { useDispatch } from "react-redux";
import { notify } from "../../../redux/slices/alert";

const AllGameRooms = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [pass, setPass] = useState("");
    const [shakingRoomId, setShakingRoomId] = useState(null);
    const { data, status } = useQuery("all-game-rooms", get_all_rooms);

    const handleCreateGameRoom = () => {
        navigate("/game-room/new");
    };

    useEffect(() => {
        if (!socket) return;

        const goToGamePage = (room_id, callback) => {
            navigate(`/game-room/${room_id}`);
            let res = {};
            res.status = 200;
            callback(res);
        };

        socket.on("redirect-to-game-room", goToGamePage);

        return () => {
            socket.off("redirect-to-game-room", goToGamePage);
        };
    }, []);

    const triggerShake = (roomId) => {
        setShakingRoomId(roomId);
        setTimeout(() => setShakingRoomId(null), 500);
    };

    const handleJoinRoom = (roomname, roompass, id) => {
        socket.emit("user-join-room", { roomname, roompass, id }, (err) => {
            if (err === "Invalid Credentials") {
                triggerShake(id);
                notify("Incorrect password", "error")(dispatch);
            } else if (err) {
                notify(err, "error")(dispatch);
            }
        });
    };

    return (
        <div className="rooms-section">
            <div className="section-header">
                <h2>♠ Active Rooms</h2>
                <button className="btn-primary" onClick={handleCreateGameRoom}>
                    + Create Room
                </button>
            </div>

            {status === "error" && (
                <p className="rooms-status">Error fetching rooms. Please try again.</p>
            )}
            {status === "loading" && (
                <p className="rooms-status">Loading rooms...</p>
            )}
            {status === "success" &&
                (data.length === 0 ? (
                    <p className="rooms-status">
                        No active rooms yet. Be the first to create one!
                    </p>
                ) : (
                    <table className="rooms-table">
                        <thead>
                            <tr>
                                <th>Room Name</th>
                                <th>Admin</th>
                                <th>Players</th>
                                <th>Join</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((room) => {
                                const isFull = room.players.length >= room.player_count;
                                return (
                                    <tr key={room["_id"]}>
                                        <td>
                                            <span className="room-name-cell">
                                                {room.roomname}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="room-admin-cell">
                                                {room.admin.name}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="player-count-badge">
                                                {room.players.length} / {room.player_count}
                                            </span>
                                        </td>
                                        <td>
                                            {isFull ? (
                                                <span className="room-full-badge">Full</span>
                                            ) : (
                                                <div className="join-cell">
                                                    <input
                                                        type="password"
                                                        className={`join-input${shakingRoomId === room["_id"] ? " shake" : ""}`}
                                                        value={pass}
                                                        onChange={(e) => setPass(e.target.value)}
                                                        placeholder="Password"
                                                    />
                                                    <button
                                                        className="btn-primary"
                                                        onClick={() =>
                                                            handleJoinRoom(
                                                                room.roomname,
                                                                pass,
                                                                room["_id"]
                                                            )
                                                        }
                                                    >
                                                        Join
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ))}
        </div>
    );
};

export default AllGameRooms;
