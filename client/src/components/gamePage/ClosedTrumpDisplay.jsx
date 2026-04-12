import { memo } from "react";

/**
 * Shows a face-down card indicator with the holder's name.
 * Visible during the playing phase until band hukum trump is revealed.
 */
const ClosedTrumpDisplay = memo(({ placeholder }) => {
    if (!placeholder) return null;
    return (
        <div className="mendikot-closed-trump">
            <div className="mendikot-closed-trump-card" title="Hidden trump card">
                <div className="mendikot-closed-trump-back">?</div>
            </div>
            <div className="mendikot-closed-trump-label">
                {placeholder.holderName}&apos;s trump
            </div>
        </div>
    );
});

ClosedTrumpDisplay.displayName = "ClosedTrumpDisplay";
export default ClosedTrumpDisplay;
