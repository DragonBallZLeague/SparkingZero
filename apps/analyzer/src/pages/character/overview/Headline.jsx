import React from 'react';
import { rankColor, provisionalColor, styleColor, NEUTRAL } from '../../../utils/overviewPalette.js';
import { fmt, perMatch, mmss, percent, RankText, Tip, TipTable, MedianTrack } from './parts.jsx';

/**
 * The Overview's top half: five headline tiles, then six move cards.
 * Everything is ranked against the frozen league reference (style-baseline.json);
 * colour appears only for the top and bottom fifth of the league.
 */

/** A hit-rate donut with a light tick where the league median sits. The Match page's move figures draw it too. */
export function Ring({ rate, color, median, dim, darkMode, size = 56 }) {
  const r = 16, C = 2 * Math.PI * r, v = rate === null ? 0 : Math.min(1, rate);
  const a = -Math.PI / 2 + 2 * Math.PI * (median ?? 0);
  const full = v >= 0.995;
  return (
    <svg width={size} height={size} viewBox="0 0 42 42" style={{ overflow: 'visible' }} className="shrink-0" aria-hidden="true">
      <circle cx="21" cy="21" r={r} fill="none" stroke={darkMode ? '#262e40' : '#e5e7eb'} strokeWidth="5" />
      <circle cx="21" cy="21" r={r} fill="none" stroke={color} strokeOpacity={dim ? 0.4 : 1} strokeWidth="5"
        strokeLinecap="round" strokeDasharray={`${C * v} ${C}`} transform="rotate(-90 21 21)" />
      {median !== null && median !== undefined && (
        <line x1={21 + Math.cos(a) * 15.5} y1={21 + Math.sin(a) * 15.5} x2={21 + Math.cos(a) * 22} y2={21 + Math.sin(a) * 22}
          stroke={darkMode ? '#94a3b8' : '#6b7280'} strokeOpacity=".7" strokeWidth="2" strokeLinecap="round" />
      )}
      <text x="21" y={full ? 24.5 : 25} textAnchor="middle" fill={darkMode ? '#f1f5f9' : '#111827'}
        style={{ font: `700 ${full ? 9 : 10.5}px system-ui, sans-serif` }}>
        {rate === null ? '-' : `${Math.round(v * 100)}%`}
      </text>
    </svg>
  );
}

/**
 * A volume circle: fills with the style colour as use grows (by area, capped at
 * the league's 95th percentile), with a dashed ring at the league median. With
 * no median (a share of a whole, not a place in the league) there is no ring.
 */
export function VolumeCircle({ value, median, top, color, darkMode, size = 56 }) {
  const R = 19;
  const rad = x => R * Math.sqrt(Math.min(1, Math.max(0, (x || 0) / (top || 1))));
  const fillR = value > 0 ? Math.max(2.5, rad(value)) : 0;
  return (
    <svg width={size} height={size} viewBox="0 0 42 42" className="shrink-0" aria-hidden="true">
      <circle cx="21" cy="21" r={R} fill="none" stroke={darkMode ? '#262e40' : '#e5e7eb'} strokeWidth="1.5" />
      {fillR > 0 && <circle cx="21" cy="21" r={fillR.toFixed(1)} fill={color} fillOpacity=".85" />}
      {median !== null && median !== undefined && (
        <circle cx="21" cy="21" r={Math.max(2, rad(median)).toFixed(1)} fill="none"
          stroke={darkMode ? '#94a3b8' : '#6b7280'} strokeOpacity=".9" strokeWidth="1.3" strokeDasharray="2.5 2" />
      )}
    </svg>
  );
}

const label = darkMode => `text-[11px] font-semibold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-gray-500'}`;

export function HeadlineTiles({ overview: o, place, baseline, darkMode }) {
  const M = baseline.medians;
  // [label, value, unit, goodness %, rank key, league value]
  // Damage taken: less is better, so its goodness is the inverse of "more".
  // Every tile's rank takes the end colours, battle time included (#1 = the
  // longest time on the field), as the league asked for.
  const tiles = [
    ['Damage dealt', fmt(o.avgDealt), '/ match', place.pct.avgDealt, 'avgDealt', fmt(M.avgDealt)],
    ['Damage taken', fmt(o.avgTaken), '/ match', place.pct.avgTaken === null ? null : 100 - place.pct.avgTaken, 'avgTaken', fmt(M.avgTaken)],
    ['Efficiency', fmt(o.efficiency, 2), '×', place.pct.efficiency, 'efficiency', `${fmt(M.efficiency, 2)}×`],
    ['Damage / sec', fmt(o.dps), '', place.pct.dps, 'dps', fmt(M.dps)],
    ['Battle time', mmss(o.avgTime), 'avg', place.pct.avgTime, 'avgTime', mmss(M.avgTime)],
  ];
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-5 gap-px rounded-[10px] overflow-hidden border border-solid ${
      darkMode ? 'bg-slate-400/[.16] border-gray-700' : 'bg-gray-200 border-gray-200'
    }`}>
      {tiles.map(([lbl, val, unit, good, key, league], i) => {
        const color = rankColor(good, darkMode);
        return (
          <div key={key} className={`p-3.5 min-w-0 ${i === 4 ? 'col-span-2 sm:col-span-1' : ''} ${darkMode ? 'bg-shell-panel' : 'bg-white'}`}>
            <div className={label(darkMode)}>{lbl}</div>
            <div className={`text-2xl font-extrabold tracking-tight tabular-nums whitespace-nowrap mt-0.5 mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {val}
              {unit && <span className={`text-xs font-medium ml-1 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{unit}</span>}
            </div>
            <MedianTrack p={good} color={color || NEUTRAL[darkMode ? 'dark' : 'light']} fade={!color} dot darkMode={darkMode} />
            {/* The league median sits on the rank's line: these are the headline
                comparisons, the tiles have room, and a phone cannot hover. */}
            {/* Wraps on a phone, where a half-width tile cannot fit both. */}
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 mt-2 text-xs">
              <RankText rank={place.rank[key]} pool={place.pool[key]} color={color} darkMode={darkMode} />
              <span className={`whitespace-nowrap ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>League {league}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** A hit rate is only ranked from this many throws up (6/6 is 100% by luck). */
export const MIN_THROWS = 10;

export function MoveCards({ overview: o, place, baseline, darkMode }) {
  const M = baseline.medians;
  const faint = darkMode ? '#64748b' : '#9ca3af';
  const cardClass = `flex items-center gap-2.5 rounded-[10px] border border-solid px-3 py-2.5 min-w-0 h-full ${
    darkMode ? 'bg-transparent border-gray-700' : 'bg-gray-50 border-gray-200'
  }`;
  const value = `text-base font-bold tabular-nums whitespace-nowrap ${darkMode ? 'text-white' : 'text-gray-900'}`;
  const small = `text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`;
  const caption = 'text-xs font-semibold whitespace-nowrap';

  // Supers and the ultimate: hit / thrown per match, a donut of the hit rate.
  // The donut wears the move's style colour; only the rank text is rank-coloured.
  // Under MIN_THROWS the rate still shows, faded, and the caption says why it is
  // not ranked - the per-match average alone (1.2/1.2) hides how few throws there were.
  const hitCard = (name, pair, total, rateKey, volKey, styleKey) => {
    const rate = pair && pair[1] ? pair[0] / pair[1] : null;
    const thin = total > 0 && total < MIN_THROWS;
    const rc = rankColor(place.pct[rateKey], darkMode);
    const capColor = rate === null ? faint : thin ? (provisionalColor(rc) || faint) : rc;
    const rankFull = `#${place.rank[rateKey]} of ${place.pool[rateKey]}`;
    const tip = (
      <TipTable darkMode={darkMode} title={name}
        rows={[
          ['Thrown per match', pair ? perMatch(pair[1]) : '—', perMatch(M[volKey])],
          ['Hit rate', percent(rate), percent(M[rateKey])],
        ]}
        foot={rate === null ? null : thin ? `Rank ${rankFull}, provisional: only ${total} thrown` : <>Rank <b>{rankFull}</b></>} />
    );
    return (
      <Tip content={tip} darkMode={darkMode} className="min-w-0">
        <div className={cardClass}>
          <Ring rate={rate} color={rate === null ? faint : styleColor(styleKey, darkMode)} median={M[rateKey]} dim={thin} darkMode={darkMode} />
          <div className="min-w-0">
            <div className={label(darkMode)}>{name}</div>
            <div className={value}>{pair ? `${perMatch(pair[0])}/${perMatch(pair[1])}` : '—'}</div>
            <div className={caption} style={{ color: capColor || undefined }}>
              {!pair ? 'No hit data'
                : rate === null ? 'Never used'
                  : thin ? `Only ${total} thrown`
                    : <RankText rank={place.rank[rateKey]} pool={place.pool[rateKey]} color={rc} darkMode={darkMode} />}
            </div>
          </div>
        </div>
      </Tip>
    );
  };

  // Ki blasts and skills are VOLUME: how much, not how well - #1 is the heaviest
  // user, and the rank takes the end colours like every other. Ki blasts have no hit rate at all - a deflected enemy blast that lands
  // is credited as the deflector's hit (docs/ACTION_CODES.md).
  const volumeCard = (name, per, key, styleKey, unit, rowLabel, digits) => {
    const tip = (
      <TipTable darkMode={darkMode} title={name}
        rows={[[rowLabel, fmt(per, digits), fmt(M[key], digits)]]}
        foot={per ? <>Rank <b>#{place.rank[key]} of {place.pool[key]}</b></> : null} />
    );
    return (
      <Tip content={tip} darkMode={darkMode} className="min-w-0">
        <div className={cardClass}>
          <VolumeCircle value={per} median={M[key]} top={baseline.p95[key]} color={styleColor(styleKey, darkMode)} darkMode={darkMode} />
          <div className="min-w-0">
            <div className={label(darkMode)}>{name}</div>
            <div className={value}>{fmt(per, digits)}<span className={`${small} ml-1`}>{unit}</span></div>
            <div className={caption}>
              {per ? <RankText rank={place.rank[key]} pool={place.pool[key]} color={rankColor(place.pct[key], darkMode)} darkMode={darkMode} />
                : <span style={{ color: faint }}>Never used</span>}
            </div>
          </div>
        </div>
      </Tip>
    );
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-2">
      {hitCard('Super 1', o.blasts.s1, o.blastTotals.s1, 's1Rate', 's1Thrown', 'blast')}
      {hitCard('Super 2', o.blasts.s2, o.blastTotals.s2, 's2Rate', 's2Thrown', 'blast')}
      {hitCard('Ultimate', o.blasts.ult, o.blastTotals.ult, 'ultRate', 'ultThrown', 'ult')}
      {volumeCard('Ki blasts', o.kiFired, 'kiFired', 'ki', 'fired', 'Fired per match', 1)}
      {volumeCard('Skill 1', o.skills.s1, 'skill1', 'skill', 'uses', 'Uses per match', 2)}
      {volumeCard('Skill 2', o.skills.s2, 'skill2', 'skill', 'uses', 'Uses per match', 2)}
    </div>
  );
}
