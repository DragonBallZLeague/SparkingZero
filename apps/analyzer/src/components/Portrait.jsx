import React, { useState } from 'react';

/**
 * A character's face, from public/portraits/<id>.webp (96px cuts of the
 * Calculator's in-game icons, made by scripts/build-portraits.mjs).
 *
 * A character without a file - one that reached match data before
 * characters.csv or the portrait set caught up, or any id we cannot resolve -
 * shows a neutral tile with its initial rather than a broken image.
 *
 * `size` is the rendered edge in px; the files are 96px, so anything up to 48
 * is sharp on a 2x screen.
 */
export default function Portrait({ id, name = '', size = 34, rounded = 8, className = '', dim = false }) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size, borderRadius: rounded, flex: 'none' };
  const faded = dim ? { filter: 'saturate(.45)', opacity: 0.55 } : null;
  if (!id || failed) {
    return (
      <span
        aria-hidden="true"
        className={`inline-flex items-center justify-center bg-gray-700 text-slate-400 font-bold ${className}`}
        style={{ ...box, ...faded, fontSize: Math.round(size * 0.42) }}
      >
        {(name || '?').trim().charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      src={`${import.meta.env.BASE_URL}portraits/${id}.webp`}
      alt=""
      loading="lazy"
      decoding="async"
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={`block bg-gray-700 ${className}`}
      style={{ ...box, ...faded }}
    />
  );
}
