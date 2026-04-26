import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { buttonStyles, colors, fonts, panelStyle, shadows, spacing, typography } from '../../../styles/theme';
import AvatarImage from '../../shared/AvatarImage';
import ScoreTable from './ScoreTable';

const BADGES = {
  1: { emoji: '🥇', tone: '#f4d35e', borderColor: colors.gold },
  2: { emoji: '🥈', tone: '#d7dee8', borderColor: '#c0c0c0' },
  3: { emoji: '🥉', tone: '#d6a77a', borderColor: '#cd7f32' },
};

const AVATAR_SIZE = 62;        // 48 * 1.3 ≈ 62
const AVATAR_SIZE_1ST = 62;    // same avatar, card is bigger
const MEDAL_SIZE = 28;
const MEDAL_OVERLAP = MEDAL_SIZE / 2; // medal center sits at avatar bottom

export default function SeriesFinishedPanel({
  finalRankings = [],
  scores = {},
  seatOrder = [],
  getName,
  userId,
  playerAvatars = {},
  gameType,
  roundResults = [],
  tricksWon = {},
  bidding = {},
  phase,
  onReturnToLobby,
  isLogView = false,
  renderHeader = null,
}) {
  const rankings = (finalRankings || []).length
    ? finalRankings
    : (seatOrder || [])
        .map((pid) => ({
          playerId: pid,
          name: getName(pid),
          score: scores?.[pid] || 0,
        }))
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

  const top = rankings.slice(0, 3);
  const rest = rankings.slice(3);

  // Reorder podium: [2nd, 1st, 3rd]
  const podiumOrder = [];
  const first  = top.find((p) => p.rank === 1);
  const second = top.find((p) => p.rank === 2);
  const third  = top.find((p) => p.rank === 3);
  if (second) podiumOrder.push(second);
  if (first)  podiumOrder.push(first);
  if (third)  podiumOrder.push(third);

  // ── Avatar renderer ─────────────────────────────────────────────────────
  const renderAvatar = (player, size = AVATAR_SIZE) => {
    const avatarUrl = playerAvatars?.[player.playerId];
    const initial = (player.name || getName(player.playerId) || '?').charAt(0).toUpperCase();
    return (
      <View style={[styles.avatarCircle, { width: size, height: size, borderRadius: size / 2 }]}>
        {avatarUrl ? (
          <View style={[styles.avatarInner, { width: size - 6, height: size - 6, borderRadius: (size - 6) / 2 }]}>
            <AvatarImage uri={avatarUrl} width="100%" height="100%" />
          </View>
        ) : (
          <Text style={[styles.avatarInitial, { fontSize: Math.round(size * 0.4) }]}>{initial}</Text>
        )}
      </View>
    );
  };


  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {renderHeader ? renderHeader() : null}
      {/* ── Series Complete card (podium + runners-up + lobby button) ── */}
      <View style={styles.wrap}>
        {!isLogView && <Text style={styles.title}>Series Complete</Text>}

        {/* ── Podium: 2nd | 1st | 3rd ── */}
        <View style={styles.podiumRow}>
          {podiumOrder.map((player) => {
            const badge = BADGES[player.rank] || { emoji: '🎖️', tone: colors.goldLight, borderColor: colors.borderGold };
            const isMe = player.playerId === userId;
            const isFirst = player.rank === 1;
            return (
              <View
                key={player.playerId}
                style={[
                  styles.podiumCard,
                  isFirst && styles.podiumCardFirst,
                  { borderColor: badge.borderColor },
                  isMe && styles.meCard,
                ]}
              >
                {/* Avatar + medal overlay */}
                <View style={styles.avatarWrap}>
                  <View style={{ borderWidth: 3, borderColor: badge.borderColor, borderRadius: (AVATAR_SIZE + 6) / 2, ...shadows.medium }}>
                    {renderAvatar(player, AVATAR_SIZE)}
                  </View>
                  <View style={[styles.medalWrap, { bottom: -MEDAL_OVERLAP }]}>
                    <Text style={[styles.medal, { color: badge.tone }]}>{badge.emoji}</Text>
                  </View>
                </View>
                <Text style={styles.name} numberOfLines={1}>{isMe ? 'You' : (player.name || getName(player.playerId))}</Text>
                <Text style={styles.score}>{player.score || 0} pts</Text>
              </View>
            );
          })}
        </View>

        {/* ── Rest of players ── */}
        {rest.length ? (
          <View style={styles.restList}>
            {rest.map((player) => {
              const isMe = player.playerId === userId;
              const avatarUrl = playerAvatars?.[player.playerId];
              const initial = (player.name || getName(player.playerId) || '?').charAt(0).toUpperCase();
              return (
                <View key={player.playerId} style={[styles.restRow, isMe && styles.meCard]}>
                  <Text style={styles.rank}>#{player.rank}</Text>
                  <View style={[styles.restAvatar]}>
                    {avatarUrl ? (
                      <View style={styles.restAvatarInner}>
                        <AvatarImage uri={avatarUrl} width="100%" height="100%" />
                      </View>
                    ) : (
                      <Text style={styles.restAvatarInitial}>{initial}</Text>
                    )}
                  </View>
                  <Text style={styles.restName}>{isMe ? 'You' : (player.name || getName(player.playerId))}</Text>
                  <Text style={styles.restScore}>{player.score || 0}</Text>
                </View>
              );
            })}
          </View>
        ) : null}

        {!isLogView && (
          <Pressable style={styles.lobbyBtn} onPress={onReturnToLobby}>
            <Text style={styles.lobbyBtnText}>Return to Lobby</Text>
          </Pressable>
        )}
      </View>

      {/* ── Scoreboard — outside the card ── */}
      <View style={styles.scoreSection}>
        <Text style={styles.scoreSectionTitle}>Scoreboard</Text>
        <View style={styles.scoreTableWrap}>
          <ScoreTable
            seatOrder={seatOrder}
            scores={scores}
            getName={getName}
            gameType={gameType}
            userId={userId}
            roundResults={roundResults}
            tricksWon={tricksWon}
            bidding={bidding}
            phase={phase}
            maxRowHeight={400}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  wrap: {
    ...panelStyle,
    padding: spacing.md,
    gap: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.cream,
    fontSize: 20,
    textAlign: 'center',
  },

  // ── Podium ──────────────────────────────────────────────────────────────
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',  // 1st card taller, aligns at bottom
    gap: spacing.sm,
  },
  podiumCard: {
    flex: 1,
    ...panelStyle,
    borderRadius: 10,
    padding: spacing.sm,
    paddingTop: spacing.sm + 4,
    alignItems: 'center',
    gap: 6,
  },
  podiumCardFirst: {
    flex: 1.1,  // 10% wider
    paddingVertical: spacing.sm + 4,
  },
  meCard: {
    backgroundColor: 'rgba(201, 162, 39, 0.12)',
  },

  // ── Avatar + medal ────────────────────────────────────────────────────
  avatarWrap: {
    alignItems: 'center',
    marginBottom: MEDAL_OVERLAP + 2, // room for medal overhang
  },
  avatarCircle: {
    backgroundColor: colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInner: {
    overflow: 'hidden',
  },
  avatarInitial: {
    fontFamily: fonts.heading,
    color: colors.gold,
  },
  medalWrap: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 2,
  },
  medal: {
    fontSize: MEDAL_SIZE,
  },
  name: {
    fontFamily: fonts.heading,
    color: colors.cream,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  score: {
    fontFamily: fonts.heading,
    color: colors.goldLight,
    fontWeight: '700',
    fontSize: 13,
  },

  // ── Rest list ───────────────────────────────────────────────────────────
  restList: {
    ...panelStyle,
    borderRadius: 10,
    overflow: 'hidden',
  },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderGold,
    gap: spacing.sm,
  },
  rank: {
    fontFamily: fonts.heading,
    width: 34,
    color: colors.goldLight,
    fontWeight: '700',
    fontSize: 13,
  },
  restAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  restAvatarInner: {
    width: 26,
    height: 26,
    borderRadius: 13,
    overflow: 'hidden',
  },
  restAvatarInitial: {
    fontFamily: fonts.heading,
    color: colors.gold,
    fontSize: 12,
  },
  restName: {
    fontFamily: fonts.body,
    flex: 1,
    color: colors.cream,
    fontWeight: '600',
    fontSize: 13,
  },
  restScore: {
    fontFamily: fonts.heading,
    color: colors.creamMuted,
    fontWeight: '700',
    fontSize: 13,
  },

  // ── Score section (outside the card) ──────────────────────────────────
  scoreSection: {
    gap: spacing.sm,
  },
  scoreSectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 13,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  scoreTableWrap: {
    ...panelStyle,
    borderRadius: 10,
    padding: 0,
    overflow: 'hidden',
  },

  // ── Lobby button ────────────────────────────────────────────────────────
  lobbyBtn: {
    ...buttonStyles.base,
    ...buttonStyles.primary,
    width: '100%',
  },
  lobbyBtnText: {
    ...buttonStyles.primaryText,
  },
});
