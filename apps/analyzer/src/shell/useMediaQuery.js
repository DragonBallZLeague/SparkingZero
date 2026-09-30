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

/**
 * A wide table's size for the screen: 'phone' below 640px, 'tablet' from
 * there until its full layout fits (`fullFrom`, in px, measured per table),
 * 'full' after. A tablet draws the phone layout with more columns
 * (PICKED_COLUMNS), so no table pushes the page sideways (the league's ask,
 * 2026-09-30: between 640px and about 1,100px the Characters, Teams and Team
 * page tables were wider than the screen).
 */
export function useTableSize(fullFrom) {
  const phone = useIsPhone();
  const narrow = useMediaQuery(`(max-width: ${fullFrom - 1}px)`);
  return phone ? 'phone' : narrow ? 'tablet' : 'full';
}

/** How many stat columns a compact table shows: a phone two, a tablet four. */
export const PICKED_COLUMNS = { phone: 2, tablet: 4 };

/** A stat column's width in a compact table: a phone's are tight, a tablet's roomier. */
export const pickedWidth = (size, i = 1) => (size === 'phone' ? ['54px', '58px'][i] || '58px' : '72px');
