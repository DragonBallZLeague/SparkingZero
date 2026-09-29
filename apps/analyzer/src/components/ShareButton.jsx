import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Link2, AlertCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';

/**
 * Copies an absolute, shareable link to whatever is currently on screen.
 *
 * These links get pasted into Discord, which is the whole reason the URL scheme
 * exists. Two things follow from that and are the point of this component:
 *
 *  1. **The link must be absolute.** react-router gives relative paths, and a
 *     relative path in a chat message is useless. The origin plus the app's
 *     BASE_URL is prepended here so the button is the one place that knows how
 *     to build a link someone else can open.
 *
 *  2. **The current view must be in the link.** By default it shares the live
 *     location, path AND query string, so a filtered or scoped view travels with
 *     the link rather than opening on defaults for the recipient.
 *
 * Callers wanting to share something other than the live location pass `path`
 * (already app-relative, e.g. from ROUTES.character(...)).
 *
 * Deliberately NOT sharing an image card yet: that is a separate job with its
 * own dependency, and a broken or half-rendered image is worse than a link.
 */
export default function ShareButton({
  path = null,
  label = 'Share link',
  title = 'Copy a link to this view',
  darkMode = false,
  className = '',
}) {
  const location = useLocation();
  // 'idle' | 'copied' | 'failed'
  const [state, setState] = useState('idle');
  const timer = useRef(null);

  // A copy that resolves after unmount would otherwise set state on a dead
  // component; the button is on a page you can navigate away from immediately.
  useEffect(() => () => clearTimeout(timer.current), []);

  const buildUrl = useCallback(() => {
    const relative = path != null ? path : location.pathname + location.search;
    // BASE_URL is '/SparkingZero/analyzer/' in production and '/' in dev, and is
    // the same value main.jsx hands BrowserRouter as its basename - so joining
    // them here reproduces exactly what the address bar shows.
    const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
    const suffix = relative.startsWith('/') ? relative : '/' + relative;
    return window.location.origin + base + suffix;
  }, [path, location.pathname, location.search]);

  const onClick = useCallback(async () => {
    const url = buildUrl();
    clearTimeout(timer.current);

    // navigator.clipboard needs a secure context, so it is missing on plain-HTTP
    // LAN testing. Fall back to the old execCommand trick rather than failing,
    // since testing this app over the LAN is a normal thing to do.
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        ok = true;
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      }
    } catch {
      ok = false;
    }

    setState(ok ? 'copied' : 'failed');
    timer.current = setTimeout(() => setState('idle'), ok ? 1800 : 3000);
  }, [buildUrl]);

  const copied = state === 'copied';
  const failed = state === 'failed';
  const Icon = copied ? Check : failed ? AlertCircle : Link2;

  const tone = copied
    ? (darkMode ? 'bg-green-900/60 border-green-700 text-green-300' : 'bg-green-50 border-green-300 text-green-700')
    : failed
      ? (darkMode ? 'bg-red-900/60 border-red-700 text-red-300' : 'bg-red-50 border-red-300 text-red-700')
      : (darkMode
          ? 'bg-transparent border-gray-700 text-slate-200 hover:border-slate-400/[.35]'
          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50');

  return (
    <button
      type="button"
      onClick={onClick}
      // Tailwind preflight is off in this app, so a <button> keeps the UA's
      // default background and border unless they are stated. Hence border-solid
      // and an explicit background in every branch above.
      className={`inline-flex items-center gap-1.5 h-8 px-[11px] rounded-[8px] border border-solid text-[13px] font-medium whitespace-nowrap
        cursor-pointer transition-colors ${tone} ${className}`}
      title={failed ? 'Could not copy - the link is in the address bar' : title}
      aria-live="polite"
    >
      <Icon className="w-4 h-4" />
      {copied ? 'Link copied' : failed ? 'Copy failed' : label}
    </button>
  );
}
