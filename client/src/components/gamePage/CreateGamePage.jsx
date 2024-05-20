import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { room_register } from "../../api/apiHandler";
import { WsUserCreateRoom } from "../../api/wsEmitters";
import { socket } from "../../socket";

const CreateGamePage = () => {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [pass, setPass] = useState("");
    const [errors, setErrors] = useState([]);
    const [playerCount, setPlayerCount] = useState(4);

    useEffect(()=>{
        const goToGamePage = (room_id, callback)=> {
            navigate(`/game-room/${room_id}`);
            let res = {}
            res.status = 200
            callback(res)
        };

        socket.on("redirect-to-game-room", goToGamePage);

        return () => {
            socket.off("redirect-to-game-room", goToGamePage);
        };
    },[])

    const handleCreateRoom = async (roomname, roompass, player_count) => {
        let data = {
            roomname,
            roompass,
            player_count,
        };
        try {
            WsUserCreateRoom(data);
        } catch (error) {
            console.log(error);
            setErrors(error.errors);
        }
    };

    return (
        <div>
            <p>CreateGamePage</p>
            <button onClick={() => navigate("/")}>Home</button>
            <div>
                <div>
                    <label>name:</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>
                <div>
                    <label>pass:</label>
                    <input
                        type="text"
                        value={pass}
                        onChange={(e) => setPass(e.target.value)}
                    />
                </div>
                <div>
                    <label>player Count:</label>
                    <p>{playerCount}</p>
                    <input
                        type="range"
                        value={playerCount}
                        min={2}
                        max={10}
                        step={1}
                        onChange={(e) => setPlayerCount(e.target.value)}
                    />
                </div>
            </div>
            <button onClick={() => handleCreateRoom(name, pass, playerCount)}>
                Create
            </button>
            {errors.length !== 0 &&
                errors.map((err) => <div key={err.path}>{err.msg}</div>)}
        </div>
    );
};

export default CreateGamePage;
