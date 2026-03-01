// PlayerSeat - reusable player seat for circular table
import { getCardBackComponent } from "../gamePage/utils/cardMapper";

/**
 * Reusable player seat for circular table.
 * Shows avatar, name, badges, card-back fan (representing hand size), and score.
 * No Redux dependency — all data via props.
 */
const PlayerSeat = ({
    name = "",
    avatarInitial = "?",
    isMe = false,
    isTurn = false,
    isLeader = false,
    isPartner = false,
    cardCount = 0,
    score = 0,
}) => {
    const CardBack = getCardBackComponent();

    // Show at most 5 card backs, with a count badge if more
    const fanCount = Math.min(cardCount, 5);
    const fanCards = Array.from({ length: fanCount }, (_, i) => i);

    // Fan angle: spread cards slightly around center
    const fanSpread = (i) => {
        const center = (fanCount - 1) / 2;
        const offset = i - center;
        const angle = offset * 6; // degrees per card
        const translateX = offset * 3; // px horizontal spread
        return {
            transform: `rotate(${angle}deg) translateX(${translateX}px)`,
            zIndex: i,
        };
    };

    return (
        <>
            {/* Card back fan */}
            {cardCount > 0 && (
                <div className="card-back-fan">
                    {fanCards.map((i) => (
                        <div
                            key={i}
                            className="card-back-item"
                            style={fanSpread(i)}
                        >
                            {CardBack && (
                                <CardBack
                                    style={{ width: "100%", height: "100%" }}
                                />
                            )}
                        </div>
                    ))}
                    {cardCount > 5 && (
                        <span className="card-count-badge">{cardCount}</span>
                    )}
                </div>
            )}

            {/* Avatar */}
            <div className="table-seat-avatar">
                {avatarInitial}
                {isTurn && <div className="table-seat-turn-dot" />}
            </div>

            {/* Name */}
            <div className="table-seat-name">
                {isMe ? "You" : name}
            </div>

            {/* Badges */}
            {(isLeader || isPartner) && (
                <div className="table-seat-badges">
                    {isLeader && (
                        <span className="leader-badge">Leader</span>
                    )}
                    {isPartner && (
                        <span className="partner-badge">Partner</span>
                    )}
                </div>
            )}

            {/* Score */}
            <div className="table-seat-meta">
                {score} pts
            </div>
        </>
    );
};

export default PlayerSeat;
