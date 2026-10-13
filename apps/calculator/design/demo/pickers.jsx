// The two pickers: the character picker (the roster as the game's faces, filtered by search, team,
// class and DP, with a preview) and the capsule picker (the build with its budget and attack-cap meters,
// every allowed capsule by type with what it changes on this build).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import transformations from '../../../../referencedata/transformations.json';
import {
  characters, capsules, teams, byId, faceUrl, artUrl, classColours, classFilterOf, CLASS_FILTERS, baseView, rosterPos, nameParts,
  CAPSULE_TYPES, typeClass, capsuleSummary, buildCheck, inAttackGroup, evaluate, blastsOf, blastDamage, volley, conditionNeedsOf,
} from './model.js';
import { usePhone, Rk, Name, RulesetSelect } from './ui.jsx';
import { ClassChip } from './sheet.jsx';
import { parseCondition } from '../../src/utils/conditions.js';
import { F } from './format.js';

/* ------------------------------------------------------------------ forms (referencedata/transformations.json) */
const ADJ = new Map();
for (const [id, t] of Object.entries(transformations)) {
  if (id.startsWith('_')) continue;
  for (const to of t.transformsTo || []) {
    if (!ADJ.has(id)) ADJ.set(id, new Set());
    if (!ADJ.has(to)) ADJ.set(to, new Set());
    ADJ.get(id).add(to); ADJ.get(to).add(id);
  }
}
function formsOf(id) {
  const seen = new Set([id]), q = [id];
  while (q.length) for (const n of ADJ.get(q.shift()) || []) if (!seen.has(n)) { seen.add(n); q.push(n); }
  return [...seen].filter(x => byId.has(x)).sort((a, b) => characters.findIndex(c => c.id === a) - characters.findIndex(c => c.id === b));
}

/* ------------------------------------------------------------------ character picker */
function Face({ c, cur, hov, sel, onHover, onPick, onOpen }) {
  const [c1, c2] = classColours(c.class.label);
  return (
    <button className={`ct${c1 !== c2 ? ' two' : ''}${cur ? ' cur' : ''}${hov ? ' hov' : ''}${sel ? ' sel' : ''}`} style={{ '--c1': c1, '--c2': c2 }} title={`${c.name}, ${c.class.label}, DP ${c.dp}`}
      aria-pressed={sel} onMouseEnter={() => onHover(c.id)} onFocus={() => onHover(c.id)} onClick={() => onPick(c.id)} onDoubleClick={() => onOpen(c.id)}>
      <img src={faceUrl(c)} alt="" loading="lazy" /><b>{c.dp}</b><span>{c.name}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ the quick list (Change fighter) */
/**
 * A searchable list of every fighter that opens where the fighter is shown, so changing one never leaves
 * its numbers: in the Sheet's art column, or as a drop-down under the name. Up and down switch the fighter
 * as you go (the numbers follow); a click or Enter keeps it and closes the list.
 */
export function QuickPick({ current, side, onPick, onClose, onBrowse, mode = 'dd', title = 'Change fighter' }) {
  const phone = usePhone();
  const [q, setQ] = useState('');
  const [team, setTeam] = useState('');
  const [dp, setDp] = useState('');
  const box = useRef(null);
  const members = team ? new Set(teams.find(t => t.name === team)?.members || []) : null;
  const list = characters.filter(c => (!q || c.name.toLowerCase().includes(q.toLowerCase())) && (!members || members.has(c.id)) && (!dp || c.dp === +dp));
  const forms = formsOf(current);
  useEffect(() => {
    // keep the current fighter in view, scrolling the list only (not the page)
    const l = box.current?.querySelector('.qlist'), r = l?.querySelector('.qrow.cur');
    if (l && r && (r.offsetTop < l.scrollTop || r.offsetTop + r.offsetHeight > l.scrollTop + l.clientHeight)) l.scrollTop = r.offsetTop - l.clientHeight / 2 + r.offsetHeight / 2;
  }, [current, q, team, dp]);
  useEffect(() => {
    const away = (e) => { if (box.current && !box.current.contains(e.target) && !e.target.closest?.('[data-qp]')) onClose(); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [onClose]);
  const step = (d) => {
    if (!list.length) return;
    const i = list.findIndex(c => c.id === current);
    const n = list[i < 0 ? 0 : (i + d + list.length) % list.length];
    onPick(n.id, true);
  };
  const key = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); step(e.key === 'ArrowDown' ? 1 : -1); }
    else if (e.key === 'Enter') { e.preventDefault(); const pick = list.find(c => c.id === current) || list[0]; if (pick) onPick(pick.id); }
    else if (e.key === 'Escape') onClose();
  };
  return (
    <div className={`qp ${mode} s${side}`} ref={box} role="dialog" aria-label={title} onKeyDown={key}>
      <div className="qph"><b>{title}</b><button className="x" onClick={onClose}>Close</button></div>
      <label className="srch"><span className="sr">Search</span><input autoFocus={!phone} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" /></label>
      <div className="qpf">
        <label><span className="sr">Team</span><select value={team} onChange={(e) => setTeam(e.target.value)}><option value="">All teams</option>{teams.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}</select></label>
        <label><span className="sr">DP</span><select value={dp} onChange={(e) => setDp(e.target.value)}><option value="">Any DP</option>{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>DP {n}</option>)}</select></label>
      </div>
      {forms.length > 1 && !q && (
        <div className="qforms"><small>Forms</small>{forms.map(f => (
          <button key={f} className={f === current ? 'on' : ''} title={byId.get(f).name} onClick={() => onPick(f, true)}><img src={faceUrl(byId.get(f))} alt={byId.get(f).name} /></button>
        ))}</div>
      )}
      <div className="qlist" role="listbox" aria-label="Fighters">
        {list.map(c => {
          const [c1] = classColours(c.class.label);
          return (
            <button key={c.id} role="option" aria-selected={c.id === current} className={`qrow${c.id === current ? ' cur' : ''}`} style={{ '--c1': c1 }} onClick={() => onPick(c.id)}>
              <img src={faceUrl(c)} alt="" loading="lazy" /><span>{c.name}<small>{c.class.label}</small></span><b>{c.dp}</b>
            </button>
          );
        })}
        {!list.length && <div className="shown">No fighter matches.</div>}
      </div>
      <div className="qpfoot">{!phone && <span>↑ ↓ flip through, Enter keeps</span>}<button onClick={onBrowse}>Browse all characters</button></div>
    </div>
  );
}

function Preview({ id, selected, onSelect, onPick, side, onCompare, onVs, currentName }) {
  const c = byId.get(id);
  const v = baseView(id);
  const forms = formsOf(id);
  return (
    <div className="pvw">
      <div className="pvfig"><img src={artUrl(id)} alt="" /></div>
      <div className="pvb">
        <div className="nm"><Name parts={nameParts(c.name)} br /></div>
        <div className="chips"><ClassChip c={c} /><span className="chip dp">DP {c.dp}</span></div>
        <div className="tiles t2">
          <div className="tile"><span>HP</span><b>{F.int(v.health)}</b></div>
          <div className="tile"><span>Rush 5-hit</span><b>{F.int(v.rush5Hit)}</b><Rk p={rosterPos('rush5', x => x.rush5Hit, v.rush5Hit)} /></div>
          <div className="tile"><span>Smash</span><b>{F.int(v.smash)}</b><Rk p={rosterPos('smash', x => x.smash, v.smash)} /></div>
          <div className="tile"><span>Ki blast limit</span><b>{F.count(v.kiBlastLimit)}</b><Rk p={rosterPos('kibl', x => Math.min(x.kiBlastLimit, 20), Math.min(v.kiBlastLimit, 20))} /></div>
        </div>
        {forms.length > 1 && (
          <div className="forms"><span>Forms</span>{forms.map(f => (
            <button key={f} className={f === id ? 'on' : ''} aria-pressed={f === id} title={`${byId.get(f).name}, DP ${byId.get(f).dp}`} onClick={() => onSelect(f)}><img src={faceUrl(byId.get(f))} alt={byId.get(f).name} /></button>
          ))}</div>
        )}
        {!selected && <div className="pvhint">Click to select, so the buttons below act on this fighter</div>}
        <button className={`pick${side === 'B' ? ' side' : ''}`} onClick={() => onPick(id)}>{side === 'B' ? `Pick for the right side` : onCompare ? `Open ${c.name}` : `Pick ${c.name}`}</button>
        {onCompare && currentName && (
          <div className="pv2"><button onClick={() => onCompare(id)}>Compare with {currentName}</button><button onClick={() => onVs(id)}>Opponent for {currentName}</button></div>
        )}
      </div>
    </div>
  );
}

export function CharacterPicker({ current, side, view, onPick, onClose = null, onCompare = null, onVs = null }) {
  const phone = usePhone();
  const [q, setQ] = useState('');
  const [team, setTeam] = useState(null);
  const [cls, setCls] = useState(null);
  const [dp, setDp] = useState(null);
  // a click selects a fighter (the preview stays on it); hovering the grid previews another, and leaving the
  // grid goes back to the selected one, so the preview's buttons act on the fighter that was clicked
  const [sel, setSel] = useState(current);
  const [hov, setHov] = useState(null);
  const [open, setOpen] = useState(null); // phone filter menus
  const members = team ? new Set(teams.find(t => t.name === team)?.members || []) : null;
  const list = characters.filter(c => (!q || c.name.toLowerCase().includes(q.toLowerCase()))
    && (!members || members.has(c.id)) && (!cls || classFilterOf(c) === cls) && (!dp || c.dp === dp));
  const pick = (id) => (id !== sel ? setSel(id) : onPick(id));
  const shown = (!phone && hov) || sel;
  const label = side === 'B' ? (view === 'vs' ? 'Pick the opponent' : 'Pick for the right side') : onClose ? 'Pick a fighter' : 'Characters';
  const currentName = nameParts(byId.get(current).name)[0];
  const teamChips = <><button className={!team ? 'on' : ''} onClick={() => setTeam(null)}>All</button>{teams.map(t => <button key={t.name} className={team === t.name ? 'on' : ''} onClick={() => setTeam(t.name)}>{t.name}</button>)}</>;
  const classChips = <><button className={!cls ? 'on' : ''} onClick={() => setCls(null)}>All</button>{CLASS_FILTERS.map(k => { const [c1, c2] = classColours(k); return <button key={k} className={`ccl${c1 !== c2 ? ' two' : ''}${cls === k ? ' on' : ''}`} style={{ '--c1': c1, '--c2': c2 }} onClick={() => setCls(cls === k ? null : k)}>{k}</button>; })}</>;
  const dpChips = <><button className={!dp ? 'on' : ''} onClick={() => setDp(null)}>Any</button>{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <button key={n} className={dp === n ? 'on' : ''} onClick={() => setDp(dp === n ? null : n)}>{n}</button>)}</>;
  return (
    <div className="pk">
      <div className="pk-main">
        <div className="pk-h"><b>{label}</b>{!phone && <small>{list.length} of {characters.length} fighters</small>}{onClose && <button className="x" onClick={onClose}>Close</button>}</div>
        <label className="srch"><span className="sr">Search</span><input autoFocus={!phone} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" /></label>
        {phone ? (
          <>
            <div className="fl scroll">
              <button className={`dd${team ? ' on' : ''}`} onClick={() => setOpen(open === 't' ? null : 't')}>{team || 'All teams'}</button>
              <button className={`dd${cls ? ' on' : ''}`} onClick={() => setOpen(open === 'c' ? null : 'c')}>{cls || 'Class'}</button>
              <button className={`dd${dp ? ' on' : ''}`} onClick={() => setOpen(open === 'd' ? null : 'd')}>{dp ? `DP ${dp}` : 'DP'}</button>
            </div>
            {open === 't' && <div className="fl">{teamChips}</div>}
            {open === 'c' && <div className="fl cls">{classChips}</div>}
            {open === 'd' && <div className="fl">{dpChips}</div>}
          </>
        ) : (
          <>
            <div className="fl"><small>Team</small>{teamChips}</div>
            <div className="fl cls"><small>Class</small>{classChips}</div>
            <div className="fl"><small>DP</small>{dpChips}</div>
          </>
        )}
        <div className="cgrid" onMouseLeave={() => setHov(null)}>
          {list.map(c => <Face key={c.id} c={c} cur={c.id === current} hov={c.id === hov} sel={c.id === sel} onHover={phone ? () => {} : setHov} onPick={pick} onOpen={onPick} />)}
          {!list.length && <div className="shown">No fighter matches.</div>}
        </div>
      </div>
      {!phone && <Preview id={shown} selected={shown === sel} onSelect={(id) => { setSel(id); setHov(null); }} onPick={onPick} side={side} onCompare={onCompare} onVs={onVs} currentName={shown !== current ? currentName : null} />}
      {phone && sel && (
        <div className="pkbar">
          <img src={faceUrl(byId.get(sel))} alt="" />
          <div><div className="nm">{byId.get(sel).name}</div><div className="chips"><ClassChip c={byId.get(sel)} /><span className="chip dp">DP {byId.get(sel).dp}</span></div></div>
          <button className={`pick${side === 'B' ? ' side' : ''}`} onClick={() => onPick(sel)}>{onClose ? 'Pick' : 'Open'}</button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ capsule picker */
const HEADLINE = [
  ['HP', (s) => s.view.health], ['Rush 5-hit', (s) => s.view.rush5Hit], ['Smash', (s) => s.view.smash], ['Throw', (s) => s.view.throw],
  ['Vanishing Attack', (s) => s.view.vanishingAttack], ['Dragon Smash', (s) => s.view.dragonSmash],
  ['Follow-ups', (s) => s.view.pursuitLimit.general, String], ['Vanishing Attack uses', (s) => s.view.pursuitLimit.vanishingAttack, String], ['Dragon Homing uses', (s) => s.view.pursuitLimit.dragonHoming, String],
  ['Ki blast', (s) => s.view.kiBlastDmg], ['Ki blast limit', (s) => s.view.kiBlastLimit, F.count], ['Full volley', (s) => volley(s.view)],
  ['Ki blast cost', (s) => s.view.kiBlastCost, F.bars], ['Melee defense', (s) => s.view.meleeDefenseStat, F.def], ['Ki-blast defense', (s) => s.view.energy, F.def],
  ['Blast defense', (s) => s.view.blastDefense, F.def], ['Starting ki', (s) => s.view.startingKi, (x) => `${+x.toFixed(2)} bars`],
  ['Ki charge', (s) => s.view.kiCharge, F.dec2], ['Ki regen', (s) => s.view.kiRegen, F.dec], ['Ki from hits', (s) => s.view.attackKiGain, F.dec],
  ['Skill gauge at start', (s) => s.view.skillStart, String], ['Skill gauge per minute', (s) => parseFloat(s.view.skillRegen), F.dec],
  ['Short dash', (s) => s.view.shortDashCost, F.bars], ['Switch', (s) => s.view.switch, F.secs], ['Armor', (s) => s.view.armor, F.armor],
  ['B1', (s) => blastDamage(s, blastsOf(s.c).find(b => b.slot === 'Super 1' && !b.variant) || {}).damage],
  ['ULT', (s) => blastDamage(s, blastsOf(s.c).find(b => b.slot === 'Ultimate' && !b.variant) || {}).damage],
];
const SPEC_NO_SIT = (spec) => ({ ...spec, sit: null });
/** What adding a capsule changes on this build: the headline stats it moves, else when it works. */
function changesOf(side, cap) {
  const before = evaluate(SPEC_NO_SIT(side.spec));
  const after = evaluate(SPEC_NO_SIT({ ...side.spec, caps: [...side.spec.caps, cap.id] }));
  const diff = (a, b) => HEADLINE.filter(([, get]) => { const x = get(a), y = get(b); return typeof x === 'number' && typeof y === 'number' && Math.abs(x - y) > 1e-9; })
    .map(([label, get, fmt = F.int]) => ({ label, from: fmt(get(a)), to: fmt(get(b)), worse: label === 'HP' || label === 'Starting ki' ? get(b) < get(a) : ['Ki blast cost', 'Melee defense', 'Ki-blast defense', 'Blast defense', 'Short dash', 'Switch'].includes(label) ? get(b) > get(a) : get(b) < get(a) }));
  const now = diff(before, after);
  if (now.length) return { kind: 'now', list: now.slice(0, 2) };
  if ((cap.effects || []).some(e => e.condition === 'sparking')) {
    const sb = evaluate(SPEC_NO_SIT({ ...side.spec, sparking: true })), sa = evaluate(SPEC_NO_SIT({ ...side.spec, sparking: true, caps: [...side.spec.caps, cap.id] }));
    const d = diff(sb, sa);
    if (d.length) return { kind: 'sparking', list: d.slice(0, 1) };
  }
  const cond = (cap.effects || []).find(e => e.condition && e.condition !== 'sparking');
  if (cond) {
    const c = parseCondition(cond.condition);
    if (c.kind === 'healthPct') return { kind: 'when', text: `At ${Math.round(c.max * 100)}% health and below` };
    if (c.kind === 'map') return { kind: 'when', text: 'On its map' };
    if (c.kind === 'event') return { kind: 'when', text: 'For a while after its event' };
    if (c.kind === 'rushOnly') return { kind: 'now', list: [], text: 'Rush hits break armor 3 levels sooner' };
  }
  return { kind: 'ns' };
}

function Meter({ label, now, hover, of, gray = false }) {
  const n = Math.max(of, now + hover);
  return (
    <div>
      <div className="meterl"><span>{label}</span><b>{now}{hover > 0 && <em> → {now + hover}</em>} of {of}</b></div>
      <div className={`bud${gray ? ' g' : ''}`}>{Array.from({ length: n }, (_, i) => <i key={i} className={i < now ? 'f' : i < now + hover ? 'h' : ''} style={i >= of ? { outline: '1px solid #ef4444' } : undefined} />)}</div>
    </div>
  );
}

/**
 * The capsule picker. `mode` places it (round 23): 'dock' in the fighter's column or a Versus rail, beside the
 * numbers it changes; 'sheet' in the phone's (and tablet's) half-height bottom sheet; 'page' on its own.
 * `onHover(id)` reports the capsule under the pointer, so the page can preview what it would change.
 */
export function CapsulePicker({ side, ruleset, onChange, onClose, who, mode = 'page', onHover = null }) {
  const phone = usePhone();
  const narrow = phone || mode !== 'page';
  const [q, setQ] = useState('');
  const [type, setType] = useState(null);
  const [cost, setCost] = useState(null);
  const [banned, setBanned] = useState(false);
  const [hov, setHov0] = useState(null);
  const setHov = (id) => { setHov0(id); onHover?.(id); };
  useEffect(() => () => onHover?.(null), []);
  const spec = side.spec;
  const chk = buildCheck(spec.caps, ruleset);
  const group = chk.groups[0];
  const bannedIds = new Set(ruleset.banned);
  const hovCap = hov ? capsules.find(x => x.id === hov) : null;
  const hovAdds = hovCap && !spec.caps.includes(hovCap.id) ? hovCap : null;
  const fits = (x) => chk.cost + x.cost <= ruleset.totalCost && (!inAttackGroup(ruleset, x.id) || !group || group.cost + x.cost <= group.maxCost) && spec.caps.length < 7;
  const add = (x) => { if (!spec.caps.includes(x.id) && fits(x) && !bannedIds.has(x.id)) onChange({ ...spec, caps: [...spec.caps, x.id] }); };
  const remove = (id) => onChange({ ...spec, caps: spec.caps.filter(x => x !== id) });
  const list = capsules.filter(x => (banned || !bannedIds.has(x.id)) && (!type || x.type === type) && (!cost || x.cost === cost)
    && (!q || `${x.name} ${capsuleSummary(x)} ${x.description || ''}`.toLowerCase().includes(q.toLowerCase())));
  const changes = useMemo(() => new Map(list.map(x => [x.id, spec.caps.includes(x.id) ? null : changesOf(side, x)])), [list.map(x => x.id).join(), spec.caps.join(), spec.skills, spec.sparking, side.c.id]);
  const notShown = [];
  for (const x of chk.caps) {
    for (const e of x.effects || []) {
      if (e.key === 'display' && e.note) notShown.push([x.name, e.note]);
      else if (e.condition && e.condition !== 'sparking' && !spec.sit) notShown.push([x.name, `${capsuleSummary({ effects: [e] })}`]);
    }
  }
  const nameOf = side.c.name;
  return (
    <div className={`cpk ${mode}`}>
      <div className="cbuild">
        <div className="pk-h"><b>Capsules</b><small>{nameOf}</small>{mode !== 'sheet' && <button className="x" onClick={onClose}>Done</button>}</div>
        <div className="caps">
          {chk.caps.map(x => (
            <div key={x.id} className={`caprow ${typeClass(x.type)}`}><span className="cst">{x.cost}</span><b title={capsuleSummary(x)}>{x.name}</b><button className="rm" aria-label={`Remove ${x.name}`} onClick={() => remove(x.id)}>✕</button></div>
          ))}
          {Array.from({ length: mode === 'page' ? 7 - chk.caps.length : Math.min(1, 7 - chk.caps.length) }, (_, i) => <div key={i} className="caprow empty"><span className="cst"></span><b>{mode !== 'page' ? `${7 - chk.caps.length} free, pick below` : i === 0 ? 'Pick a capsule on the right' : 'Empty slot'}</b><em></em></div>)}
        </div>
        <div className="meterl rsrow"><span>Ruleset</span><RulesetSelect /></div>
        <Meter label="Budget" now={chk.cost} hover={hovAdds ? hovAdds.cost : 0} of={ruleset.totalCost} />
        {group && <Meter label="Attack boosts cap" now={group.cost} hover={hovAdds && inAttackGroup(ruleset, hovAdds.id) ? hovAdds.cost : 0} of={group.maxCost} gray />}
        {chk.problems.length ? chk.problems.map(p => <div className="warn" key={p}>{p}</div>) : <div className="warn ok">Fits {ruleset.name}{chk.cost < ruleset.totalCost ? `, ${ruleset.totalCost - chk.cost} points left` : ''}.</div>}
        {notShown.length > 0 && <div className="nsl"><div className="meterl" style={{ margin: '0 0 2px' }}><span>Not in the stats</span></div>{notShown.map(([n, t], i) => <div key={i}><b>{n}</b> {t}</div>)}</div>}
        {chk.caps.length > 0 && mode === 'page' && <div className="shown">The sheet's numbers already include {chk.caps.filter(x => (x.effects || []).some(e => !e.condition && e.key !== 'display')).map(x => capsuleSummary({ effects: x.effects.filter(e => !e.condition && e.key !== 'display') })).join('; ') || 'nothing yet'}.</div>}
      </div>
      <div className="clist">
        <label className="srch"><span className="sr">Search capsules</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={narrow ? 'Search capsules' : 'Search capsules by name or effect'} /></label>
        <div className={`fl${phone && mode === 'page' ? ' scroll' : ''}`}><button className={!type ? 'on' : ''} onClick={() => setType(null)}>All</button>{CAPSULE_TYPES.map(t => <button key={t.type} className={`${t.k}${type === t.type ? ' on' : ''}`} onClick={() => setType(type === t.type ? null : t.type)}>{t.type}</button>)}</div>
        {!narrow && (
          <div className="fl cost"><small>Cost</small><button className={!cost ? 'on' : ''} onClick={() => setCost(null)}>Any cost</button>
            {[1, 2, 3, 4, 5].map(n => <button key={n} className={cost === n ? 'on' : ''} onClick={() => setCost(cost === n ? null : n)}><span className={`hc c${n}`}>{n}</span></button>)}
            <button className={`showb${banned ? ' on' : ''}`} onClick={() => setBanned(!banned)}>{banned ? 'Hide banned' : `Show banned (${ruleset.banned.length})`}</button>
          </div>
        )}
        <div className="crows">
          {CAPSULE_TYPES.filter(t => list.some(x => x.type === t.type)).map(t => (
            <React.Fragment key={t.type}>
              <div className={`cgh ${t.k}`}>{t.type}</div>
              {list.filter(x => x.type === t.type).map(x => {
                const eq = spec.caps.includes(x.id);
                const ban = bannedIds.has(x.id);
                const ok = eq || (fits(x) && !ban);
                const ch = changes.get(x.id);
                return (
                  <button key={x.id} className={`cr${eq ? ' eqd' : ''}${hov === x.id ? ' hov' : ''}${!ok ? ' no' : ''}`} onMouseEnter={() => setHov(x.id)} onMouseLeave={() => setHov(null)} onFocus={() => setHov(x.id)}
                    onClick={() => (eq ? remove(x.id) : add(x))} aria-pressed={eq} title={x.description || undefined}>
                    <span className={`hc c${x.cost}`}>{x.cost}</span>
                    <span className="cn"><b>{x.name}</b>{eq && <em className="ctag">Equipped ✕</em>}{ban && <em className="ctag g">Banned</em>}{!eq && inAttackGroup(ruleset, x.id) && <em className="ctag g">Attack cap</em>}<small>{capsuleSummary(x)}</small></span>
                    <span className="cc">
                      {ch?.kind === 'now' && ch.list.map((d, i) => <React.Fragment key={d.label}>{i > 0 && <br />}{d.label} <s>{d.from}</s> {d.worse ? <em className="dn">{d.to}</em> : d.to}</React.Fragment>)}
                      {ch?.kind === 'now' && ch.text}
                      {ch?.kind === 'sparking' && <><i className="when">In Sparking!</i>{ch.list[0].label} {ch.list[0].to}</>}
                      {ch?.kind === 'when' && <i className="ns">{ch.text}</i>}
                      {ch?.kind === 'ns' && <i className="ns">Not in the stats</i>}
                      {!ok && !eq && <i className="ns over">{ban ? 'Banned' : spec.caps.length >= 7 ? 'No free slot' : 'Over the budget or cap'}</i>}
                    </span>
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
