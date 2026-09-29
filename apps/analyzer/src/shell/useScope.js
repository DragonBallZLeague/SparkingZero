import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryUpdate } from './useQueryUpdate.js';
import {
  parseScope, writeScope, hasScopeParams, defaultScope, scopePaths,
} from './scopeModel.js';

/**
 * The data scope, read from and written to the query string (see scopeModel.js).
 *
 * The URL is the only copy of it: there is no local state to drift from what a
 * shared link carries. A league URL that says nothing about scope gets the
 * current-season default written in (replace, so it is not a Back stop), and
 * the scope is not `ready` until it has been, so nothing ever loads the whole
 * corpus by accident. Clearing every chip writes an explicit "all" marker
 * instead, so that choice survives a reload or a shared link.
 *
 * `enabled` is false in the Sandbox, whose data is uploads: no default is
 * written there and nothing needs to wait.
 *
 * Returns:
 *   ready     the tag index is in and the scope is final; load nothing before this
 *   scope     { dimensionKey: values[] }
 *   paths     the match paths in scope (null until ready; stable between renders
 *             that do not change the scope)
 *   tagsIndex the raw index, for option lists and counts
 *   setDim    (key, values[]) => void
 *   clear     () => void, every dimension off ("all match data")
 */
export function useScope(enabled = true) {
  const [searchParams] = useSearchParams();
  const update = useQueryUpdate();
  const [tagsIndex, setTagsIndex] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`${import.meta.env.BASE_URL}br-data-tags.json`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(index => { if (alive) setTagsIndex(index); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);

  const hasScope = hasScopeParams(searchParams);
  useEffect(() => {
    if (!enabled || !tagsIndex || hasScope) return;
    update(prev => writeScope(prev, defaultScope(tagsIndex)));
  }, [enabled, tagsIndex, hasScope, update]);

  // Keyed on the scope params only, so a change to anything else in the query
  // string (sort, view, build) does not hand out a new scope or path list.
  const scopeKey = useMemo(() => JSON.stringify(parseScope(searchParams)), [searchParams]);
  const scope = useMemo(() => JSON.parse(scopeKey), [scopeKey]);
  const ready = !!tagsIndex && (!enabled || hasScope);
  const paths = useMemo(() => (ready ? scopePaths(tagsIndex, scope) : null), [ready, tagsIndex, scope]);

  const setDim = useCallback((key, values) => {
    update(prev => writeScope(prev, { ...parseScope(prev), [key]: values }));
  }, [update]);
  const clear = useCallback(() => {
    update(prev => writeScope(prev, {}));
  }, [update]);

  return { ready, failed, scope, paths, tagsIndex, setDim, clear };
}
