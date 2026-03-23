import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts, typography } from '../../../styles/theme';
import CardFace from '../CardFace';
import { useCardAnimation } from '../hooks/useCardAnimation';

const RANK_ORDER = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14,
};

function findWinningIndex(plays = [], trumpSuit = null) {
  if (!plays.length) return -1;

  const ledSuit = plays[0]?.card?.suit;
  if (!ledSuit) return -1;

  const indexed = plays.map((play, index) => ({ play, index }));
  const trumpPlays = indexed.filter(({ play }) => play?.card?.suit === trumpSuit);
  const ledSuitPlays = indexed.filter(({ play }) => play?.card?.suit === ledSuit);
  const contenders = trumpPlays.length && trumpSuit !== ledSuit ? trumpPlays : ledSuitPlays;

  if (!contenders.length) return 0;

  let winner = contenders[0];
  for (let i = 1; i < contenders.length; i += 1) {
    const curr = contenders[i].play?.card;
    const best = winner.play?.card;
    if ((RANK_ORDER[curr?.rank] || 0) >= (RANK_ORDER[best?.rank] || 0)) {
      // >= so that duplicate cards (same rank in 2-deck games) pick the later play as winner
      winner = contenders[i];
    }
  }
  return winner.index;
}

function hashKey(input = '') {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function thrownPosition(play, index) {
  const key = `${play?.playerId || ''}_${play?.card?.suit || ''}${play?.card?.rank || ''}_${play?.card?.deckIndex ?? 0}_${index}`;
  const h = hashKey(key);
  return {
    x: ((h & 0xff) / 255) * 90 - 45,
    y: (((h >> 8) & 0xff) / 255) * 64 - 32,
    rotate: (((h >> 16) & 0xff) / 255) * 44 - 22,
  };
}

/** Position cards near their player's seat (inspect mode). */
function inspectPosition(seatDir) {
  return {
    x: seatDir.x * 0.88,
    y: seatDir.y * 0.88,
    rotate: 0,
  };
}

const EASE_SLIDE = { duration: 320, easing: Easing.out(Easing.cubic) };

function AnimatedTrickCard({
  play,
  target,
  seatDir,
  winnerDir,
  isWinning,
  isEntering,
  isSweeping,
}) {
  const flyProgress = useSharedValue(isEntering ? 0 : 1);
  const sweepProgress = useSharedValue(0);
  const targetX = useSharedValue(target.x);
  const targetY = useSharedValue(target.y);
  const targetRot = useSharedValue(target.rotate);

  // Animate target changes (inspect mode transitions)
  useEffect(() => {
    targetX.value = withTiming(target.x, EASE_SLIDE);
    targetY.value = withTiming(target.y, EASE_SLIDE);
    targetRot.value = withTiming(target.rotate, EASE_SLIDE);
  }, [target.x, target.y, target.rotate, targetX, targetY, targetRot]);

  useEffect(() => {
    if (isEntering) {
      flyProgress.value = 0;
      flyProgress.value = withTiming(1, {
        duration: 520,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      flyProgress.value = withTiming(1, { duration: 180 });
    }
  }, [flyProgress, isEntering]);

  useEffect(() => {
    if (isSweeping) {
      sweepProgress.value = withTiming(1, {
        duration: 760,
        easing: Easing.in(Easing.cubic),
      });
    } else {
      sweepProgress.value = withTiming(0, { duration: 140 });
    }
  }, [isSweeping, sweepProgress]);

  const animStyle = useAnimatedStyle(() => {
    const baseX = seatDir.x + (targetX.value - seatDir.x) * flyProgress.value;
    const baseY = seatDir.y + (targetY.value - seatDir.y) * flyProgress.value;
    const x = baseX + (winnerDir.x - baseX) * sweepProgress.value;
    const y = baseY + (winnerDir.y - baseY) * sweepProgress.value;
    const rot = targetRot.value * (1 - sweepProgress.value);

    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { rotateZ: `${rot}deg` },
        { scale: 1 - (sweepProgress.value * 0.82) },
      ],
      opacity: 1 - (sweepProgress.value * 0.94),
      zIndex: isWinning ? 4 : 2,
    };
  });

  return (
    <Animated.View style={[styles.cardWrap, animStyle]}>
      <View style={isWinning && !isSweeping ? styles.cardWinning : null}>
        <CardFace card={play.card} width={42} />
      </View>
    </Animated.View>
  );
}

function PlayArea({ plays = [], tricks = [], seatPositionMap = {}, tableSize = 300, getName, trumpSuit, stickyInspect = false, tableShape = 'rectangular' }) {
  const keyFn = useCallback((play, index = 0) => {
    const c = play?.card || {};
    return `${play?.playerId || ''}_${c.suit || ''}${c.rank || ''}_${c.deckIndex ?? 0}_${index}`;
  }, []);

  const { animatingCardKey } = useCardAnimation(plays, keyFn, 520);

  const [departingState, setDepartingState] = useState(null);
  const [inspectMode, setInspectMode] = useState(false);
  const prevTricksRef = useRef(0);

  // Toggle inspect mode on tap
  const toggleInspect = useCallback(() => {
    setInspectMode((prev) => !prev);
  }, []);

  // Reset inspect mode when plays change (unless sticky)
  useEffect(() => {
    if (!stickyInspect) setInspectMode(false);
  }, [plays, stickyInspect]);

  useEffect(() => {
    const trickCount = tricks?.length || 0;
    if (trickCount > prevTricksRef.current) {
      const lastTrick = tricks[trickCount - 1];
      if (lastTrick?.cards?.length && lastTrick?.winner) {
        setDepartingState({
          plays: lastTrick.cards,
          winner: lastTrick.winner,
          phase: 'hold',
          lastCardAnimating: true,
        });

        const flyTimer = setTimeout(() => {
          setDepartingState((prev) => prev ? { ...prev, lastCardAnimating: false } : null);
        }, 560);

        prevTricksRef.current = trickCount;
        return () => clearTimeout(flyTimer);
      }
    }
    prevTricksRef.current = trickCount;
  }, [tricks]);

  useEffect(() => {
    if (!departingState) return undefined;

    if (departingState.phase === 'hold') {
      // Wait 2 seconds so players can see the last card before sweeping
      const timer = setTimeout(() => {
        setDepartingState((prev) => prev ? { ...prev, phase: 'sweep' } : null);
      }, 2000);
      return () => clearTimeout(timer);
    }

    if (departingState.phase === 'sweep') {
      const timer = setTimeout(() => setDepartingState(null), 760);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [departingState]);

  const isDeparting = !!departingState;
  const effectivePlays = isDeparting ? departingState.plays : plays;

  const winningIndex = useMemo(() => (
    isDeparting ? -1 : findWinningIndex(plays, trumpSuit)
  ), [isDeparting, plays, trumpSuit]);

  if (!effectivePlays.length) {
    return <Text style={styles.empty}>Waiting for cards...</Text>;
  }

  const seatDirection = (playerId) => {
    const pos = seatPositionMap[playerId];
    if (!pos) return { x: 0, y: Math.min(130, tableSize * 0.38) };
    const scale = Math.min(140, tableSize * 0.44);
    const angle = pos.angle;

    if (tableShape === 'rectangular') {
      // Project angle onto rectangle perimeter to match player sitting positions
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const absCos = Math.abs(cosA) || 1e-9;
      const absSin = Math.abs(sinA) || 1e-9;
      const halfW = scale;
      const halfH = scale * 0.75; // portrait aspect ratio
      const rectScale = Math.min(halfW / absCos, halfH / absSin);
      return { x: cosA * rectScale, y: sinA * rectScale };
    }

    return {
      x: Math.cos(angle) * scale,
      y: Math.sin(angle) * scale,
    };
  };

  const winnerDir = isDeparting ? seatDirection(departingState?.winner) : { x: 0, y: 0 };

  return (
    <Pressable style={styles.wrap} onPress={toggleInspect}>
      {effectivePlays.map((play, index) => {
        const cardKey = keyFn(play, index);
        const isWinning = !isDeparting && index === winningIndex;
        const isSweeping = isDeparting && departingState?.phase === 'sweep';
        const isEntering =
          (isDeparting && departingState?.lastCardAnimating && index === effectivePlays.length - 1)
          || (!isDeparting && cardKey === animatingCardKey);

        const seatDir = seatDirection(play.playerId);
        const target = inspectMode && !isDeparting
          ? inspectPosition(seatDir)
          : thrownPosition(play, index);

        return (
          <AnimatedTrickCard
            key={cardKey}
            play={play}
            target={target}
            seatDir={seatDir}
            winnerDir={winnerDir}
            isWinning={isWinning}
            isEntering={isEntering}
            isSweeping={isSweeping}
          />
        );
      })}

      {!isDeparting && plays.length > 0 && winningIndex >= 0 ? (
        <Text style={styles.winningLabel}>{getName?.(plays[winningIndex]?.playerId) || 'Player'} leading</Text>
      ) : null}
    </Pressable>
  );
}

export default memo(PlayArea);

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    ...typography.captionSmall,
    color: colors.creamMuted,
    fontFamily: fonts.body,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  cardWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  cardWinning: {
    borderWidth: 2,
    borderColor: 'rgba(146, 111, 20, 0.95)',
    borderRadius: 5,
    shadowColor: 'rgba(146, 111, 20, 1)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 9,
    elevation: 6,
  },
  winningLabel: {
    position: 'absolute',
    bottom: 2,
    color: colors.goldLight,
    fontFamily: fonts.heading,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
