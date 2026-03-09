import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { WsPlayCard } from "../../api/wsEmitters";
import { getCardComponent, cardKey, isCardInList } from "./utils/cardMapper";
import { toggleHandSort } from "../../redux/slices/game";

// How many px of each non-last card to expose (shows rank+suit top-left corner)
const OVERLAP = 28;
// Extra px of the hovered card exposed by shifting it left
const HOVER_EXPOSE = 20;
// How many px the hovered card rises above its resting position
const LIFT = 18;
// How many px cards to the RIGHT of hovered card spread outward
const SPREAD = 12;
// Arc degrees of rotation per card position from center (fan effect)
const ARC_DEG = 3;
// Card dimensions (base)
const CARD_W = 60;
const CARD_H = 84;
// Scale factor when hand area is hovered
const HAND_HOVER_SCALE = 1.08;

const PlayerHand = ({ cards = [], validPlays = [], isMyTurn }) => {
    const [hoveredIndex, setHoveredIndex] = useState(-1);
    const dispatch = useDispatch();
    const handSorted = useSelector((state) => state.game.handSorted);

    const handleCardClick = (card) => {
        if (!isMyTurn) return;
        if (!isCardInList(card, validPlays)) return;
        WsPlayCard(card);
    };

    // Sort by suit then rank
    const suitOrder = { S: 0, D: 1, C: 2, H: 3 };
    const rankOrder = {
        "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
        "8": 8, "9": 9, "10": 10, J: 11, Q: 12, K: 13, A: 14,
    };

    const displayCards = handSorted
        ? [...cards].sort((a, b) => {
            const sd = suitOrder[a.suit] - suitOrder[b.suit];
            if (sd !== 0) return sd;
            return rankOrder[a.rank] - rankOrder[b.rank];
        })
        : cards; // natural deal order

    const N = displayCards.length;
    if (N === 0) return null;

    // Zoom triggers when any card is hovered (not the whole hand area)
    const scale = hoveredIndex >= 0 ? HAND_HOVER_SCALE : 1;
    const cardW = Math.round(CARD_W * scale);
    const cardH = Math.round(CARD_H * scale);
    const overlap = Math.round(OVERLAP * scale);

    const center = (N - 1) / 2;
    // Container width: expose overlap px per card, last card fully visible
    const containerW = (N - 1) * overlap + cardW;
    // Container height: card height + max lift + buffer so risen cards aren't clipped
    const containerH = cardH + LIFT + 16;

    return (
        <div
            className="player-hand-area"
            onMouseLeave={() => setHoveredIndex(-1)}
        >
            <div className="hand-header">
                <div className="hand-label">Your Hand</div>
                <button
                    className="hand-sort-toggle"
                    onClick={() => dispatch(toggleHandSort())}
                    title={handSorted ? "Show natural deal order" : "Sort by suit"}
                >
                    {handSorted ? "Natural Order" : "Sort by Suit"}
                </button>
            </div>
            <div className="hand-cards-arc-wrap">
                <div
                    className="hand-cards-arc"
                    style={{ width: `${containerW}px`, height: `${containerH}px` }}
                >
                    {displayCards.map((card, i) => {
                        const CardSvg = getCardComponent(card);
                        const isValid = isMyTurn && isCardInList(card, validPlays);
                        const isDisabled = isMyTurn && !isValid;
                        const isHovered = i === hoveredIndex;
                        // Disabled cards: no pop-out — suppress lift, expose-shift, and right-spread
                        const hoveredIsDisabled =
                            hoveredIndex >= 0 &&
                            isMyTurn &&
                            !isCardInList(displayCards[hoveredIndex], validPlays);
                        const isRight = hoveredIndex >= 0 && i > hoveredIndex && !hoveredIsDisabled;

                        // Arc rotation: edges tilt outward from center
                        const arcRotate = (i - center) * ARC_DEG;
                        // Resting Y: cards sit near the bottom of the container;
                        // edges are slightly higher (arcY) for the fan curve
                        const arcY = Math.abs(i - center) * 1.2;
                        // Only right-side cards spread outward; hovered card shifts left to expose more
                        const spreadX = isRight ? SPREAD : 0;
                        // Disabled cards get no pop-out shift or lift
                        const hoverShiftX = isHovered && !isDisabled ? -HOVER_EXPOSE : 0;
                        const liftY = isHovered && !isDisabled ? LIFT + arcY : arcY;

                        // Cards are positioned from bottom of container upward
                        const translateY = containerH - cardH - liftY;

                        return (
                            <div
                                key={cardKey(card)}
                                className={`hand-card-arc ${isValid ? "playable" : ""} ${isDisabled ? "disabled" : ""} ${isHovered ? "hovered" : ""}`}
                                style={{
                                    left: `${i * overlap}px`,
                                    width: `${cardW}px`,
                                    height: `${cardH}px`,
                                    zIndex: i,
                                    transform: `translateX(${spreadX + hoverShiftX}px) translateY(${translateY}px) rotate(${arcRotate}deg)`,
                                    transformOrigin: "bottom center",
                                }}
                                onClick={() => handleCardClick(card)}
                                onMouseEnter={() => setHoveredIndex(i)}
                                onMouseLeave={() => setHoveredIndex(-1)}
                                title={`${card.rank} of ${card.suit}`}
                            >
                                {CardSvg && (
                                    <CardSvg style={{ height: "100%", width: "100%" }} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default PlayerHand;
