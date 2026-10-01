/**
 * Restores a deep link that the site-root 404 dispatcher had to bounce.
 *
 * GitHub Pages serves /SparkingZero/404.html for any path that is not a real
 * file, including paths inside a sub-app. scripts/build-404.js injects a
 * dispatcher into that page which stashes the original URL and redirects to the
 * sub-app's own index.html. This puts the URL back before the router reads it,
 * so react-router sees /analyzer/characters/0620_00 rather than /analyzer/.
 *
 * Call it once, at the very top of the app's entry module, BEFORE the router is
 * created. It is a no-op in normal navigation.
 */

/** Must match STORAGE_KEY in scripts/build-404.js. */
const STORAGE_KEY = 'szl:deep-link';

export function restoreDeepLink(basePath) {
  if (typeof window === 'undefined') return;

  let stashed = null;
  try {
    stashed = window.sessionStorage.getItem(STORAGE_KEY);
    if (stashed) window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked (private mode, blocked cookies). The visitor stays on the
    // app root, which still renders - just not the exact page they asked for.
    return;
  }
  if (!stashed) return;

  // Only ever restore a path inside this app. The value is same-origin session
  // storage, but validating keeps a stale or hand-edited entry from navigating
  // somewhere unrelated, and stops one app restoring another app's URL.
  const base = basePath || '/';
  if (stashed.indexOf(base) !== 0) return;

  // Nothing to do if we somehow landed on the exact URL already.
  const current = window.location.pathname + window.location.search + window.location.hash;
  if (stashed === current) return;

  try {
    window.history.replaceState(null, '', stashed);
  } catch {
    // Non-fatal: the app still renders at its root.
  }
}
