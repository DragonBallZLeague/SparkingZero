import React, { useState, useEffect, useRef } from 'react';
import { classBadge, classGradient } from '../utils/classStyles.js';
import { DRACONIC_AURA, DRAGON_RUSH, hasCapsule } from '../utils/specialCapsules.js';
import { getImageUrl, calcFiveHitArmorDamage, calcFiveHitDamageTaken, calcOutgoingCombo, applyOpponentDefense, damageTaken, kiBlastVolley } from '../utils/calculator.js';

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
      { key: 'armor',               label: 'Armor',             fmt: 'pct', tooltip: 'Applies defense buff to all hits that are armored' },
      { key: 'meleeDefenseStat',    label: 'Melee Defense',     fmt: 'pct_mult_inv' },
      { key: 'blastDefense',        label: 'Blast Defense',     fmt: 'pct_mult_inv' },
      { key: 'energy',              label: 'Ki Blast Defense',  fmt: 'pct_mult_inv' },
    ],
  },
{
    label: 'Combo Damage',
    hdrClass: 'bg-red-900/70',
    stats: [],
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

// armorTint: if true, the row is tinted blue to indicate opponent armor reduction
function StatRow({ label, base, modified, fmtType, tooltip, armorTint = false, rowHighlight = false }) {
  const changed = modified !== null && modified !== undefined && base !== modified;
  const rowBg = rowHighlight
    ? 'bg-orange-900/30'
    : changed
    ? 'bg-orange-950/25'
    : armorTint
    ? 'bg-blue-950/30'
    : '';
  return (
    <tr className={`border-b border-sz-border/20 ${rowBg}`}>
      <td className="py-1.5 px-2 text-sm text-gray-400 leading-tight">
        {tooltip ? (
          <span className="group relative cursor-help inline-flex items-center gap-1">
            {label}
            <span className="text-xs text-gray-600">ⓘ</span>
            <span className="absolute left-0 bottom-full mb-1 z-10 hidden group-hover:block w-52 bg-gray-900 text-gray-200 text-xs rounded px-2 py-1.5 shadow-lg border border-gray-700 pointer-events-none leading-snug">
              {tooltip}
            </span>
          </span>
        ) : label}
      </td>
      <td className="py-1.5 px-2 text-sm text-gray-300 text-right font-mono leading-tight w-20">{fmt(base, fmtType)}</td>
      <td className={`py-1.5 px-2 text-sm text-right font-mono leading-tight w-20 ${
        changed ? 'text-sz-orange font-bold' : 'text-gray-500'
      }`}>
        {modified !== null && modified !== undefined ? fmt(modified, fmtType) : '—'}
      </td>
    </tr>
  );
}

export default function StatsPanel({ baseStats, modifiedStats, characterImages, onSelectCharacter, opponentStats, equippedCapsules, opponentHasLightBody }) {
    // Check if Draconic Aura or Dragon Rush is equipped
    const hasArmorBreakCapsule = hasCapsule(equippedCapsules, DRACONIC_AURA) || hasCapsule(equippedCapsules, DRAGON_RUSH);
    const hasDraconicAura = hasCapsule(equippedCapsules, DRACONIC_AURA);
  const [imgCentered, setImgCentered] = useState(false);
  const imgContainerRef = useRef(null);
  const [armorBreakHit, setArmorBreakHit] = useState(5);
  const hasStats = !!baseStats;

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
  }, [hasStats]);

  if (!baseStats) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-700 p-6">
        <div className="text-5xl mb-3">?</div>
        <p className="text-sm text-center">Select a character to view stats</p>
      </div>
    );
  }

  const imgFilename = characterImages?.[baseStats.name];
  const mod = modifiedStats ?? baseStats;

  const volleyOpts = { opponentStats, opponentHasLightBody, attackerHasDraconicAura: hasDraconicAura };
  const baseAug = { ...baseStats, kiBlastVolley: kiBlastVolley(baseStats, volleyOpts) };
  const modAug  = { ...mod,       kiBlastVolley: kiBlastVolley(mod, volleyOpts) };

  // If armor break capsule is equipped, ignore opponent armor for combo damage
  const outgoingCombo = opponentStats
    ? calcOutgoingCombo(
        modAug,
        hasArmorBreakCapsule
          ? { ...opponentStats, armor: 0 } // ignore armor
          : opponentStats
      )
    : null;

  // When opponent is selected: apply their melee/blast/ki defense to base and mod values
  function applyOppDef(value, defField) {
    return opponentStats ? applyOpponentDefense(value, opponentStats, defField) : value;
  }

  // Column header labels change when opponent is set
  const baseColLabel = opponentStats
    ? `vs. ${opponentStats.name?.split(' ').slice(-1)[0] ?? 'Opp'}`
    : 'Base';
  const modColLabel = opponentStats ? 'Build vs.' : 'Mod';

  const gradientFrom = classGradient(baseStats.class);
  const badgeColor = classBadge(baseStats.class);

  return (
    <div className="flex flex-col">
      {/* Portrait image with identity strip overlaid at bottom */}
      <div ref={imgContainerRef} className="relative w-full h-80 overflow-hidden flex-shrink-0 bg-[#242424]">
        {onSelectCharacter && (
          <button
            onClick={onSelectCharacter}
            className="absolute top-2 left-2 z-10 min-[793px]:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-black/60 hover:bg-black/80 text-gray-200 hover:text-white text-xs font-semibold transition-colors border border-white/10"
            title="Change character"
          >
            ← Change
          </button>
        )}
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
        <div
          className={`absolute bottom-0 left-0 right-0 px-3 py-2.5 border-b-2 border-sz-border bg-gradient-to-t ${gradientFrom} via-black/60 to-transparent${onSelectCharacter ? ' min-[793px]:hidden cursor-pointer hover:brightness-110 transition-[filter]' : ''}`}
          onClick={onSelectCharacter || undefined}
          title={onSelectCharacter ? 'Select character' : undefined}
        >
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
            <th className="py-1.5 px-2 text-sm text-gray-500 text-right font-medium w-20">{baseColLabel}</th>
            <th className="py-1.5 px-2 text-sm text-sz-orange text-right font-medium w-20">{modColLabel}</th>
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
              {section.label === 'Combo Damage' ? (
                // Combo Damage: apply opponent melee defense + armor tints
                <>
                  {[
                    { key: 'rush',  label: 'Rush Hit 1', hitIdx: 0 },
                    { key: 'hit2',  label: 'Rush Hit 2', hitIdx: 1 },
                    { key: 'hit3',  label: 'Rush Hit 3', hitIdx: 2 },
                    { key: 'hit4',  label: 'Rush Hit 4', hitIdx: 3 },
                    { key: 'hit5',  label: 'Rush Hit 5', hitIdx: 4 },
                  ].map(({ key, label, hitIdx }) => {
                    // Would this hit have been armored without the capsule?
                    const oppArmor = opponentStats?.armor ?? 0;
                    const oppArmorBreak = baseAug.armorBreak ?? 999;
                    const wasArmored = oppArmor > 0 && (hitIdx + 1) < oppArmorBreak;

                    // Calculate base value as if armor is present (for comparison)
                    const raw = typeof baseAug[key] === 'number' ? baseAug[key] : 0;
                    const meleeDef = opponentStats?.meleeDefenseStat ?? 1;
                    // Always calculate what the value would be with armor applied, even if Draconic Aura or Dragon Rush is equipped
                    const baseValWithArmor = damageTaken(raw, meleeDef, wasArmored ? (1 - oppArmor) : 1);

                    // Calculate value with armor break capsule (ignoring armor)
                    const baseVal = outgoingCombo
                      ? (() => {
                          const ignoreArmor = hasArmorBreakCapsule && wasArmored;
                          const ignoreDraconic = hasDraconicAura && wasArmored;
                          // If either capsule is breaking armor, ignore it
                          return damageTaken(raw, meleeDef, (ignoreArmor || ignoreDraconic) ? 1 : (wasArmored ? (1 - oppArmor) : 1));
                        })()
                      : baseAug[key];
                    const modVal = outgoingCombo
                      ? outgoingCombo.perHit[hitIdx].damage
                      : modAug[key];

                    // Highlight if value changed due to ignoring armor (armor break capsule or Draconic Aura)
                    const highlight = ((hasArmorBreakCapsule && wasArmored && baseVal !== baseValWithArmor) || (hasDraconicAura && wasArmored && baseVal !== baseValWithArmor));

                    // Show ARM badge: blue if normal, orange if broken (armor ignored), but only once
                    let badge = null;
                    if (wasArmored) {
                      badge = (
                        <span className={
                          highlight
                            ? 'ml-1.5 text-[10px] font-semibold align-middle text-orange-400'
                            : 'ml-1.5 text-[10px] font-semibold align-middle text-blue-400'
                        }>
                          <i className="iconoir-hand-brake"></i>🛡 ARM
                        </span>
                      );
                    }

                    return (
                      <StatRow
                        key={key}
                        label={<span className="inline-flex items-center gap-1">{label}{badge}</span>}
                        base={baseVal}
                        modified={modVal}
                        fmtType="int"
                        armorTint={wasArmored && !highlight}
                        rowHighlight={highlight}
                      />
                    );
                  })}
                  {/* 5-Hit Total */}
                  {(() => {
                    const baseTotal = outgoingCombo
                      ? (['rush', 'hit2', 'hit3', 'hit4', 'hit5']).reduce((sum, k, i) => {
                          const raw = typeof baseAug[k] === 'number' ? baseAug[k] : 0;
                          const meleeDef = opponentStats?.meleeDefenseStat ?? 1;
                          const oppArmor = hasArmorBreakCapsule ? 0 : (opponentStats?.armor ?? 0);
                          const baseArmorBreak = baseAug.armorBreak ?? 999;
                          const isArmored = oppArmor > 0 && (i + 1) < baseArmorBreak;
                          return sum + damageTaken(raw, meleeDef, isArmored ? (1 - oppArmor) : 1);
                        }, 0)
                      : baseAug.rush5Hit;
                    const modTotal = outgoingCombo ? outgoingCombo.rush5Hit : modAug.rush5Hit;
                    const changed = modTotal !== null && modTotal !== undefined && baseTotal !== modTotal;
                    return (
                      <tr className={`border-b border-sz-border/20 ${changed ? 'bg-orange-900/25' : ''}`}>
                        <td className="py-1.5 px-2 text-sm text-gray-400 leading-tight">
                          5-Hit Total
                        </td>
                        <td className="py-1.5 px-2 text-sm text-gray-300 text-right font-mono leading-tight w-20">{fmt(baseTotal, 'int')}</td>
                        <td className={`py-1.5 px-2 text-sm text-right font-mono leading-tight w-20 ${changed ? 'text-sz-orange font-bold' : 'text-gray-500'}`}>
                          {fmt(modTotal, 'int')}
                        </td>
                      </tr>
                    );
                  })()}
                  {/* 5-Hit (Against Armor) — grayed out when opponent is selected (opponent armor data is used instead) */}
                  {opponentStats ? (
                    <tr className="border-b border-sz-border/20 opacity-40">
                      <td className="py-1.5 px-2 text-sm text-gray-500 leading-tight">5-Hit (Against Armor)</td>
                      <td className="py-1.5 px-2 text-sm text-gray-600 text-right font-mono leading-tight w-20">—</td>
                      <td className="py-1.5 px-2 text-sm text-gray-600 text-right font-mono leading-tight w-20">—</td>
                    </tr>
                  ) : (
                    <StatRow
                      key="fiveHitAfterArmor"
                      label="5-Hit (Against Armor)"
                      base={baseAug.fiveHitAfterArmor}
                      modified={modAug.fiveHitAfterArmor}
                      fmtType="int"
                    />
                  )}
                </>
              ) : section.label === 'Defense' ? (
                // Defense section: use opponent hits for 5-hit damage taken rows
                <>
                  {section.stats.map(({ key, label, fmt: fmtType, tooltip }) => (
                    <StatRow
                      key={`${section.label}-${key}`}
                      label={label}
                      base={baseAug[key]}
                      modified={modAug[key]}
                      fmtType={fmtType}
                      tooltip={tooltip}
                    />
                  ))}
                  {/* 5-Hit Damage Taken */}
                  {(() => {
                    const baseTaken = calcFiveHitDamageTaken(baseAug, opponentStats);
                    const modTaken  = calcFiveHitDamageTaken(modAug,  opponentStats);
                    const baseVal = baseTaken?.total ?? null;
                    const modVal  = modTaken?.total ?? null;
                    const changed = modVal !== null && baseVal !== modVal;
                    return (
                      <tr className={`border-b border-sz-border/20 ${changed ? 'bg-orange-950/25' : ''}`}>
                        <td className="py-1.5 px-2 text-sm text-gray-400 leading-tight">5-Hit Damage Taken</td>
                        <td className="py-1.5 px-2 text-sm text-gray-300 text-right font-mono leading-tight w-20">
                          {baseVal !== null ? Math.round(baseVal).toLocaleString() : '—'}
                        </td>
                        <td className={`py-1.5 px-2 text-sm text-right font-mono leading-tight w-20 ${changed ? 'text-sz-orange font-bold' : 'text-gray-500'}`}>
                          {modVal !== null ? Math.round(modVal).toLocaleString() : '—'}
                        </td>
                      </tr>
                    );
                  })()}
                  {/* 5-Hit Damage Taken w/ Armor */}
                  {(() => {
                    const baseVal = calcFiveHitArmorDamage(baseAug, armorBreakHit, opponentStats ?? null);
                    const modVal  = calcFiveHitArmorDamage(modAug,  armorBreakHit, opponentStats ?? null);
                    const changed = modVal !== null && baseVal !== modVal;
                    return (
                      <>
                        <tr className={changed ? 'bg-orange-950/25' : ''}>
                          <td className="py-1.5 px-2 text-sm text-gray-400 leading-tight">
                            5-Hit Damage Taken (w/ Armor)
                          </td>
                          <td className="py-1.5 px-2 text-sm text-gray-300 text-right font-mono leading-tight w-20">
                            {baseVal !== null ? Math.round(baseVal).toLocaleString() : '—'}
                          </td>
                          <td className={`py-1.5 px-2 text-sm text-right font-mono leading-tight w-20 ${changed ? 'text-sz-orange font-bold' : 'text-gray-500'}`}>
                            {modVal !== null ? Math.round(modVal).toLocaleString() : '—'}
                          </td>
                        </tr>
                        <tr className={`border-b border-sz-border/20 ${opponentStats ? 'opacity-40' : ''}`}>
                          <td colSpan={3} className="py-1 px-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-gray-600 uppercase tracking-wider">Break on Hit:</span>
                              {[2, 3, 4, 5].map(n => (
                                <button
                                  key={n}
                                  onClick={opponentStats ? undefined : () => setArmorBreakHit(n)}
                                  disabled={!!opponentStats}
                                  className={`text-xs px-4 py-1 rounded font-mono transition-colors ${
                                    opponentStats
                                      ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                      : armorBreakHit === n
                                      ? 'bg-teal-700 text-white'
                                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                                  }`}
                                >
                                  {n}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      </>
                    );
                  })()}
                </>
              ) : section.label === 'Melee' ? (
                // Melee section: apply opponent melee defense to smash/throw/pursuit
                section.stats.map(({ key, label, fmt: fmtType, tooltip }) => {
                  const isOutgoing = ['smash', 'throw', 'pursuit'].includes(key);
                  const baseVal = isOutgoing ? applyOppDef(baseAug[key], 'meleeDefenseStat') : baseAug[key];
                  const modVal  = isOutgoing ? applyOppDef(modAug[key],  'meleeDefenseStat') : modAug[key];
                  return (
                    <StatRow
                      key={`${section.label}-${key}`}
                      label={label}
                      base={baseVal}
                      modified={modVal}
                      fmtType={fmtType}
                      tooltip={tooltip}
                    />
                  );
                })
              ) : section.label === 'Ki Blast' ? (
                // Ki Blast section: apply opponent Ki Blast Defense (energy) and then armor to Ki Blast Dmg and Volley
                section.stats.map(({ key, label, fmt: fmtType, tooltip }) => {
                  const isOutgoing = key === 'kiBlastDmg' || key === 'kiBlastVolley';
                  let baseVal = baseAug[key];
                  let modVal = modAug[key];
                  if (isOutgoing && opponentStats) {
                    // Only apply defense/armor to kiBlastDmg, not kiBlastVolley (already included in volley logic)
                    if (key === 'kiBlastDmg') {
                      // Ignore opponent armor if Draconic Aura is equipped; defense and armor round once
                      const armorToApply = hasDraconicAura ? 0 : (opponentStats.armor ?? 0);
                      baseVal = damageTaken(baseVal, opponentStats.energy ?? 1, 1 - armorToApply);
                      modVal  = damageTaken(modVal, opponentStats.energy ?? 1, 1 - armorToApply);
                    }
                  }
                  return (
                    <StatRow
                      key={`${section.label}-${key}`}
                      label={label}
                      base={baseVal}
                      modified={modVal}
                      fmtType={fmtType}
                      tooltip={tooltip}
                    />
                  );
                })
              ) : (
                // All other sections: no opponent modification
                section.stats.map(({ key, label, fmt: fmtType, tooltip }) => (
                  <StatRow
                    key={`${section.label}-${key}`}
                    label={label}
                    base={baseAug[key]}
                    modified={modAug[key]}
                    fmtType={fmtType}
                    tooltip={tooltip}
                  />
                ))
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
