import React, { useEffect, useState } from "react";
import { useQuery } from "react-query";
import { get_all_rooms, room_join } from "../../../api/apiHandler";
import { useNavigate } from "react-router-dom";
import { socket } from "../../../socket";
import { WsUserJoinRoom } from "../../../api/wsEmitters";

const AllGameRooms = () => {
    const navigate = useNavigate();
    const [pass, setPass] = useState("");
    const [errors, setErrors] = useState([]);
    //game-data
    const { data, status } = useQuery("all-game-rooms", get_all_rooms);

    const handleCreateGameRoom = () => {
        navigate("/game-room/new");
    };

    useEffect(()=>{
        const goToGamePage = (room_id)=> {
            navigate(`/game-room/${room_id}`);
        };

        socket.on("redirect-to-game-room", goToGamePage);

        return () => {
            socket.off("redirect-to-game-room", goToGamePage);
        };
    },[])

    const handleJoinRoom = async (roomname, roompass, id) => {
        let data = {
            roomname,
            roompass,
            id
        }
        try {
            WsUserJoinRoom(data);
        } catch (error) {
            console.log(error);
            setErrors(error.errors);
        }
    };
    // const handleJoinRoom = async (roomname, roompass, id) => {
    //     try {
    //         const response = await room_join(roomname, roompass);
    //         if (response.status === 200) {
    //             console.log("Navigating...");
    //             navigate(`/game-room/${id}`);
    //         }
    //     } catch (error) {
    //         console.log(error);
    //         setErrors(error.errors);
    //     }
    // };

    return (
        <div className="create-and-all-rooms">
            <div className="all-rooms">
                <div className="title-and-create-room">
                    <h3>All Active Rooms</h3>
                    <button onClick={handleCreateGameRoom}>Create Room</button>
                </div>
                {status === "error" && <p>Error fetching data</p>}
                {status === "loading" && <p>Fetching data...</p>}
                {status === "success" &&
                    (data.length === 0 ? (
                        <div>No Active Game Rooms</div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Admin</th>
                                    <th>Players</th>
                                    <th>Join</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((room) => {
                                    return (
                                        <tr key={room["_id"]}>
                                            <td>{room.roomname}</td>
                                            <td>{room.admin.name}</td>
                                            <td>
                                                {room.players.length} /{" "}
                                                {room.player_count}
                                            </td>
                                            <td>
                                                <input
                                                    type="password"
                                                    value={pass}
                                                    onChange={(e) =>
                                                        setPass(e.target.value)
                                                    }
                                                />
                                                <button
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
                                                {errors.length !== 0 &&
                                                    errors.map((err) => (
                                                        <div key={err.path}>
                                                            {err.msg}
                                                        </div>
                                                    ))}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ))}
            </div>
        </div>
    );
};

export default AllGameRooms;
