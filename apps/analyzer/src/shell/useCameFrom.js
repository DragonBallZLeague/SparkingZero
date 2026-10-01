import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Where the current page was opened from, so a detail page's back button can
 * say "Budokai" and go back there, rather than always "All characters".
 *
 * Each history entry remembers the page (pathname + search) that pushed it.
 * A replace - a filter or tab change, a canonical-URL rewrite - keeps the
 * entry's origin; a push to another page records the page it left. The origin
 * is therefore always the previous history entry, and going back to it is
 * navigate(-1), which returns to it exactly as it was left (its sort, tab and
 * filters). Browser Back and Forward land on entries that already know theirs.
 *
 * Origins live in memory, so a page opened from a pasted link, or refreshed,
 * has none: null, and the page offers its list instead. (A refresh of a deep
 * link goes through the site's 404 page, which drops the history entry's
 * state, so there is no key left to remember it by.)
 *
 * Call it once per render of the app shell; it records the navigation as it
 * reads it.
 */
const origins = new Map();
let last = null;

export function useCameFrom() {
  const location = useLocation();
  const type = useNavigationType();
  if (!last || last.key !== location.key) {
    if (last && !origins.has(location.key)) {
      let origin = null;
      if (type === 'REPLACE') origin = origins.get(last.key) || null;
      else if (type === 'PUSH' && last.pathname !== location.pathname) origin = { pathname: last.pathname, search: last.search };
      if (origin) origins.set(location.key, origin);
    }
    last = { key: location.key, pathname: location.pathname, search: location.search };
  }
  return origins.get(location.key) || null;
}
