import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get_series_detail } from "../../api/apiHandler";

const GAME_TYPE_LABEL = {
    kaliteri: "Kaliteri",
    judgement: "Judgement",
    mendikot: "Mendikot",
};

function formatDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function RankRow({ rank, name, score }) {
    const isFirst = rank === 1;
    return (
        <div className={`rank-row${isFirst ? " rank-row--first" : ""}`}>
            <span className="rank-row__num">#{rank}</span>
            <span className="rank-row__name">{name}</span>
            <span className="rank-row__score">{score}</span>
        </div>
    );
}

function GameBreakdownRow({ game }) {
    return (
        <div className="game-breakdown-row">
            <div className="game-breakdown-row__num">Game {game.gameNumber}</div>
            <div className="game-breakdown-row__players">
                {(game.players || []).map((p, i) => {
                    const uid = p.userId?.toString?.() ?? p.userId;
                    const delta = game.playerDeltas?.[uid] ?? null;
                    return (
                        <div key={i} className="game-breakdown-row__player">
                            <span>{p.name}</span>
                            {delta !== null && (
                                <span className={`game-breakdown-row__delta game-breakdown-row__delta--${delta >= 0 ? "pos" : "neg"}`}>
                                    {delta > 0 ? `+${delta}` : delta}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function SeriesDetail() {
    const { seriesId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!seriesId) return;
        get_series_detail(seriesId)
            .then(setData)
            .catch(() => setError("Failed to load series details"))
            .finally(() => setLoading(false));
    }, [seriesId]);

    return (
        <div className="series-detail">
            <button className="series-detail__back" onClick={() => navigate("/log")}>
                ‹ Game Log
            </button>

            {loading ? (
                <div style={{ textAlign: "center", color: "#a89f8e", padding: "3rem 0" }}>Loading…</div>
            ) : error ? (
                <div style={{ textAlign: "center", color: "#cc2936", padding: "3rem 0" }}>{error}</div>
            ) : (
                <>
                    <div className="series-detail__header-card">
                        <h2 className="series-detail__type">
                            {GAME_TYPE_LABEL[data.series.gameType] || data.series.gameType}
                        </h2>
                        <p className="series-detail__date">{formatDate(data.series.finishedAt)}</p>
                        <p className="series-detail__games-count">
                            {data.gameRows.length} game{data.gameRows.length !== 1 ? "s" : ""}
                        </p>
                    </div>

                    <div className="series-detail__section">
                        <h3 className="series-detail__section-title">Final Rankings</h3>
                        {(data.series.finalRankings || []).map((r, i) => (
                            <RankRow key={i} rank={r.rank} name={r.name} score={r.score} />
                        ))}
                    </div>

                    {data.gameRows.length > 0 && (
                        <div className="series-detail__section">
                            <h3 className="series-detail__section-title">Game Breakdown</h3>
                            {data.gameRows.map((g, i) => (
                                <GameBreakdownRow key={i} game={g} />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
