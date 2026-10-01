import React, { useState } from 'react';
import { teamByTag } from '../utils/teams.js';

/**
 * A team's logo, from public/team-logos/<slug>.webp (96px copies of the
 * website's logos, made by scripts/build-team-logos.mjs).
 *
 * A team without a file shows a neutral tile with its initial, like
 * <Portrait>, rather than a broken image. Logos are drawn whole on a
 * transparent ground, so there is no tile behind them.
 *
 * `tag` is the team's identifier in the match data ("Master and Student").
 */
export default function TeamLogo({ tag, size = 34, rounded = 8, className = '' }) {
  const [failed, setFailed] = useState(false);
  const team = teamByTag(tag);
  const box = { width: size, height: size, borderRadius: rounded, flex: 'none' };
  if (!team || failed) {
    return (
      <span aria-hidden="true"
        className={`inline-flex items-center justify-center bg-gray-700 font-bold text-slate-400 ${className}`}
        style={{ ...box, fontSize: Math.round(size * 0.42) }}>
        {((team && team.name) || '?').trim().charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    <img src={`${import.meta.env.BASE_URL}team-logos/${team.slug}.webp`} alt="" loading="lazy" decoding="async"
      width={size} height={size} onError={() => setFailed(true)}
      className={`block object-contain ${className}`} style={box} />
  );
}
