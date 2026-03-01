import { useState, useEffect, useRef } from "react";

/**
 * Detects when a new card is played (new entry in plays[]) and
 * returns the key of the animating card for fly-in CSS.
 *
 * @param {Array} plays - Array of { playerId, card } objects (currentTrick.plays)
 * @param {Function} keyFn - Function to generate a unique key from a play: (play) => string
 * @param {number} duration - Animation duration in ms (default 600)
 * @returns {{ animatingCardKey: string|null }}
 */
export function useCardAnimation(plays = [], keyFn, duration = 600) {
    const [animatingCardKey, setAnimatingCardKey] = useState(null);
    const prevLengthRef = useRef(0);

    useEffect(() => {
        const prevLen = prevLengthRef.current;
        const currLen = plays.length;

        if (currLen > prevLen && currLen > 0) {
            // A new card was played — animate the latest one
            const newPlay = plays[currLen - 1];
            const key = keyFn ? keyFn(newPlay) : `${currLen}`;
            setAnimatingCardKey(key);

            const timer = setTimeout(() => setAnimatingCardKey(null), duration);
            prevLengthRef.current = currLen;
            return () => clearTimeout(timer);
        }

        // If plays shrink (new trick), reset
        if (currLen < prevLen) {
            prevLengthRef.current = currLen;
            setAnimatingCardKey(null);
        }
    }, [plays, keyFn, duration]);

    // Also reset when plays goes to 0 (trick cleared)
    useEffect(() => {
        if (plays.length === 0) {
            prevLengthRef.current = 0;
        }
    }, [plays.length]);

    return { animatingCardKey };
}
