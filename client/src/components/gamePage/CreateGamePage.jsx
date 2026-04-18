import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../../socket";
import { useAuth } from "../hooks/useAuth";
import RoomConfigForm from "./RoomConfigForm";

const CreateGamePage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const roomName = `${user?.user_name || "Player"}'s Room`;

    const [errors, setErrors] = useState([]);
    const [creating, setCreating] = useState(false);
    const [gameType, setGameType] = useState("kaliteri");
    const [playerCount, setPlayerCount] = useState(4);
    const [deckCount, setDeckCount] = useState(1);
    const [bidThreshold, setBidThreshold] = useState(null);
    const [gameCount, setGameCount] = useState(4);
    const [bidWindow, setBidWindow] = useState(15);
    const [inspectTime, setInspectTime] = useState(15);
    const [maxCardsPerRound, setMaxCardsPerRound] = useState(7);
    const [reverseOrder, setReverseOrder] = useState(true);
    const [trumpMode, setTrumpMode] = useState("fixed");
    const [mendikotTrumpMode, setMendikotTrumpMode] = useState("band");
    const [bidTimeEnabled, setBidTimeEnabled] = useState(false);
    const [bidTime, setBidTime] = useState(15);
    const [cardRevealTime, setCardRevealTime] = useState(10);
    const [roundsCount, setRoundsCount] = useState(5);
    const [bandHukumPickPhase, setBandHukumPickPhase] = useState(true);

    useEffect(() => {
        const goToGamePage = (room_id, callback) => {
            navigate(`/game-room/${room_id}`);
            callback({ status: 200 });
        };
        socket.on("redirect-to-game-room", goToGamePage);
        return () => socket.off("redirect-to-game-room", goToGamePage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleCreateRoom = () => {
        const data = {
            roomname: roomName,
            player_count: playerCount,
            game_type: gameType,
            deck_count: deckCount,
        };

        if (gameType === "kaliteri") {
            data.game_count = gameCount;
            data.bid_window = bidWindow;
            data.inspect_time = inspectTime;
            if (playerCount % 2 === 1 && bidThreshold) {
                data.bid_threshold = bidThreshold;
            }
        } else if (gameType === "judgement") {
            data.max_cards_per_round = maxCardsPerRound;
            data.reverse_order = reverseOrder;
            data.trump_mode = trumpMode;
            if (bidTimeEnabled) data.judgement_bid_time = bidTime;
            data.card_reveal_time = cardRevealTime;
        } else if (gameType === "mendikot") {
            data.trump_mode = mendikotTrumpMode;
            data.rounds_count = roundsCount;
            data.band_hukum_pick_phase = bandHukumPickPhase;
        }

        setErrors([]);
        setCreating(true);
        socket.emit("user-create-room", data, (err) => {
            setCreating(false);
            if (err) setErrors([{ msg: String(err) }]);
        });
    };

    return (
        <div className="create-page">
            <div className="create-card">
                <div className="create-header">
                    <span className="create-icon">&spades;</span>
                    <h2>Create Room</h2>
                    <p>Set up a new game and invite your friends</p>
                </div>

                <RoomConfigForm
                    gameType={gameType}
                    setGameType={setGameType}
                    playerCount={playerCount}
                    setPlayerCount={setPlayerCount}
                    deckCount={deckCount}
                    setDeckCount={setDeckCount}
                    bidThreshold={bidThreshold}
                    setBidThreshold={setBidThreshold}
                    gameCount={gameCount}
                    setGameCount={setGameCount}
                    bidWindow={bidWindow}
                    setBidWindow={setBidWindow}
                    inspectTime={inspectTime}
                    setInspectTime={setInspectTime}
                    maxCardsPerRound={maxCardsPerRound}
                    setMaxCardsPerRound={setMaxCardsPerRound}
                    reverseOrder={reverseOrder}
                    setReverseOrder={setReverseOrder}
                    trumpMode={trumpMode}
                    setTrumpMode={setTrumpMode}
                    mendikotTrumpMode={mendikotTrumpMode}
                    setMendikotTrumpMode={setMendikotTrumpMode}
                    bidTimeEnabled={bidTimeEnabled}
                    setBidTimeEnabled={setBidTimeEnabled}
                    bidTime={bidTime}
                    setBidTime={setBidTime}
                    cardRevealTime={cardRevealTime}
                    setCardRevealTime={setCardRevealTime}
                    roundsCount={roundsCount}
                    setRoundsCount={setRoundsCount}
                    bandHukumPickPhase={bandHukumPickPhase}
                    setBandHukumPickPhase={setBandHukumPickPhase}
                    minPlayerCount={0}
                    showRoomName={true}
                    roomName={roomName}
                />

                <div className="create-form">
                    {errors.length !== 0 && (
                        <div className="form-errors">
                            {errors.map((err, i) => (
                                <p key={err.path || i} className="form-error">{err.msg || err}</p>
                            ))}
                        </div>
                    )}

                    <div className="create-actions">
                        <button className="btn-secondary" onClick={() => navigate("/")}>
                            Back
                        </button>
                        <button className="btn-primary" onClick={handleCreateRoom} disabled={creating}>
                            {creating ? "Creating…" : "Create Room"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateGamePage;
