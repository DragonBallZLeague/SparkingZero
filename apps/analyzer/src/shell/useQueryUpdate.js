import { useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * A query string with its commas left readable. URLSearchParams writes a comma
 * as %2C, so `matchType=Season,Test` would become `matchType=Season%2CTest` in
 * every link someone pastes into Discord. Commas are safe in a query value,
 * and parsing reads both forms, so links shared either way keep working.
 */
export function prettySearch(params) {
  const s = params.toString().replace(/%2C/gi, ',');
  return s ? `?${s}` : '';
}

/**
 * Updates the query string in place (replace: no Back stop for each filter
 * tweak), keeping commas readable. `edit` gets a copy of the current params and
 * either mutates it or returns a new URLSearchParams.
 */
export function useQueryUpdate() {
  const navigate = useNavigate();
  const location = useLocation();
  const current = useRef(location);
  current.current = location;
  return useCallback(edit => {
    const loc = current.current;
    const params = new URLSearchParams(loc.search);
    const returned = edit(params);
    const next = returned instanceof URLSearchParams ? returned : params;
    navigate({ pathname: loc.pathname, search: prettySearch(next), hash: loc.hash }, { replace: true });
  }, [navigate]);
}
