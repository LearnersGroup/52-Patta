import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get_my_game_log } from "../../api/apiHandler";
import { useAuth } from "../hooks/useAuth";

const GAME_TYPE_LABEL = {
    kaliteri: "Kaliteri",
    judgement: "Judgement",
    mendikot: "Mendikot",
};

function formatDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function SeriesCard({ item, onClick }) {
    const totalGames = item.gameRows?.length ?? 0;

    return (
        <div className="series-card" onClick={() => onClick(item)}>
            <div className="series-card__top">
                <span className="series-card__game-type">
                    {GAME_TYPE_LABEL[item.gameType] || item.gameType}
                </span>
                <span className="series-card__date">{formatDate(item.finishedAt)}</span>
            </div>
            <div className="series-card__meta">
                <span>{totalGames} game{totalGames !== 1 ? "s" : ""}</span>
                {item.finalRankings?.slice(0, 3).map((r, i) => (
                    <span key={i} className={`series-card__rank-chip${r.rank === 1 ? " series-card__rank-chip--win" : ""}`}>
                        {r.rank === 1 ? "🥇 " : ""}{r.name} {r.score}
                    </span>
                ))}
            </div>
        </div>
    );
}

export default function LogPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [series, setSeries] = useState([]);
    const [nextCursor, setNextCursor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState("");

    const fetchSeries = useCallback(async (cursor = null) => {
        const data = await get_my_game_log({ limit: 20, cursor });
        return data;
    }, []);

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        fetchSeries()
            .then(({ series: rows, nextCursor: nc }) => {
                setSeries(rows);
                setNextCursor(nc);
            })
            .catch(() => setError("Failed to load game history"))
            .finally(() => setLoading(false));
    }, [user, fetchSeries]);

    const loadMore = () => {
        if (!nextCursor || loadingMore) return;
        setLoadingMore(true);
        fetchSeries(nextCursor)
            .then(({ series: rows, nextCursor: nc }) => {
                setSeries((prev) => [...prev, ...rows]);
                setNextCursor(nc);
            })
            .catch(() => {})
            .finally(() => setLoadingMore(false));
    };

    const openSeries = (item) => {
        navigate(`/log/${item.seriesId}`);
    };

    return (
        <div className="log-page">
            <div className="log-page__header">
                <h1 className="log-page__title">Game Log</h1>
            </div>

            {loading ? (
                <div className="log-page__empty">Loading…</div>
            ) : error ? (
                <div className="log-page__error">{error}</div>
            ) : series.length === 0 ? (
                <div className="log-page__empty">No games played yet.</div>
            ) : (
                <>
                    <div className="log-page__list">
                        {series.map((item) => (
                            <SeriesCard key={item._id} item={item} onClick={openSeries} />
                        ))}
                    </div>
                    {nextCursor && (
                        <button className="log-page__load-more" onClick={loadMore} disabled={loadingMore}>
                            {loadingMore ? "Loading…" : "Load more"}
                        </button>
                    )}
                </>
            )}
        </div>
    );
}
