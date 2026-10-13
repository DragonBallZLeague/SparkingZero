// The Fighter page (round 23): the Sheet and Full stats as one page. Every section keeps one place in one order;
// Quick shows it as the Sheet does (the game's look, roster bars), Full blows it up with every detail in the same
// look (as the Command list's move cards do; fullstats.jsx), and More / Less
// switches one section. A headline strip and the section links stay pinned; Find jumps to any stat or move,
// opening a closed section to reach it. The capsule picker docks in the fighter column (main.jsx), so the
// numbers stay in view while capsules go on and off.
import React, { useEffect, useRef, useState } from 'react';
import { fiveHitTaken, volley } from './model.js';
import { Tap, Modes, PhoneSectionNav, usePhone, usePair } from './ui.jsx';
import { QuickBody, FighterColumn } from './sheet.jsx';
import { sections as fullSections, FullForm, Summary } from './fullstats.jsx';
import { MoveCards } from './moves.jsx';
import { F } from './format.js';

/** The numbers checked first (the league's list), pinned at the top; the phone shows the first four marked. */
export const HEAD = [
  { label: 'Health', title: 'HP', get: (v) => v.health, ph: 1 },
  { label: '5-hit taken', title: '5-hit damage taken', get: fiveHitTaken, less: true },
  { label: 'Rush 5-hit', title: 'Rush 5-hit', get: (v) => v.rush5Hit, ph: 1 },
  { label: 'Smash', title: 'Smash', get: (v) => v.smash, ph: 1 },
  { label: 'Throw', title: 'Throw', get: (v) => v.throw },
  { label: 'Ki blast', title: 'Ki blast', get: (v) => v.kiBlastDmg, ph: 1 },
  { label: 'Full volley', title: 'Full volley', get: (v) => volley(v) },
  { label: 'Armor break', title: 'Armor break', get: (v) => v.armorBreak, less: true, fmt: F.hits, kind: 'dec' },
  { label: 'Ki charge', title: 'Ki charge', get: (v) => v.kiCharge, fmt: F.dec2, kind: 'dec', hide: 1 },
];

/** The headline strip; `preview` (a view with the hovered capsule added) shows where each number would go. */
function Headline({ preview, phone }) {
  const pc = usePair();
  const items = HEAD.filter(h => !h.hide && (!phone || h.ph));
  return (
    <div className="hl">
      {items.map(h => {
        const fmt = h.fmt || F.int;
        const now = h.get(pc.pair.A.view), next = preview ? h.get(preview) : null;
        const moves = next != null && typeof now === 'number' && Math.abs(next - now) > 1e-9;
        return (
          <div key={h.label}>
            <span>{h.label}</span>
            <Tap as="b" title={h.title} get={(p) => h.get(p.A.view)} fmt={fmt} kind={h.kind} lessIsBetter={h.less} />
            {moves && <em className={`pv${(h.less ? next < now : next > now) ? '' : ' dn'}`}>→ {fmt(next)}</em>}
          </div>
        );
      })}
    </div>
  );
}

/** What the build changes among the headline numbers (the phone's loadout sheet, above the capsules). */
export function BuildDelta({ side, base }) {
  if (!side || !base) return null;
  const list = HEAD.filter(h => { const a = h.get(base.view), b = h.get(side.view); return typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) > 1e-9; });
  return (
    <div className="delta">
      {list.length ? <>Changed{list.map(h => {
        const fmt = h.fmt || F.int, a = h.get(base.view), b = h.get(side.view);
        return <span key={h.label}>{h.label} <s>{fmt(a)}</s> <b className={(h.less ? b < a : b > a) ? 'up' : 'dn'}>{fmt(b)}</b></span>;
      })}</> : <i>No headline number changed yet</i>}
    </div>
  );
}

/** One order for both forms. `fullOnly`: one line with its headline numbers (Summary) until opened. */
const SECS = [
  { id: 'tough', title: 'Toughness', cls: '' },
  { id: 'res', title: 'Resources', cls: 'res' },
  { id: 'cmd', title: 'Command list', cls: 'cmd' },
  { id: 'off', title: 'Offense', cls: 'off' },
  { id: 'chains', title: 'Rush Chains', cls: 'mov', note: 'Damage at full charge' },
  { id: 'spk', title: 'Sparking! Mode', cls: 'spk' },
  { id: 'armor', title: 'Breaking armor', cls: 'armp', fullOnly: true },
  { id: 'limits', title: 'Combat limits', cls: 'new', fullOnly: true },
  { id: 'mob', title: 'Mobility', cls: 'mob', fullOnly: true },
  { id: 'traits', title: 'Traits', cls: 'neutral', fullOnly: true },
];

/** The first text node under `root` holding `needle`, as its element; ghosts (closed sections' full rows) only when asked. */
function findText(root, needle, inGhost) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const el = n.parentElement;
    if (!inGhost && el.closest('.fghost')) continue;
    if (el.closest('.more')) continue;
    if (n.nodeValue.toLowerCase().includes(needle)) return el;
  }
  return null;
}

export function FighterView({ A: side, ruleset, setSpec, openPicker, qp = () => null, depth, setDepth, dock = null, preview = null }) {
  const phone = usePhone();
  const quick = qp('A', 'col');
  const fsecs = fullSections(side);
  const fs = (id) => fsecs.find(s => s.id === id);
  // each section's own More / Less, on top of the page's Quick / Full (reset when that changes)
  const [open, setOpen] = useState({});
  useEffect(() => setOpen({}), [depth]);
  const isFull = (s) => open[s.id] ?? depth === 'full';
  const [abTab, setAbTab] = useState(side.spec.sparking ? 'sp' : 'n');
  const root = useRef(null);
  const [here, setHere] = useState(null);
  const [q, setQ] = useState('');
  const [findOpen, setFindOpen] = useState(false);
  const noRef = useRef(null);
  const searching = q.trim().length >= 3;

  const offset = () => {
    const hd = root.current?.querySelector('.fhd');
    return hd ? parseFloat(getComputedStyle(hd).top) + hd.offsetHeight + 10 : 120;
  };
  const scrollTo = (el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset(), behavior: 'auto' });
  const jump = (id) => { const el = document.getElementById(`f-${id}`); if (el) scrollTo(el); };

  // the section being read, for the links
  useEffect(() => {
    const f = () => {
      let at = null;
      const off = offset() + 4;
      for (const s of SECS) { const el = document.getElementById(`f-${s.id}`); if (el && el.getBoundingClientRect().top < off) at = s.id; }
      setHere(at);
    };
    window.addEventListener('scroll', f, { passive: true });
    f();
    return () => window.removeEventListener('scroll', f);
  }, []);

  // Find: the first match in the page's order; a match only in a closed section's full rows opens that section
  const lastQ = useRef('');
  const pending = useRef(false);
  useEffect(() => {
    if (q === lastQ.current && !pending.current) return;
    lastQ.current = q; pending.current = false;
    const el = root.current;
    if (!el) return;
    el.querySelectorAll('.fhit').forEach(e => e.classList.remove('fhit'));
    if (noRef.current) noRef.current.textContent = '';
    if (!searching) return;
    const needle = q.trim().toLowerCase();
    for (const sec of el.querySelectorAll('[data-sec]')) {
      const hit = findText(sec, needle, false);
      if (hit) { hit.classList.add('fhit'); scrollTo(hit); return; }
      const ghost = sec.querySelector('.fghost');
      if (ghost && findText(ghost, needle, true)) { pending.current = true; setOpen(o => ({ ...o, [sec.dataset.sec]: true })); return; }
    }
    if (noRef.current) noRef.current.textContent = 'No match';
  }, [q, open]);

  const fullBody = (s) => (s.id === 'cmd'
    ? <MoveCards side={side} onStage={(slot, n) => setSpec({ ...side.spec, stage: { ...side.spec.stage, [slot]: n } })} />
    : <FullForm id={s.id} side={side} phone={phone} abTab={abTab} setAbTab={setAbTab} />);
  const section = (s) => {
    const full = isFull(s);
    const mob = s.id === 'mob' ? fs('mob')?.tag : null;
    return (
      <section key={s.id} id={`f-${s.id}`} data-sec={s.id} className={`plate fsec ${s.cls}${full ? ' full' : ''}${s.fullOnly && !full ? ' cl' : ''}`}>
        <h5>
          <span className="st">{s.title}{s.note && !full && <em className="h5n">{s.note}</em>}{mob && <span className="tg">{mob}</span>}</span>
          <button className="more" aria-expanded={full} onClick={() => setOpen(o => ({ ...o, [s.id]: !full }))}>{full ? 'Less' : 'More'}</button>
        </h5>
        <div className="sbody">{full ? fullBody(s) : s.fullOnly ? <Summary s={fs(s.id)} /> : <QuickBody id={s.id} side={side} />}</div>
        {searching && !full && <div className="fghost" aria-hidden="true" inert="">{fullBody(s)}</div>}
      </section>
    );
  };

  const find = (
    <label className="ffind">
      <span className="sr">Find a stat or move</span>
      <input value={q} placeholder={phone ? 'Find a stat or move' : 'Find a stat or move'} autoFocus={phone && findOpen}
        onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') { setQ(''); setFindOpen(false); } }} />
      <em ref={noRef} />
    </label>
  );
  return (
    <div className={`cols fpage${dock ? ' docked' : ''}`}>
      <div className={`art${quick && !phone ? ' qpon' : ''}${dock ? ' dock' : ''}`}>
        {dock || (quick && !phone ? quick : <FighterColumn side={side} ruleset={ruleset} setSpec={setSpec} openPicker={openPicker} />)}
        {phone && quick}
      </div>
      <div className="sheet" ref={root}>
        <div className="fhd">
          <Headline preview={preview} phone={phone} />
          {phone ? (
            <div className="fctl">
              {findOpen ? (
                <>{find}<button className="fbtn" onClick={() => { setQ(''); setFindOpen(false); }}>Close</button></>
              ) : (
                <>
                  <Modes value={depth} options={[['quick', 'Quick'], ['full', 'Full']]} onChange={setDepth} />
                  <PhoneSectionNav items={SECS} prefix="f-" onJump={jump} />
                  <button className="fbtn" onClick={() => setFindOpen(true)}>Find</button>
                </>
              )}
            </div>
          ) : (
            <div className="fctl">
              <Modes value={depth} options={[['quick', 'Quick'], ['full', 'Full']]} onChange={setDepth} />
              <nav className="fsnav" aria-label="Sections">
                {SECS.map(s => <button key={s.id} className={`${s.cls || 'tough'}${here === s.id ? ' on' : ''}`} onClick={() => jump(s.id)}><i />{s.title.replace('! Mode', '!')}</button>)}
              </nav>
              {find}
            </div>
          )}
        </div>
        {SECS.map(section)}
      </div>
    </div>
  );
}
