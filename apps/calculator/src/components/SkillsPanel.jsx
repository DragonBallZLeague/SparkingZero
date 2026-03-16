import React from 'react';
import { parseEffectKey } from '../utils/calculator.js';

const SLOT_ORDER = ['BlastSkill1', 'BlastSkill2', 'BlastUltimate', 'Replacement_Slot2', 'ReplacementSlot2'];
const SLOT_LABELS = {
  BlastSkill1:      'Blast 1',
  BlastSkill2:      'Blast 2',
  BlastUltimate:    'Ultimate',
  Replacement_Slot2:'Replace',
  ReplacementSlot2: 'Replace',
};

const SLOT_EFFECT_FIELDS = {
  BlastSkill1:      ['blastDamage', 'blastCombo'],
  BlastSkill2:      ['blastDamage', 'blastCombo'],
  BlastUltimate:    ['ultimate'],
  Replacement_Slot2:['blastDamage', 'blastCombo'],
  ReplacementSlot2: ['blastDamage', 'blastCombo'],
};

function getCapsuleBlastModifier(equippedCapsules, fields) {
  let percent = 0;
  equippedCapsules.forEach(capsule => {
    if (!capsule?.effects) return;
    capsule.effects.forEach(effect => {
      if (!effect) return;
      const mapping = parseEffectKey(effect.key);
      if (!mapping || effect.value === null) return;
      if (fields.includes(mapping.field) && mapping.op === 'percent') {
        percent += effect.value;
      }
    });
  });
  return percent;
}

const CAT_COLORS = {
  Beam:                       'bg-blue-700/70 text-blue-200',
  Rush:                       'bg-orange-700/70 text-orange-200',
  'Continuous Fire':          'bg-purple-700/70 text-purple-200',
  Fire:                       'bg-red-700/70 text-red-200',
  'Short-Range Energy Attack':'bg-teal-700/70 text-teal-200',
  'Explosive Wave':           'bg-amber-700/70 text-amber-200',
};

function catClass(cat) {
  return CAT_COLORS[cat] || 'bg-gray-700/70 text-gray-300';
}

const SKILL_TYPE_COLORS = {
  'Sparking':      'bg-yellow-700/70 text-yellow-200',
  'Teleport':      'bg-cyan-700/70 text-cyan-200',
  'Evade':         'bg-teal-700/70 text-teal-200',
  'Evade x2':      'bg-teal-700/70 text-teal-200',
  'Barrier':       'bg-blue-700/70 text-blue-200',
  'Bind':          'bg-purple-700/70 text-purple-200',
  'Buff/Debuff':   'bg-orange-700/70 text-orange-200',
  'Buff/Ki':       'bg-green-700/70 text-green-200',
  'Heal':          'bg-pink-700/70 text-pink-200',
  'Damage':        'bg-red-700/70 text-red-200',
};

function skillTypeClass(type) {
  return SKILL_TYPE_COLORS[type] || 'bg-gray-700/70 text-gray-300';
}

function BuffCell({ value }) {
  if (value === null || value === undefined || value === 0) {
    return <span className="text-gray-600">—</span>;
  }
  const isPos = value > 0;
  return (
    <span className={`font-semibold ${isPos ? 'text-green-400' : 'text-red-400'}`}>
      {isPos ? '+' : ''}{value}
    </span>
  );
}

const BUFF_COLS = [
  { key: 'meleeBuff',      label: 'Melee' },
  { key: 'defenseBuff',    label: 'Defense' },
  { key: 'kiBlastBuff',    label: 'Ki Blast' },
  { key: 'kiChargingBuff', label: 'Ki Charge' },
  { key: 'blastBuff',      label: 'Blast' },
  { key: 'ultimateBuff',   label: 'Ultimate' },
];

function hasBuff(detail) {
  if (!detail) return false;
  return BUFF_COLS.some(col => detail[col.key] && detail[col.key] !== 0);
}

function SkillsTable({ skillDetails, activeSkills, onToggleSkill }) {
  if (!skillDetails.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-purple-900/40 border-b border-sz-border">
            <th className="py-2 px-2 text-sm font-bold uppercase tracking-wider text-gray-300 text-left" rowSpan={2}>Skills</th>
            <th className="py-1.5 px-1.5 text-gray-400 font-medium text-center" rowSpan={2}>Cost</th>
            <th className="py-1.5 px-1.5 text-gray-400 font-medium text-center" rowSpan={2}>Type</th>
            <th className="py-1.5 px-1.5 text-gray-400 font-medium text-center" rowSpan={2}>Act.<br/>Time</th>
            <th className="py-1.5 px-1.5 text-gray-400 font-medium text-center" rowSpan={2}>Damage</th>
            <th className="py-1.5 px-1.5 text-gray-400 font-medium text-center" rowSpan={2}>Duration</th>
            <th className="py-1.5 px-1.5 text-gray-400 font-medium text-center" rowSpan={2}>Health<br/>Gain</th>
            <th className="py-1.5 px-1.5 text-gray-400 font-medium text-center" rowSpan={2}>Ki<br/>Gain</th>
            <th colSpan={6} className="py-1 px-1.5 text-gray-400 font-semibold text-center border-b border-sz-border/40 border-l border-sz-border/30">
              Buffs
            </th>
          </tr>
          <tr className="bg-purple-900/20 border-b border-sz-border">
            {BUFF_COLS.map(col => (
              <th key={col.key} className="py-1 px-1.5 text-gray-500 font-medium text-center border-l border-sz-border/20 first:border-l-0">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {skillDetails.map(({ name, damage, detail }, idx) => {
            const flags = detail ? [
              detail.instantSparking && 'Inst. Spark',
              detail.instantKi && 'Inst. Ki',
              detail.unblockable && 'Unblockable',
              detail.armor && 'Armor',
              detail.cutscene && 'Cutscene',
            ].filter(Boolean) : [];
            const buffable = hasBuff(detail);
            const isActive = buffable && activeSkills?.some(s => s.id === detail?.id);
            return (
              <tr
                key={idx}
                className={`border-b border-sz-border/20 ${
                  isActive
                    ? 'bg-yellow-900/30 ring-1 ring-inset ring-yellow-600/50'
                    : 'hover:bg-gray-800/20'
                } ${buffable ? 'cursor-pointer select-none' : ''}`}
                onClick={buffable && detail ? () => onToggleSkill(detail) : undefined}
                title={buffable ? (isActive ? 'Click to deactivate buffs' : 'Click to activate buffs') : undefined}
              >
                <td className="py-1.5 px-2 text-gray-200 font-medium leading-tight">
                  <div className="flex items-center gap-1.5">
                    {buffable && (
                      <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                        isActive ? 'bg-yellow-400' : 'bg-gray-600'
                      }`} />
                    )}
                    {name}
                  </div>
                  {flags.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {flags.map(f => (
                        <span key={f} className="text-[10px] px-1 py-px rounded bg-indigo-800/50 text-indigo-300">{f}</span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="py-1.5 px-1.5 text-center text-gray-300 font-mono">
                  {detail?.cost ?? '—'}
                </td>
                <td className="py-1.5 px-1.5 text-center">
                  {detail?.type ? (
                    <span className={`px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${skillTypeClass(detail.type)}`}>
                      {detail.type}
                    </span>
                  ) : '—'}
                </td>
                <td className="py-1.5 px-1.5 text-center text-gray-300 font-mono">
                  {detail?.activationTime != null ? detail.activationTime.toFixed(2) : '—'}
                </td>
                <td className="py-1.5 px-1.5 text-center font-mono text-sz-orange">
                  {detail?.baseDamage > 0 ? Number(detail.baseDamage).toLocaleString()
                    : damage > 0 ? Number(damage).toLocaleString()
                    : '—'}
                </td>
                <td className="py-1.5 px-1.5 text-center text-gray-300 font-mono">
                  {detail?.duration > 0 ? `${detail.duration}s` : '—'}
                </td>
                <td className="py-1.5 px-1.5 text-center font-mono">
                  {detail?.healthAmount > 0
                    ? <span className="text-pink-400">+{detail.healthAmount}</span>
                    : <span className="text-gray-600">—</span>}
                </td>
                <td className="py-1.5 px-1.5 text-center font-mono">
                  {detail?.kiAmount > 0
                    ? <span className="text-blue-400">+{detail.kiAmount}</span>
                    : <span className="text-gray-600">—</span>}
                </td>
                {BUFF_COLS.map(col => (
                  <td key={col.key} className="py-1.5 px-1.5 text-center font-mono border-l border-sz-border/10">
                    <BuffCell value={detail?.[col.key]} />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function SkillsPanel({ character, blasts, skills = [], equippedCapsules = [], activeSkills = [], onToggleSkill }) {
  if (!character) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-700 p-4">
        <div className="text-3xl mb-2">⚡</div>
        <p className="text-xs text-center">Select a character</p>
      </div>
    );
  }

  const charBlasts = blasts?.[character.name] || [];

  const sorted = [...charBlasts].sort((a, b) => {
    const ai = SLOT_ORDER.indexOf(a.slot);
    const bi = SLOT_ORDER.indexOf(b.slot);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const skills1 = character.skill1Name;
  const skills2 = character.skill2Name;
  const skill1Dmg = character.skill1Damage;
  const skill2Dmg = character.skill2Damage;

  const skillMap = React.useMemo(() => {
    const map = {};
    skills.forEach(s => { if (s.name) map[s.name.toLowerCase()] = s; });
    return map;
  }, [skills]);

  const charSkillDetails = [];
  if (skills1) charSkillDetails.push({ name: skills1, damage: skill1Dmg, detail: skillMap[skills1.toLowerCase()] ?? null });
  if (skills2) charSkillDetails.push({ name: skills2, damage: skill2Dmg, detail: skillMap[skills2.toLowerCase()] ?? null });

  const blastRows = sorted.filter(b => b.slot !== 'BlastUltimate');
  const ultimateRows = sorted.filter(b => b.slot === 'BlastUltimate');

  function renderBlastRows(rows, isUltimate = false) {
    return rows.map((blast, i) => {
      const fields = SLOT_EFFECT_FIELDS[blast.slot] || ['blastDamage'];
      const capsulePct = getCapsuleBlastModifier(equippedCapsules, fields);
      // Skill buff: blastBuff applies to blasts+ultimates; ultimateBuff applies to ultimates only
      const skillPct = activeSkills.reduce((sum, s) => {
        const bp = (s.blastBuff || 0) * 5;
        const up = isUltimate ? (s.ultimateBuff || 0) * 5 : 0;
        return sum + bp + up;
      }, 0);
      const totalPct = capsulePct + skillPct;
      const baseRaw = blast.baseDamagePatch != null && blast.baseDamagePatch !== '' ? Number(blast.baseDamagePatch) : null;
      const boostedRaw = blast.boostedDamagePatch != null && blast.boostedDamagePatch !== '' ? Number(blast.boostedDamagePatch) : null;
      const modBase = baseRaw !== null && totalPct !== 0 ? Math.round(baseRaw * (1 + totalPct / 100)) : baseRaw;
      const modBoosted = boostedRaw !== null && totalPct !== 0 ? Math.round(boostedRaw * (1 + totalPct / 100)) : boostedRaw;
      const changed = totalPct !== 0;
      return (
        <React.Fragment key={i}>
          <tr className={`border-b border-sz-border/30 hover:bg-gray-800/30 ${changed ? 'bg-blue-950/20' : ''}`}>
            <td className="py-1.5 px-2 text-sm text-gray-200 leading-tight">{blast.name || '—'}</td>
            <td className="py-1.5 px-1.5 text-sm text-gray-500 leading-tight whitespace-nowrap">{SLOT_LABELS[blast.slot] || blast.slot}</td>
            <td className="py-1.5 px-1.5">
              {blast.category && (
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${catClass(blast.category)}`}>
                  {blast.category}
                </span>
              )}
            </td>
            <td className={`py-1.5 px-1.5 text-sm text-right font-mono ${changed ? 'text-gray-200 font-bold' : 'text-gray-300'}`}>
              {modBase !== null ? modBase.toLocaleString() : '—'}
            </td>
            <td className={`py-1.5 px-1.5 text-sm text-right font-mono ${changed ? 'text-blue-300 font-bold' : 'text-blue-400/70'}`}>
              {modBoosted !== null ? modBoosted.toLocaleString() : '—'}
            </td>
          </tr>
          {blast.traits?.length > 0 && (
            <tr className="border-b border-sz-border/20 bg-gray-900/30">
              <td colSpan={5} className="py-0.5 px-2">
                <div className="flex flex-wrap gap-1">
                  {blast.traits.map((t, ti) => (
                    <span key={ti} className="text-xs px-1.5 py-0.5 rounded bg-gray-700/60 text-gray-400">{t}</span>
                  ))}
                </div>
              </td>
            </tr>
          )}
        </React.Fragment>
      );
    });
  }

  const anyBlastModified = blastRows.some(blast => {
    const fields = SLOT_EFFECT_FIELDS[blast.slot] || ['blastDamage'];
    const capsulePct = getCapsuleBlastModifier(equippedCapsules, fields);
    const skillPct = activeSkills.reduce((sum, s) => sum + (s.blastBuff || 0) * 5, 0);
    return capsulePct + skillPct !== 0;
  });
  const anyUltModified = ultimateRows.some(blast => {
    const fields = SLOT_EFFECT_FIELDS[blast.slot] || ['blastDamage'];
    const capsulePct = getCapsuleBlastModifier(equippedCapsules, fields);
    const skillPct = activeSkills.reduce((sum, s) => sum + (s.blastBuff || 0) * 5 + (s.ultimateBuff || 0) * 5, 0);
    return capsulePct + skillPct !== 0;
  });

  return (
    <div className="flex flex-col">
      {/* Skills section — columnar buff table */}
      {charSkillDetails.length > 0 && <SkillsTable skillDetails={charSkillDetails} activeSkills={activeSkills} onToggleSkill={onToggleSkill} />}

      {/* Blasts + Ultimates */}
      {sorted.length > 0 && (
        <table className="w-full">
          <colgroup>
            <col />
            <col className="w-28" />
            <col className="w-40" />
            <col className="w-20" />
            <col className="w-20" />
          </colgroup>
          <tbody>
            {blastRows.length > 0 && (
              <>
                <tr className="border-b border-sz-border border-t border-sz-border bg-orange-900/40">
                  <th className="py-2 px-2 text-sm font-bold uppercase tracking-wider text-gray-300 text-left">Blasts</th>
                  <th className="py-2 px-1.5 text-sm text-gray-500 font-medium text-left">Slot</th>
                  <th className="py-2 px-1.5 text-sm text-gray-500 font-medium text-left">Category</th>
                  <th className={`py-2 px-1.5 text-sm font-medium text-right ${anyBlastModified ? 'text-sz-orange' : 'text-gray-500'}`}>Base</th>
                  <th className={`py-2 px-1.5 text-sm font-medium text-right ${anyBlastModified ? 'text-sz-orange' : 'text-blue-400'}`}>Boost</th>
                </tr>
                {renderBlastRows(blastRows, false)}
              </>
            )}
            {ultimateRows.length > 0 && (
              <>
                <tr className="border-b border-sz-border border-t border-sz-border bg-red-900/30">
                  <th className="py-2 px-2 text-sm font-bold uppercase tracking-wider text-gray-300 text-left">Ultimates</th>
                  <th className="py-2 px-1.5 text-sm text-gray-500 font-medium text-left">Slot</th>
                  <th className="py-2 px-1.5 text-sm text-gray-500 font-medium text-left">Category</th>
                  <th className={`py-2 px-1.5 text-sm font-medium text-right ${anyUltModified ? 'text-sz-orange' : 'text-gray-500'}`}>Base</th>
                  <th className={`py-2 px-1.5 text-sm font-medium text-right ${anyUltModified ? 'text-sz-orange' : 'text-blue-400'}`}>Boost</th>
                </tr>
                {renderBlastRows(ultimateRows, true)}
              </>
            )}
          </tbody>
        </table>
      )}

      {/* Unique Character Traits */}
      {(character.miscellaneous || character.sparkStatBuffs) && (
        <>
          <div className="px-3 py-1.5 border-t border-sz-border bg-teal-900/40">
            <span className="text-sm font-bold uppercase tracking-wider text-white">Unique Character Traits</span>
          </div>
          {character.miscellaneous && (
            <div className="px-3 py-2 border-b border-sz-border/40">
              <p className="text-sm text-gray-300 leading-relaxed">{character.miscellaneous}</p>
            </div>
          )}
          {character.sparkStatBuffs && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-yellow-900/30 border-b border-sz-border">
                    <th colSpan={6} className="py-1.5 px-2 text-xs font-bold uppercase tracking-wider text-yellow-400 text-center">
                      Sparking Buffs
                    </th>
                  </tr>
                  <tr className="bg-yellow-900/10 border-b border-sz-border">
                    {BUFF_COLS.map(col => (
                      <th key={col.key} className="py-1 px-3 text-gray-500 font-medium text-center">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const sb = character.sparkStatBuffs;
                    const sparkSkill = { id: `spark_${character.name}`, ...sb };
                    const sparkBuffable = hasBuff(sparkSkill);
                    const sparkActive = sparkBuffable && activeSkills?.some(s => s.id === sparkSkill.id);
                    return (
                      <tr
                        className={`border-b border-sz-border/20 ${
                          sparkActive ? 'bg-yellow-900/30 ring-1 ring-inset ring-yellow-600/50' : ''
                        } ${sparkBuffable ? 'cursor-pointer select-none hover:bg-gray-800/20' : ''}`}
                        onClick={sparkBuffable ? () => onToggleSkill(sparkSkill) : undefined}
                        title={sparkBuffable ? (sparkActive ? 'Click to deactivate sparking buffs' : 'Click to activate sparking buffs') : undefined}
                      >
                        {BUFF_COLS.map(col => (
                          <td key={col.key} className="py-2 px-3 text-center font-mono">
                            <BuffCell value={sb[col.key] ?? 0} />
                          </td>
                        ))}
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
