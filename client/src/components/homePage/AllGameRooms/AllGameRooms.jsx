import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../../../socket";
import { useDispatch } from "react-redux";
import { notify } from "../../../redux/slices/alert";

const AllGameRooms = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [code, setCode] = useState("");
    const [joining, setJoining] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleJoinRoom = () => {
        const trimmed = code.trim().toUpperCase();
        if (!trimmed) {
            notify("Enter a room code", "error")(dispatch);
            return;
        }
        setJoining(true);
        socket.emit("user-join-room", { code: trimmed }, (err) => {
            setJoining(false);
            if (err) {
                notify(err, "error")(dispatch);
            }
        });
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") handleJoinRoom();
    };

    return (
        <div className="rooms-section">
            <div className="section-header">
                <h2>♠ Join a Game</h2>
                <button className="btn-primary" onClick={handleCreateGameRoom}>
                    + Create Room
                </button>
            </div>

            <div className="join-code-section">
                <p className="join-code-hint">Enter the room code shared by your host</p>
                <div className="join-code-row">
                    <input
                        className="join-code-input"
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        onKeyDown={handleKeyDown}
                        placeholder="ABC123"
                        maxLength={6}
                        autoComplete="off"
                        spellCheck={false}
                    />
                    <button
                        className="btn-primary"
                        onClick={handleJoinRoom}
                        disabled={joining}
                    >
                        {joining ? "Joining..." : "Join"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AllGameRooms;
