/**
 * Loads the compact match corpus emitted by scripts/generate-br-aggregates.js.
 *
 * Replaces the old bulk path, which fetched every selected file from
 * public/BR_Data/ individually - roughly 2,200 requests and 67 MB on a default
 * page load. Matches are now grouped into one shard per BR_Data/<Top>/<Sub>
 * folder, so selecting a season or a team's tests costs a single request
 * (~100-150 KB gzipped) instead of hundreds.
 *
 * Shards preserve the original match JSON shape, so everything downstream
 * (statCalculations.js, utils/aggregation/*) consumes them unchanged. This is
 * verified over the whole corpus by scripts/verify-br-aggregates.mjs.
 *
 * Single-match navigation deliberately still fetches the raw file from
 * public/BR_Data/ - it is one request and keeps full fidelity for that view.
 */

/** Must match CORPUS_VERSION in scripts/generate-br-aggregates.js. */
const EXPECTED_CORPUS_VERSION = 1;

const CORPUS_DIR = 'br-aggregates';

let manifestPromise = null;
/** slug -> Promise<Map<matchName, entry>> */
const shardPromises = new Map();

function baseUrl() {
  return (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL)
    ? import.meta.env.BASE_URL
    : '';
}

/**
 * Fetches the corpus manifest once per session. Resolves to null when the corpus
 * is absent or the wrong version, which makes callers fall back to raw files
 * rather than showing an empty app.
 */
export function loadCorpusManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch(`${baseUrl()}${CORPUS_DIR}/index.json`)
      .then(res => (res.ok ? res.json() : null))
      .then(manifest => {
        if (!manifest || manifest.version !== EXPECTED_CORPUS_VERSION) {
          if (manifest) {
            console.warn(
              `corpusLoader: corpus version ${manifest.version} != expected ${EXPECTED_CORPUS_VERSION}; ` +
              'falling back to raw BR_Data files. Re-run npm run build-aggregates.'
            );
          }
          return null;
        }
        const byFolder = new Map();
        manifest.shards.forEach(shard => {
          byFolder.set(`${shard.topFolder}/${shard.subFolder}`, shard);
        });
        return { ...manifest, byFolder };
      })
      .catch(() => null);
  }
  return manifestPromise;
}

/** "Tests/Tiny Terrors/foo.json" -> "Tests/Tiny Terrors" */
function folderKeyForMatch(matchName) {
  const parts = String(matchName).split('/');
  if (parts.length < 3) return null;
  return `${parts[0]}/${parts[1]}`;
}

function loadShard(slug) {
  if (!shardPromises.has(slug)) {
    const promise = fetch(`${baseUrl()}${CORPUS_DIR}/${slug}.json`)
      .then(res => (res.ok ? res.json() : null))
      .then(payload => {
        const byName = new Map();
        if (payload && Array.isArray(payload.files)) {
          payload.files.forEach(entry => byName.set(entry.name, entry));
        }
        return byName;
      })
      .catch(() => new Map());
    shardPromises.set(slug, promise);
  }
  return shardPromises.get(slug);
}

/** Fetches one raw match file. Used as the per-file fallback. */
async function fetchRawMatch(matchName, extractTags) {
  try {
    const res = await fetch(`${baseUrl()}BR_Data/${matchName}`);
    if (!res.ok) return null;
    const content = await res.json();
    return { name: matchName, content, tags: extractTags ? extractTags(content) : null };
  } catch {
    return null;
  }
}

/**
 * Loads the given match files, preferring the compact corpus.
 *
 * @param {string[]} matchNames   Relative paths, e.g. "Seasons/Season 0/x.json".
 * @param {object}   options
 * @param {Function} options.onProgress  Called with the accumulated results after
 *   each shard, so views can render before everything has arrived.
 * @param {Function} options.isStale     Polled between shards; return true to abort
 *   a superseded load.
 * @param {Function} options.extractTags Fallback tag extractor for raw files.
 * @returns {Promise<Array<{name, content, tags}>>} in `matchNames` order.
 */
export async function loadMatches(matchNames, { onProgress, isStale, extractTags } = {}) {
  const names = Array.isArray(matchNames) ? matchNames.filter(n => n && n.endsWith('.json')) : [];
  if (names.length === 0) return [];

  const manifest = await loadCorpusManifest();
  if (isStale && isStale()) return [];

  // Group requested matches by shard, preserving first-seen shard order.
  const byShard = new Map();
  const unresolved = [];
  for (const name of names) {
    const shard = manifest ? manifest.byFolder.get(folderKeyForMatch(name)) : null;
    if (!shard) {
      unresolved.push(name);
      continue;
    }
    if (!byShard.has(shard.slug)) byShard.set(shard.slug, []);
    byShard.get(shard.slug).push(name);
  }

  const resultsByName = new Map();
  const ordered = () => names.map(n => resultsByName.get(n)).filter(Boolean);

  for (const [slug, wanted] of byShard) {
    if (isStale && isStale()) return [];
    const shardIndex = await loadShard(slug);
    if (isStale && isStale()) return [];

    const missing = [];
    for (const name of wanted) {
      const entry = shardIndex.get(name);
      if (entry) {
        resultsByName.set(name, { name: entry.name, content: entry.content, tags: entry.tags, seq: entry.seq });
      } else {
        // In the corpus' shard but not in it - e.g. a file added since the last
        // prebuild. Fall back rather than dropping the match silently.
        missing.push(name);
      }
    }
    if (missing.length) unresolved.push(...missing);
    if (onProgress) onProgress(ordered());
  }

  if (unresolved.length) {
    if (!manifest) {
      console.warn(`corpusLoader: compact corpus unavailable; fetching ${unresolved.length} file(s) individually.`);
    } else {
      console.warn(`corpusLoader: ${unresolved.length} match(es) not in the corpus; fetching individually. Re-run npm run build-aggregates.`);
    }
    const BATCH_SIZE = 200;
    for (let i = 0; i < unresolved.length; i += BATCH_SIZE) {
      if (isStale && isStale()) return [];
      const batch = unresolved.slice(i, i + BATCH_SIZE);
      const fetched = await Promise.all(batch.map(name => fetchRawMatch(name, extractTags)));
      fetched.forEach(entry => { if (entry) resultsByName.set(entry.name, entry); });
      if (onProgress) onProgress(ordered());
    }
  }

  return ordered();
}
