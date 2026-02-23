import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WsUserCreateRoom } from "../../api/wsEmitters";
import { socket } from "../../socket";

const GAME_VARIANTS = [
    { key: "4P1D", players: 4, decks: 1, cards: 52, cardsPerPlayer: 13, rounds: 13, label: "4 Players - 1 Deck", hasThreshold: false, maxPoints: 250 },
    { key: "5P1D", players: 5, decks: 1, cards: 50, cardsPerPlayer: 10, rounds: 10, label: "5 Players - 1 Deck", hasThreshold: true, maxPoints: 250, defaultThreshold: 200, bidStart: 150, thresholdStep: 5, defaultTeams: "2 vs 3", advantageTeams: "3 vs 2" },
    { key: "6P1D", players: 6, decks: 1, cards: 48, cardsPerPlayer: 8, rounds: 8, label: "6 Players - 1 Deck", hasThreshold: false, maxPoints: 250 },
    { key: "6P2D", players: 6, decks: 2, cards: 102, cardsPerPlayer: 17, rounds: 17, label: "6 Players - 2 Decks", hasThreshold: false, maxPoints: 500 },
    { key: "7P2D", players: 7, decks: 2, cards: 98, cardsPerPlayer: 14, rounds: 14, label: "7 Players - 2 Decks", hasThreshold: true, maxPoints: 500, defaultThreshold: 400, bidStart: 300, thresholdStep: 5, defaultTeams: "3 vs 4", advantageTeams: "4 vs 3" },
    { key: "8P2D", players: 8, decks: 2, cards: 104, cardsPerPlayer: 13, rounds: 13, label: "8 Players - 2 Decks", hasThreshold: false, maxPoints: 500 },
    { key: "9P2D", players: 9, decks: 2, cards: 99, cardsPerPlayer: 11, rounds: 11, label: "9 Players - 2 Decks", hasThreshold: true, maxPoints: 500, defaultThreshold: 400, bidStart: 300, thresholdStep: 5, defaultTeams: "4 vs 5", advantageTeams: "5 vs 4" },
    { key: "10P2D", players: 10, decks: 2, cards: 100, cardsPerPlayer: 10, rounds: 10, label: "10 Players - 2 Decks", hasThreshold: false, maxPoints: 500 },
];

const CreateGamePage = () => {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [pass, setPass] = useState("");
    const [errors, setErrors] = useState([]);
    const [selectedVariant, setSelectedVariant] = useState("4P1D");
    const [bidThreshold, setBidThreshold] = useState(null);

    const variant = GAME_VARIANTS.find((v) => v.key === selectedVariant) || GAME_VARIANTS[0];

    // When variant changes, reset threshold to that variant's default
    const handleVariantSelect = (key) => {
        setSelectedVariant(key);
        const v = GAME_VARIANTS.find((vt) => vt.key === key);
        if (v?.hasThreshold) {
            setBidThreshold(v.defaultThreshold);
        } else {
            setBidThreshold(null);
        }
    };

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

    const handleCreateRoom = async () => {
        let data = {
            roomname: name,
            roompass: pass,
            player_count: variant.players,
            deck_count: variant.decks,
        };
        if (variant.hasThreshold && bidThreshold) {
            data.bid_threshold = bidThreshold;
        }
        try {
            WsUserCreateRoom(data);
        } catch (error) {
            console.log(error);
            setErrors(error.errors);
        }
    };

    const adjustThreshold = (delta) => {
        if (!variant.hasThreshold) return;
        const step = variant.thresholdStep || 5;
        const min = variant.bidStart + step;
        const max = variant.maxPoints;
        setBidThreshold((prev) => {
            const next = (prev || variant.defaultThreshold) + delta;
            return Math.max(min, Math.min(max, next));
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
                        <label>Game Variant</label>
                        <div className="variant-grid">
                            {GAME_VARIANTS.map((v) => (
                                <button
                                    key={v.key}
                                    className={`variant-btn ${selectedVariant === v.key ? "active" : ""}`}
                                    onClick={() => handleVariantSelect(v.key)}
                                >
                                    <div className="variant-label">{v.label}</div>
                                    <div className="variant-meta">
                                        {v.cards} cards &middot; {v.cardsPerPlayer}/player &middot; {v.rounds} rounds
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {variant.hasThreshold && (
                        <div className="form-group">
                            <label>Bid Threshold for Extra Teammate</label>
                            <div className="threshold-info">
                                Below threshold: teams are {variant.defaultTeams} &mdash;
                                At or above: teams flip to {variant.advantageTeams}
                            </div>
                            <div className="threshold-widget">
                                <button
                                    className="bid-adjust"
                                    onClick={() => adjustThreshold(-(variant.thresholdStep || 5))}
                                    disabled={(bidThreshold || variant.defaultThreshold) <= variant.bidStart + (variant.thresholdStep || 5)}
                                >
                                    &minus;
                                </button>
                                <span className="threshold-value">
                                    {bidThreshold || variant.defaultThreshold}
                                </span>
                                <button
                                    className="bid-adjust"
                                    onClick={() => adjustThreshold(variant.thresholdStep || 5)}
                                    disabled={(bidThreshold || variant.defaultThreshold) >= variant.maxPoints}
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    )}

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
                            onClick={handleCreateRoom}
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
