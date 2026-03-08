import { useMemo, useRef, useState, useEffect } from "react";
import PlayerSeat from "./PlayerSeat";

/**
 * Reusable circular table layout.
 * Positions N player seats OUTSIDE the circular table boundary, with "me" always at the bottom.
 * The "me" player has no visible seat — they are represented by the hand at the bottom of the page.
 * Renders arbitrary center content (e.g. PlayArea) inside the table.
 *
 * @param {Object[]} players - Array of player data objects, in seat order.
 *   Each: { id, name, isMe, isLeader, isPartner, isTurn, teamClass, cardCount, score, avatarInitial }
 * @param {Function|ReactNode} centerContent - Rendered inside the center of the table.
 *   If a function, called with ({ seatPositionMap, tableSize }).
 * @param {Function} renderSeat - Optional custom seat renderer: (player, pos, i) => ReactNode
 */

const SEAT_PADDING = 72; // extra space outside the table circle for seat elements

const CircularTable = ({
    players = [],
    centerContent,
    renderSeat,
}) => {
    const containerRef = useRef(null);
    const [tableSize, setTableSize] = useState(500);

    // Responsive table sizing via ResizeObserver
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const computeSize = () => {
            const w = el.parentElement?.clientWidth || 600;
            if (w <= 400) setTableSize(Math.min(w - 2 * SEAT_PADDING - 20, 280));
            else if (w <= 640) setTableSize(Math.min(w - 2 * SEAT_PADDING - 20, 360));
            else if (w <= 960) setTableSize(Math.min(w - 2 * SEAT_PADDING - 20, 460));
            else setTableSize(500);
        };

        computeSize();

        if (typeof ResizeObserver !== "undefined") {
            const ro = new ResizeObserver(computeSize);
            ro.observe(el.parentElement || el);
            return () => ro.disconnect();
        }
    }, []);

    // Find "me" index — my seat is always at the bottom (angle = PI/2)
    const myIndex = useMemo(
        () => players.findIndex((p) => p.isMe),
        [players]
    );

    // Wrapper size = table + padding on all sides for seats
    const wrapperSize = tableSize + 2 * SEAT_PADDING;
    const wrapperCenter = wrapperSize / 2;

    // Orbit radius: just outside the table edge so seats straddle the border
    const orbitRadius = tableSize / 2 + 18;

    // Compute seat positions relative to the wrapper (not the table)
    const seatPositions = useMemo(() => {
        const N = players.length;
        if (N === 0) return [];

        return players.map((_, i) => {
            const offset = i - (myIndex >= 0 ? myIndex : 0);
            const angle = Math.PI / 2 + (offset * 2 * Math.PI) / N;
            const x = wrapperCenter + Math.cos(angle) * orbitRadius;
            const y = wrapperCenter + Math.sin(angle) * orbitRadius;
            return { left: x, top: y, angle };
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [players.length, myIndex, wrapperCenter, orbitRadius]);

    // seatPositionMap keyed by player ID — stores only { angle } for PlayArea animations
    const seatPositionMap = useMemo(() => {
        const map = {};
        players.forEach((p, i) => {
            if (seatPositions[i]) {
                map[p.id] = { angle: seatPositions[i].angle };
            }
        });
        return map;
    }, [players, seatPositions]);

    return (
        <div
            className="circular-table-wrapper"
            ref={containerRef}
            style={{
                "--wrapper-size": `${wrapperSize}px`,
                "--table-size": `${tableSize}px`,
                "--seat-padding": `${SEAT_PADDING}px`,
            }}
        >
            {/* Player seats positioned around the outside of the table */}
            {players.map((player, i) => {
                // "Me" has no seat — represented by the hand at the bottom
                if (player.isMe) return null;

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
                        } ${player.teamClass || ""}`}
                        style={{
                            left: `${pos.left}px`,
                            top: `${pos.top}px`,
                            "--seat-angle-deg": pos.angle * 180 / Math.PI,
                            "--arrow-dx": `${-Math.cos(pos.angle) * 38}px`,
                            "--arrow-dy": `${-Math.sin(pos.angle) * 38}px`,
                        }}
                    >
                        <PlayerSeat
                            name={player.name}
                            avatarInitial={player.avatarInitial}
                            isMe={false}
                            isTurn={player.isTurn}
                            isLeader={player.isLeader}
                            isDealer={player.isDealer}
                            isPartner={player.isPartner}
                            cardCount={player.cardCount}
                            score={player.score}
                            relation={player.relation}
                        />
                    </div>
                );
            })}

            {/* The felt table circle */}
            <div className="circular-table">
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
