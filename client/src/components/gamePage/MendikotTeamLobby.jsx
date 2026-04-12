import { memo } from "react";

/**
 * Lobby team display for Mendikot.
 * Shows two columns (Team A sky-blue, Team B pink) with player cards.
 * Non-admin players get a "Switch Team" button.
 * Admin gets a "Randomize Teams" button.
 */
const MendikotTeamLobby = memo(({ roomData, players, userId, isAdmin, onSwitchTeam, onRandomizeTeams }) => {
    const teamAIds = (roomData?.team_a_players || []).map((id) =>
        id?._id?.toString() || id?.toString()
    );
    const teamBIds = (roomData?.team_b_players || []).map((id) =>
        id?._id?.toString() || id?.toString()
    );

    const getPlayerEntry = (id) =>
        players.find((p) => {
            const pid = p.playerId?._id?.toString() || p.playerId?.toString();
            return pid === id;
        });

    const renderPlayer = (id) => {
        const p = getPlayerEntry(id);
        const name = p?.playerId?.name || p?.name || id?.slice(0, 8);
        const avatar = p?.playerId?.avatar || p?.avatar;
        const isMe = id === userId;
        const isReady = p?.ready ?? false;
        return (
            <div key={id} className={`mendikot-team-player${isMe ? " mendikot-team-player--me" : ""}`}>
                <div className="mendikot-team-player-avatar">
                    {avatar
                        ? <img src={avatar} alt={name} />
                        : <span>{(name || "?").charAt(0).toUpperCase()}</span>}
                </div>
                <div className="mendikot-team-player-name">
                    {name}{isMe ? " (you)" : ""}
                </div>
                {isReady && <div className="mendikot-team-player-ready-dot" title="Ready" />}
            </div>
        );
    };

    const allAssignedIds = [...teamAIds, ...teamBIds];
    const unassigned = players.filter((p) => {
        const pid = p.playerId?._id?.toString() || p.playerId?.toString();
        return !allAssignedIds.includes(pid);
    });

    return (
        <div className="mendikot-team-lobby">
            {/* Team A */}
            <div className="mendikot-team-column mendikot-team-column--a">
                <div className="mendikot-team-header">
                    <span className="mendikot-team-dot mendikot-team-dot--a" />
                    Team A
                    <span className="mendikot-team-count">({teamAIds.length})</span>
                </div>
                <div className="mendikot-team-players">
                    {teamAIds.length === 0
                        ? <div className="mendikot-team-empty">No players yet</div>
                        : teamAIds.map(renderPlayer)}
                </div>
            </div>

            {/* Team B */}
            <div className="mendikot-team-column mendikot-team-column--b">
                <div className="mendikot-team-header">
                    <span className="mendikot-team-dot mendikot-team-dot--b" />
                    Team B
                    <span className="mendikot-team-count">({teamBIds.length})</span>
                </div>
                <div className="mendikot-team-players">
                    {teamBIds.length === 0
                        ? <div className="mendikot-team-empty">No players yet</div>
                        : teamBIds.map(renderPlayer)}
                </div>
            </div>

            {/* Unassigned players */}
            {unassigned.length > 0 && (
                <div className="mendikot-team-unassigned">
                    <div className="mendikot-team-unassigned-label">Unassigned</div>
                    {unassigned.map((p) => {
                        const id = p.playerId?._id?.toString() || p.playerId?.toString();
                        return renderPlayer(id);
                    })}
                </div>
            )}

            {/* Actions */}
            <div className="mendikot-team-actions">
                {!isAdmin && (
                    <button
                        className="btn-secondary mendikot-switch-btn"
                        onClick={() => onSwitchTeam?.()}
                    >
                        Switch Team
                    </button>
                )}
                {isAdmin && (
                    <button
                        className="btn-secondary mendikot-randomize-btn"
                        onClick={() => onRandomizeTeams?.()}
                    >
                        🔀 Randomize Teams
                    </button>
                )}
            </div>
        </div>
    );
});

MendikotTeamLobby.displayName = "MendikotTeamLobby";
export default MendikotTeamLobby;
