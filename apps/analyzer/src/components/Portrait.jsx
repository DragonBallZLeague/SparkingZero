import React, { useState } from 'react';

/**
 * A character's face, from public/portraits/ (cuts of the Calculator's in-game
 * icons, made by scripts/build-portraits.mjs).
 *
 * A character without a file - one that reached match data before
 * characters.csv or the portrait set caught up, or any id we cannot resolve -
 * shows a neutral tile with its initial rather than a broken image.
 *
 * `size` is the rendered edge in px. The 96px file is sharp up to 48 on a 2x
 * screen; above that the 192px cut (portraits/192/) is offered too, and the
 * browser takes it only where the screen needs it, so a list of small
 * portraits stays light.
 */
const SHARP_ABOVE = 48;
export default function Portrait({ id, name = '', size = 34, rounded = 8, className = '', dim = false }) {
  // What has failed to load, for this id: 1 once a 192px cut was missing
  // (fall back to the 96px file), 2 once there is no file at all.
  const [miss, setMiss] = useState({ id: null, stage: 0 });
  const stage = miss.id === id ? miss.stage : 0;
  const box = { width: size, height: size, borderRadius: rounded, flex: 'none' };
  const faded = dim ? { filter: 'saturate(.45)', opacity: 0.55 } : null;
  if (!id || stage === 2) {
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
  const dir = `${import.meta.env.BASE_URL}portraits/`;
  const sharp = size > SHARP_ABOVE && stage === 0
    ? { srcSet: `${dir}${id}.webp 96w, ${dir}192/${id}.webp 192w`, sizes: `${size}px` }
    : null;
  return (
    <img
      src={`${dir}${id}.webp`}
      {...sharp}
      alt=""
      loading="lazy"
      decoding="async"
      width={size}
      height={size}
      onError={() => setMiss({ id, stage: sharp ? 1 : 2 })}
      className={`block bg-gray-700 ${className}`}
      style={{ ...box, ...faded }}
    />
  );
}
