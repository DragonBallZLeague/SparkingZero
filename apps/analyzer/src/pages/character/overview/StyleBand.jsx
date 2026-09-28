import React, { useState } from 'react';
import { STYLES, fightingStyles } from '../../../utils/characterOverview.js';
import { styleColor, capsuleTypeColor, rankColor } from '../../../utils/overviewPalette.js';
import { fmt, RankText, Tip, TipTable, MedianTrack } from './parts.jsx';
import BuildPicker, { BuildPill } from './BuildPicker.jsx';

/**
 * The Overview's lower half: what kind of fighter this is. Left, the build picker,
 * the fighting-style label, the build and the AI; right, "How it fights" as a
 * radar or as bars, over six styles in the league's order.
 */

const muted = darkMode => (darkMode ? 'text-gray-400' : 'text-gray-500');
const kicker = darkMode => `text-[11px] font-semibold uppercase tracking-wider ${muted(darkMode)}`;

/**
 * A raw zero is "never", not a rank. Ranks share the middle on ties, so the ~1 in
 * 5 characters who never use a skill would all sit at a low-but-nonzero rank, and a
 * bar drawn there reads as real use. Zero gets an empty bar and "Never".
 */
function shown(o, place, st) {
  const raw = st.rate ? o.rate[st.rate] : null;
  if (raw === 0) return { p: 0, zero: true };
  return { p: place.pct['style_' + st.key], zero: false };
}

/** The sub-stats under a style: [label, metric key, value text, raw, is-outcome, league text, unit label]. */
function subParts(o, M, key) {
  const pm = (x, d) => `${fmt(x, d)}/min`;
  if (key === 'melee') return [
    ['Rush', 'r_rush', pm(o.rate.rush, 1), o.rate.rush, false, pm(M.r_rush, 1)],
    ['Heavy', 'r_heavy', pm(o.rate.heavy, 1), o.rate.heavy, false, pm(M.r_heavy, 1)],
  ];
  if (key === 'blast') return [
    ['Super 1', 'r_s1', pm(o.rate.s1, 2), o.rate.s1, false, pm(M.r_s1, 2)],
    ['Super 2', 'r_s2', pm(o.rate.s2, 2), o.rate.s2, false, pm(M.r_s2, 2)],
  ];
  if (key === 'skill') return [
    ['Skill 1', 'r_sk1', pm(o.rate.sk1, 2), o.rate.sk1, false, pm(M.r_sk1, 2)],
    ['Skill 2', 'r_sk2', pm(o.rate.sk2, 2), o.rate.sk2, false, pm(M.r_sk2, 2)],
  ];
  if (key === 'defense') return [
    ['Guards', 'r_guard', pm(o.rate.guard, 1), o.rate.guard, false, pm(M.r_guard, 1)],
    ['Counters', 'r_counter', pm(o.rate.counter, 1), o.rate.counter, false, pm(M.r_counter, 1)],
    ['Tags', 'tags', `${fmt(o.tagsPerMatch, 1)}/match`, o.tagsPerMatch, true, `${fmt(M.tags, 1)}/match`],
    ['Survival', 'survival', `${Math.round(o.survival * 100)}%`, o.survival, true, `${Math.round((M.survival || 0) * 100)}%`],
  ];
  return [];
}
// A zero rate reads "Never"; a zero outcome (0% survival, 0 tags) keeps its number.
const partText = ([, , val, raw, outcome]) => (raw === 0 && !outcome ? 'Never' : val);

/** Everything the bars show for one style, for the radar's tooltip. */
function styleTip(o, place, M, st, darkMode) {
  const s = shown(o, place, st);
  const rows = st.rate ? [['Per min', s.zero ? 'Never' : fmt(o.rate[st.rate], st.rate === 'melee' || st.rate === 'ki' ? 1 : 2), fmt(M['r_' + st.rate], st.rate === 'melee' || st.rate === 'ki' ? 1 : 2)]] : [];
  for (const part of subParts(o, M, st.key)) rows.push([part[0], partText(part), part[5]]);
  const k = 'style_' + st.key;
  return <TipTable darkMode={darkMode} title={st.name} rows={rows}
    foot={s.zero ? null : <>Rank <b>#{place.rank[k]} of {place.pool[k]}</b></>} />;
}

const Swatch = ({ color, className = '' }) => (
  <span className={`inline-block w-2.5 h-2.5 rounded-sm shrink-0 ${className}`} style={{ background: color }} />
);

// ---- bars -------------------------------------------------------------------
function StyleBars({ o, place, M, darkMode }) {
  const cols = 'grid grid-cols-[76px_1fr_44px_44px_64px] sm:grid-cols-[96px_1fr_56px_56px_72px] gap-x-2 sm:gap-x-3 items-center';
  return (
    <div className="space-y-3">
      <div className={`${cols} text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        <span /><span /><span className="text-right">Per min</span><span className="text-right">League</span><span className="text-right">Rank</span>
      </div>
      {STYLES.map(st => {
        const s = shown(o, place, st);
        const color = styleColor(st.key, darkMode);
        const k = 'style_' + st.key;
        const dp = st.rate === 'melee' || st.rate === 'ki' ? 1 : 2;
        const parts = subParts(o, M, st.key);
        return (
          <div key={st.key}>
            <div className={cols}>
              <span className={`flex items-center gap-2 text-sm font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                <Swatch color={color} />{st.name}
              </span>
              <MedianTrack p={s.p} color={color} height={12} empty={s.zero} darkMode={darkMode} />
              <span className={`text-right text-sm font-semibold tabular-nums ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                {st.rate ? fmt(o.rate[st.rate], dp) : ''}
              </span>
              <span className={`text-right text-sm tabular-nums ${muted(darkMode)}`}>{st.rate ? fmt(M['r_' + st.rate], dp) : ''}</span>
              <span className="text-right text-sm">
                {s.zero ? <span className={`font-bold ${muted(darkMode)}`}>Never</span>
                  : <RankText rank={place.rank[k]} pool={place.pool[k]} color={rankColor(s.p, darkMode)} darkMode={darkMode} />}
              </span>
            </div>
            {parts.length > 0 && (
              <div className="grid grid-cols-[76px_1fr] sm:grid-cols-[96px_1fr] gap-x-2 sm:gap-x-3 mt-1">
                <span />
                {/* Two to a line, so Defense's four stack instead of running off to the right. */}
                <div className="grid grid-cols-[repeat(2,max-content)] gap-x-5 gap-y-1">
                  {parts.map(part => {
                    const [name, key, , raw, outcome] = part;
                    const unit = key === 'tags' ? 'Per match' : key === 'survival' ? 'Survived' : 'Per min';
                    return (
                      <Tip key={name} darkMode={darkMode} as="span" className="inline-flex items-center gap-1.5 text-xs"
                        content={<TipTable darkMode={darkMode} title={name} rows={[[unit, partText(part), part[5]]]}
                          foot={raw === 0 && !outcome ? null : <>Rank <b>#{place.rank[key]} of {place.pool[key]}</b></>} />}>
                        <span className={muted(darkMode)}>{name}</span>
                        <span className="inline-block w-11"><MedianTrack p={place.pct[key]} color={color} height={5} empty={raw === 0} darkMode={darkMode} /></span>
                        <b className={`tabular-nums ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{partText(part)}</b>
                      </Tip>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---- radar ------------------------------------------------------------------
function StyleRadar({ o, place, M, shapeColor, darkMode }) {
  const R = 125, W = 440, cx = W / 2, cy = R + 44, H = cy + R + 60, N = STYLES.length;
  const pt = (i, r) => { const a = -Math.PI / 2 + i * 2 * Math.PI / N; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
  const poly = f => STYLES.map((_, i) => pt(i, f(i)).map(n => n.toFixed(1)).join(',')).join(' ');
  const grid = darkMode ? '#374151' : '#d1d5db';
  const medianStroke = darkMode ? '#9ca3af' : '#6b7280';
  // A style never used sits at the centre, not at its tied rank.
  const vals = STYLES.map(st => { const s = shown(o, place, st); return s.zero ? 0 : Math.max(5, s.p ?? 0) / 100 * R; });
  return (
    <div className="relative mx-auto max-w-[440px]">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full h-auto" role="img" aria-label="Fighting style radar">
        {[0.25, 0.75, 1].map(f => (
          <polygon key={f} points={poly(() => R * f)} fill={f === 1 ? (darkMode ? '#111827' : '#f9fafb') : 'none'} stroke={grid} />
        ))}
        {/* League median: the 50th-percentile hexagon, dashed and lightly filled. */}
        <polygon points={poly(() => R * 0.5)} fill={medianStroke} fillOpacity=".08" stroke={medianStroke} strokeWidth="1.6" strokeDasharray="5 4" />
        {STYLES.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={grid} />; })}
        <polygon points={poly(i => vals[i])} fill={shapeColor} fillOpacity=".22" stroke={shapeColor} strokeWidth="2.4" strokeLinejoin="round" />
        {STYLES.map((st, i) => {
          const [x, y] = pt(i, vals[i]);
          return (
            <Tip key={st.key} as="g" darkMode={darkMode} content={styleTip(o, place, M, st, darkMode)}>
              <circle cx={x} cy={y} r="14" fill="transparent" />
              <circle cx={x} cy={y} r="5" fill={styleColor(st.key, darkMode)} stroke={darkMode ? '#1f2937' : '#ffffff'} strokeWidth="1.5" />
            </Tip>
          );
        })}
      </svg>
      {/* Names and ranks are HTML over the chart, so they can take hover and focus. */}
      {STYLES.map((st, i) => {
        const [x, y] = pt(i, R + 20);
        const s = shown(o, place, st);
        const side = Math.abs(x - cx) < 5 ? 'middle' : x > cx ? 'start' : 'end';
        const tx = side === 'middle' ? '-50%' : side === 'start' ? '0' : '-100%';
        const ty = y < cy - 20 ? '-55%' : y > cy + 20 ? '-5%' : '-50%';
        const k = 'style_' + st.key;
        return (
          <Tip key={st.key} darkMode={darkMode} content={styleTip(o, place, M, st, darkMode)}
            className={`absolute whitespace-nowrap text-[12px] sm:text-sm font-semibold leading-tight ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}
            style={{ left: `${(x / W * 100).toFixed(2)}%`, top: `${(y / H * 100).toFixed(2)}%`, transform: `translate(${tx}, ${ty})`, textAlign: side === 'middle' ? 'center' : side === 'start' ? 'left' : 'right' }}>
            <div><Swatch color={styleColor(st.key, darkMode)} className="mr-1.5 align-[0px]" />{st.name}</div>
            <div className="mt-0.5">
              {s.zero ? <span className={`font-bold ${muted(darkMode)}`}>Never</span>
                : <RankText rank={place.rank[k]} pool={place.pool[k]} color={rankColor(s.p, darkMode)} darkMode={darkMode} />}
            </div>
          </Tip>
        );
      })}
    </div>
  );
}

// ---- left column ------------------------------------------------------------
function BuildBlock({ build, isSelected, totalMatches, darkMode }) {
  if (!build) return null;
  const byType = {};
  for (const c of build.capsules) byType[c.type] = (byType[c.type] || 0) + c.cost;
  const order = Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  // Grouped by type, biggest share first, so the list reads in the same order as the bar.
  const caps = [...build.capsules].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type) || b.cost - a.cost || a.name.localeCompare(b.name));
  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <span className={kicker(darkMode)}>{isSelected ? 'Capsules' : 'Most common build'}</span>
        <span className={`text-xs tabular-nums ${muted(darkMode)}`}>{build.cost} cost</span>
      </div>
      {!isSelected && (
        <div className="flex items-center gap-2 flex-wrap">
          <BuildPill label={build.label} darkMode={darkMode} />
          <span className={`text-xs ${muted(darkMode)}`}>{build.count} of {totalMatches} matches</span>
        </div>
      )}
      {!caps.length && <div className={`text-sm mt-2 ${muted(darkMode)}`}>No capsules equipped</div>}
      {caps.length > 0 && <div className={`flex h-2 rounded overflow-hidden gap-0.5 my-2.5 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
        {order.map(t => <span key={t} style={{ flex: byType[t], background: capsuleTypeColor(t, darkMode) }} title={`${t} ${byType[t]}`} />)}
      </div>}
      <ul className="list-none m-0 p-0">
        {caps.map((c, i) => (
          <li key={`${c.name}-${i}`} className={`grid grid-cols-[10px_1fr_auto] gap-2 items-center py-1 text-sm ${
            i ? `border-0 border-t border-solid ${darkMode ? 'border-gray-700' : 'border-gray-200'}` : ''
          } ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
            <Swatch color={capsuleTypeColor(c.type, darkMode)} className="w-2 h-2" />
            <span>{c.name}</span>
            <span className={`text-xs tabular-nums ${muted(darkMode)}`}>{c.cost}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// `initialView` exists for scripts/smoke-character-page.mjs, which renders on the
// server and so can never click over to the bars.
export default function StyleBand({
  overview: o, place, baseline, builds, selected, allRow, onSelectBuild, darkMode, initialView = 'radar',
}) {
  const [viz, setViz] = useState(initialView);
  const M = baseline.medians;
  const styles = fightingStyles(place.pct);
  const primaryColor = styles[0] ? styleColor(styles[0].key, darkMode) : (darkMode ? '#e5e7eb' : '#111827');
  const shownBuild = selected || builds[0] || null;
  const ai = o.ai;

  return (
    <div className="grid md:grid-cols-[290px_1fr] gap-7 mt-7">
      <div>
        <div className="mb-5">
          <BuildPicker builds={builds} selected={selected} allRow={allRow} onSelect={onSelectBuild} darkMode={darkMode} />
        </div>
        <div className="border-0 border-l-[3px] border-solid pl-3.5" style={{ borderColor: primaryColor }}>
          <div className={kicker(darkMode)}>Fighting style</div>
          <h2 className="m-0 mt-0.5 text-2xl font-extrabold tracking-tight leading-tight" style={{ color: primaryColor }}>
            {styles.length ? styles[0].label : 'All-Rounder'}
            {styles[1] && <span className="block text-xl mt-0.5" style={{ color: styleColor(styles[1].key, darkMode) }}>{styles[1].label}</span>}
          </h2>
          <BuildBlock build={shownBuild} isSelected={!!selected} totalMatches={allRow.matchCount} darkMode={darkMode} />
          {ai && (
            <div className={`mt-4 pt-3 border-0 border-t border-solid ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className={kicker(darkMode)}>{selected ? 'AI' : 'Most used AI'}</div>
              <div className={`text-sm font-semibold mt-0.5 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                {ai.tied
                  ? <>Varied <span className={`font-normal text-xs ${muted(darkMode)}`}>{ai.strategies} strategies</span></>
                  : <>{ai.name} <span className={`font-normal text-xs ${muted(darkMode)}`}>{Math.round(ai.share * 100)}% of matches</span></>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className={`text-[11px] font-bold uppercase tracking-widest ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>How it fights</div>
          <div className="flex items-center gap-3">
            {/* [display:none], not `hidden`: App.css's `.hidden` would beat sm:inline-flex. */}
            <span className={`[display:none] sm:inline-flex items-center gap-1.5 text-xs whitespace-nowrap ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {viz === 'radar'
                ? <span className={`inline-block w-4 border-0 border-t-2 border-dashed ${darkMode ? 'border-gray-400' : 'border-gray-500'}`} />
                : <span className={`inline-block w-0.5 h-3 ${darkMode ? 'bg-gray-400' : 'bg-gray-500'}`} />}
              league median
            </span>
            <div role="group" aria-label="Chart type" className={`inline-flex rounded-lg overflow-hidden border border-solid ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
              {[['radar', 'Radar'], ['bars', 'Bars']].map(([id, text]) => (
                <button key={id} type="button" aria-pressed={viz === id} onClick={() => setViz(id)}
                  className={`px-2.5 py-1 text-xs border-0 cursor-pointer ${viz === id
                    ? (darkMode ? 'bg-gray-600 text-white font-semibold' : 'bg-gray-200 text-gray-900 font-semibold')
                    : (darkMode ? 'bg-transparent text-gray-400 hover:text-gray-200' : 'bg-transparent text-gray-500 hover:text-gray-800')}`}>
                  {text}
                </button>
              ))}
            </div>
          </div>
        </div>
        {viz === 'radar'
          ? <StyleRadar o={o} place={place} M={M} shapeColor={primaryColor} darkMode={darkMode} />
          : <StyleBars o={o} place={place} M={M} darkMode={darkMode} />}
      </div>
    </div>
  );
}
