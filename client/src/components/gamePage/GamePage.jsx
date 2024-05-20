import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { get_all_user_in_room, room_leave } from "../../api/apiHandler";
import { useAuth } from "../hooks/useAuth";
import { handleUserJoin } from "../../api/wsListners";
import { socket } from "../../socket";

const GamePage = () => {
    const { user } = useAuth();
    let params = useParams();
    const [roomData, setRoomData] = useState(null);

    const navigate = useNavigate();

    const handleLeave = async () => {
        const { status } = await room_leave();
        if (status === 200) {
            navigate("/");
        } else {
            alert("Something went wrong while removing player");
        }
    };
    const getRoomDetails = async () => {
        try {
            const res = await get_all_user_in_room(params.id);
            console.log(res);
            return res;
        } catch (err) {
            console.log(err);
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

        socket.on("room-message", onRoomMessage);
        socket.on("fetch-users-in-room", onFetchUsersInRoom);

        return () => {
            socket.off("room-message", onRoomMessage);
            socket.off("fetch-users-in-room", onFetchUsersInRoom);
        };
    }, [roomData]);

    return (
        <div>
            <p>GamePage-{params.id}</p>
            {roomData === null || roomData.players.length === 0 ? (
                <div>No Active Game Rooms</div>
            ) : (
                <table className="table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {roomData?.players?.map((player) => {
                            return (
                                <tr key={player["_id"]}>
                                    <td>{player.name}</td>
                                    <td>Not Ready</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
            <button onClick={() => navigate("/")}>Home</button>
            <button onClick={() => handleLeave()}>Leave</button>
        </div>
    );
};

export default GamePage;
