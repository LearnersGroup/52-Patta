import { memo, useState } from "react";

/**
 * Prompt shown when the current player is void in the led suit and may
 * optionally reveal the band hukum hidden trump.
 * Clicking "Play without revealing" dismisses the prompt locally —
 * the player then plays a card normally.
 */
const RevealTrumpPrompt = memo(({ onReveal }) => {
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    return (
        <div className="mendikot-reveal-prompt">
            <div className="mendikot-reveal-prompt-dialog">
                <div className="mendikot-reveal-prompt-text">
                    You have no cards in the led suit.<br />
                    Reveal the hidden trump?
                </div>
                <div className="mendikot-reveal-prompt-actions">
                    <button
                        className="btn-primary mendikot-reveal-yes"
                        onClick={onReveal}
                    >
                        Reveal Trump
                    </button>
                    <button
                        className="btn-secondary mendikot-reveal-no"
                        onClick={() => setDismissed(true)}
                    >
                        Play without revealing
                    </button>
                </div>
            </div>
        </div>
    );
});

RevealTrumpPrompt.displayName = "RevealTrumpPrompt";
export default RevealTrumpPrompt;
