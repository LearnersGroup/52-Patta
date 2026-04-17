import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { feltStyle, shadows } from '../../../styles/theme';

const SEAT_SIZE = 76;
const SEAT_AVATAR_HALF = 34;

export default function CircularTable({ players = [], centerContent, overlayContent }) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const myIndex = useMemo(() => {
    const idx = players.findIndex((p) => p?.isMe);
    return idx >= 0 ? idx : 0;
  }, [players]);

  // ── Geometry ──────────────────────────────────────────────────────────────
  const geo = useMemo(() => {
    const W = layout.width  || 360;
    const H = layout.height || 500;

    const PAD_H_TABLE = 12;
    const PAD_V_TOP = SEAT_AVATAR_HALF + 4;
    const PAD_V_BOT = 160;

    const tableW = Math.max(100, W - PAD_H_TABLE * 2);
    const tableH = Math.max(100, H - PAD_V_TOP - PAD_V_BOT);

    const cx = W / 2;
    const cy = PAD_V_TOP + tableH / 2;

    const orbitX = tableW / 2;
    const orbitY = tableH / 2;

    const tableBorderRadius = { borderRadius: Math.max(tableW, tableH) / 2 };

    return { tableW, tableH, wrapW: W, wrapH: H, cx, cy, orbitX, orbitY, PAD_V_TOP, tableBorderRadius };
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
      <View style={[styles.wrapper, { width: geo.wrapW, height: geo.wrapH }]}>
        {/* Gold glow halo — same shape/position as table, hidden beneath it */}
        <View style={[
          styles.tableGlow,
          {
            width:    geo.tableW,
            height:   geo.tableH,
            position: 'absolute',
            top:      geo.PAD_V_TOP,
            left:     geo.wrapW / 2 - geo.tableW / 2,
          },
          geo.tableBorderRadius,
        ]} />

        {/* Felt table */}
        <View style={[
          styles.table,
          {
            width:    geo.tableW,
            height:   geo.tableH,
            position: 'absolute',
            top:      geo.PAD_V_TOP,
            left:     geo.wrapW / 2 - geo.tableW / 2,
          },
          geo.tableBorderRadius,
        ]} />

        {/* Under-seat overlay — rendered before seats so avatars appear on top */}
        {typeof overlayContent === 'function'
          ? overlayContent({ seatPositionMap, geo })
          : overlayContent}

        {/* Seats — absolutely positioned on the ellipse */}
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

        {/* Centre content */}
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
  container: {
    flex: 1,
    alignSelf: 'stretch',
  },
  wrapper: {
    // Children are absolutely positioned; wrapper is just a coordinate origin
  },
  tableGlow: {
    backgroundColor: '#0f2314', // same as feltStyle — iOS needs a bg color to cast shadow
    shadowColor: '#c9a227',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 22,
    elevation: 14,
  },
  table: {
    ...feltStyle,
    ...shadows.deep,
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
