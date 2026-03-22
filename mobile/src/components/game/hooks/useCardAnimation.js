import { useEffect, useRef, useState } from 'react';

/**
 * Detects a newly added card in current trick and returns its key so UI can
 * run fly-in animation for just that card.
 */
export function useCardAnimation(plays = [], keyFn, duration = 600) {
  const [animatingCardKey, setAnimatingCardKey] = useState(null);
  const prevLengthRef = useRef(0);

  useEffect(() => {
    const prevLen = prevLengthRef.current;
    const currLen = plays.length;

    if (currLen > prevLen && currLen > 0) {
      const newest = plays[currLen - 1];
      const nextKey = keyFn ? keyFn(newest, currLen - 1) : `${currLen - 1}`;
      setAnimatingCardKey(nextKey);

      const timer = setTimeout(() => setAnimatingCardKey(null), duration);
      prevLengthRef.current = currLen;
      return () => clearTimeout(timer);
    }

    if (currLen < prevLen) {
      setAnimatingCardKey(null);
      prevLengthRef.current = currLen;
    }
  }, [plays, keyFn, duration]);

  useEffect(() => {
    if (!plays.length) prevLengthRef.current = 0;
  }, [plays.length]);

  return { animatingCardKey };
}
