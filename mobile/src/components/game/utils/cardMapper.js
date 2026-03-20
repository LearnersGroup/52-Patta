const SUIT_SYMBOLS = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣',
};

const SUIT_ORDER = {
  S: 0,
  D: 1,
  C: 2,
  H: 3,
};

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

export function cardKey(card) {
  if (!card) return 'unknown-card';
  return `${card.suit}${card.rank}_${card.deckIndex ?? 0}`;
}

export function suitSymbol(suit) {
  return SUIT_SYMBOLS[suit] || suit;
}

export function isRedSuit(suit) {
  return suit === 'H' || suit === 'D';
}

export function isCardInList(card, list = []) {
  if (!card || !Array.isArray(list)) return false;

  return list.some(
    (candidate) =>
      candidate &&
      candidate.suit === card.suit &&
      candidate.rank === card.rank &&
      (candidate.deckIndex ?? 0) === (card.deckIndex ?? 0)
  );
}

export function sortCardsBySuit(cards = []) {
  return [...cards].sort((a, b) => {
    const suitDiff = (SUIT_ORDER[a?.suit] ?? 99) - (SUIT_ORDER[b?.suit] ?? 99);
    if (suitDiff !== 0) return suitDiff;
    return (RANK_ORDER[a?.rank] ?? -1) - (RANK_ORDER[b?.rank] ?? -1);
  });
}
