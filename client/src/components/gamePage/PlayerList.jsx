
const PlayerList = ({
    seatOrder = [],
    handSizes = {},
    teams = { bid: [], oppose: [] },
    revealedPartners = [],
    currentTurn,
    leader,
    dealer,
    userId,
    scores = {},
    getName = (pid) => pid?.substring(0, 8),
}) => {
    return (
        <div className="player-list-bar">
            {seatOrder.map((pid) => {
                const isMe = pid === userId;
                const isLeader = pid === leader;
                const isDealer = pid === dealer;
                const isTurn = pid === currentTurn;
                const isBidTeam = teams.bid?.includes(pid);
                const isOppose = teams.oppose?.includes(pid);
                const isRevealed = revealedPartners?.includes(pid);
                const cards = handSizes[pid] ?? 0;
                const displayName = isMe ? "You" : getName(pid);
                const initial = getName(pid).charAt(0).toUpperCase();

                let teamClass = "";
                if (isBidTeam) teamClass = "team-bid";
                else if (isOppose && leader) teamClass = "team-oppose";

                return (
                    <div
                        key={pid}
                        className={`player-seat ${isTurn ? "active-turn" : ""} ${
                            isMe ? "is-me" : ""
                        } ${teamClass}`}
                    >
                        <div className="seat-avatar">
                            {initial}
                        </div>
                        <div className="seat-info">
                            <div className="seat-name">
                                {displayName}
                                {isDealer && (
                                    <span className="dealer-badge">Dealer</span>
                                )}
                                {isLeader && (
                                    <span className="leader-badge">Leader</span>
                                )}
                                {isRevealed && (
                                    <span className="partner-badge">
                                        Teammate
                                    </span>
                                )}
                            </div>
                            <div className="seat-meta">
                                <span className="cards-count">
                                    {cards} cards
                                </span>
                                <span className="seat-score">
                                    {scores[pid] ?? 0} pts
                                </span>
                            </div>
                        </div>
                        {isTurn && <div className="turn-indicator" />}
                    </div>
                );
            })}
        </div>
    );
};

export default PlayerList;
