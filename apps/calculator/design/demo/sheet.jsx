// The Sheet's pieces, used by the Fighter page (fighter.jsx): the fighter column (figure, nameplate, Active,
// Conditions, Capsules), each section's Quick form, and the build controls shared with Versus.
import React from 'react';
import {
  artUrl, faceUrl, nameParts, classColours, chipText, rosterPos, movePos, chevrons, fiveHitTaken, volley, gameMoves, skillOf, toggleable,
  capsuleSummary, typeClass, buildCheck, isGiant, figHeight, formsOf, byId, capsuleById,
} from './model.js';
import { Tap, Rk, Chev, Name, Switch, RulesetSelect, usePhone } from './ui.jsx';
import { CmdRows, SheetChains } from './moves.jsx';
import { Conditions } from './conditions.jsx';
import { F } from './format.js';

const A = (get) => (sides) => get(sides.A.view, sides.A);

/** Trait chips under the name: what the character can or can't do that changes how it plays. */
export function traitChips(c) {
  const out = [];
  const ab = c.moveset?.abilities || [];
  if (ab.includes('Hyper armor')) out.push(['Hyper armor', 'Takes 10% less from hits until one breaks the armor']);
  if (c.mobility && c.mobility.canFly === false) out.push(["Can't fly", null]);
  if (ab.includes('Ki absorption')) out.push(['Ki drain', 'Drains ki from the opponent']);
  if (ab.includes('Immune to ki drain')) out.push(['Drain immune', null]);
  if (ab.includes('Cannot charge ki')) out.push(["Can't charge ki", null]);
  for (const p of c.passives || []) {
    const tile = p.effects?.[0];
    out.push(['Low-HP power-up', `All damage +${Math.round((tile?.value ?? 0) * 100)}% ${p.condition}`]);
  }
  return out;
}

/** The game's abilities the trait chips don't already say ("Cannot charge ki" is the chip "Can't charge ki"). */
const CHIPPED = ['Hyper armor', 'Ki absorption', 'Immune to ki drain', 'Cannot charge ki'];
export const otherAbilities = (c) => (c.moveset?.abilities || []).filter(a => !CHIPPED.includes(a));

export function ClassChip({ c }) {
  const [c1] = classColours(c.class.label);
  return <span className="chip" style={{ background: c1, color: chipText(c1) }}>{c.class.label}</span>;
}

/** The Active toggles: each skill and Sparking. */
export function ActiveToggles({ side, onChange }) {
  const { c, spec } = side;
  return (
    <div className="toggles">
      {[1, 2].map(slot => {
        const s = skillOf(c, slot);
        if (!s) return <div key={slot} className="tog off"><small>S{slot}</small><span>None</span></div>;
        const can = toggleable(s);
        const on = !!spec.skills?.[slot] && can;
        return (
          <button key={slot} className={`tog${on ? ' on' : ''}${can ? '' : ' na'}`} aria-pressed={on} disabled={!can}
            title={can ? (on ? 'On: its effects are in the numbers' : 'Off') : 'No stat effect to switch on'}
            onClick={() => onChange({ ...spec, skills: { ...spec.skills, [slot]: !on } })}>
            <small>S{slot}</small><span>{s.name}</span>
          </button>
        );
      })}
      <button className={`tog sp${spec.sparking ? ' on' : ''}`} aria-pressed={spec.sparking} onClick={() => onChange({ ...spec, sparking: !spec.sparking })}>
        <small>SPARKING</small><span>{spec.sparking ? 'On' : 'Off'}</span>
      </button>
    </div>
  );
}

/** Each skill and Sparking as a labelled switch row (Full stats' build, the opponent's build). */
export function SkillSwitches({ side, onChange }) {
  const { c, spec } = side;
  return (
    <>
      {[1, 2].map(slot => {
        const s = skillOf(c, slot);
        if (!s) return null;
        const can = toggleable(s);
        return (
          <div className="tgl" key={slot}><span className="slot s">S{slot}</span><span className="tn">{s.name}</span>
            {can ? <Switch on={!!spec.skills?.[slot]} label={s.name} onChange={(on) => onChange({ ...spec, skills: { ...spec.skills, [slot]: on } })} /> : <em className="na">No stat effect</em>}
          </div>
        );
      })}
      <div className="tgl"><span className="slot u">SP</span><span className="tn">Sparking!</span><Switch sp on={!!spec.sparking} label="Sparking" onChange={(on) => onChange({ ...spec, sparking: on })} /></div>
    </>
  );
}

/**
 * A build as capsule rows in their type's colour, with a bar of its points by type, and its actions under it:
 * Edit capsules and Clear, then `actions` on a row below (Versus: "Same as the other side's").
 */
export function CapsuleRows({ side, ruleset, onEdit, onClear = null, slots = 7, compact = false, actions = null }) {
  const chk = buildCheck(side.spec.caps, ruleset);
  const byType = new Map();
  for (const x of chk.caps) byType.set(x.type, (byType.get(x.type) || 0) + x.cost);
  return (
    <>
      <p className="lbl2"><span>Capsules</span><span className="rsw"><RulesetSelect /><span>{chk.cost} of {ruleset.totalCost}</span></span></p>
      {chk.caps.length > 0 && <div className="catbar">{[...byType].map(([t, n]) => <i key={t} className={typeClass(t)} style={{ flex: n }} title={`${t} ${n}`} />)}</div>}
      <div className="caps">
        {chk.caps.map((x, i) => (
          <button key={i} className={`caprow ${typeClass(x.type)}`} onClick={onEdit} title={capsuleSummary(x)}>
            <span className="cst">{x.cost}</span><b>{x.name}</b><em>{x.type}</em>
          </button>
        ))}
        {chk.caps.length < slots && (
          <button className="caprow empty" onClick={onEdit}><span className="cst">+</span><b>{chk.caps.length ? 'Add a capsule' : 'Add capsules'}</b><em>{slots - chk.caps.length} free</em></button>
        )}
      </div>
      <div className="capacts">
        <button className="edb" onClick={onEdit}>Edit capsules</button>
        {onClear && chk.caps.length > 0 && <button className="clr" onClick={onClear}>Clear</button>}
      </div>
      {actions && <div className="capacts">{actions}</div>}
      {!compact && chk.problems.map(p => <div className="warn" key={p}>{p}</div>)}
    </>
  );
}

/**
 * The button that opens the quick list of fighters, next to the fighter's name (data-qp: clicking it is not a
 * click away from the list). Outlined and square-cornered, so it reads as an action, not one of the chips.
 */
export const ChangeButton = ({ onClick, label = 'Change', title = 'Change fighter' }) => (
  <button className="chgb" data-qp onClick={onClick} title={`${title}, without leaving this page`} aria-label={title}><i aria-hidden="true">⇄</i><span>{label}</span></button>
);

export function Nameplate({ c, onChange, showTraits = true }) {
  return (
    <div className="nameplate">
      {/* the button flows right after the name's last line */}
      <div className="nm"><button className="nmb" data-qp onClick={onChange} title="Change fighter"><Name parts={nameParts(c.name)} br /></button><ChangeButton onClick={onChange} /></div>
      <div className="chips">
        <ClassChip c={c} />
        <span className="chip dp">DP {c.dp}</span>
        {showTraits && traitChips(c).map(([t, title]) => <span key={t} className="chip trait-chip" title={title || undefined}>{t}</span>)}
      </div>
    </div>
  );
}

/**
 * The Sheet's form of each section, the Fighter page's Quick view (round 23): the game's look, with roster bars
 * under the stats that have them (how the fighter sits in the whole roster's range), rates as chevrons, health
 * and ki as bars. `id` is the Fighter page's section id.
 */
export function QuickBody({ id, side, only = null }) {
  const phone = usePhone();
  const { c, view: v } = side;
  const gm = gameMoves(side);
  const s = c.stats;
  if (id === 'tough') {
    const hpBars = Math.max(5, Math.ceil(v.health / 10000));
    const full = Math.floor(v.health / 10000), part = (v.health % 10000) / 10000;
    return (
      <>
        <div className="grow">
          <span className="k">Health</span>
          <span className="bars hp">{Array.from({ length: hpBars }, (_, i) => (
            <i key={i} className={i < full ? 'f' : i === full && part ? 'part' : i >= 4 && i >= full ? 'cap' : ''} style={i === full && part ? { '--p': `${part * 100}%` } : undefined} />
          ))}</span>
          <span className="v"><Tap title="HP" get={A(x => x.health)} /><small>{+(v.health / 10000).toFixed(2)} bars</small></span>
        </div>
        <div className="tiles t5">
          <div className="tile"><span>5-hit taken</span><Tap as="b" title="5-hit damage taken" get={A(fiveHitTaken)} lessIsBetter /><Rk p={rosterPos('taken', fiveHitTaken, v.melee, true)} title="Less is better" /></div>
          <div className="tile"><span>Melee def</span><Tap as="b" title="Melee defense" get={A(x => 1 - x.meleeDefenseStat)} fmt={(x) => F.def(1 - x)} kind="def" /><Rk p={rosterPos('mdef', x => 1 - x.meleeDefenseStat, 1 - v.meleeDefenseStat)} /></div>
          <div className="tile"><span>Blast def</span><Tap as="b" title="Blast defense" get={A(x => 1 - x.blastDefense)} fmt={(x) => F.def(1 - x)} kind="def" /><Rk p={rosterPos('bdef', x => 1 - x.blastDefense, 1 - v.blastDefense)} /></div>
          <div className="tile"><span>Ki-blast def</span><Tap as="b" title="Ki-blast defense" get={A(x => 1 - x.energy)} fmt={(x) => F.def(1 - x)} kind="def" /><Rk p={rosterPos('edef', x => 1 - x.energy, 1 - v.energy)} /></div>
          <div className="tile"><span>Armor</span><Tap as="b" title="Armor" get={A(x => x.armor)} fmt={F.armor} kind="def" /></div>
        </div>
      </>
    );
  }
  if (id === 'res') {
    return (
      <>
        <div className="grow">
          <span className="k">Ki</span>
          <div className="kiwrap">
            <span className="bars ki">{Array.from({ length: s.maxKi ?? 5 }, (_, i) => <i key={i} className={i < Math.floor(v.startingKi) ? 'f' : ''} />)}</span>
            <div className="regen-mark"><span style={{ width: `${(s.kiRegenRange / (s.maxKi || 5)) * 100 - 1.6}%` }} /><em style={{ left: 0, width: `${(s.kiRegenRange / (s.maxKi || 5)) * 100}%`, textAlign: 'center' }}>Auto-recharge</em></div>
          </div>
          <span className="v"><Tap title="Starting ki" get={A(x => x.startingKi)} fmt={(x) => `${+x.toFixed(2)} of ${s.maxKi ?? 5}`} kind="dec" /><small>at start</small></span>
        </div>
        <div className="meters">
          <div className="meter">
            <div className="h"><span>Ki charge</span><b><Tap title="Ki charge" get={A(x => x.kiCharge)} fmt={F.dec2} kind="dec" /><small>bars/s</small></b></div>
            <Chev kind="ki" lit={chevrons('kiCharge', x => x.kiCharge, v.kiCharge)} />
            <div className="note">{v.kiCharge > 0 ? `${(1 / v.kiCharge).toFixed(1)}s per bar` : "Can't charge ki"}</div>
          </div>
          <div className="meter">
            <div className="h"><span>Ki regen</span><b><Tap title="Ki regen" get={A(x => x.kiRegen)} fmt={F.dec} kind="dec" /><small>bars/s</small></b></div>
            <div className="rsegs">{Array.from({ length: s.kiRegenRange || 0 }, (_, i) => <i key={i} />)}</div>
            <Chev kind="rg" lit={chevrons('kiRegen', x => x.kiRegen, v.kiRegen)} />
            <div className="note">{v.kiRegen ? `${(1 / v.kiRegen).toFixed(1)}s per bar` : 'None'}</div>
          </div>
          <div className="meter skill">
            <div className="h"><span>Skill gauge</span><b>{v.skillStart}<small>of {v.skillLimit}</small></b></div>
            <div className="pips">{Array.from({ length: v.skillLimit || 0 }, (_, i) => <i key={i} className={i < v.skillStart ? 'f' : ''} />)}</div>
            <Chev kind="sk" lit={chevrons('skillRegen', x => parseFloat(x.skillRegen), parseFloat(v.skillRegen))} />
            <div className="note">+{parseFloat(v.skillRegen)} per minute</div>
          </div>
        </div>
      </>
    );
  }
  if (id === 'cmd') {
    return (
      <>
        {!phone && <div className="cmdhead"><span></span><span>Move</span><span>Type</span><span className="r">Damage</span><span className="r">Cost</span></div>}
        <CmdRows side={side} only={only} />
      </>
    );
  }
  if (id === 'melee') {
    return (
      <>
        <div className="tiles t5" style={{ marginTop: 0 }}>
          <div className="tile"><span>Rush 5-hit</span><Tap as="b" title="Rush 5-hit" get={A(x => x.rush5Hit)} extra={(p) => <div className="hitl">Hits<span className="tags">{[p.A.view.rush, p.A.view.hit2, p.A.view.hit3, p.A.view.hit4, p.A.view.hit5].map((h, i) => <span key={i}>{F.int(h)}</span>)}</span></div>} /><Rk p={rosterPos('rush5', x => x.rush5Hit, v.rush5Hit)} /></div>
          {/* the smash at full charge (Lv.3), as Rush Chains show theirs; every level is in Full */}
          <div className="tile"><span>Smash<em className="kt lv">Lv.3</em></span><Tap as="b" title="Smash, Charge Lv.3" get={(p) => gameMoves(p.A).smash.at(-1)} /><Rk p={movePos('smash3', g => g.smash.at(-1), gm.smash.at(-1))} /></div>
          <div className="tile"><span>Throw</span><Tap as="b" title="Throw" get={A(x => x.throw)} /><Rk p={rosterPos('throw', x => x.throw, v.throw)} /></div>
          <div className="tile"><span>Pursuit</span><Tap as="b" title="Pursuit (Vanishing Attack)" get={A(x => x.vanishingAttack ?? x.pursuit)} /><Rk p={rosterPos('pursuit', x => x.pursuit, v.vanishingAttack ?? v.pursuit)} /></div>
          <div className="tile"><span>Armor break</span><Tap as="b" title="Armor break" get={A(x => x.armorBreak)} fmt={F.hits} kind="dec" lessIsBetter>{v.armorBreak}<small>hits</small></Tap><Rk p={rosterPos('abrk', x => x.armorBreak, v.armorBreak, true)} title="Fewer is better" /></div>
        </div>
      </>
    );
  }
  if (id === 'kib') {
    const ktype = gm.kiBlastTags.find(t => ['laser', 'thrown', 'giant', 'none'].includes(t));
    return (
      <>
        <div className="tiles t5" style={{ marginTop: 0 }}>
          <div className="tile kib"><span>Ki blast{ktype && ktype !== 'none' && <em className="kt">{ktype.toUpperCase()}</em>}</span><Tap as="b" title="Ki blast" get={A(x => x.kiBlastDmg)} /><Rk p={rosterPos('kib', x => x.kiBlastDmg, v.kiBlastDmg)} /></div>
          <div className="tile kib"><span>Ki blast limit</span><Tap as="b" title="Ki blast limit" get={A(x => x.kiBlastLimit)} fmt={F.count} /><Rk p={rosterPos('kibl', x => Math.min(x.kiBlastLimit, 20), Math.min(v.kiBlastLimit, 20))} /></div>
          <div className="tile kib"><span>Ki blast cost</span><b><Tap title="Ki blast cost" get={A(x => x.kiBlastCost)} fmt={F.bars} kind="dec" lessIsBetter /><small>bars</small></b><Rk p={rosterPos('kibc', x => x.kiBlastCost, v.kiBlastCost, true)} title="Less is better" /></div>
          <div className="tile kib"><span>Full volley</span><Tap as="b" title="Full volley" get={A(x => volley(x))} /><Rk p={rosterPos('volley', x => volley(x), volley(v))} /></div>
          {gm.charged && (
            <div className="tile kib"><span>Charged ki blast<em className="kt lv">Lv.3</em>{gm.charged.shots > 1 && <em className="kt x">×{gm.charged.shots}</em>}</span><Tap as="b" title="Charged ki blast, Charge Lv.3" get={(p) => gameMoves(p.A).charged.damage.at(-1)} /><Rk p={movePos('charged3', g => g.charged?.damage.at(-1), gm.charged.damage.at(-1))} /></div>
          )}
        </div>
      </>
    );
  }
  if (id === 'chains') return <SheetChains side={side} />;
  if (id === 'spk') {
    // how fast the gauge fills to enter Sparking! and how long it lasts, against the usual (class and capsules);
    // Burst Melee Attack and Burst Rush, the same for everyone, are in Full
    return (
      <div className="tiles t5" style={{ marginTop: 0 }}>
        <div className="tile"><span>Charge speed</span><Tap as="b" title="Sparking charge speed" get={A(x => x.sparkCharge)} fmt={F.rel} kind="rel" /><Rk p={rosterPos('spkc', x => x.sparkCharge, v.sparkCharge)} title="Faster is better" /></div>
        <div className="tile"><span>Duration</span><Tap as="b" title="Sparking duration" get={A(x => x.sparkDuration)} fmt={F.rel} kind="rel" /><Rk p={rosterPos('spkd', x => x.sparkDuration, v.sparkDuration)} title="Longer is better" /></div>
        <div className="tile"><span>Hyper Smash</span><Tap as="b" title="Hyper Smash" get={(p) => gameMoves(p.A).hyperSmash} /><Rk p={movePos('hyper', g => g.hyperSmash, gm.hyperSmash)} /></div>
        <div className="tile"><span>Violent Rush</span><b>{c.moveset?.unavailable?.includes('Violent Rush') ? 'No' : 'Yes'}</b></div>
        <div className="tile"><span>Extra follow-ups</span><b>+{c.moveset?.pursuits?.sparkingAdd ?? 0}</b></div>
      </div>
    );
  }
  return null;
}

/** A fighter's forms as faces; a click switches to that form (the build stays). */
export function FormSwitch({ c, onForm }) {
  const forms = formsOf(c.id);
  if (forms.length < 2) return null;
  return (
    <div className="fforms">
      <p className="lbl2"><span>Forms</span></p>
      <div className="ffl">{forms.map(f => {
        const x = byId.get(f);
        return <button key={f} className={f === c.id ? 'on' : ''} aria-pressed={f === c.id} title={`${x.name}, DP ${x.dp}`} onClick={() => f !== c.id && onForm(f)}><img src={faceUrl(x)} alt={x.name} /><b>{x.dp}</b></button>;
      })}</div>
    </div>
  );
}

/** The league's lineup builds for this fighter (the website's linked lineups); a click puts one on. */
/** The league's builds for this fighter: up to 6 on the Fighter page, `max` 3 in the narrow Versus rails. */
export function LeagueBuilds({ side, onChange, max = 6 }) {
  const lb = side.c.leagueBuilds;
  if (!lb?.top?.length) return null;
  const top = lb.top.slice(0, max);
  const same = (ids) => ids.length === side.spec.caps.length && ids.every(id => side.spec.caps.includes(id));
  return (
    <>
      <div className="sublbl" style={{ marginTop: 12 }}><span>League builds</span><em>top {top.length} of {lb.builds}, from {lb.lineups} lineups</em></div>
      <div className="lb">
        {top.map((b, i) => {
          const caps = b.capsules.map(id => capsuleById.get(id)).filter(Boolean);
          const byType = new Map();
          for (const x of caps) byType.set(x.type, (byType.get(x.type) || 0) + x.cost);
          const on = same(b.capsules);
          return (
            <button key={i} className={on ? 'on' : ''} onClick={() => onChange({ ...side.spec, caps: [...b.capsules] })} aria-pressed={on}>
              <div className="lbh"><span>{b.teams.join(', ')}</span><em>{b.uses} lineup{b.uses === 1 ? '' : 's'}, Season {b.season}</em></div>
              <div className="catbar">{[...byType].map(([t, n]) => <i key={t} className={typeClass(t)} style={{ flex: n }} />)}</div>
              {!on && <div className="tags">{caps.map(x => <span key={x.id} className={`cm ${typeClass(x.type)}`}>{x.name}</span>)}</div>}
            </button>
          );
        })}
      </div>
    </>
  );
}

/** The fighter column: the figure, the nameplate, then the build (Forms, Active, Conditions, Capsules, league builds). */
export function FighterColumn({ side, ruleset, setSpec, openPicker, onForm }) {
  const { c } = side;
  return (
    <>
      <div className="fig"><img src={artUrl(c.id)} alt="" className={isGiant(c) ? 'giant' : ''} style={{ '--fh': figHeight(c) }} /></div>
      <Nameplate c={c} onChange={() => openPicker('char', 'A')} />
      <div className="build">
        {onForm && <FormSwitch c={c} onForm={onForm} />}
        <p className="lbl2"><span>Active</span></p>
        <ActiveToggles side={side} onChange={setSpec} />
        <Conditions side={side} onChange={setSpec} compact />
        <CapsuleRows side={side} ruleset={ruleset} onEdit={() => openPicker('caps', 'A')} onClear={() => setSpec({ ...side.spec, caps: [] })} />
        <LeagueBuilds side={side} onChange={setSpec} />
      </div>
    </>
  );
}
