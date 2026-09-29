import { useEffect, useRef, useState } from 'react';
import { loadMatches } from '../utils/corpusLoader.js';

const tagsOf = content => (content && typeof content === 'object' && content.tags && typeof content.tags === 'object' ? content.tags : null);

/**
 * Loads the matches at `paths` from the compact corpus (public/br-aggregates/,
 * one request per season/team folder, see utils/corpusLoader.js).
 *
 * This replaced the file tree as the thing that decides what loads: the scope
 * bar's tag filter produces the paths, and every page works from what comes
 * back. A newer call makes an older one stale, so fast scope changes never let
 * an old batch overwrite a new one. It renders progressively, so pages fill in
 * while the later shards arrive.
 *
 * Returns { matches, loading }: matches is null until the first batch for the
 * current paths lands; loading is true until the last one does.
 */
export function useScopedMatches(paths, enabled = true) {
  const [matches, setMatches] = useState(null);
  const [loading, setLoading] = useState(false);
  const gen = useRef(0);

  useEffect(() => {
    if (!enabled || !paths) return undefined;
    const mine = ++gen.current;
    const isStale = () => gen.current !== mine;
    if (!paths.length) {
      setMatches([]);
      setLoading(false);
      return undefined;
    }
    setMatches(null);
    setLoading(true);
    loadMatches(paths, {
      isStale,
      extractTags: tagsOf,
      onProgress: partial => { if (!isStale()) setMatches([...partial]); },
    })
      .then(loaded => { if (!isStale()) { setMatches(loaded); setLoading(false); } })
      .catch(() => { if (!isStale()) { setMatches([]); setLoading(false); } });
    return undefined;
  }, [paths, enabled]);

  return { matches, loading };
}
