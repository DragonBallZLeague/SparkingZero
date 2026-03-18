import React, { useState, useMemo } from 'react';
import { getImageUrl, parseEffectKey, calcFiveHitArmorDamage } from '../utils/calculator.js';

// Reuse the same stat sections definition from StatsPanel
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
      { key: 'armor',               label: 'Armor',                  fmt: 'pct' },
      { key: 'meleeDefenseStat',    label: 'Melee Defense',           fmt: 'pct_mult_inv' },
      { key: 'blastDefense',        label: 'Blast Defense',           fmt: 'pct_mult_inv' },
      { key: 'kiBlastDefenseArmor', label: 'Ki Blast Defense + Armor',fmt: 'pct_mult_inv' },
      { key: 'melee',               label: '5-Hit Damage Taken',      fmt: 'int' },
    ],
  },
  {
    label: 'Combo Damage',
    hdrClass: 'bg-red-900/70',
    stats: [
      { key: 'rush',              label: 'Rush Hit 1',           fmt: 'int' },
      { key: 'hit2',              label: 'Rush Hit 2',           fmt: 'int' },
      { key: 'hit3',              label: 'Rush Hit 3',           fmt: 'int' },
      { key: 'hit4',              label: 'Rush Hit 4',           fmt: 'int' },
      { key: 'hit5',              label: 'Rush Hit 5',           fmt: 'int' },
      { key: 'rush5Hit',          label: '5-Hit Total',          fmt: 'int' },
      { key: 'fiveHitAfterArmor', label: '5-Hit (Against Armor)',fmt: 'int' },
    ],
  },
  {
    label: 'Melee',
    hdrClass: 'bg-orange-900/70',
    stats: [
      { key: 'smash',      label: 'Smash Attack' },
      { key: 'throw',      label: 'Throw' },
      { key: 'pursuit',    label: 'Pursuit' },
      { key: 'armorBreak', label: 'Armor Break', fmt: 'hits' },
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
      { key: 'sparkCharge',   label: 'Sparking Charge Time', fmt: 'pct' },
      { key: 'sparkDuration', label: 'Spark Duration',       fmt: 'pct' },
    ],
  },
];

// fields where lower is better (winning = lower value)
// lower raw value = better outcome for these fields
const LOWER_IS_BETTER = new Set(['switch', 'kiBlastCost', 'shortDashCost', 'melee', 'fiveHitWithArmor', 'armorBreak', 'sparkCharge']);
// Defense multiplier fields: lower multiplier = better defense (displayed as higher %)
const DEFENSE_MULT_FIELDS = new Set(['meleeDefenseStat', 'blastDefense', 'kiBlastDefenseArmor']);

function fmtPct(raw) {
  // Show one decimal only when the fractional part is non-zero
  const rounded1 = Math.round(raw * 10) / 10;
  const str = Number.isInteger(rounded1) ? String(rounded1) : rounded1.toFixed(1);
  return rounded1 > 0 ? `+${str}%` : `${str}%`;
}

function fmtVal(value, type) {
  if (value === null || value === undefined) return '—';
  if (type === 'pct_mult') {
    const pct = (value - 1) * 100;
    if (Math.round(pct * 10) === 0) return 'Base';
    return fmtPct(pct);
  }
  if (type === 'pct_mult_inv') {
    const pct = (1 - value) * 100;
    if (Math.round(pct * 10) === 0) return 'Base';
    return fmtPct(pct);
  }
  if (type === 'pct') {
    if (value === 0) return '—';
    return fmtPct(value * 100);
  }
  if (type === 'int')       return Math.round(value).toLocaleString();
  if (type === 'bars')      return `${Number(value).toFixed(1)} Bars`;
  if (type === 'bars2')     return `${Number(value).toFixed(2)} Bars`;
  if (type === 'bars3')     return `${Number(value).toFixed(3)} Bars`;
  if (type === 'bars_s')    return `${Number(value).toFixed(2)} Bars/s`;
  if (type === 'bars_hit')  return `${Number(value).toFixed(4)} Bars/hit`;
  if (type === 'bars_range')return `0–${value} Bars`;
  if (type === 'bar_count') return `${value} Bar(s)`;
  if (type === 'seconds')   return `${value} s`;
  if (type === 'hits')      return `${value} Hit(s)`;
  if (type === 'ki_count')  return value >= 999 ? '∞' : `${value} Ki Blasts`;
  if (type === 'skill_pts') return `${value} Point(s)`;
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
}

/**
 * Compute a signed numeric delta for comparison purposes.
 * Returns null if either value is not a number.
 */
function computeDelta(key, valA, valB, fmt) {
  if (typeof valA !== 'number' || typeof valB !== 'number') return null;

  // For defense multiplier fields (lower mult = better defense) compute defensive delta
  if (DEFENSE_MULT_FIELDS.has(key) || fmt === 'pct_mult_inv') {
    // Convert multipliers to displayed defense % (higher % = better)
    // Return defB - defA so positive = B wins, consistent with all other fields
    const defA = (1 - valA) * 100;
    const defB = (1 - valB) * 100;
    return defB - defA; // positive = B wins
  }

  return valB - valA; // positive = B wins
}

function deltaLabel(key, valA, valB, fmt) {
  const delta = computeDelta(key, valA, valB, fmt);
  if (delta === null || delta === 0) return null;

  // Format the magnitude nicely
  const abs = Math.abs(delta);
  let str;

  function fmtPctDelta(pctAbs) {
    const rounded1 = Math.round(pctAbs * 10) / 10;
    return Number.isInteger(rounded1) ? `${rounded1}%` : `${rounded1.toFixed(1)}%`;
  }

  if (fmt === 'pct_mult_inv' || DEFENSE_MULT_FIELDS.has(key)) {
    // delta is already in percentage space (computeDelta multiplied by 100)
    str = fmtPctDelta(abs);
  } else if (fmt === 'pct' || fmt === 'pct_mult') {
    // delta is in raw decimal/multiplier space — convert to percentage first
    str = fmtPctDelta(abs * 100);
  } else if (fmt === 'bars_hit') {
    str = abs.toFixed(4);
  } else if (fmt === 'bars2') {
    str = abs.toFixed(2);
  } else if (fmt === 'bars3') {
    str = abs.toFixed(3);
  } else if (fmt === 'bars_s') {
    str = abs.toFixed(2);
  } else if (typeof valB === 'number' && !Number.isInteger(valB)) {
    str = Math.round(abs).toLocaleString();
  } else {
    str = Math.round(abs).toLocaleString();
  }

  // delta > 0 means B is "numerically larger"
  // but we need to map that to "who wins"
  const bWins = LOWER_IS_BETTER.has(key) ? delta < 0 : delta > 0;
  return { str, bWins, delta };
}

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

// ─── Skills / Blast view helpers ───────────────────────────────────────────
function isReplacementSlot(slot) {
  if (!slot) return false;
  return slot.replace(/[\s_]/g, '').toLowerCase() === 'replacementslot2';
}

function fmtKiBars(val) {
  const bars = val / 10000;
  const display = Number.isInteger(bars) ? String(bars) : bars.toFixed(1);
  return `${display} bar${bars === 1 ? '' : 's'}`;
}

function getCapsuleBlastMod(equippedCapsules, fields) {
  if (!equippedCapsules) return 0;
  let percent = 0;
  equippedCapsules.forEach(cap => {
    if (!cap?.effects) return;
    cap.effects.forEach(eff => {
      if (!eff) return;
      const m = parseEffectKey(eff.key);
      if (m && eff.value !== null && fields.includes(m.field) && m.op === 'percent') {
        percent += eff.value;
      }
    });
  });
  return percent;
}

function getModifiedDmg(rawPatch, capsulePct, skillPct) {
  if (rawPatch == null || rawPatch === '') return null;
  const base = Number(rawPatch);
  if (isNaN(base)) return null;
  const total = capsulePct + skillPct;
  return total !== 0 ? Math.round(base * (1 + total / 100)) : base;
}

function getCharBlasts(charName, blasts) {
  const cb = blasts?.[charName] || [];
  return {
    blast1:      cb.find(b => b.slot === 'BlastSkill1') || null,
    blast2:      cb.find(b => b.slot === 'BlastSkill2') || null,
    replacement: cb.find(b => isReplacementSlot(b.slot)) || null,
    ultimate:    cb.find(b => b.slot === 'BlastUltimate') || null,
  };
}

const CAT_COLORS = {
  Beam:                        'bg-blue-700/70 text-blue-200',
  Rush:                        'bg-orange-700/70 text-orange-200',
  'Continuous Fire':           'bg-purple-700/70 text-purple-200',
  Fire:                        'bg-red-700/70 text-red-200',
  'Short-Range Energy Attack': 'bg-teal-700/70 text-teal-200',
  'Explosive Wave':            'bg-amber-700/70 text-amber-200',
  'Lock-On Explosion':         'bg-lime-700/70 text-lime-200',
  'Simultaneous Fire':         'bg-rose-700/70 text-rose-200',
  Sweep:                       'bg-cyan-700/70 text-cyan-200',
};
function catClass(cat) { return CAT_COLORS[cat] || 'bg-gray-700/70 text-gray-300'; }

const SKILL_TYPE_COLORS = {
  'Sparking':             'bg-yellow-700/70 text-yellow-200',
  'Buff/Sparking':        'bg-yellow-800/70 text-yellow-300',
  'Buff/DeBuff/Sparking': 'bg-amber-700/70 text-amber-200',
  'Teleport':             'bg-cyan-700/70 text-cyan-200',
  'Evade':                'bg-teal-700/70 text-teal-200',
  'Multi-Evade':          'bg-teal-700/70 text-teal-200',
  'Barrier':              'bg-blue-700/70 text-blue-200',
  'Bind':                 'bg-purple-700/70 text-purple-200',
  'Buff/Debuff':          'bg-orange-700/70 text-orange-200',
  'Buff':                 'bg-orange-800/70 text-orange-300',
  'Buff/Ki':              'bg-green-700/70 text-green-200',
  'Buff/HealthDown':      'bg-rose-800/70 text-rose-200',
  'Heal':                 'bg-pink-700/70 text-pink-200',
  'Health':               'bg-pink-700/70 text-pink-200',
  'Damage':               'bg-red-700/70 text-red-200',
  'Explosion':            'bg-red-800/70 text-red-300',
  'Explosion/Sparking':   'bg-orange-900/70 text-orange-200',
  'Blind':                'bg-slate-700/70 text-slate-200',
  'Ki':                   'bg-indigo-700/70 text-indigo-200',
  'Push':                 'bg-sky-700/70 text-sky-200',
  'Speed Buff':           'bg-lime-700/70 text-lime-200',
};
function skillTypeClass(type) { return SKILL_TYPE_COLORS[type] || 'bg-gray-700/70 text-gray-300'; }

const SKILL_BUFF_COLS = [
  { key: 'meleeBuff',      label: 'Melee',     cls: 'bg-orange-800/60 text-orange-300' },
  { key: 'defenseBuff',    label: 'Defense',   cls: 'bg-teal-800/60 text-teal-300'     },
  { key: 'kiBlastBuff',    label: 'Ki Blast',  cls: 'bg-purple-800/60 text-purple-300' },
  { key: 'kiChargingBuff', label: 'Ki Charge', cls: 'bg-blue-800/60 text-blue-300'     },
  { key: 'blastBuff',      label: 'Blast',     cls: 'bg-red-800/60 text-red-300'       },
  { key: 'ultimateBuff',   label: 'Ultimate',  cls: 'bg-amber-800/60 text-amber-300'   },
];

function CharCard({ char, modStats, characterImages, label }) {
  const imgId = char ? characterImages?.[char.name] : null;
  const badgeColor = char ? (CLASS_BADGE_COLOR[char.class] || 'bg-gray-600 text-white') : '';

  if (!char) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-32 bg-sz-border/30 rounded-lg border border-sz-border/50 mx-2">
        <div className="text-3xl text-gray-700 mb-1">?</div>
        <p className="text-xs text-gray-600 text-center">Select {label}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center gap-2 px-2 py-1.5 min-w-0">
      {/* Portrait thumbnail */}
      <div className="w-14 h-14 flex-shrink-0 rounded overflow-hidden bg-sz-border">
        {imgId ? (
          <img
            src={getImageUrl(imgId)}
            alt={char.name}
            className="w-full h-full object-cover object-top scale-110"
            onError={e => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 font-bold text-lg">
            {char.name[0]}
          </div>
        )}
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5">{label}</div>
        <div className="text-sm font-bold text-white truncate leading-tight">{char.name}</div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold leading-none ${badgeColor}`}>
            {char.class}
          </span>
          <span className="text-xs text-sz-orange font-mono font-bold">DP {char.dp}</span>
          {modStats && char.dp !== modStats.dp && (
            <span className="text-xs text-gray-500 font-mono">→ {modStats.dp}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function CompareRow({ label, keyName, valA, valB, fmtType, modifiedA, modifiedB }) {
  const displayA = modifiedA ?? valA;
  const displayB = modifiedB ?? valB;
  const changedA = typeof valA === 'number' && modifiedA !== null && modifiedA !== undefined && valA !== modifiedA;
  const changedB = typeof valB === 'number' && modifiedB !== null && modifiedB !== undefined && valB !== modifiedB;

  const info = (displayA !== null && displayB !== null)
    ? deltaLabel(keyName, displayA, displayB, fmtType)
    : null;

  // Determine winner
  const aWins = info && !info.bWins;
  const bWins = info && info.bWins;

  return (
    <tr className="border-b border-sz-border/20">
      {/* Char A value */}
      <td className={`py-1.5 px-2 text-sm text-right font-mono leading-tight w-24 transition-colors ${
        changedA ? 'text-sz-orange font-bold' : 'text-gray-300'
      } ${aWins ? 'bg-green-950/30' : bWins ? 'bg-red-950/20' : ''}`}>
        {fmtVal(displayA, fmtType)}
      </td>
      {/* Stat label */}
      <td className="py-1.5 px-2 text-xs text-gray-500 text-center leading-tight whitespace-nowrap">
        {label}
      </td>
      {/* Char B value */}
      <td className={`py-1.5 px-2 text-sm text-left font-mono leading-tight w-24 transition-colors ${
        changedB ? 'text-sz-orange font-bold' : 'text-gray-300'
      } ${bWins ? 'bg-green-950/30' : aWins ? 'bg-red-950/20' : ''}`}>
        {fmtVal(displayB, fmtType)}
      </td>
      {/* Delta */}
      <td className="py-1.5 px-2 text-xs text-center font-mono w-16 leading-tight">
        {info ? (
          <span className={info.bWins ? 'text-green-400' : 'text-red-400'}>
            {info.bWins ? '+' : '−'}{info.str}
          </span>
        ) : (
          <span className="text-gray-700">—</span>
        )}
      </td>
    </tr>
  );
}

const SKILL_DASH = <span className="text-gray-600">—</span>;

function SkillAttrRow({ label, aContent, bContent, delta }) {
  const aWins = delta && !delta.bWins;
  const bWins = delta && delta.bWins;
  return (
    <tr className="border-b border-sz-border/20">
      <td className={`py-1.5 px-2 text-sm text-right leading-tight ${aWins ? 'bg-green-950/30' : bWins ? 'bg-red-950/20' : ''}`}>
        {aContent}
      </td>
      <td className="py-1.5 px-2 text-xs text-gray-500 text-center leading-tight whitespace-nowrap">
        {label}
      </td>
      <td className={`py-1.5 px-2 text-sm text-left leading-tight ${bWins ? 'bg-green-950/30' : aWins ? 'bg-red-950/20' : ''}`}>
        {bContent}
      </td>
      <td className="py-1.5 px-2 text-xs text-center font-mono w-16 leading-tight">
        {delta ? (
          <span className={delta.bWins ? 'text-green-400' : 'text-red-400'}>
            {delta.bWins ? '+' : '−'}{delta.str}
          </span>
        ) : <span className="text-gray-700">—</span>}
      </td>
    </tr>
  );
}

function hasBuff(detail) {
  if (!detail) return false;
  return SKILL_BUFF_COLS.some(col => detail[col.key] && detail[col.key] !== 0) || !!detail.armor;
}

function SkillCompareSection({ aSkill, bSkill, slotLabel, activeSkillsA, activeSkillsB, onToggleSkillA, onToggleSkillB }) {
  const ad = aSkill?.detail ?? null;
  const bd = bSkill?.detail ?? null;

  function numDelta(av, bv, lowerBetter = false) {
    if (av == null || bv == null) return null;
    const d = bv - av;
    if (Math.abs(d) < 0.0001) return null;
    const bWins = lowerBetter ? d < 0 : d > 0;
    const abs = Math.abs(d);
    return { str: Number.isInteger(abs) ? abs.toLocaleString() : abs.toFixed(2), bWins };
  }

  const aFlags = ad ? [
    ad.instantSparking && 'Inst. Spark',
    ad.instantKi       && 'Inst. Ki',
    ad.unblockable     && 'Unblockable',
    ad.armor           && 'Armor',
    ad.cutscene        && 'Cutscene',
  ].filter(Boolean) : [];
  const bFlags = bd ? [
    bd.instantSparking && 'Inst. Spark',
    bd.instantKi       && 'Inst. Ki',
    bd.unblockable     && 'Unblockable',
    bd.armor           && 'Armor',
    bd.cutscene        && 'Cutscene',
  ].filter(Boolean) : [];

  const costDelta    = numDelta(ad?.cost ?? null,             bd?.cost ?? null,             true);
  const actTimeDelta = numDelta(ad?.activationTime ?? null,   bd?.activationTime ?? null,   true);
  const dmgA         = (ad?.baseDamage > 0) ? ad.baseDamage  : null;
  const dmgB         = (bd?.baseDamage > 0) ? bd.baseDamage  : null;
  const dmgDeltaVal  = numDelta(dmgA, dmgB, false);
  const durA         = (ad?.duration > 0)   ? ad.duration    : null;
  const durB         = (bd?.duration > 0)   ? bd.duration    : null;
  const durDelta     = numDelta(durA, durB, false);
  const hpA          = (ad?.healthAmount > 0) ? ad.healthAmount : null;
  const hpB          = (bd?.healthAmount > 0) ? bd.healthAmount : null;
  const hpDelta      = numDelta(hpA, hpB, false);
  const kiA          = (ad?.kiAmount > 0)   ? ad.kiAmount    : null;
  const kiB          = (bd?.kiAmount > 0)   ? bd.kiAmount    : null;
  const kiDelta      = numDelta(kiA, kiB, false);

  const visibleBuffRows = SKILL_BUFF_COLS.filter(col =>
    (ad?.[col.key] ?? 0) !== 0 || (bd?.[col.key] ?? 0) !== 0
  );

  const aBuffable = hasBuff(ad);
  const bBuffable = hasBuff(bd);
  const aActive = aBuffable && activeSkillsA?.some(s => s.id === ad?.id);
  const bActive = bBuffable && activeSkillsB?.some(s => s.id === bd?.id);

  return (
    <>
      <tr className="bg-purple-900/30 border-y border-sz-border/40">
        <td colSpan={4} className="py-1.5 px-3 text-xs font-bold uppercase tracking-wider text-purple-200">
          {slotLabel}
        </td>
      </tr>

      {/* Skill name — each side independently clickable if has buffs */}
      <tr className="border-b border-sz-border/20">
        <td
          className={`py-1.5 px-2 text-sm text-right leading-tight ${
            aBuffable ? 'cursor-pointer select-none hover:bg-gray-800/30' : ''
          } ${aActive ? 'bg-yellow-900/30 ring-1 ring-inset ring-yellow-600/50' : ''}`}
          onClick={() => { if (aBuffable && ad) onToggleSkillA?.(ad); }}
          title={aBuffable ? (aActive ? 'Click to deactivate buffs' : 'Click to activate buffs') : undefined}
        >
          {aSkill ? (
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-1.5 justify-end">
                {aBuffable && (
                  <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${aActive ? 'bg-yellow-400' : 'bg-gray-600'}`} />
                )}
                <span className="text-gray-200 font-medium">{aSkill.name}</span>
              </div>
              {aFlags.length > 0 && (
                <div className="flex gap-0.5 flex-wrap justify-end">
                  {aFlags.map(f => <span key={f} className="text-[10px] px-1 py-px rounded bg-indigo-800/50 text-indigo-300">{f}</span>)}
                </div>
              )}
            </div>
          ) : SKILL_DASH}
        </td>
        <td className="py-1.5 px-2 text-xs text-gray-500 text-center leading-tight whitespace-nowrap">Skill</td>
        <td
          className={`py-1.5 px-2 text-sm text-left leading-tight ${
            bBuffable ? 'cursor-pointer select-none hover:bg-gray-800/30' : ''
          } ${bActive ? 'bg-yellow-900/30 ring-1 ring-inset ring-yellow-600/50' : ''}`}
          onClick={() => { if (bBuffable && bd) onToggleSkillB?.(bd); }}
          title={bBuffable ? (bActive ? 'Click to deactivate buffs' : 'Click to activate buffs') : undefined}
        >
          {bSkill ? (
            <div className="flex flex-col items-start gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-200 font-medium">{bSkill.name}</span>
                {bBuffable && (
                  <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${bActive ? 'bg-yellow-400' : 'bg-gray-600'}`} />
                )}
              </div>
              {bFlags.length > 0 && (
                <div className="flex gap-0.5 flex-wrap">
                  {bFlags.map(f => <span key={f} className="text-[10px] px-1 py-px rounded bg-indigo-800/50 text-indigo-300">{f}</span>)}
                </div>
              )}
            </div>
          ) : SKILL_DASH}
        </td>
        <td className="py-1.5 px-2 w-16" />
      </tr>

      {/* Type */}
      {(ad?.type || bd?.type) && (
        <SkillAttrRow
          label="Type"
          aContent={ad?.type ? <span className={`text-[10px] px-1.5 py-px rounded font-medium ${skillTypeClass(ad.type)}`}>{ad.type}</span> : SKILL_DASH}
          bContent={bd?.type ? <span className={`text-[10px] px-1.5 py-px rounded font-medium ${skillTypeClass(bd.type)}`}>{bd.type}</span> : SKILL_DASH}
          delta={null}
        />
      )}

      {/* Cost */}
      {(ad?.cost != null || bd?.cost != null) && (
        <SkillAttrRow
          label="Cost"
          aContent={ad?.cost != null ? <span className="text-gray-200 font-mono">{ad.cost}pt</span> : SKILL_DASH}
          bContent={bd?.cost != null ? <span className="text-gray-200 font-mono">{bd.cost}pt</span> : SKILL_DASH}
          delta={costDelta ? { ...costDelta, str: costDelta.str + 'pt' } : null}
        />
      )}

      {/* Act. Time */}
      {(ad?.activationTime != null || bd?.activationTime != null) && (
        <SkillAttrRow
          label="Act. Time"
          aContent={ad?.activationTime != null ? <span className="text-gray-200 font-mono">{ad.activationTime.toFixed(2)}s</span> : SKILL_DASH}
          bContent={bd?.activationTime != null ? <span className="text-gray-200 font-mono">{bd.activationTime.toFixed(2)}s</span> : SKILL_DASH}
          delta={actTimeDelta ? { ...actTimeDelta, str: actTimeDelta.str + 's' } : null}
        />
      )}

      {/* Damage */}
      {(dmgA != null || dmgB != null) && (
        <SkillAttrRow
          label="Damage"
          aContent={dmgA != null ? <span className="text-sz-orange font-mono font-bold">{Math.round(dmgA).toLocaleString()}</span> : SKILL_DASH}
          bContent={dmgB != null ? <span className="text-sz-orange font-mono font-bold">{Math.round(dmgB).toLocaleString()}</span> : SKILL_DASH}
          delta={dmgDeltaVal}
        />
      )}

      {/* Duration */}
      {(durA != null || durB != null) && (
        <SkillAttrRow
          label="Duration"
          aContent={durA != null ? <span className="text-gray-200 font-mono">{durA}s</span> : SKILL_DASH}
          bContent={durB != null ? <span className="text-gray-200 font-mono">{durB}s</span> : SKILL_DASH}
          delta={durDelta ? { ...durDelta, str: durDelta.str + 's' } : null}
        />
      )}

      {/* Health Gain */}
      {(hpA != null || hpB != null) && (
        <SkillAttrRow
          label="Health Gain"
          aContent={hpA != null ? <span className="text-pink-400 font-mono">+{hpA}</span> : SKILL_DASH}
          bContent={hpB != null ? <span className="text-pink-400 font-mono">+{hpB}</span> : SKILL_DASH}
          delta={hpDelta}
        />
      )}

      {/* Ki Gain */}
      {(kiA != null || kiB != null) && (
        <SkillAttrRow
          label="Ki Gain"
          aContent={kiA != null ? <span className="text-blue-400 font-mono">+{kiA}</span> : SKILL_DASH}
          bContent={kiB != null ? <span className="text-blue-400 font-mono">+{kiB}</span> : SKILL_DASH}
          delta={kiDelta}
        />
      )}

      {/* Buff rows — only shown if at least one side has a value */}
      {visibleBuffRows.map(col => {
        const av = ad?.[col.key] ?? 0;
        const bv = bd?.[col.key] ?? 0;
        const d = numDelta(av !== 0 ? av : null, bv !== 0 ? bv : null, false);
        return (
          <SkillAttrRow
            key={col.key}
            label={col.label}
            aContent={av !== 0 ? <span className={`font-mono font-semibold ${av > 0 ? 'text-green-400' : 'text-red-400'}`}>{av > 0 ? '+' : ''}{av}</span> : SKILL_DASH}
            bContent={bv !== 0 ? <span className={`font-mono font-semibold ${bv > 0 ? 'text-green-400' : 'text-red-400'}`}>{bv > 0 ? '+' : ''}{bv}</span> : SKILL_DASH}
            delta={d}
          />
        );
      })}
    </>
  );
}

function BlastSide({ blast, modDmg, changed, side, hasReplacement, replActive, onToggleRepl }) {
  if (!blast) return <span className="text-gray-600 text-sm">—</span>;
  const isRight = side === 'a';

  const contentBlock = (
    <div className={`flex flex-col ${isRight ? 'items-end' : 'items-start'} min-w-0 flex-1 overflow-hidden`}>
      <span className={`text-sm text-gray-200 font-medium leading-tight w-full ${isRight ? 'text-right' : ''}`}>{blast.name || '—'}</span>
      {blast.category && (
        <span className={`text-[10px] px-1.5 py-px rounded font-medium whitespace-nowrap ${catClass(blast.category)}`}>
          {blast.category}
        </span>
      )}
      {modDmg !== null && (
        <span className={`text-sm font-mono mt-0.5 ${changed ? 'text-sz-orange font-bold' : 'text-gray-300'}`}>
          {modDmg.toLocaleString()}
        </span>
      )}
      {(() => {
        const traitTags = [
          ...(blast.traits || []).filter(Boolean),
          ...(blast.dashClashCapable ? ['Can Speed Clash'] : []),
          ...(blast.beamClashCapable ? ['Can Beam Clash'] : []),
          ...(blast.targetGiant ? ['Can Target Giants'] : []),
        ];
        if (!traitTags.length) return null;
        return (
          <div className={`flex gap-0.5 mt-0.5 flex-wrap ${isRight ? 'justify-end' : ''}`}>
            {traitTags.map((t, i) => (
              <span key={i} className="text-[10px] px-1 py-px rounded bg-gray-700/60 text-gray-400">{t}</span>
            ))}
          </div>
        );
      })()}
    </div>
  );

  const toggleBtn = hasReplacement ? (
    <button
      onClick={onToggleRepl}
      className="flex-shrink-0 self-center text-[10px] px-2 py-1 rounded border font-semibold transition-colors whitespace-nowrap
        bg-amber-950/60 border-amber-700/60 text-amber-400
        hover:bg-amber-900/70 hover:border-amber-500 hover:text-amber-200"
    >
      {replActive ? '↩ Orig' : '⇄ Alt'}
    </button>
  ) : null;

  return (
    <div className={`flex items-center gap-2 w-full min-w-0 ${isRight ? 'flex-row-reverse' : ''}`}>
      {contentBlock}
      {toggleBtn}
    </div>
  );
}

function kiVolley(stats) {
  if (!stats) return 0;
  const dmg = stats.kiBlastDmg ?? 0;
  const count = stats.kiBlastLimit ?? 0;
  return Math.round(dmg * (count >= 999 ? 20 : count));
}

export default function CompareStatsPanel({
  charA, charB, modStatsA, modStatsB, characterImages,
  blasts = {}, skills = [],
  equippedCapsulesA = [], equippedCapsulesB = [],
  activeSkillsA = [], activeSkillsB = [],
  onToggleSkillA, onToggleSkillB,
}) {
  const [compareView, setCompareView] = useState('stats');
  const [replActiveA, setReplActiveA] = useState(false);
  const [replActiveB, setReplActiveB] = useState(false);
  const [armorBreakHit, setArmorBreakHit] = useState(5);

  const augA = charA ? { ...charA, kiBlastVolley: kiVolley(charA) } : null;
  const augB = charB ? { ...charB, kiBlastVolley: kiVolley(charB) } : null;
  const modAugA = modStatsA ? { ...modStatsA, kiBlastVolley: kiVolley(modStatsA) } : augA;
  const modAugB = modStatsB ? { ...modStatsB, kiBlastVolley: kiVolley(modStatsB) } : augB;

  const neitherSelected = !charA && !charB;

  // Skills view data
  const skillMap = useMemo(() => {
    const map = {};
    skills.forEach(s => { if (s.name) map[s.name.toLowerCase()] = s; });
    return map;
  }, [skills]);

  const aBlastInfo = useMemo(() => getCharBlasts(charA?.name, blasts), [charA, blasts]);
  const bBlastInfo = useMemo(() => getCharBlasts(charB?.name, blasts), [charB, blasts]);

  const aBlastCapPct = useMemo(() => getCapsuleBlastMod(equippedCapsulesA, ['blastDamage', 'blastCombo']), [equippedCapsulesA]);
  const bBlastCapPct = useMemo(() => getCapsuleBlastMod(equippedCapsulesB, ['blastDamage', 'blastCombo']), [equippedCapsulesB]);
  const aUltCapPct   = useMemo(() => getCapsuleBlastMod(equippedCapsulesA, ['ultimate']), [equippedCapsulesA]);
  const bUltCapPct   = useMemo(() => getCapsuleBlastMod(equippedCapsulesB, ['ultimate']), [equippedCapsulesB]);

  const aBlastSkillPct = useMemo(() => activeSkillsA.reduce((s, sk) => s + (sk.blastBuff || 0) * 5, 0), [activeSkillsA]);
  const bBlastSkillPct = useMemo(() => activeSkillsB.reduce((s, sk) => s + (sk.blastBuff || 0) * 5, 0), [activeSkillsB]);
  const aUltSkillPct   = useMemo(() => activeSkillsA.reduce((s, sk) => s + (sk.blastBuff || 0) * 5 + (sk.ultimateBuff || 0) * 5, 0), [activeSkillsA]);
  const bUltSkillPct   = useMemo(() => activeSkillsB.reduce((s, sk) => s + (sk.blastBuff || 0) * 5 + (sk.ultimateBuff || 0) * 5, 0), [activeSkillsB]);

  const aSlot2 = (aBlastInfo.replacement && replActiveA) ? aBlastInfo.replacement : aBlastInfo.blast2;
  const bSlot2 = (bBlastInfo.replacement && replActiveB) ? bBlastInfo.replacement : bBlastInfo.blast2;

  const aBlast1Dmg = getModifiedDmg(aBlastInfo.blast1?.baseDamagePatch, aBlastCapPct, aBlastSkillPct);
  const bBlast1Dmg = getModifiedDmg(bBlastInfo.blast1?.baseDamagePatch, bBlastCapPct, bBlastSkillPct);
  const aSlot2Dmg  = getModifiedDmg(aSlot2?.baseDamagePatch, aBlastCapPct, aBlastSkillPct);
  const bSlot2Dmg  = getModifiedDmg(bSlot2?.baseDamagePatch, bBlastCapPct, bBlastSkillPct);
  const aUltDmg    = getModifiedDmg(aBlastInfo.ultimate?.baseDamagePatch, aUltCapPct, aUltSkillPct);
  const bUltDmg    = getModifiedDmg(bBlastInfo.ultimate?.baseDamagePatch, bUltCapPct, bUltSkillPct);

  function blastWinner(aVal, bVal) {
    if (aVal === null || bVal === null) return null;
    if (aVal > bVal) return 'a';
    if (bVal > aVal) return 'b';
    return null;
  }
  const blast1Winner = blastWinner(aBlast1Dmg, bBlast1Dmg);
  const slot2Winner  = blastWinner(aSlot2Dmg, bSlot2Dmg);
  const ultWinner    = blastWinner(aUltDmg, bUltDmg);

  const aBlastChanged = aBlastCapPct + aBlastSkillPct !== 0;
  const bBlastChanged = bBlastCapPct + bBlastSkillPct !== 0;
  const aUltChanged   = aUltCapPct + aUltSkillPct !== 0;
  const bUltChanged   = bUltCapPct + bUltSkillPct !== 0;

  function getSkillInfo(char, slot) {
    if (!char) return null;
    const name = slot === 1 ? char.skill1Name : char.skill2Name;
    if (!name) return null;
    return { name, detail: skillMap[name.toLowerCase()] || null };
  }

  function dmgDelta(aVal, bVal) {
    if (aVal === null || bVal === null) return <span className="text-gray-700 text-xs font-mono">—</span>;
    const d = bVal - aVal;
    if (d === 0) return <span className="text-gray-600 text-xs font-mono">—</span>;
    const bWins = d > 0;
    return (
      <span className={`text-xs font-mono ${bWins ? 'text-green-400' : 'text-red-400'}`}>
        {bWins ? '+' : '−'}{Math.abs(Math.round(d)).toLocaleString()}
      </span>
    );
  }

  function blastFieldRows(aBlast, bBlast) {
    const fields = [
      { label: 'Ki Cost',         aVal: aBlast?.maxExpendEnergy,     bVal: bBlast?.maxExpendEnergy,     lowerBetter: true, fmt: fmtKiBars },
      { label: 'Speed',           aVal: aBlast?.lungeSpeed,          bVal: bBlast?.lungeSpeed,          lowerBetter: false },
      { label: 'Impact Power',    aVal: aBlast?.impactPower,         bVal: bBlast?.impactPower,         lowerBetter: false },
    ].filter(f => f.aVal != null || f.bVal != null);
    if (!fields.length) return null;
    return fields.map(({ label, aVal, bVal, lowerBetter, fmt }) => {
      const fmtVal = fmt ?? (v => Number(v).toLocaleString());
      const d = (aVal != null && bVal != null) ? bVal - aVal : null;
      const bWins = d !== null && d !== 0 && (lowerBetter ? d < 0 : d > 0);
      const aWins = d !== null && d !== 0 && !bWins;
      const delta = d !== null && d !== 0 ? (
        <span className={`text-xs font-mono ${bWins ? 'text-green-400' : 'text-red-400'}`}>
          {d > 0 ? '+' : '−'}{Math.abs(Math.round(d)).toLocaleString()}
        </span>
      ) : <span className="text-gray-700 text-xs font-mono">—</span>;
      return (
        <div key={label} className="flex border-b border-sz-border/10 bg-gray-900/10">
          <div className={`flex-1 py-1 px-2 text-right text-xs font-mono text-gray-300 ${aWins ? 'bg-green-950/30' : bWins ? 'bg-red-950/20' : ''}`}>
            {aVal != null ? fmtVal(aVal) : <span className="text-gray-600">—</span>}
          </div>
          <div className="w-14 flex-shrink-0 flex items-center justify-center border-x border-sz-border/20">
            <span className="text-[10px] text-gray-500 text-center leading-tight">{label}</span>
          </div>
          <div className={`flex-1 py-1 px-2 text-left text-xs font-mono text-gray-300 ${bWins ? 'bg-green-950/30' : aWins ? 'bg-red-950/20' : ''}`}>
            {bVal != null ? fmtVal(bVal) : <span className="text-gray-600">—</span>}
          </div>
          <div className="w-16 flex-shrink-0 flex items-center justify-center">{delta}</div>
        </div>
      );
    });
  }

  const hasAnyBlast = !!(aBlastInfo.blast1 || bBlastInfo.blast1 || aBlastInfo.blast2 || bBlastInfo.blast2 || aBlastInfo.replacement || bBlastInfo.replacement);
  const hasAnyUlt   = !!(aBlastInfo.ultimate || bBlastInfo.ultimate);
  const hasAnySkill = !!(charA?.skill1Name || charA?.skill2Name || charB?.skill1Name || charB?.skill2Name);

  const aSparkObj = useMemo(() => charA?.sparkStatBuffs ? { id: `spark_${charA.name}`, instantSparking: true, ...charA.sparkStatBuffs } : null, [charA]);
  const bSparkObj = useMemo(() => charB?.sparkStatBuffs ? { id: `spark_${charB.name}`, instantSparking: true, ...charB.sparkStatBuffs } : null, [charB]);
  const aSparkBuffable = hasBuff(aSparkObj);
  const bSparkBuffable = hasBuff(bSparkObj);
  const aSparkActive = aSparkBuffable && activeSkillsA.some(s => s.id === aSparkObj?.id);
  const bSparkActive = bSparkBuffable && activeSkillsB.some(s => s.id === bSparkObj?.id);
  const hasAnyTraits = !!(charA?.miscellaneous || charB?.miscellaneous || aSparkObj || bSparkObj);

  return (
    <div className="flex flex-col h-full">
      {/* Character header strip */}
      <div className="flex-shrink-0 border-b-2 border-sz-border bg-sz-panel/80 flex items-stretch">
        <CharCard char={charA} modStats={modStatsA} characterImages={characterImages} label="Character A" />
        <div className="w-px bg-sz-border flex-shrink-0" />
        <CharCard char={charB} modStats={modStatsB} characterImages={characterImages} label="Character B" />
      </div>

      {/* View toggle */}
      <div className="flex-shrink-0 flex border-b border-sz-border bg-sz-panel/60">
        <button
          onClick={() => setCompareView('stats')}
          className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
            compareView === 'stats'
              ? 'text-sz-orange border-b-2 border-sz-orange -mb-px'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          ≡ Stats
        </button>
        <button
          onClick={() => setCompareView('skills')}
          className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
            compareView === 'skills'
              ? 'text-sz-orange border-b-2 border-sz-orange -mb-px'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          ⚡ Skills
        </button>
      </div>

      {/* Column headers (both views) */}
      <div className="flex-shrink-0 border-b border-sz-border bg-sz-panel/50">
        <table className="w-full">
          <thead>
            <tr>
              <th className="py-1.5 px-2 text-xs text-gray-400 text-right font-semibold w-24">
                {charA ? <span className="text-sz-orange truncate block max-w-[6rem] text-right ml-auto">A</span> : 'A'}
              </th>
              <th className="py-1.5 px-2 text-xs text-gray-500 text-center font-medium">
                {compareView === 'stats' ? 'Stat' : '—'}
              </th>
              <th className="py-1.5 px-2 text-xs text-gray-400 text-left font-semibold w-24">
                {charB ? <span className="text-blue-400 truncate block max-w-[6rem]">B</span> : 'B'}
              </th>
              <th className="py-1.5 px-2 text-xs text-gray-500 text-center font-medium w-16">Δ B−A</th>
            </tr>
          </thead>
        </table>
      </div>

      {neitherSelected ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-700 p-6">
          <div className="text-4xl mb-3">⚔</div>
          <p className="text-sm text-center">Select two characters to compare</p>
        </div>
      ) : compareView === 'stats' ? (
        <div className="flex-1 overflow-y-auto">
          <table className="w-full">
            <tbody>
              {STAT_SECTIONS.map(section => (
                <React.Fragment key={section.label}>
                  <tr>
                    <td colSpan={4} className={`py-1 px-2 text-xs font-bold uppercase tracking-wider text-gray-300 ${section.hdrClass}`}>
                      {section.label}
                    </td>
                  </tr>
                  {section.stats.map(({ key, label, fmt: fmtType }) => (
                    <CompareRow
                      key={`${section.label}-${key}`}
                      label={label}
                      keyName={key}
                      valA={augA?.[key] ?? null}
                      valB={augB?.[key] ?? null}
                      modifiedA={modAugA?.[key] ?? null}
                      modifiedB={modAugB?.[key] ?? null}
                      fmtType={fmtType}
                    />
                  ))}
                  {section.label === 'Defense' && (
                    <>
                      <CompareRow
                        label="5-Hit Dmg Taken (w/ Armor)"
                        keyName="fiveHitWithArmor"
                        valA={augA ? calcFiveHitArmorDamage(augA, armorBreakHit) : null}
                        valB={augB ? calcFiveHitArmorDamage(augB, armorBreakHit) : null}
                        modifiedA={modAugA ? calcFiveHitArmorDamage(modAugA, armorBreakHit) : null}
                        modifiedB={modAugB ? calcFiveHitArmorDamage(modAugB, armorBreakHit) : null}
                        fmtType="int"
                      />
                      <tr className="border-b border-sz-border/20">
                        <td colSpan={3} className="pb-1 text-center">
                          <div className="inline-flex flex-col items-center gap-1">
                            <span className="text-[10px] text-gray-600 uppercase tracking-wider">Break on Hit:</span>
                            <div className="flex gap-1.5">
                            {[2, 3, 4, 5].map(n => (
                              <button
                                key={n}
                                onClick={() => setArmorBreakHit(n)}
                                className={`text-xs px-4 py-1 rounded font-mono transition-colors ${
                                  armorBreakHit === n
                                    ? 'bg-teal-700 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                                }`}
                              >
                                {n}
                              </button>
                            ))}
                            </div>
                          </div>
                        </td>
                        <td className="w-16" />
                      </tr>
                    </>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Skills view */
        <div className="flex-1 overflow-y-auto">
          {/* Skills section */}
          {hasAnySkill && (
            <table className="w-full table-fixed">
              <colgroup>
                <col />
                <col style={{ width: '3.5rem' }} />{/* matches blast center w-14 */}
                <col />
                <col style={{ width: '4rem' }} />{/* matches blast delta w-16 */}
              </colgroup>
              <tbody>
                {[1, 2].map(slot => {
                  const aSkill = getSkillInfo(charA, slot);
                  const bSkill = getSkillInfo(charB, slot);
                  if (!aSkill && !bSkill) return null;
                  return (
                    <SkillCompareSection
                      key={slot}
                      aSkill={aSkill}
                      bSkill={bSkill}
                      slotLabel={`Skill ${slot}`}
                      activeSkillsA={activeSkillsA}
                      activeSkillsB={activeSkillsB}
                      onToggleSkillA={onToggleSkillA}
                      onToggleSkillB={onToggleSkillB}
                    />
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Blasts section */}
          {hasAnyBlast && (
            <>
              <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-300 bg-orange-900/50 border-b border-t border-sz-border">
                Blasts
              </div>
              {(aBlastInfo.blast1 || bBlastInfo.blast1) && (
                <>
                  <div className="flex border-b border-sz-border/20">
                    <div className={`flex-1 p-2 flex flex-col justify-center items-end min-w-0 ${blast1Winner === 'a' ? 'bg-green-950/30' : blast1Winner === 'b' ? 'bg-red-950/20' : ''}`}>
                      <BlastSide blast={aBlastInfo.blast1} modDmg={aBlast1Dmg} changed={aBlastChanged} side="a" />
                    </div>
                    <div className="w-14 flex-shrink-0 flex items-center justify-center border-x border-sz-border/20">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium text-center leading-tight">Blast 1</span>
                    </div>
                    <div className={`flex-1 p-2 flex flex-col justify-center items-start min-w-0 ${blast1Winner === 'b' ? 'bg-green-950/30' : blast1Winner === 'a' ? 'bg-red-950/20' : ''}`}>
                      <BlastSide blast={bBlastInfo.blast1} modDmg={bBlast1Dmg} changed={bBlastChanged} side="b" />
                    </div>
                    <div className="w-16 flex-shrink-0 flex items-center justify-center">
                      {dmgDelta(aBlast1Dmg, bBlast1Dmg)}
                    </div>
                  </div>
                  {blastFieldRows(aBlastInfo.blast1, bBlastInfo.blast1)}
                </>
              )}
              {(aBlastInfo.blast2 || aBlastInfo.replacement || bBlastInfo.blast2 || bBlastInfo.replacement) && (
                <>
                  <div className="flex border-b border-sz-border/20">
                    <div className={`flex-1 p-2 flex flex-col justify-center items-end min-w-0 ${slot2Winner === 'a' ? 'bg-green-950/30' : slot2Winner === 'b' ? 'bg-red-950/20' : ''}`}>
                      <BlastSide
                        blast={aSlot2}
                        modDmg={aSlot2Dmg}
                        changed={aBlastChanged}
                        side="a"
                        hasReplacement={!!aBlastInfo.replacement}
                        replActive={replActiveA}
                        onToggleRepl={() => setReplActiveA(v => !v)}
                      />
                    </div>
                    <div className="w-14 flex-shrink-0 flex items-center justify-center border-x border-sz-border/20">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium text-center leading-tight">Blast 2</span>
                    </div>
                    <div className={`flex-1 p-2 flex flex-col justify-center items-start min-w-0 ${slot2Winner === 'b' ? 'bg-green-950/30' : slot2Winner === 'a' ? 'bg-red-950/20' : ''}`}>
                      <BlastSide
                        blast={bSlot2}
                        modDmg={bSlot2Dmg}
                        changed={bBlastChanged}
                        side="b"
                        hasReplacement={!!bBlastInfo.replacement}
                        replActive={replActiveB}
                        onToggleRepl={() => setReplActiveB(v => !v)}
                      />
                    </div>
                    <div className="w-16 flex-shrink-0 flex items-center justify-center">
                      {dmgDelta(aSlot2Dmg, bSlot2Dmg)}
                    </div>
                  </div>
                  {blastFieldRows(aSlot2, bSlot2)}
                </>
              )}
            </>
          )}

          {/* Ultimate section */}
          {hasAnyUlt && (
            <>
              <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-300 bg-amber-900/40 border-b border-t border-sz-border">
                Ultimate
              </div>
              <div className="flex border-b border-sz-border/20">
                <div className={`flex-1 p-2 flex flex-col justify-center items-end min-w-0 ${ultWinner === 'a' ? 'bg-green-950/30' : ultWinner === 'b' ? 'bg-red-950/20' : ''}`}>
                  <BlastSide blast={aBlastInfo.ultimate} modDmg={aUltDmg} changed={aUltChanged} side="a" />
                </div>
                <div className="w-14 flex-shrink-0 flex items-center justify-center border-x border-sz-border/20">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium text-center leading-tight">Ult</span>
                </div>
                <div className={`flex-1 p-2 flex flex-col justify-center items-start min-w-0 ${ultWinner === 'b' ? 'bg-green-950/30' : ultWinner === 'a' ? 'bg-red-950/20' : ''}`}>
                  <BlastSide blast={bBlastInfo.ultimate} modDmg={bUltDmg} changed={bUltChanged} side="b" />
                </div>
                <div className="w-16 flex-shrink-0 flex items-center justify-center">
                  {dmgDelta(aUltDmg, bUltDmg)}
                </div>
              </div>
              {blastFieldRows(aBlastInfo.ultimate, bBlastInfo.ultimate)}
            </>
          )}

          {/* Unique Character Traits + Sparking Buffs */}
          {hasAnyTraits && (
            <>
              <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-teal-200 bg-teal-900/40 border-b border-t border-sz-border">
                Unique Character Traits
              </div>
              {(charA?.miscellaneous || charB?.miscellaneous) && (
                <div className="flex border-b border-sz-border/20">
                  <div className="flex-1 p-2 text-right text-xs text-gray-300 leading-relaxed min-w-0">
                    {charA?.miscellaneous || <span className="text-gray-600">—</span>}
                  </div>
                  <div className="w-14 flex-shrink-0 flex items-center justify-center border-x border-sz-border/20">
                    <span className="text-[10px] text-gray-500 text-center leading-tight">Trait</span>
                  </div>
                  <div className="flex-1 p-2 text-left text-xs text-gray-300 leading-relaxed min-w-0">
                    {charB?.miscellaneous || <span className="text-gray-600">—</span>}
                  </div>
                  <div className="w-16 flex-shrink-0" />
                </div>
              )}
              {(aSparkObj || bSparkObj) && (
                <table className="w-full table-fixed">
                  <colgroup>
                    <col />
                    <col style={{ width: '3.5rem' }} />
                    <col />
                    <col style={{ width: '4rem' }} />
                  </colgroup>
                  <tbody>
                    {/* Sparking Buffs header — clickable per side */}
                    <tr className="bg-yellow-900/30 border-y border-sz-border/40">
                      <td
                        className={`py-1.5 px-3 text-xs font-bold text-right ${
                          aSparkBuffable ? 'cursor-pointer select-none hover:bg-yellow-800/20' : ''
                        } ${aSparkActive ? 'bg-yellow-900/40' : ''}`}
                        onClick={aSparkBuffable ? () => onToggleSkillA?.(aSparkObj) : undefined}
                        title={aSparkBuffable ? (aSparkActive ? 'Deactivate A sparking buffs' : 'Activate A sparking buffs') : undefined}
                      >
                        <div className="flex items-center gap-1 justify-end">
                          {aSparkBuffable && (
                            <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${aSparkActive ? 'bg-yellow-400' : 'bg-gray-600'}`} />
                          )}
                          <span className="text-yellow-200">Sparking Buffs</span>
                        </div>
                      </td>
                      <td className="py-1.5 px-2 text-[10px] text-yellow-400 font-bold uppercase tracking-wider text-center leading-tight whitespace-nowrap">Spark</td>
                      <td
                        className={`py-1.5 px-3 text-xs font-bold text-left ${
                          bSparkBuffable ? 'cursor-pointer select-none hover:bg-yellow-800/20' : ''
                        } ${bSparkActive ? 'bg-yellow-900/40' : ''}`}
                        onClick={bSparkBuffable ? () => onToggleSkillB?.(bSparkObj) : undefined}
                        title={bSparkBuffable ? (bSparkActive ? 'Deactivate B sparking buffs' : 'Activate B sparking buffs') : undefined}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-200">Sparking Buffs</span>
                          {bSparkBuffable && (
                            <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${bSparkActive ? 'bg-yellow-400' : 'bg-gray-600'}`} />
                          )}
                        </div>
                      </td>
                      <td />
                    </tr>
                    {/* One row per buff column */}
                    {SKILL_BUFF_COLS.map(col => {
                      const av = aSparkObj?.[col.key];
                      const bv = bSparkObj?.[col.key];
                      if (!av && !bv) return null;
                      const d = (av != null && bv != null) ? bv - av : null;
                      const delta = d !== null && d !== 0 ? { str: Math.abs(d).toString(), bWins: d > 0 } : null;
                      return (
                        <SkillAttrRow
                          key={col.key}
                          label={col.label}
                          aContent={av ? <span className={`font-mono font-semibold ${av > 0 ? 'text-green-400' : 'text-red-400'}`}>{av > 0 ? '+' : ''}{av}</span> : SKILL_DASH}
                          bContent={bv ? <span className={`font-mono font-semibold ${bv > 0 ? 'text-green-400' : 'text-red-400'}`}>{bv > 0 ? '+' : ''}{bv}</span> : SKILL_DASH}
                          delta={delta}
                        />
                      );
                    })}
                    {(aSparkObj?.armor || bSparkObj?.armor) && (
                      <SkillAttrRow
                        label="Armor"
                        aContent={aSparkObj?.armor ? <span className="font-semibold text-green-400">✓</span> : SKILL_DASH}
                        bContent={bSparkObj?.armor ? <span className="font-semibold text-green-400">✓</span> : SKILL_DASH}
                        delta={null}
                      />
                    )}
                  </tbody>
                </table>
              )}
            </>
          )}

          {!hasAnySkill && !hasAnyBlast && !hasAnyUlt && !hasAnyTraits && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-600 px-6">
              <div className="text-4xl mb-3">⚡</div>
              <p className="text-sm text-center">No skills or blast data available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
