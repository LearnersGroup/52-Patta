import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { feltStyle, shadows } from '../../../styles/theme';

/**
 * Seat component width — must match PlayerSeat's wrap.width so the
 * centering arithmetic (left: pos.x - SEAT_SIZE/2) stays accurate.
 */
const SEAT_SIZE = 68;

/**
 * Half the avatar ring height.  Used to vertically pin the ring centre
 * on the orbital point (instead of the top of the seat view).
 * RING = 58 (51 + 7)  →  SEAT_AVATAR_HALF = 29
 */
const SEAT_AVATAR_HALF = 29;

export default function CircularTable({ players = [], centerContent }) {
  // Measure the full available space (width AND height) via onLayout
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const myIndex = useMemo(() => {
    const idx = players.findIndex((p) => p?.isMe);
    return idx >= 0 ? idx : 0;
  }, [players]);

  // ── Geometry ──────────────────────────────────────────────────────────────
  const geo = useMemo(() => {
    const W = layout.width  || 360;
    const H = layout.height || 500;

    /**
     * Horizontal padding:
     *   PAD_H_TABLE — table margin each side.
     *
     * Avatar centres sit exactly on the table border (orbitX = tableW/2).
     * The outer half of side-seat avatars intentionally hangs into this margin.
     * Keep it just wide enough to show the avatar ring (SEAT_AVATAR_HALF = 29),
     * plus a small safety gap so nothing clips the screen edge.
     */
    const PAD_H_TABLE = 12;    // tight margin — avatar centres on border, outer half hangs off slightly

    /**
     * Vertical padding:
     *   top — just enough so the top-seat avatar clears the container edge.
     *   bottom — hand overlay height (≈90) PLUS the full PlayerSeat extent below
     *            the orbit centre: ring bottom half (29) + gap (3) + name (~14) +
     *            gap (3) + jdg-chip (~18) + safety (3) = 160.
     *            This keeps the entire "You" seat (avatar + label + chip) above the
     *            player hand, and also reduces the table height slightly.
     */
    const PAD_V_TOP = SEAT_AVATAR_HALF + 4;   // 33 px – clears top avatar
    const PAD_V_BOT = 160;                    // hand (90) + full seat below orbit (67) + safety (3)

    const tableW = Math.max(100, W - PAD_H_TABLE * 2);
    const tableH = Math.max(100, H - PAD_V_TOP - PAD_V_BOT);

    // Wrapper equals measured container; centre is shifted up by half the
    // asymmetric padding so the table is visually centred in the space.
    const wrapW = W;
    const wrapH = H;
    const cx = W / 2;
    const cy = PAD_V_TOP + tableH / 2;   // top of table + half table height

    // Avatar centres sit exactly on the table border.
    const orbitX = tableW / 2;
    const orbitY = tableH / 2;

    return { tableW, tableH, wrapW, wrapH, cx, cy, orbitX, orbitY, PAD_V_TOP };
  }, [layout]);

  // ── Seat positions (angles + pixel coords) ────────────────────────────────
  const seatPositions = useMemo(() => {
    const n = players.length;
    if (!n) return [];

    return players.map((_, i) => {
      const offset = i - myIndex;
      const angle  = Math.PI / 2 + (offset * 2 * Math.PI) / n;
      return {
        angle,
        x: geo.cx + Math.cos(angle) * geo.orbitX,
        y: geo.cy + Math.sin(angle) * geo.orbitY,
      };
    });
  }, [players, myIndex, geo]);

  const seatPositionMap = useMemo(() => {
    const map = {};
    players.forEach((p, i) => {
      if (!p?.id || !seatPositions[i]) return;
      map[p.id] = seatPositions[i];
    });
    return map;
  }, [players, seatPositions]);

  return (
    <View
      style={styles.container}
      onLayout={(e) =>
        setLayout({
          width:  e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        })
      }
    >
      {/* Wrapper fills the measured space exactly */}
      <View style={[styles.wrapper, { width: geo.wrapW, height: geo.wrapH }]}>
        {/* Portrait rounded-rectangle felt table — top-anchored */}
        <View style={[
          styles.table,
          {
            width:    geo.tableW,
            height:   geo.tableH,
            position: 'absolute',
            top:      geo.PAD_V_TOP,
            left:     geo.wrapW / 2 - geo.tableW / 2,
          },
        ]} />

        {/* Seats — absolutely positioned on the elliptical orbit */}
        {players.map((player, i) => {
          const pos = seatPositions[i];
          if (!pos) return null;

          return (
            <View
              key={player.id || `seat_${i}`}
              style={[
                styles.seat,
                {
                  left: pos.x - SEAT_SIZE / 2,
                  top:  pos.y - SEAT_AVATAR_HALF,
                },
              ]}
            >
              {player.render?.()}
            </View>
          );
        })}

        {/* Centre content — positioned at geometric centre of the table */}
        <View
          style={[
            styles.center,
            {
              width:  geo.tableW * 0.78,
              height: geo.tableH * 0.55,
              left:   geo.cx - (geo.tableW * 0.78) / 2,
              top:    geo.cy - (geo.tableH * 0.55) / 2,
            },
          ]}
        >
          {typeof centerContent === 'function'
            ? centerContent({ seatPositionMap, tableSize: geo.tableW })
            : centerContent}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Fills tableArea completely so onLayout reports the full available space
  container: {
    flex: 1,
    alignSelf: 'stretch',
  },
  wrapper: {
    // Children are absolutely positioned; wrapper is just a coordinate origin
  },
  table: {
    ...feltStyle,
    ...shadows.deep,
    borderRadius: 28,
  },
  seat: {
    position: 'absolute',
    width: SEAT_SIZE,
    alignItems: 'center',
  },
  center: {
    position: 'absolute',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
