
const RANK_BADGES = {
    1: { emoji: "🥇", label: "1st", className: "gold" },
    2: { emoji: "🥈", label: "2nd", className: "silver" },
    3: { emoji: "🥉", label: "3rd", className: "bronze" },
};

const SeriesFinishedPanel = ({
    finalRankings = [],
    scores = {},
    seatOrder = [],
    getName = (pid) => pid?.substring(0, 8),
    userId,
    playerAvatars = {},
    onReturnToLobby,
}) => {
    // Use finalRankings if available, otherwise compute from scores
    const rankings = (finalRankings || []).length > 0
        ? finalRankings
        : seatOrder
            .map((pid) => ({
                playerId: pid,
                name: getName(pid),
                score: scores[pid] || 0,
            }))
            .sort((a, b) => b.score - a.score)
            .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    const top3 = rankings.slice(0, 3);
    const rest = rankings.slice(3);

    const renderAvatar = (player) => {
        const avatarUrl = playerAvatars?.[player.playerId];
        const initial = (player.name || getName(player.playerId) || "?")
            .charAt(0)
            .toUpperCase();
        return (
            <div className="podium-avatar-wrap">
                <div className="podium-avatar">
                    {avatarUrl
                        ? <img src={avatarUrl} alt={player.name} className="podium-avatar-img" />
                        : <span className="podium-avatar-initial">{initial}</span>
                    }
                </div>
                <div className="podium-medal">
                    {RANK_BADGES[player.rank]?.emoji}
                </div>
            </div>
        );
    };

    return (
        <div className="series-finished-panel">
            <div className="series-header">
                <h2>🏆 Series Complete!</h2>
            </div>

            <div className="podium">
                {top3.map((player) => {
                    const badge = RANK_BADGES[player.rank];
                    const isMe = player.playerId === userId;
                    return (
                        <div
                            key={player.playerId}
                            className={`podium-slot ${badge?.className || ""} ${
                                isMe ? "is-me" : ""
                            }`}
                        >
                            {renderAvatar(player)}
                            <div className="podium-name">
                                {isMe ? "You" : (player.name || getName(player.playerId))}
                            </div>
                            <div className="podium-score">
                                {player.score} pts
                            </div>
                        </div>
                    );
                })}
            </div>

            {rest.length > 0 && (
                <div className="series-rest">
                    {rest.map((player) => {
                        const isMe = player.playerId === userId;
                        return (
                            <div
                                key={player.playerId}
                                className={`series-row ${isMe ? "is-me" : ""}`}
                            >
                                <span className="series-rank">
                                    #{player.rank}
                                </span>
                                <span className="series-name">
                                    {isMe ? "You" : (player.name || getName(player.playerId))}
                                </span>
                                <span className="series-score">
                                    {player.score} pts
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="series-footer">
                {onReturnToLobby ? (
                    <button className="btn-primary series-lobby-btn" onClick={onReturnToLobby}>
                        Return to Lobby
                    </button>
                ) : (
                    <div className="series-redirect">Returning to lobby...</div>
                )}
            </div>
        </div>
    );
};

export default SeriesFinishedPanel;
