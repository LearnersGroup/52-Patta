import { useMemo, useRef, useState, useEffect } from "react";
import PlayerSeat from "./PlayerSeat";

/**
 * Reusable circular table layout.
 * Positions N player seats around a circle with "me" always at the bottom.
 * Renders arbitrary center content (e.g. PlayArea) in the middle.
 *
 * @param {Object[]} players - Array of player data objects, in seat order.
 *   Each: { id, name, isMe, isLeader, isPartner, isTurn, teamClass, cardCount, score, avatarInitial, badges? }
 * @param {ReactNode} centerContent - Rendered inside the center of the table.
 * @param {Function} renderSeat - Optional custom seat renderer: (player, position, index) => ReactNode
 */
const CircularTable = ({
    players = [],
    centerContent,
    renderSeat,
}) => {
    const containerRef = useRef(null);
    const [tableSize, setTableSize] = useState(520);

    // Responsive sizing via ResizeObserver
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const computeSize = () => {
            const w = el.parentElement?.clientWidth || 520;
            if (w <= 400) setTableSize(Math.min(w - 20, 340));
            else if (w <= 640) setTableSize(Math.min(w - 40, 420));
            else if (w <= 960) setTableSize(Math.min(w - 40, 520));
            else setTableSize(560);
        };

        computeSize();

        if (typeof ResizeObserver !== "undefined") {
            const ro = new ResizeObserver(computeSize);
            ro.observe(el.parentElement || el);
            return () => ro.disconnect();
        }
    }, []);

    // Find "me" index — me is always at the bottom
    const myIndex = useMemo(
        () => players.findIndex((p) => p.isMe),
        [players]
    );

    // Compute seat positions (in px) around the circle
    const seatPositions = useMemo(() => {
        const N = players.length;
        if (N === 0) return [];

        const center = tableSize / 2;
        // Seats sit at the edge — leave room for seat element (approx 45px radius from center of seat)
        const orbitRadius = center - 45;

        return players.map((_, i) => {
            // Rotate so myIndex maps to bottom (PI/2)
            const offset = i - (myIndex >= 0 ? myIndex : 0);
            const angle = Math.PI / 2 + (offset * 2 * Math.PI) / N;
            const x = center + Math.cos(angle) * orbitRadius;
            const y = center + Math.sin(angle) * orbitRadius;
            // Angle from center (useful for card animation direction)
            return { left: x, top: y, angle };
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [players.length, myIndex, tableSize]);

    // Build a map of seat positions keyed by player ID (for PlayArea animations)
    const seatPositionMap = useMemo(() => {
        const map = {};
        players.forEach((p, i) => {
            if (seatPositions[i]) {
                map[p.id] = seatPositions[i];
            }
        });
        return map;
    }, [players, seatPositions]);

    return (
        <div className="circular-table-wrapper" ref={containerRef}>
            <div
                className="circular-table"
                style={{ "--table-size": `${tableSize}px` }}
            >
                {/* Player seats around the perimeter */}
                {players.map((player, i) => {
                    const pos = seatPositions[i];
                    if (!pos) return null;

                    if (renderSeat) {
                        return renderSeat(player, pos, i);
                    }

                    return (
                        <div
                            key={player.id}
                            className={`table-seat ${
                                player.isTurn ? "active-turn" : ""
                            } ${player.isMe ? "is-me" : ""} ${
                                player.teamClass || ""
                            }`}
                            style={{
                                left: `${pos.left}px`,
                                top: `${pos.top}px`,
                            }}
                        >
                            <PlayerSeat
                                name={player.name}
                                avatarInitial={player.avatarInitial}
                                isMe={player.isMe}
                                isTurn={player.isTurn}
                                isLeader={player.isLeader}
                                isPartner={player.isPartner}
                                cardCount={player.cardCount}
                                score={player.score}
                            />
                        </div>
                    );
                })}

                {/* Center content (PlayArea) */}
                <div className="table-center">
                    {typeof centerContent === "function"
                        ? centerContent({ seatPositionMap, tableSize })
                        : centerContent}
                </div>
            </div>
        </div>
    );
};

export default CircularTable;
