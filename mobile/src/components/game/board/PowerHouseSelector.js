import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WsSelectPartners, WsSelectPowerHouse } from '../../../api/wsEmitters';
import { buttonStyles, colors, fonts, spacing, typography } from '../../../styles/theme';
import CardFace from '../CardFace';
import { isRedSuit, suitSymbol } from '../utils/cardMapper';

const SUITS = ['S', 'H', 'D', 'C'];
// Rendered as two rows: [S, D] / [C, H]
const SUIT_ROW_1 = ['S', 'D'];
const SUIT_ROW_2 = ['C', 'H'];
const SUIT_NAMES = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' };
const RANK_ORDER_DESC = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function measureInWindow(ref) {
  return new Promise((resolve) => {
    const node = ref && typeof ref === 'object' && 'current' in ref ? ref.current : ref;
    if (!node || typeof node.measureInWindow !== 'function') {
      resolve(null);
      return;
    }

    node.measureInWindow((x, y, width, height) => {
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        resolve(null);
        return;
      }
      resolve({ x, y, width, height });
    });
  });
}

function getPartnerCount(configKey) {
  if (!configKey) return 1;
  const counts = {
    '4P1D': 1,
    '5P1D': 1,
    '6P1D': 2,
    '6P2D': 2,
    '7P2D': 2,
    '8P2D': 3,
    '9P2D': 3,
    '10P2D': 4,
  };
  return counts[configKey] || 1;
}

export default function PowerHouseSelector({
  isLeader,
  leader,
  getName,
  powerHouseSuit,
  partnerCards = [],
  myHand = [],
  configKey,
  partnerCardCount,
}) {
  const [selectedCards, setSelectedCards] = useState([]);
  const [copyPicker, setCopyPicker] = useState(null);
  const [pendingSuit, setPendingSuit] = useState(null);
  const [pendingSuitLayout, setPendingSuitLayout] = useState(null);
  const expandAnim = useRef(new Animated.Value(0)).current;
  const pendingRequestRef = useRef(false);
  const suitGridRef = useRef(null);
  const suitButtonRefs = useRef({});

  const is2Deck = (configKey || '').includes('2D');
  const targetCount = partnerCardCount || getPartnerCount(configKey);

  useEffect(() => {
    if (!isLeader) {
      setSelectedCards([]);
      setCopyPicker(null);
      setPendingSuit(null);
      setPendingSuitLayout(null);
      pendingRequestRef.current = false;
      expandAnim.stopAnimation();
      expandAnim.setValue(0);
      return;
    }
    if (!powerHouseSuit) {
      setSelectedCards([]);
      setCopyPicker(null);
    } else {
      setPendingSuit(null);
      setPendingSuitLayout(null);
      pendingRequestRef.current = false;
      expandAnim.stopAnimation();
      expandAnim.setValue(0);
    }
  }, [expandAnim, isLeader, powerHouseSuit]);

  const selectedCount = selectedCards.length;

  const availableBySuit = useMemo(() => {
    const out = {};
    for (const suit of SUITS) {
      out[suit] = RANK_ORDER_DESC
        .filter((rank) => {
          const holdCount = myHand.filter((c) => c?.suit === suit && c?.rank === rank).length;
          return is2Deck ? holdCount < 2 : holdCount === 0;
        })
        .map((rank) => ({ suit, rank }));
    }
    return out;
  }, [myHand, is2Deck]);

  const isCopySelected = (suit, rank, copyNum) =>
    selectedCards.some((c) => c.suit === suit && c.rank === rank && c.whichCopy === copyNum);

  const isSingleSelected = (suit, rank) =>
    selectedCards.some((c) => c.suit === suit && c.rank === rank && c.whichCopy == null);

  const toggleSingleCard = (card) => {
    const already = isSingleSelected(card.suit, card.rank);
    if (already) {
      setSelectedCards((prev) => prev.filter((c) => !(c.suit === card.suit && c.rank === card.rank && c.whichCopy == null)));
      return;
    }
    if (selectedCount >= targetCount) return;
    setSelectedCards((prev) => [...prev, { ...card, whichCopy: null }]);
  };

  const toggleCopySelection = (card, copyNum) => {
    const exists = isCopySelected(card.suit, card.rank, copyNum);
    if (exists) {
      setSelectedCards((prev) => prev.filter((c) => !(c.suit === card.suit && c.rank === card.rank && c.whichCopy === copyNum)));
    } else if (selectedCount < targetCount) {
      setSelectedCards((prev) => [...prev, { ...card, whichCopy: copyNum }]);
    }
    setCopyPicker(null);
  };

  const submitPartners = () => {
    if (selectedCount !== targetCount) return;

    const cards = selectedCards.map((c) => ({ suit: c.suit, rank: c.rank }));
    const duplicateSpecs = selectedCards
      .filter((c) => c.whichCopy != null)
      .map((c) => ({
        card: { suit: c.suit, rank: c.rank },
        whichCopy: c.whichCopy === 1 ? '1st' : '2nd',
      }));

    WsSelectPartners(cards, duplicateSpecs);
  };

  if (!isLeader) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>PowerHouse</Text>
        <Text style={styles.subtitle}>
          {!powerHouseSuit
            ? `${getName?.(leader) || 'Leader'} is selecting trump suit...`
            : `${getName?.(leader) || 'Leader'} is selecting partner cards...`}
        </Text>
        {powerHouseSuit ? (
          <Text style={[styles.suitLarge, isRedSuit(powerHouseSuit) ? styles.red : styles.black]}>
            {suitSymbol(powerHouseSuit)}
          </Text>
        ) : null}
      </View>
    );
  }

  const clearPendingSuit = () => {
    pendingRequestRef.current = false;
    setPendingSuit(null);
    setPendingSuitLayout(null);
  };

  const cancelPending = () => {
    Animated.timing(expandAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      clearPendingSuit();
    });
  };

  const confirmSuit = () => {
    const suit = pendingSuit;
    clearPendingSuit();
    if (suit) WsSelectPowerHouse(suit);
  };

  const showConfirm = async (suit) => {
    if (pendingRequestRef.current) return;
    pendingRequestRef.current = true;

    const [fromRect, toRect] = await Promise.all([
      measureInWindow(suitButtonRefs.current[suit]),
      measureInWindow(suitGridRef),
    ]);

    const fallbackRect = toRect || fromRect;
    if (!fallbackRect) {
      pendingRequestRef.current = false;
      WsSelectPowerHouse(suit);
      return;
    }

    expandAnim.stopAnimation();
    expandAnim.setValue(0);
    setPendingSuit(suit);
    setPendingSuitLayout({
      fromRect: fromRect || fallbackRect,
      toRect: toRect || fallbackRect,
    });

    requestAnimationFrame(() => {
      Animated.timing(expandAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    });
  };

  const expandedSuitStyle = pendingSuitLayout
    ? {
        left: expandAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [pendingSuitLayout.fromRect.x, pendingSuitLayout.toRect.x],
        }),
        top: expandAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [pendingSuitLayout.fromRect.y, pendingSuitLayout.toRect.y],
        }),
        width: expandAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [pendingSuitLayout.fromRect.width, pendingSuitLayout.toRect.width],
        }),
        height: expandAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [pendingSuitLayout.fromRect.height, pendingSuitLayout.toRect.height],
        }),
        borderRadius: expandAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 14],
        }),
      }
    : null;

  const expandedSymbolScale = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.7],
  });

  const confirmHintOpacity = expandAnim.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [0, 0, 1],
  });

  const renderSuitButton = (suit) => (
    <View
      key={suit}
      ref={(node) => {
        suitButtonRefs.current[suit] = node;
      }}
      collapsable={false}
    >
      <Pressable
        style={[styles.suitBtn, pendingSuit === suit && styles.suitBtnGhost]}
        onPress={() => showConfirm(suit)}
        disabled={!!pendingSuit}
      >
        <Text style={[styles.suitBtnSymbol, isRedSuit(suit) ? styles.red : styles.black]}>
          {suitSymbol(suit)}
        </Text>
        <Text style={styles.suitBtnLabel}>{SUIT_NAMES[suit]}</Text>
      </Pressable>
    </View>
  );

  if (!powerHouseSuit) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Select PowerHouse Suit</Text>
        <View ref={suitGridRef} collapsable={false} style={styles.suitGrid}>
          <View style={styles.suitRow}>
            {SUIT_ROW_1.map(renderSuitButton)}
          </View>
          <View style={styles.suitRow}>
            {SUIT_ROW_2.map(renderSuitButton)}
          </View>
        </View>

        {pendingSuit && pendingSuitLayout ? (
          <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={cancelPending}>
            <View style={styles.confirmOverlayRoot}>
              <Pressable style={styles.transparentBackdrop} onPress={cancelPending} />
              <AnimatedPressable
                style={[
                  styles.suitBtn,
                  styles.suitBtnExpanded,
                  expandedSuitStyle,
                ]}
                onPress={confirmSuit}
              >
                <Animated.Text
                  style={[
                    styles.suitBtnSymbol,
                    styles.suitBtnSymbolExpanded,
                    pendingSuit && isRedSuit(pendingSuit) ? styles.red : styles.black,
                    { transform: [{ scale: expandedSymbolScale }] },
                  ]}
                >
                  {pendingSuit ? suitSymbol(pendingSuit) : ''}
                </Animated.Text>
                <Text style={styles.suitBtnLabelExpanded}>{pendingSuit ? SUIT_NAMES[pendingSuit] : ''}</Text>
                <Animated.Text style={[styles.suitBtnLabelConfirm, { opacity: confirmHintOpacity }]}>
                  Tap again to confirm
                </Animated.Text>
              </AnimatedPressable>
            </View>
          </Modal>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.wrapTall}>
      <Text style={styles.title}>Select Teammate Cards ({selectedCount}/{targetCount})</Text>
      <Text style={styles.subtitle}>
        PowerHouse: <Text style={[styles.inlineSuit, isRedSuit(powerHouseSuit) ? styles.red : styles.black]}>{suitSymbol(powerHouseSuit)}</Text>
      </Text>

      {partnerCards?.length > 0 ? (
        <Text style={styles.note}>Partner cards already selected. Waiting to start play...</Text>
      ) : (
        <>
          <ScrollView style={styles.pickList} contentContainerStyle={styles.pickListContent}>
            {SUITS.map((suit) => {
              const cards = availableBySuit[suit] || [];
              if (!cards.length) return null;

              return (
                <View key={suit} style={styles.suitSection}>
                  <Text style={[styles.suitHeader, isRedSuit(suit) ? styles.red : styles.black]}>
                    {suitSymbol(suit)} {SUIT_NAMES[suit]}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardRow}>
                    {cards.map((card) => {
                      const holdCount = myHand.filter((c) => c?.suit === card.suit && c?.rank === card.rank).length;
                      const hasCopyPicker = is2Deck && holdCount === 0;
                      const copy1 = isCopySelected(card.suit, card.rank, 1);
                      const copy2 = isCopySelected(card.suit, card.rank, 2);
                      const single = isSingleSelected(card.suit, card.rank);
                      const selected = single || copy1 || copy2;
                      const disabled = !selected && selectedCount >= targetCount;

                      return (
                        <View key={`${card.suit}${card.rank}`} style={styles.cardWrap}>
                          <Pressable
                            onPress={() => {
                              if (disabled) return;
                              if (hasCopyPicker) {
                                setCopyPicker((prev) =>
                                  prev && prev.suit === card.suit && prev.rank === card.rank ? null : { suit: card.suit, rank: card.rank }
                                );
                              } else {
                                toggleSingleCard(card);
                              }
                            }}
                            style={[styles.cardPress, selected && styles.cardSelected, disabled && styles.cardDisabled]}
                          >
                            <CardFace card={card} width={40} />
                          </Pressable>

                          {hasCopyPicker ? (
                            <View style={styles.copyBadges}>
                              <Text style={[styles.copyBadge, copy1 && styles.copyBadgeOn]}>1</Text>
                              <Text style={[styles.copyBadge, copy2 && styles.copyBadgeOn]}>2</Text>
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              );
            })}
          </ScrollView>

          {copyPicker ? (
            <View style={styles.copyPickerPanel}>
              <Text style={styles.copyPickerTitle}>
                {copyPicker.rank}{suitSymbol(copyPicker.suit)} — choose copy
              </Text>
              <View style={styles.copyPickerBtns}>
                <Pressable
                  style={[styles.copyBtn, isCopySelected(copyPicker.suit, copyPicker.rank, 1) && styles.copyBtnOn]}
                  onPress={() => toggleCopySelection(copyPicker, 1)}
                >
                  <Text style={styles.copyBtnText}>1st</Text>
                </Pressable>
                <Pressable
                  style={[styles.copyBtn, isCopySelected(copyPicker.suit, copyPicker.rank, 2) && styles.copyBtnOn]}
                  onPress={() => toggleCopySelection(copyPicker, 2)}
                >
                  <Text style={styles.copyBtnText}>2nd</Text>
                </Pressable>
                <Pressable style={styles.copyBtn} onPress={() => setCopyPicker(null)}>
                  <Text style={styles.copyBtnText}>Close</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <Pressable
            style={[styles.confirmBtn, selectedCount !== targetCount && styles.disabled]}
            disabled={selectedCount !== targetCount}
            onPress={submitPartners}
          >
            <Text style={styles.confirmBtnText}>Confirm Teammates</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '80%',
    alignItems: 'center',
    gap: spacing.sm,
  },
  wrapTall: {
    width: '80%',
    gap: spacing.sm,
    maxHeight: 340,
  },
  title: {
    ...typography.subtitle,
    color: colors.cream,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontFamily: fonts.body,
    color: colors.creamMuted,
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  note: {
    fontFamily: fonts.body,
    color: colors.creamMuted,
    fontSize: 12,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  suitLarge: {
    fontSize: 44,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  inlineSuit: {
    fontWeight: '700',
  },
  red: {
    color: colors.redSuit,
  },
  black: {
    color: colors.cream,
  },
  suitGrid: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  suitRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  confirmOverlayRoot: {
    flex: 1,
  },
  transparentBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  suitBtn: {
    width: 68,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
    gap: 4,
  },
  suitBtnSymbol: {
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 34,
  },
  suitBtnGhost: {
    opacity: 0,
  },
  suitBtnSymbolExpanded: {
    fontSize: 48,
    lineHeight: 54,
  },
  suitBtnLabel: {
    ...typography.label,
    color: colors.creamMuted,
    fontSize: 9,
  },
  suitBtnExpanded: {
    position: 'absolute',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    overflow: 'hidden',
    zIndex: 2,
    backgroundColor: 'rgba(10,30,15,0.95)',
    borderWidth: 2,
    borderColor: colors.gold,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  suitBtnLabelExpanded: {
    ...typography.label,
    color: colors.creamMuted,
    fontSize: 11,
    letterSpacing: 0.7,
  },
  suitBtnLabelConfirm: {
    ...typography.label,
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  pickList: {
    flexGrow: 0,
    maxHeight: 230,
  },
  pickListContent: {
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  suitSection: {
    gap: 4,
  },
  suitHeader: {
    fontFamily: fonts.heading,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardRow: {
    gap: spacing.xs,
    paddingBottom: 2,
  },
  cardWrap: {
    alignItems: 'center',
    gap: 2,
  },
  cardPress: {
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: colors.gold,
  },
  cardDisabled: {
    opacity: 0.45,
  },
  copyBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  copyBadge: {
    width: 14,
    height: 14,
    textAlign: 'center',
    lineHeight: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderGold,
    color: colors.creamMuted,
    fontSize: 9,
    overflow: 'hidden',
  },
  copyBadgeOn: {
    color: colors.bgDeep,
    backgroundColor: colors.gold,
    borderColor: colors.gold,
    fontWeight: '700',
  },
  copyPickerPanel: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderGold,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  copyPickerTitle: {
    fontFamily: fonts.body,
    color: colors.cream,
    fontSize: 12,
  },
  copyPickerBtns: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  copyBtn: {
    ...buttonStyles.base,
    ...buttonStyles.secondary,
    ...buttonStyles.small,
  },
  copyBtnOn: {
    ...buttonStyles.primary,
  },
  copyBtnText: {
    ...buttonStyles.secondaryText,
    ...buttonStyles.smallText,
  },
  confirmBtn: {
    ...buttonStyles.base,
    ...buttonStyles.primary,
    width: '100%',
  },
  confirmBtnText: {
    ...buttonStyles.primaryText,
  },
  disabled: {
    ...buttonStyles.disabled,
  },
});
