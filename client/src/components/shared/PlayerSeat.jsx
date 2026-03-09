// PlayerSeat - reusable player seat for circular table
import { memo } from "react";
import { getCardBackComponent } from "../gamePage/utils/cardMapper";

/**
 * Reusable player seat for circular table.
 * Shows avatar, name, badges, card-back fan (representing hand size), and score.
 * No Redux dependency — all data via props.
 *
 * @prop {string|null} relation - "teammate" | "opponent" | null
 *   Shown once all partners are revealed (provided by GameBoard).
 */
const PlayerSeat = memo(({
    name = "",
    avatarInitial = "?",
    isMe = false,
    isTurn = false,
    isLeader = false,
    isDealer = false,
    isPartner = false,
    cardCount = 0,
    score = 0,
    relation = null, // "teammate" | "opponent" | null
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

    // "potential-teammate" is a private visual cue (yellow tint) — no badge shown
    const showRelationBadges = (isPartner && !relation) || (relation && relation !== "potential-teammate");

    return (
        <>
            {/* Card back fan — tinted by relation once known */}
            {cardCount > 0 && (
                <div className={[
                    "card-back-fan",
                    relation === "opponent"           ? "card-back-fan--opponent"           : "",
                    relation === "potential-teammate" ? "card-back-fan--potential-teammate" : "",
                ].filter(Boolean).join(" ")}>
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

            {/* Avatar — with B (Bidder) and D (Dealer) chips overlaid on corners */}
            <div className="table-seat-avatar-wrap">
                <div className="table-seat-avatar">
                    {avatarInitial}
                    {isTurn && <div className="table-seat-turn-dot" />}
                </div>
                {isDealer && (
                    <span
                        className="dealer-badge badge-on-avatar badge-on-avatar--dealer"
                        data-tooltip="Dealer"
                    >
                        D
                    </span>
                )}
                {isLeader && (
                    <span
                        className="leader-badge badge-on-avatar badge-on-avatar--bidder"
                        data-tooltip="Bidder"
                    >
                        B
                    </span>
                )}
            </div>

            {/* Name */}
            <div className="table-seat-name">
                {isMe ? "You" : name}
            </div>

            {/* Relation badges only (Partner / Teammate / Opponent) */}
            {showRelationBadges && (
                <div className="table-seat-badges">
                    {/* Show Partner badge only while team relation isn't known yet */}
                    {isPartner && !relation && (
                        <span className="partner-badge">Partner</span>
                    )}
                    {/* Once all partners revealed: show Teammate / Opponent */}
                    {relation === "teammate" && (
                        <span className="teammate-badge">Teammate</span>
                    )}
                    {relation === "opponent" && (
                        <span className="opponent-badge">Opponent</span>
                    )}
                </div>
            )}

            {/* Score */}
            <div className="table-seat-meta">
                {score} pts
            </div>
        </>
    );
});

PlayerSeat.displayName = "PlayerSeat";

export default PlayerSeat;
