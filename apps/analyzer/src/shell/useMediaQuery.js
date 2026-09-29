import { useEffect, useState } from 'react';

/** Whether a media query matches, kept live. */
export function useMediaQuery(query) {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return matches;
}

/** The phone breakpoint every shell layout switches at (Tailwind's `sm`). */
export const PHONE_QUERY = '(max-width: 639px)';
export const useIsPhone = () => useMediaQuery(PHONE_QUERY);
