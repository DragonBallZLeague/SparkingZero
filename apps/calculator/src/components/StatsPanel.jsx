import React, { useState, useEffect, useRef } from 'react';
import { getImageUrl } from '../utils/calculator.js';

// fmt types:
//   'raw'          — toLocaleString (default)
//   'pct_mult'     — multiplier, (val-1)*100 → "+10%", "-2%", "Base"
//   'pct_mult_inv' — inverted multiplier for defense: 1.1 = -10% (takes more dmg), 0.9 = +10%
//   'pct'          — decimal signed pct, val*100 → "+20%", "-10%", "—" if 0
const STAT_SECTIONS = [
  {
    label: 'Base Stats',
    hdrClass: 'bg-blue-900/70',
    stats: [
      { key: 'health', label: 'Max HP', fmt: 'int' },
      { key: 'switch', label: 'Switch', fmt: 'seconds' },
    ],
  },
  {
    label: 'Defense',
    hdrClass: 'bg-teal-900/70',
    stats: [
      { key: 'armor',               label: 'Armor',             fmt: 'pct' },
      { key: 'meleeDefenseStat',    label: 'Melee Defense',     fmt: 'pct_mult_inv' },
      { key: 'blastDefense',        label: 'Blast Defense',     fmt: 'pct_mult_inv' },
      { key: 'kiBlastDefenseArmor', label: 'Ki Blast Defense + Armor',    fmt: 'pct_mult_inv' },
      { key: 'melee',      label: '5-Hit Damage Taken', fmt: 'int' },
    ],
  },
{
    label: 'Combo Damage',
    hdrClass: 'bg-red-900/70',
    stats: [
      { key: 'rush',              label: 'Rush Hit 1',               fmt: 'int' },
      { key: 'hit2',              label: 'Rush Hit 2',               fmt: 'int' },
      { key: 'hit3',              label: 'Rush Hit 3',               fmt: 'int' },
      { key: 'hit4',              label: 'Rush Hit 4',               fmt: 'int' },
      { key: 'hit5',              label: 'Rush Hit 5',               fmt: 'int' },
      { key: 'rush5Hit',          label: '5-Hit Total',         fmt: 'int' },
      { key: 'fiveHitAfterArmor', label: '5-Hit (Against Armor)', fmt: 'int' },
    ],
  },
  {
    label: 'Melee',
    hdrClass: 'bg-orange-900/70',
    stats: [
      { key: 'smash',      label: 'Smash Attack' },
      { key: 'throw',      label: 'Throw' },
      { key: 'pursuit',    label: 'Pursuit' },
      { key: 'armorBreak', label: 'Armor Break',    fmt: 'hits' },
    ],
  },
  {
    label: 'Ki Blast',
    hdrClass: 'bg-purple-900/70',
    stats: [
      { key: 'kiBlastDmg',    label: 'Ki Blast Dmg' },
      { key: 'kiBlastVolley', label: 'Ki Blast Volley', fmt: 'int' },
      { key: 'kiBlastCost',   label: 'Ki Blast Cost',   fmt: 'bars2' },
      { key: 'kiBlastLimit',  label: 'Ki Blast Count',  fmt: 'ki_count' },
    ],
  },
  {
    label: 'Ki',
    hdrClass: 'bg-blue-900/70',
    stats: [
      { key: 'startingKi',    label: 'Starting Ki',     fmt: 'bar_count' },
      { key: 'kiCharge',      label: 'Ki Charge',       fmt: 'bars_s' },
      { key: 'attackKiGain',  label: 'Atk Ki Gain',     fmt: 'bars_hit' },
      { key: 'kiRegen',       label: 'Ki Regen',        fmt: 'bars_s' },
      { key: 'kiRegenRange',  label: 'Ki Bars Regen',   fmt: 'bars_range' },
      { key: 'shortDashCost', label: 'Short Dash Cost', fmt: 'bars3' },
    ],
  },
  {
    label: 'Skill Gauge',
    hdrClass: 'bg-indigo-900/70',
    stats: [
      { key: 'skillStart', label: 'Skill Gauge Start', fmt: 'skill_pts' },
      { key: 'skillLimit', label: 'Skill Gauge Limit', fmt: 'skill_pts' },
      { key: 'skillRegen', label: 'Skill Gauge Regen' },
    ],
  },
  {
    label: 'Sparking',
    hdrClass: 'bg-yellow-900/70',
    stats: [
      { key: 'sparkCharge',   label: 'Sparking Charge Time',   fmt: 'pct' },
      { key: 'sparkDuration', label: 'Spark Duration', fmt: 'pct' },
    ],
  },
];

const CLASS_GRADIENT = {
  'Normal':                          'from-blue-950',
  'Super Saiyan':                    'from-yellow-950',
  'Ki-Blast':                        'from-purple-950',
  'Power':                           'from-red-950',
  'Villain':                         'from-indigo-950',
  'Fusion':                          'from-sky-950',
  'Almighty':                        'from-orange-950',
  'Rival':                           'from-emerald-950',
  'Secret':                          'from-pink-950',
  'Skill-User':                      'from-gray-950',
  'Speed':                           'from-cyan-950',
  'God':                             'from-amber-950',
  'Giant':                           'from-amber-950',
  'Legendary Super Saiyan':          'from-green-950',
  'Infinite Ki (Giant)':             'from-amber-950',
  'Infinite Ki (Villain)':           'from-violet-950',
  'Infinite Ki Android (Ki-Blast)':  'from-purple-950',
  'Infinite Ki Android (Power)':     'from-rose-950',
  'Ki Drain Android (Normal)':       'from-slate-950',
  'Ki Drain Android (Power)':        'from-rose-950',
  'Skill-User (Yajirobe)':           'from-gray-950',
};

const CLASS_BADGE_COLOR = {
  'Normal':                          'bg-blue-600 text-white',
  'Super Saiyan':                    'bg-yellow-500 text-black',
  'Ki-Blast':                        'bg-purple-600 text-white',
  'Power':                           'bg-red-600 text-white',
  'Villain':                         'bg-indigo-800 text-purple-200 border border-purple-600',
  'Fusion':                          'bg-sky-600 text-white',
  'Almighty':                        'bg-orange-500 text-white',
  'Rival':                           'bg-emerald-600 text-white',
  'Secret':                          'bg-pink-600 text-white',
  'Skill-User':                      'bg-gray-600 text-white',
  'Speed':                           'bg-cyan-500 text-black',
  'God':                             'bg-amber-400 text-black',
  'Giant':                           'bg-amber-700 text-white',
  'Legendary Super Saiyan':          'bg-green-600 text-white',
  'Infinite Ki (Giant)':             'bg-amber-800 text-white',
  'Infinite Ki (Villain)':           'bg-violet-700 text-white',
  'Infinite Ki Android (Ki-Blast)':  'bg-purple-700 text-white',
  'Infinite Ki Android (Power)':     'bg-rose-700 text-white',
  'Ki Drain Android (Normal)':       'bg-slate-600 text-white',
  'Ki Drain Android (Power)':        'bg-rose-600 text-white',
  'Skill-User (Yajirobe)':           'bg-gray-500 text-white',
};

function fmt(value, type) {
  if (value === null || value === undefined) return '—';
  if (type === 'pct_mult') {
    const pct = Math.round((value - 1) * 100);
    if (pct === 0) return 'Base';
    return pct > 0 ? `+${pct}%` : `${pct}%`;
  }
  if (type === 'pct_mult_inv') {
    // inverted: 1.1 = takes more dmg = -10% defense, 0.9 = +10% defense
    const pct = Math.round((1 - value) * 100);
    if (pct === 0) return 'Base';
    return pct > 0 ? `+${pct}%` : `${pct}%`;
  }
  if (type === 'pct') {
    if (value === 0) return '—';
    const pct = Math.round(value * 100);
    return pct > 0 ? `+${pct}%` : `${pct}%`;
  }
  if (type === 'raw2') {
    if (typeof value !== 'number') return String(value);
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (type === 'int') {
    return Math.round(value).toLocaleString();
  }
  if (type === 'bars')       return `${Number(value).toFixed(1)} Bars`;
  if (type === 'bars2')      return `${Number(value).toFixed(2)} Bars`;
  if (type === 'bars3')      return `${Number(value).toFixed(3)} Bars`;
  if (type === 'bars_s')     return `${Number(value).toFixed(2)} Bars/s`;
  if (type === 'bars_hit')   return `${Number(value).toFixed(4)} Bars/hit`;
  if (type === 'bars_range') return `Between 0 - ${value} Bars`;
  if (type === 'bar_count')  return `${value} Bar(s)`;
  if (type === 'seconds')    return `${value} s`;
  if (type === 'hits')       return `${value} Hit(s)`;
  if (type === 'ki_count')   return value >= 999 ? '∞' : `${value} Ki Blasts`;
  if (type === 'skill_pts')  return `${value} Point(s)`;
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
}

function StatRow({ label, base, modified, fmtType }) {
  const changed = modified !== null && modified !== undefined && base !== modified;
  return (
    <tr className={`border-b border-sz-border/20 ${changed ? 'bg-orange-950/25' : ''}`}>
      <td className="py-1.5 px-2 text-sm text-gray-400 leading-tight">{label}</td>
      <td className="py-1.5 px-2 text-sm text-gray-300 text-right font-mono leading-tight w-20">{fmt(base, fmtType)}</td>
      <td className={`py-1.5 px-2 text-sm text-right font-mono leading-tight w-20 ${changed ? 'text-sz-orange font-bold' : 'text-gray-500'}`}>
        {modified !== null && modified !== undefined ? fmt(modified, fmtType) : '—'}
      </td>
    </tr>
  );
}

export default function StatsPanel({ baseStats, modifiedStats, characterImages }) {
  if (!baseStats) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-700 p-6">
        <div className="text-5xl mb-3">?</div>
        <p className="text-sm text-center">Select a character to view stats</p>
      </div>
    );
  }

  const imgFilename = characterImages?.[baseStats.name];
  const [imgCentered, setImgCentered] = useState(false);
  const imgContainerRef = useRef(null);

  // Observe the portrait container: when it is wider than it is tall (landscape)
  // center the image; otherwise anchor to the top so the face stays visible.
  useEffect(() => {
    const el = imgContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setImgCentered(width >= height * 1.25);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const mod = modifiedStats ?? baseStats;

  function kiVolley(stats) {
    const dmg = stats?.kiBlastDmg ?? 0;
    const count = stats?.kiBlastLimit ?? 0;
    return Math.round(dmg * (count >= 999 ? 20 : count));
  }
  const baseAug = { ...baseStats, kiBlastVolley: kiVolley(baseStats) };
  const modAug  = { ...mod,       kiBlastVolley: kiVolley(mod) };

  const gradientFrom = CLASS_GRADIENT[baseStats.class] || 'from-gray-950';
  const badgeColor = CLASS_BADGE_COLOR[baseStats.class] || 'bg-gray-600 text-white';

  return (
    <div className="flex flex-col">
      {/* Portrait image with identity strip overlaid at bottom */}
      <div ref={imgContainerRef} className="relative w-full h-80 overflow-hidden flex-shrink-0 bg-[#242424]">
        {imgFilename ? (
          <img
            src={getImageUrl(imgFilename)}
            alt={baseStats.name}
            className={`absolute inset-0 w-full h-full object-cover ${imgCentered ? 'object-center' : 'object-top'}`}
            onError={e => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-sz-border">
            <span className="text-5xl font-black text-gray-600">{baseStats.name[0]}</span>
          </div>
        )}
        <div className={`absolute inset-0 bg-gradient-to-b ${gradientFrom} via-transparent to-transparent opacity-40`} />

        {/* Identity strip — overlaid on bottom of portrait */}
        <div className={`absolute bottom-0 left-0 right-0 px-3 py-2.5 border-b-2 border-sz-border bg-gradient-to-t ${gradientFrom} via-black/60 to-transparent`}>
          <p className="text-base font-extrabold text-white leading-tight truncate drop-shadow">{baseStats.name}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-xs px-2 py-1 rounded font-bold leading-none ${badgeColor}`}>
              {baseStats.class}
            </span>
            <span className="text-sm text-sz-orange font-mono font-bold drop-shadow">DP {baseStats.dp}</span>
          </div>
        </div>
      </div>

      {/* Stat table */}
      <table className="w-full">
        <thead>
          <tr className="border-b border-sz-border">
            <th className="py-1.5 px-2 text-sm text-gray-500 text-left font-medium">Stat</th>
            <th className="py-1.5 px-2 text-sm text-gray-500 text-right font-medium w-20">Base</th>
            <th className="py-1.5 px-2 text-sm text-sz-orange text-right font-medium w-20">Mod</th>
          </tr>
        </thead>
        <tbody>
          {STAT_SECTIONS.map(section => (
            <React.Fragment key={section.label}>
              <tr>
                <td colSpan={3} className={`py-1 px-2 text-sm font-bold uppercase tracking-wider text-gray-300 ${section.hdrClass}`}>
                  {section.label}
                </td>
              </tr>
              {section.stats.map(({ key, label, fmt: fmtType }) => (
                <StatRow
                  key={`${section.label}-${key}`}
                  label={label}
                  base={baseAug[key]}
                  modified={modAug[key]}
                  fmtType={fmtType}
                />
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
