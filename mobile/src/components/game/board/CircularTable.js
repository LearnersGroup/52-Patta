import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, feltStyle, shadows } from '../../../styles/theme';

const SEAT_SIZE = 90;

export default function CircularTable({ players = [], centerContent }) {
  const [layoutWidth, setLayoutWidth] = useState(0);

  const myIndex = useMemo(() => {
    const idx = players.findIndex((p) => p?.isMe);
    return idx >= 0 ? idx : 0;
  }, [players]);

  const tableSize = Math.max(220, Math.min(360, layoutWidth - 16 || 300));
  const seatPadding = 54;
  const wrapperSize = tableSize + seatPadding * 2;
  const center = wrapperSize / 2;
  const orbitRadius = tableSize / 2 + 48;

  const seatPositions = useMemo(() => {
    const n = players.length;
    if (!n) return [];

    return players.map((_, i) => {
      const offset = i - myIndex;
      const angle = Math.PI / 2 + (offset * 2 * Math.PI) / n;
      const x = center + Math.cos(angle) * orbitRadius;
      const y = center + Math.sin(angle) * orbitRadius;
      return { angle, x, y };
    });
  }, [players, myIndex, center, orbitRadius]);

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
      onLayout={(e) => setLayoutWidth(e.nativeEvent.layout.width)}
    >
      <View style={[styles.wrapper, { width: wrapperSize, height: wrapperSize }]}> 
        <View style={[styles.table, { width: tableSize, height: tableSize }]} />

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
                  top: pos.y - 26,
                },
              ]}
            >
              {player.render?.()}
            </View>
          );
        })}

        <View style={[styles.center, { width: tableSize * 0.72, height: tableSize * 0.72 }]}> 
          {typeof centerContent === 'function'
            ? centerContent({ seatPositionMap, tableSize })
            : centerContent}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
