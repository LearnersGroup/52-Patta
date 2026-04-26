bawawdaimport { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppBackground from '../../src/components/shared/AppBackground';
import {
  buttonStyles,
  colors,
  fonts,
  panelStyle,
  spacing,
  typography,
} from '../../src/styles/theme';

// ── Rule data by game ───────────────────────────────────────────────────────

const GAMES = {
  kaliteri: {
    title: 'Kaliteri',
    subtitle: 'Patta',
    icon: '3♠',
    phases: [
      {
        title: 'Introduction',
        body: [
          'Kaliteri (Patta) is a team-based trick-taking card game for 4–13 players.',
          '1 standard deck is used for 4–5 players. 2 decks are used for 6–13 players.',
          'Teams are not fixed — they form dynamically each round when the bid-winner secretly selects partner cards.',
          'The goal is to win tricks containing high-value cards and meet (or exceed) the bid your team committed to.',
        ],
      },
      {
        title: 'Shuffling & Dealing',
        body: [
          'Three shuffle styles are used in sequence: Riffle (splits the deck and interleaves), Hindu (pulls packets from within and places on top), and Overhand (strips cards from the top and restacks).',
          'A cut may follow — the deck is split at a random point and the halves swapped.',
          'Cards are dealt one at a time, clockwise, starting from the player to the dealer\'s left.',
          'If the total cards don\'t divide evenly, the lowest-value 2s are removed before dealing so every player gets the same number of cards.',
        ],
      },
      {
        title: 'Bidding',
        body: [
          'Bidding is open — any active (non-passed) player can bid at any time during the bidding window.',
          'Each new bid must exceed the current highest by the bid increment (5 points).',
          'Bid range: 150–250 (1 deck) or 300–500 (2 decks).',
          'Hitting the maximum bid ends bidding immediately.',
          'Players may pass at any time. Once you pass, you cannot bid again that round.',
          'If every player passes without a single bid, the hand is re-shuffled and re-dealt by the same dealer.',
        ],
      },
      {
        title: 'PowerHouse & Partner Selection',
        body: [
          'The winning bidder (leader) selects a trump suit — this is called the PowerHouse.',
          'The leader also selects partner card(s) — specific cards NOT in their hand. Whoever holds those cards is secretly on the leader\'s team.',
          'The number of partners depends on player count: 1 partner for 4 players, 2 for 5–6, etc.',
          'Partners are revealed only when the partner card is actually played during a trick — until then, alliances are hidden.',
          'With 2 decks: if the leader holds one copy of a card, they can choose which copy (1st or 2nd played) identifies the partner.',
        ],
      },
      {
        title: 'Playing Tricks',
        body: [
          'The leader leads the first trick by playing any card.',
          'Play continues clockwise. Each player must follow the suit that was led if they have a card of that suit.',
          'If a player has no cards of the led suit, they may play any card — including a trump card.',
          'Trump (PowerHouse suit) cards beat all non-trump cards.',
          'If no trump is played, the highest-ranked card of the led suit wins the trick.',
          'With 2 decks: if two identical cards appear in the same trick, the one played later wins.',
          'The winner of each trick leads the next one.',
        ],
      },
      {
        title: 'Scoring',
        body: [
          'Point cards: A, K, Q, J, 10 = 10 points each. 5 = 5 points. 3♠ (KaliTiri) = 30 points. All other cards = 0.',
          'If the bid team\'s total points meet or exceed their bid → each member scores the team\'s full total.',
          'If the bid team fails → the leader loses the bid amount (can go negative); other bid-team members receive half of the opposing team\'s points.',
          'The opposing (non-bid) team always scores their own total points regardless.',
        ],
      },
    ],
  },
  judgement: {
    title: 'Judgement',
    subtitle: 'Katchufool',
    icon: '♠♦♣♥',
    phases: [
      {
        title: 'Introduction',
        body: [
          'Judgement (Katchufool) is an individual trick-taking card game for 3–13 players.',
          '1 deck for up to 6 players, 2 decks for 7–13 players.',
          'The game is played over multiple rounds. Each round uses a different number of cards per player — ascending from 1, then optionally descending back down.',
          'There are no teams. Every player plays for themselves. The key skill is accurately predicting how many tricks you will win.',
        ],
      },
      {
        title: 'Shuffling & Dealing',
        body: [
          'Same shuffling process as Kaliteri — Riffle, Hindu, and Overhand shuffles in sequence, with an optional cut.',
          'Each round, the number of cards dealt to each player changes (e.g. round 1 = 1 card each, round 2 = 2 cards each, etc.).',
          'After dealing, the top card of the remaining deck is flipped face-up. Its suit becomes the trump suit for that round.',
          'Cards are dealt one at a time, clockwise, starting from the player to the dealer\'s left.',
        ],
      },
      {
        title: 'Bidding',
        body: [
          'Bidding is sequential — players bid one at a time starting from the player after the dealer, going clockwise.',
          'Each player predicts exactly how many tricks they will win this round (from 0 up to the number of cards in hand).',
          'The dealer (last to bid) has a special constraint: they cannot bid a number that makes the total of all bids equal the number of tricks available. This ensures the round can never be "perfectly satisfied" by all players.',
          'All bids are final — once placed, they cannot be changed.',
        ],
      },
      {
        title: 'Playing Tricks',
        body: [
          'The player after the dealer leads the first trick with any card.',
          'Same trick rules as Kaliteri: follow the led suit if able, trump beats non-trump, highest card of the led suit wins if no trump is played.',
          'The winner of each trick leads the next one.',
        ],
      },
      {
        title: 'Scoring',
        body: [
          'If you win exactly the number of tricks you bid → you score 10 + your bid amount (e.g. bid 3 and win 3 = 13 points).',
          'If you miss your bid (win more or fewer tricks than predicted) → you score 0 for that round.',
          'Scores accumulate across all rounds. The player with the highest total at the end of the series wins.',
          'Bidding 0 and winning 0 tricks is a valid strategy — it scores 10 points.',
        ],
      },
    ],
  },
  mendikot: {
    title: 'Mendikot',
    subtitle: 'Band / Cut Hukum',
    icon: '10♣',
    phases: [
      {
        title: 'Introduction',
        body: [
          'Mendikot is a team-based trick-taking game for even player counts: 4, 6, 8, 10, or 12.',
          '1 deck is typically used for up to 6 players; 2 decks for larger tables.',
          'Teams are fixed (Team A vs Team B) for the series of rounds.',
          'The objective is to capture 10s (Mendi cards) and win key tricks.',
        ],
      },
      {
        title: 'Shuffling & Dealing',
        body: [
          'Same shuffle pipeline as other games: Riffle, Hindu, and Overhand, with an optional cut.',
          'Cards are dealt one-by-one clockwise from the player to the dealer\'s left.',
          'If needed, low cards (2s) are removed before dealing so all players receive equal cards.',
        ],
      },
      {
        title: 'Trump Modes',
        body: [
          'Band Hukum: a closed trump card is selected before play and hidden until reveal is triggered.',
          'A reveal can be requested when a player is void in the led suit (cannot follow suit).',
          'Cut Hukum: no trump is preselected; first off-suit play by a void player sets trump immediately.',
        ],
      },
      {
        title: 'Playing Tricks',
        body: [
          'Leader starts, then play continues clockwise.',
          'Players must follow led suit if possible; otherwise any card can be played.',
          'Trump beats non-trump; if no trump is played, highest card in led suit wins.',
          'With 2 decks, if identical cards compete in a trick, the later-played copy wins.',
          'Trick winner leads the next trick.',
        ],
      },
      {
        title: 'Round Result & Series',
        body: [
          'Round priority is: 52-card Mendikot → Mendikot → win-by-mendi → win-by-tricks.',
          '52-card Mendikot = one team captures all 10s and all tricks.',
          'Mendikot = one team captures all 10s.',
          'If both teams split 10s, trick count decides; ties use first-to-N-tricks tie-break.',
          'Series winner is based on cumulative round results across configured rounds.',
        ],
      },
    ],
  },
};

const GAME_ICONS = {
  kaliteri: require('../../assets/Icons/Kaliteri_Icon.png'),
  judgement: require('../../assets/Icons/Judgement_Icon.png'),
  mendikot: require('../../assets/Icons/Mendi_Icon.png'),
};

// ── Screen ──────────────────────────────────────────────────────────────────

export default function GameRulesScreen() {
  const { game } = useLocalSearchParams();
  const router = useRouter();
  const gameParam = Array.isArray(game) ? game[0] : game;
  const gameKey = typeof gameParam === 'string'
    ? decodeURIComponent(gameParam).trim().toLowerCase()
    : '';
  const data = GAMES[gameKey];
  const gameIcon = GAME_ICONS[gameKey];

  if (!data) {
    return (
      <AppBackground>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Unknown game: {game}</Text>
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>
        </View>

        <View style={styles.titleBlock}>
          {gameIcon ? (
            <Image source={gameIcon} style={styles.iconImage} />
          ) : (
            <Text style={styles.icon}>{data.icon}</Text>
          )}
          <Text style={styles.title}>{data.title}</Text>
          <Text style={styles.subtitle}>{data.subtitle}</Text>
        </View>

        {/* Phases */}
        {data.phases.map((phase, i) => (
          <View key={i} style={styles.phaseCard}>
            <View style={styles.phaseHeader}>
              <View style={styles.phaseBadge}>
                <Text style={styles.phaseBadgeText}>{i + 1}</Text>
              </View>
              <Text style={styles.phaseTitle}>{phase.title}</Text>
            </View>
            <View style={styles.phaseBody}>
              {phase.body.map((item, j) => (
                <View key={j} style={styles.bulletRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </AppBackground>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: colors.redSuit, fontFamily: fonts.body, fontSize: 16 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.md,
  },
  backText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.gold,
  },

  // Title block
  titleBlock: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
  },
  icon: {
    fontSize: 36,
    color: colors.cream,
    marginBottom: spacing.xs,
  },
  iconImage: {
    width: 72,
    height: 72,
    resizeMode: 'contain',
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.gold,
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.creamMuted,
  },

  // Phase cards
  phaseCard: {
    ...panelStyle,
    padding: spacing.md,
    gap: spacing.sm,
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201, 162, 39, 0.15)',
  },
  phaseBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(201, 162, 39, 0.15)',
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseBadgeText: {
    fontFamily: fonts.heading,
    fontSize: 12,
    color: colors.gold,
  },
  phaseTitle: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: colors.gold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  phaseBody: {
    gap: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  bullet: {
    color: colors.gold,
    fontSize: 14,
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.cream,
    lineHeight: 22,
  },
});
