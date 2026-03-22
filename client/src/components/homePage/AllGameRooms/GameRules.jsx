import { useState } from "react";

const SHUFFLING = {
    title: "Shuffling",
    items: [
        "Three shuffle styles are used: Riffle (splits the deck and interleaves), Hindu (pulls packets from within and places on top), and Overhand (strips cards from the top and restacks).",
        "Multiple shuffles are performed in sequence for thorough randomisation.",
        "A cut may follow: the deck is split at a random point and the halves swapped.",
    ],
};

const DEALING = {
    title: "Dealing",
    items: [
        "Cards are dealt one at a time, clockwise, starting from the player to the dealer\u2019s left.",
        "Simple Deal \u2014 deck is shuffled, then dealt directly.",
        "Cut-and-Deal \u2014 deck is shuffled, cut (the cut card is revealed), then dealt.",
        "If the total cards don\u2019t divide evenly among players, the lowest-value cards (2s) are removed using balanced suit distribution before dealing.",
    ],
};

const GAME_DATA = {
    kaliteri: {
        name: "Kaliteri (Patta)",
        icon: "3\u2660",
        sections: [
            {
                title: "Overview",
                items: [
                    "Kaliteri (Patta) is a team-based trick-taking game for 4\u201313 players.",
                    "1 deck for 4\u20135 players, 2 decks for 6\u201313 players.",
                    "Teams are formed dynamically each round through partner-card selection.",
                ],
            },
            {
                title: "Bidding",
                items: [
                    "Bidding is open \u2014 any active player can bid at any time.",
                    "Each new bid must exceed the current highest by the bid increment (5 points).",
                    "Bid range: 150\u2013250 (1 deck) or 300\u2013500 (2 decks). Hitting the max ends bidding immediately.",
                    "Players can pass. If everyone passes with no bid, the hand is re-dealt by the same dealer.",
                ],
            },
            {
                title: "PowerHouse (Trump) Selection",
                items: [
                    "The winning bidder (leader) picks a trump suit \u2014 this is the PowerHouse.",
                    "The leader also selects partner card(s) \u2014 cards not in their hand that secretly identify teammates.",
                    "Partners are revealed when the partner card is played during a trick.",
                ],
            },
            {
                title: "Playing Tricks",
                items: [
                    "The leader leads the first trick with any card.",
                    "Players must follow the led suit if able; otherwise any card is legal.",
                    "Trump (PowerHouse) cards beat all non-trump cards.",
                    "Highest card of the led suit wins if no trump is played.",
                    "With 2 decks: if two identical cards are played, the later one wins.",
                ],
            },
            {
                title: "Scoring",
                items: [
                    "Point cards: A, K, Q, J, 10 = 10 pts each; 5 = 5 pts; 3 of Spades (KaliTiri) = 30 pts.",
                    "Bid team meets/exceeds bid \u2192 each member scores the team\u2019s total points.",
                    "Bid team fails \u2192 leader loses the bid amount; other bid-team members get half of the opposing team\u2019s points.",
                    "Opposing team always scores their own total points.",
                ],
            },
        ],
    },
    judgement: {
        name: "Judgement (Katchufool)",
        icon: "\u2660\u2666\u2663\u2665",
        sections: [
            {
                title: "Overview",
                items: [
                    "Judgement (Katchufool) is an individual trick-taking game for 3\u201313 players.",
                    "1 deck for up to 6 players, 2 decks for 7\u201313.",
                    "Played over multiple rounds with ascending (then optionally descending) card counts per round.",
                ],
            },
            {
                title: "Trump",
                items: [
                    "After dealing, the top remaining card is flipped face-up \u2014 its suit is trump for the round.",
                ],
            },
            {
                title: "Bidding",
                items: [
                    "Bidding is sequential, starting from the player after the dealer.",
                    "Each player predicts exactly how many tricks they will win (0 up to the cards in hand).",
                    "The dealer (last to bid) cannot bid a number that makes the total bids equal the number of tricks available.",
                ],
            },
            {
                title: "Playing Tricks",
                items: [
                    "Same trick rules as Kaliteri: follow suit if able, trump beats non-trump, highest card of led suit wins.",
                ],
            },
            {
                title: "Scoring",
                items: [
                    "Win exactly your bid \u2192 score 10 + bid amount.",
                    "Miss your bid (over or under) \u2192 score 0 for that round.",
                    "The player with the highest cumulative score across all rounds wins the series.",
                ],
            },
        ],
    },
};

function RuleSection({ section, defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="rules-section">
            <button
                className="rules-section-header"
                onClick={() => setOpen((v) => !v)}
            >
                <span>{section.title}</span>
                <span className="rules-chevron">{open ? "\u2212" : "+"}</span>
            </button>
            {open && (
                <ul className="rules-section-body">
                    {section.items.map((item, i) => (
                        <li key={i}>{item}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}

const GameRules = () => {
    const [selectedGame, setSelectedGame] = useState(null);

    return (
        <div className="game-rules">
            <div className="game-rules-label">Games</div>

            <div className="game-cards-row">
                {Object.entries(GAME_DATA).map(([key, game]) => (
                    <button
                        key={key}
                        className={`game-card ${selectedGame === key ? "game-card--active" : ""}`}
                        onClick={() => setSelectedGame(selectedGame === key ? null : key)}
                    >
                        <span className="game-card-icon">{game.icon}</span>
                        <span className="game-card-name">{game.name}</span>
                    </button>
                ))}
            </div>

            {selectedGame && (
                <div className="game-rules-body">
                    <RuleSection section={SHUFFLING} />
                    <RuleSection section={DEALING} />
                    <hr className="rules-divider" />
                    {GAME_DATA[selectedGame].sections.map((section, i) => (
                        <RuleSection
                            key={`${selectedGame}-${i}`}
                            section={section}
                            defaultOpen={i === 0}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default GameRules;
