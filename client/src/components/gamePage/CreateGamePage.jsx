import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { room_register } from "../../api/apiHandler";

const CreateGamePage = () => {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [pass, setPass] = useState("");
    const [errors, setErrors] = useState([]);
    const [playerCount, setPlayerCount] = useState(4);

    const handleCreateRoom = async (name, pass, playerCount) => {
        try {
            const response = await room_register(name, pass, playerCount);
            if (response.status === 200) {
                navigate(`/game-room/${response.data.room_id}`);
            }
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
