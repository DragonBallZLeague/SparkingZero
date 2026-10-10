// /calculator/characters/<slug>: identity, the quick view, then Stats, Moves and Skills tabs.
import React from 'react';
import { byId, baseStats, sideEffects, slugOf, teamsOf, blastsOf, skillOf, effectLabel, effectValue, sourceOf } from './data.js';
import { STAT, SECTIONS, valueOf } from './stats.js';
import { Num, Explain, Portrait, ClassBadge, usePhone } from './ui.jsx';
import { MoveCards, blastRows, blastNumbers, skillRows, sparkingRows } from './moves.jsx';

const ANALYZER = 'https://dragonballzleague.github.io/SparkingZero/analyzer/characters/';

/** The quick view: the numbers lineup builders check first, in five bordered groups. */
export const QUICK = [
  ['Toughness', ['health', 'melee', 'meleeDefenseStat', 'blastDefense', 'armor']],
  ['Attack', ['rush5Hit', 'smash', 'throw', 'armorBreak']],
  ['Ki blasts', ['kiBlastDmg', 'kiBlastLimit', 'kiBlastCost']],
  ['Ki', ['startingKi', 'kiCharge', 'kiRegen', 'kiRegenRange']],
  ['Skill gauge', ['skillStart', 'skillLimit', 'skillRegen']],
];

export function QuickGroups({ ctx, base }) {
  return (
    <div className="qgroups">
      {QUICK.map(([title, keys], i) => (
        <section key={title} className={`qg qg-${keys.length}${i >= 2 ? ' qg-row2' : ''}${i === QUICK.length - 1 ? ' last' : ''}`}>
          <h3>{title}</h3>
          <div className="qtiles">
            {keys.map(k => (
              <div key={k} className="qt">
                <span className="qt-l">{STAT[k].short || STAT[k].label}</span>
                <Num stat={k} ctx={ctx} base={base} className="qt-v" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const TABS = [['overview', 'Overview'], ['stats', 'Stats'], ['moves', 'Moves'], ['skills', 'Skills']];

export default function CharacterPage({ id, query, setQuery, go }) {
  const c = byId.get(id);
  const phone = usePhone();
  if (!c) return <div className="panel empty">No character at this address.</div>;
  const view = baseStats(id);
  const side = sideEffects(id);
  const ctx = { c, side, view };
  const tab = TABS.some(([t]) => t === query.tab) ? query.tab : 'overview';
  const teams = teamsOf.get(id) || [];

  return (
    <>
      <button className="back" onClick={() => go('/characters')}>← All characters</button>
      <header className="ident">
        <Portrait id={c.id} size={phone ? 64 : 84} radius={14} />
        <div className="min0">
          <h1>{c.name}</h1>
          <div className="ident-sub">
            <ClassBadge label={c.class.label} />
            <span className="dp">DP {c.dp}</span>
            {teams.length > 0 && <span className="muted">{teams.length === 1 ? teams[0] : `${teams.length} teams`}</span>}
          </div>
        </div>
        <div className="ident-links">
          <a className="btn accent" href={`#/build?c=${c.id}`} onClick={(e) => { e.preventDefault(); go(`/build?c=${c.id}`); }}>Build with {phone ? 'it' : 'this character'}</a>
          <a className="btn" href={`${ANALYZER}${slugOf.get(c.id)}`} target="_blank" rel="noreferrer">League results ↗</a>
        </div>
      </header>

      <div className="subtabs" role="tablist">
        {TABS.map(([t, l]) => (
          <button key={t} role="tab" className="subtab" aria-selected={tab === t} onClick={() => setQuery({ tab: t === 'overview' ? null : t })}>{l}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <QuickGroups ctx={ctx} />
          <h2 className="h2">Moves <span>tap any card or number for its breakdown</span></h2>
          <MoveCards c={c} view={view} />
        </>
      )}
      {tab === 'stats' && <StatsTable ctx={ctx} />}
      {tab === 'moves' && <MovesTab c={c} view={view} />}
      {tab === 'skills' && <SkillsTab c={c} />}
    </>
  );
}

/** Every stat, by section, with where each value came from. */
function StatsTable({ ctx }) {
  return (
    <div className="stat-cols">
      {SECTIONS.map(s => (
        <section key={s.title} className="panel st">
          <h3>{s.title}</h3>
          {s.keys.map(k => (
            <div key={k} className="st-row">
              <span className="st-l">{STAT[k].label}</span>
              <span className="st-src">{srcShort(ctx.c, k)}</span>
              <Num stat={k} ctx={ctx} className="st-v" />
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

const SRC_FIELD = { rush: 'hit1', hit2: 'hit2', hit3: 'hit3', hit4: 'hit4', hit5: 'hit5', kiBlastDmg: 'kiBlastDamage', meleeDefenseStat: 'meleeDefense', energy: 'kiBlastDefense', melee: 'meleeDefense', meleeArmored: 'meleeDefense' };
function srcShort(c, k) {
  if (k === 'kiBlastVolley') return 'formula';
  const s = sourceOf(c, SRC_FIELD[k] || k) || '';
  if (/^Capsule Corp/.test(s)) return /then/.test(s) ? 'Capsule Corp, rescaled' : 'Capsule Corp';
  if (/^Game formula/.test(s)) return 'formula';
  if (/^Game files/.test(s)) return 'game files';
  return s ? 'game' : '';
}

function MovesTab({ c, view }) {
  const bl = blastsOf(c);
  return (
    <div className="panel">
      <div className="mt-head"><span>Slot</span><span>Move</span><span className="r">Damage</span><span className="r">Ki</span><span>Kind</span><span>Traits</span></div>
      {bl.map(b => {
        const nb = blastNumbers(c, b, view);
        return (
          <Explain key={b.slot + b.variant} className="mt-row" title={b.name} sub={`${c.name} · ${b.variant || b.slot}`} rows={blastRows(c, b, view)}>
            <span className="muted">{b.variant ? `${b.slot} (alt)` : b.slot}</span>
            <span className="nm">{b.name}</span>
            <span className="r num">{nb.damage == null ? '—' : nb.damage.toLocaleString()}{b.damageStatus === 'computed' && <i className="calc">calc</i>}</span>
            <span className="r num">{nb.ki}</span>
            <span className="muted">{[b.category, b.type].filter(Boolean).join(' · ') || '—'}</span>
            <span className="muted small">{(b.traits || []).join(', ') || '—'}</span>
          </Explain>
        );
      })}
    </div>
  );
}

function SkillsTab({ c }) {
  const sk = [skillOf(c, 1), skillOf(c, 2)].filter(Boolean);
  return (
    <div className="skill-cols">
      {sk.map(s => (
        <section key={s.id} className="panel st">
          <h3>Skill {s.slot} · {s.name}</h3>
          {skillRows(c, s).map(([a, b, src], i) => (
            <div key={i} className="st-row"><span className="st-l">{a}</span><span className="st-src">{src}</span><span className="st-v plain">{b}</span></div>
          ))}
        </section>
      ))}
      <section className="panel st">
        <h3>Sparking and passives</h3>
        {sparkingRows(c).map(([a, b, src], i) => (
          <div key={i} className="st-row"><span className="st-l">{a}</span><span className="st-src">{src}</span><span className="st-v plain">{b}</span></div>
        ))}
      </section>
    </div>
  );
}
