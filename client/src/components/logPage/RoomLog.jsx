import { useEffect, useRef, useState } from "react";
import { socket } from "../../socket";
import { get_room_log } from "../../api/apiHandler";

export default function RoomLog({ roomId }) {
    const [logs, setLogs] = useState([]);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;

        get_room_log(roomId)
            .then(({ logs: rows }) => {
                if (mountedRef.current) setLogs(rows || []);
            })
            .catch(() => {});

        const onAppend = (entry) => {
            if (mountedRef.current) {
                setLogs((prev) => [...prev, entry]);
            }
        };
        socket.on("room-log-append", onAppend);

        return () => {
            mountedRef.current = false;
            socket.off("room-log-append", onAppend);
        };
    }, [roomId]);

    if (logs.length === 0) return null;

    return (
        <div className="room-log">
            <div className="room-log__title">Games This Session</div>
            {logs.map((entry, i) => {
                const playerList = (entry.players || [])
                    .map((p) => {
                        const uid = p.userId?.toString?.() ?? p.userId;
                        const delta = entry.playerDeltas?.[uid] ?? null;
                        return `${p.name}${delta !== null ? ` (${delta > 0 ? "+" : ""}${delta})` : ""}`;
                    })
                    .join(", ");
                return (
                    <div key={entry._id || i} className="room-log__row">
                        <span className="room-log__game-num">Game {entry.gameNumber}</span>
                        {playerList && (
                            <span className="room-log__players">{playerList}</span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
