import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WsUserCreateRoom } from "../../api/wsEmitters";
import { socket } from "../../socket";

const CreateGamePage = () => {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [pass, setPass] = useState("");
    const [errors, setErrors] = useState([]);
    const [playerCount, setPlayerCount] = useState(4);

    useEffect(() => {
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

    const handleCreateRoom = async (roomname, roompass, player_count) => {
        let data = { roomname, roompass, player_count };
        try {
            WsUserCreateRoom(data);
        } catch (error) {
            console.log(error);
            setErrors(error.errors);
        }
    };

    return (
        <div className="create-page">
            <div className="create-card">
                <div className="create-header">
                    <span className="create-icon">🂡</span>
                    <h2>Create Room</h2>
                    <p>Set up a new game and invite your friends</p>
                </div>

                <div className="create-form">
                    <div className="form-group">
                        <label>Room Name</label>
                        <input
                            type="text"
                            className="form-input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Give your room a name"
                        />
                    </div>

                    <div className="form-group">
                        <label>Room Password</label>
                        <input
                            type="password"
                            className="form-input"
                            value={pass}
                            onChange={(e) => setPass(e.target.value)}
                            placeholder="Set a room password"
                        />
                    </div>

                    <div className="form-group">
                        <label>Number of Players</label>
                        <div className="player-count-widget">
                            <div className="count-number">{playerCount}</div>
                            <div className="count-label">Players</div>
                            <input
                                type="range"
                                className="range-slider"
                                value={playerCount}
                                min={2}
                                max={10}
                                step={1}
                                onChange={(e) => setPlayerCount(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    {errors.length !== 0 && (
                        <div className="form-errors">
                            {errors.map((err) => (
                                <p key={err.path} className="form-error">{err.msg}</p>
                            ))}
                        </div>
                    )}

                    <div className="create-actions">
                        <button
                            className="btn-secondary"
                            onClick={() => navigate("/")}
                        >
                            Back
                        </button>
                        <button
                            className="btn-primary"
                            onClick={() => handleCreateRoom(name, pass, playerCount)}
                        >
                            Create Room
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateGamePage;
