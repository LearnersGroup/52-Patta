import { WsNextRound } from "../../api/wsEmitters";

const JudgementScoreBoard = ({
    seatOrder = [],
    roundResults = [],
    scores = {},
    getName = (pid) => pid?.substring(0, 8),
    trumpCard,
    trumpSuit,
    phase,
    nextRoundReady = { readyPlayers: [], totalPlayers: 0 },
    userId,
}) => {
    const readyPlayers = nextRoundReady?.readyPlayers || [];
    const iAmReady = readyPlayers.includes(userId);

    return (
        <div className="scoreboard judgement-scoreboard">
            <div className="score-header">
                <h3>Judgement Scoreboard</h3>
                <div className="judgement-trump-line">
                    Trump: {trumpCard ? `${trumpCard.rank}${trumpCard.suit}` : (trumpSuit || "None")}
                </div>
            </div>

            <div className="judgement-score-table">
                <div className="judgement-score-head">
                    <span>Player</span>
                    <span>Total</span>
                </div>
                {seatOrder.map((pid) => (
                    <div className="judgement-score-row" key={pid}>
                        <span>{getName(pid)}</span>
                        <strong>{scores[pid] || 0}</strong>
                    </div>
                ))}
            </div>

            {roundResults.length > 0 && (
                <div className="judgement-round-history">
                    <h4>Round History</h4>
                    {roundResults.map((rr) => (
                        <div key={rr.roundNumber} className="judgement-round-card">
                            <div className="judgement-round-title">Round {rr.roundNumber}</div>
                            {seatOrder.map((pid) => (
                                <div key={`${rr.roundNumber}-${pid}`} className="judgement-round-line">
                                    <span>{getName(pid)}</span>
                                    <span>Bid {rr.bids?.[pid] ?? 0}</span>
                                    <span>Won {rr.tricksWon?.[pid] ?? 0}</span>
                                    <strong>+{rr.deltas?.[pid] ?? 0}</strong>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {phase === "finished" && (
                <div className="next-round-section">
                    <button className="btn-primary" onClick={WsNextRound} disabled={iAmReady}>
                        {iAmReady ? "Ready ✓" : "Ready for Next Round"}
                    </button>
                    <div className="next-round-status">
                        {readyPlayers.length} / {nextRoundReady?.totalPlayers || seatOrder.length} ready
                    </div>
                </div>
            )}
        </div>
    );
};

export default JudgementScoreBoard;
