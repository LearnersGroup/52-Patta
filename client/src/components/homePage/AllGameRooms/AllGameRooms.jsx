import React, { useEffect, useState } from "react";
import { useQuery } from "react-query";
import { get_all_rooms } from "../../../api/apiHandler";
import { useNavigate } from "react-router-dom";
import { socket } from "../../../socket";
import { WsUserJoinRoom } from "../../../api/wsEmitters";

const AllGameRooms = () => {
    const navigate = useNavigate();
    const [pass, setPass] = useState("");
    const [errors, setErrors] = useState([]);
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

    const handleJoinRoom = async (roomname, roompass, id) => {
        let data = { roomname, roompass, id };
        try {
            WsUserJoinRoom(data);
        } catch (error) {
            console.log(error);
            setErrors(error.errors);
        }
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
                            {data.map((room) => (
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
                                        <div className="join-cell">
                                            <input
                                                type="password"
                                                className="join-input"
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
                                        {errors.length !== 0 &&
                                            errors.map((err) => (
                                                <p key={err.path} className="form-error" style={{ marginTop: "6px" }}>
                                                    {err.msg}
                                                </p>
                                            ))}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ))}
        </div>
    );
};

export default AllGameRooms;
