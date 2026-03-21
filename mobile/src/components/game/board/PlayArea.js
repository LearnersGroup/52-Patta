import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts, shadows, spacing, typography } from '../../../styles/theme';
import CardFace from '../CardFace';
import { useCardAnimation } from '../hooks/useCardAnimation';

const RANK_ORDER = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
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
    if ((RANK_ORDER[curr?.rank] || 0) > (RANK_ORDER[best?.rank] || 0)) {
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
    // Spread scaled down ~30 % to match the smaller card size
    x: ((h & 0xff) / 255) * 90 - 45,
    y: (((h >> 8) & 0xff) / 255) * 64 - 32,
    rotate: (((h >> 16) & 0xff) / 255) * 44 - 22,
  };
}

function AnimatedTrickCard({
  play,
  label,
  target,
  seatDir,
  winnerDir,
  isWinning,
  isEntering,
  isSweeping,
}) {
  const flyProgress = useSharedValue(isEntering ? 0 : 1);
  const sweepProgress = useSharedValue(0);
  const glowProgress = useSharedValue(isWinning ? 1 : 0);

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

  useEffect(() => {
    if (isWinning && !isSweeping) {
      glowProgress.value = withRepeat(withTiming(1.14, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
    } else {
      glowProgress.value = withTiming(1, { duration: 180 });
    }
  }, [glowProgress, isSweeping, isWinning]);

  const animStyle = useAnimatedStyle(() => {
    const baseX = seatDir.x + (target.x - seatDir.x) * flyProgress.value;
    const baseY = seatDir.y + (target.y - seatDir.y) * flyProgress.value;
    const x = baseX + (winnerDir.x - baseX) * sweepProgress.value;
    const y = baseY + (winnerDir.y - baseY) * sweepProgress.value;
    const rot = target.rotate * (1 - sweepProgress.value);

    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { rotateZ: `${rot}deg` },
        { scale: glowProgress.value - (sweepProgress.value * 0.82) },
      ],
      opacity: 1 - (sweepProgress.value * 0.94),
      zIndex: isWinning ? 4 : 2,
    };
  });

  return (
    <Animated.View style={[styles.cardWrap, animStyle]}>
      <View style={[isWinning && !isSweeping ? styles.cardWinning : null, isSweeping ? styles.cardSweeping : null]}>
        <CardFace card={play.card} width={42} />
      </View>
      <Text style={styles.name} numberOfLines={1}>{label}</Text>
    </Animated.View>
  );
}

function PlayArea({ plays = [], tricks = [], seatPositionMap = {}, tableSize = 300, getName, trumpSuit }) {
  const keyFn = useCallback((play, index = 0) => {
    const c = play?.card || {};
    return `${play?.playerId || ''}_${c.suit || ''}${c.rank || ''}_${c.deckIndex ?? 0}_${index}`;
  }, []);

  const { animatingCardKey } = useCardAnimation(plays, keyFn, 520);

  const [departingState, setDepartingState] = useState(null);
  const prevTricksRef = useRef(0);

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
      const timer = setTimeout(() => {
        setDepartingState((prev) => prev ? { ...prev, phase: 'sweep' } : null);
      }, 1300);
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
    return {
      x: Math.cos(pos.angle) * scale,
      y: Math.sin(pos.angle) * scale,
    };
  };

  const winnerDir = isDeparting ? seatDirection(departingState?.winner) : { x: 0, y: 0 };

  return (
    <View style={styles.wrap}>
      {effectivePlays.map((play, index) => {
        const cardKey = keyFn(play, index);
        const isWinning = !isDeparting && index === winningIndex;
        const isSweeping = isDeparting && departingState?.phase === 'sweep';
        const isEntering =
          (isDeparting && departingState?.lastCardAnimating && index === effectivePlays.length - 1)
          || (!isDeparting && cardKey === animatingCardKey);

        const target = thrownPosition(play, index);
        const seatDir = seatDirection(play.playerId);

        return (
          <AnimatedTrickCard
            key={cardKey}
            play={play}
            label={getName?.(play.playerId) || 'Player'}
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
    </View>
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
    gap: spacing.xs,
  },
  cardWinning: {
    borderWidth: 2,
    borderColor: colors.gold,
    borderRadius: 5,
    padding: 1,
    ...shadows.goldGlow,
  },
  cardSweeping: {
    opacity: 0.9,
  },
  name: {
    color: colors.cream,
    fontFamily: fonts.body,
    fontSize: 10,
    maxWidth: 70,
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
