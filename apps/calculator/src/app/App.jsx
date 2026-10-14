// The app's shell: the site's shared bar, the view tabs under it (Characters, Fighter, Versus), the phone's tab
// bar, the quick fighter list, the capsule picker (docked beside the numbers on a wide screen, a bottom sheet
// otherwise), and the state in the address (links.js). Built to the demo the league signed off on 2026-10-13.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { evaluatePair, emptySpec, rulesetOf, meta, baseView, buildCheck, links, characters, capsules, byId } from './model.js';
import { readLink, writeLink } from '../links.js';
import { decodeBuild, makeResolver } from '../utils/shareLink.js';
import { BreakdownHost, PairCtx, RulesetCtx, usePhone, useWide } from './ui.jsx';
import { FighterView, BuildDelta } from './fighter.jsx';
import { VersusView } from './versus.jsx';
import { SkillSwitches } from './sheet.jsx';
import { CharacterPicker, CapsulePicker, QuickPick } from './pickers.jsx';
import { NavBar } from '@szl/ui';
import './sheet.css';
import './app.css';

// one label per view on every width (the phone's bar once said Roster)
const TABS = [['roster', 'Characters'], ['fighter', 'Fighter'], ['versus', 'Versus']];

class Boundary extends React.Component {
  constructor(p) { super(p); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidUpdate(prev) { if (prev.at !== this.props.at && this.state.error) this.setState({ error: null }); }
  render() {
    if (!this.state.error) return this.props.children;
    return <div className="plate" style={{ margin: 18 }}><h5>This view failed</h5><pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{String(this.state.error.stack || this.state.error)}</pre></div>;
  }
}

/**
 * Copies the page's link, which carries everything on screen (the view, both fighters, builds, conditions);
 * on a phone, its share sheet when it has one.
 */
function CopyLink({ phone = false }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    const url = location.href;
    try {
      if (phone && navigator.share) { await navigator.share({ title: 'Character Calculator', url }); return; }
      await navigator.clipboard.writeText(url);
    } catch (e) {
      if (e?.name === 'AbortError') return; // the share sheet was closed
      // no clipboard access (an older browser, a page opened from a file)
      const t = document.createElement('textarea');
      t.value = url; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); } catch { /* nothing more to try */ }
      t.remove();
    }
    setDone(true); setTimeout(() => setDone(false), 1600);
  };
  return <button type="button" className={`cplink${done ? ' ok' : ''}`} onClick={copy} title="Copy a link to this page, builds and all">{done ? 'Copied' : phone ? 'Share' : 'Copy link'}</button>;
}

/** The no-build version of a pair, for marking changed numbers and starting breakdowns. */
function basePairOf(pair) {
  const b = (s) => s && { ...s, view: baseView(s.c.id), applied: [] };
  return { A: b(pair.A), B: b(pair.B) };
}

const BASE = import.meta.env.BASE_URL;
// the fighters a view starts with when the address names none (the Fighter and Versus tabs from Characters)
const DEFAULT_A = '0000_00', DEFAULT_B = '0040_00';

/** The state the address describes; a side it doesn't name keeps the one on screen (prev) or the default. */
function fromAddress(prev) {
  const path = location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) : '';
  const r = readLink(path, location.search, links);
  return {
    view: r.view,
    A: r.A || prev?.A || emptySpec(DEFAULT_A),
    B: r.B || prev?.B || emptySpec(DEFAULT_B),
    rs: r.rs, d: r.d, vl: r.vl,
  };
}

/**
 * An old share link (#<base64>: the live calculator's, and the website Teams page's, which name the fighter) as a
 * state, or null. Its opponent was the old Opponent panel, so it opens on Versus's Matchup.
 */
function fromOldLink() {
  const hash = location.hash.slice(1);
  if (!hash || hash.startsWith('/')) return null;
  const d = decodeBuild(hash, makeResolver(characters, capsules));
  if (!d?.character || !byId.has(d.character.id)) return null;
  if (d.notices.length) console.warn('Share link:', d.notices.join('; '));
  const side = (c, caps) => ({ ...emptySpec(c.id), caps: (caps || []).filter(Boolean).map(x => x.id) });
  const A = side(d.character, d.capsules);
  const B = d.opponent && byId.has(d.opponent.id) ? side(d.opponent, d.opponentCapsules) : null;
  return { view: B ? 'versus' : 'fighter', A, B: B || emptySpec(DEFAULT_B), rs: meta.defaultRuleset, d: 'quick', vl: B ? 'match' : 'side' };
}

const addressOf = (st) => BASE + writeLink(st, links);

function titleOf(st) {
  const name = (id) => byId.get(id)?.name;
  if (st.view === 'fighter') return `${name(st.A.id)} | Character Calculator`;
  if (st.view === 'versus') return `${name(st.A.id)} vs ${name(st.B.id)} | Character Calculator`;
  return 'Character Calculator';
}

function initialState() {
  const old = fromOldLink();
  const st = old || fromAddress(null);
  // old links and unknown fighters are rewritten to the address of what is shown
  const url = addressOf(st);
  if (old || location.pathname + location.search !== url) history.replaceState(null, '', url);
  return st;
}

function App() {
  const [st, setSt] = useState(initialState);
  const [overlay, setOverlay] = useState(null); // { kind: 'caps', side: 'A' | 'B' }: the capsule picker open for a side
  const [quick, setQuick] = useState(null);     // the quick list open on side 'A' | 'B'
  const closeQuick = useCallback(() => setQuick(null), []);
  const phone = usePhone();
  const wide = useWide();
  const stRef = useRef(st);
  stRef.current = st;
  useEffect(() => {
    // Back and Forward: the address holds the view and what it shows; sides it doesn't name stay as they were
    const f = () => { setOverlay(null); setQuick(null); setSt(fromAddress(stRef.current)); };
    // an old link pasted into a tab already on the calculator only changes the hash
    const old = () => {
      const s = fromOldLink();
      if (!s) return;
      history.replaceState(null, '', addressOf(s));
      setOverlay(null); setQuick(null); setSt(s);
    };
    window.addEventListener('popstate', f);
    window.addEventListener('hashchange', old);
    return () => { window.removeEventListener('popstate', f); window.removeEventListener('hashchange', old); };
  }, []);
  useEffect(() => { document.title = titleOf(st); }, [st.view, st.A.id, st.B.id]);
  // a different page (another view or fighter) adds a history entry, so Back returns to it; changing what a page
  // shows (capsules, skills, conditions, the switches) replaces it
  const update = (patch, push = false) => {
    const next = { ...st, ...patch };
    const url = addressOf(next);
    const page = (s) => s.view + (s.view === 'roster' ? '' : s.A.id) + (s.view === 'versus' ? s.B.id : '');
    if (push || page(next) !== page(st)) history.pushState(null, '', url);
    else history.replaceState(null, '', url);
    setSt(next);
  };
  const go = (view, patch = {}) => { update({ view, ...patch }, true); setOverlay(null); setQuick(null); window.scrollTo(0, 0); };
  const setSpec = (k) => (spec) => update({ [k]: spec });
  const fighter = (side, id) => ({ ...emptySpec(id), caps: st[side].caps });
  const resetSits = () => update({ A: { ...st.A, sit: null }, B: { ...st.B, sit: null } });
  const ruleset = rulesetOf(st.rs);
  const two = st.view === 'versus';
  const match = two && st.vl === 'match';
  const pair = useMemo(() => evaluatePair(st.A, two ? st.B : null, { exchange: match }), [st.A, st.B, two, match]);
  const ctx = { pair, base: basePairOf(pair), names: { A: pair.A.c.name, B: pair.B?.c.name } };
  // 'char' opens the quick list where the fighter is shown; 'caps' the capsule picker, beside the numbers
  // the button clicked to open or close the docked picker is swapped out with the column's content; if it still has
  // focus when it goes, the browser scrolls the page to the top, so let go of focus first
  const letGo = () => document.activeElement?.blur?.();
  const openPicker = (kind, side) => {
    if (kind === 'char') { setQuick(q => (q === side ? null : side)); return; }
    letGo();
    setOverlay({ kind, side }); setQuick(null);
    // as a bottom sheet, bring the Fighter page's numbers (its pinned headline strip) above it
    if (!wide && st.view === 'fighter') {
      const sh = document.querySelector('.fpage .sheet');
      if (sh && sh.getBoundingClientRect().top > 0) window.scrollTo({ top: sh.getBoundingClientRect().top + window.scrollY - parseFloat(getComputedStyle(sh.querySelector('.fhd')).top) });
    }
  };
  const closeCaps = () => { letGo(); setOverlay(null); };
  /** The quick list for a side, when it is open there (the views place it). */
  const qp = (side, mode = 'dd') => (quick === side ? (
    <QuickPick current={st[side].id} side={side} mode={phone ? 'sheet' : mode} onClose={closeQuick} onBrowse={() => go('roster')}
      title={side === 'B' ? (match ? 'Change opponent' : 'Change the right side') : 'Change fighter'}
      onPick={(id, keep) => { if (id !== st[side].id) update({ [side]: fighter(side, id) }); if (!keep) setQuick(null); }} />
  ) : null);

  const capsSide = overlay?.kind === 'caps' && st.view !== 'roster' && pair[overlay.side] ? overlay.side : null;
  const picker = (side, mode) => <CapsulePicker side={pair[side]} ruleset={ruleset} onClose={closeCaps} onChange={setSpec(side)} who={side} mode={mode} />;
  const setDepth = (d) => update({ d });

  let page;
  if (st.view === 'roster') {
    page = <CharacterPicker current={st.A.id} side="A" view="roster" onPick={(id) => go('fighter', { A: fighter('A', id) })}
      onCompare={(id) => go('versus', { B: emptySpec(id), vl: 'side' })} onVs={(id) => go('versus', { B: emptySpec(id), vl: 'match' })} />;
  } else if (two) {
    page = <VersusView pair={pair} lens={st.vl} setLens={(vl) => update({ vl })} depth={st.d} setDepth={setDepth} setSpec={setSpec} openPicker={openPicker} qp={qp}
      ruleset={ruleset} resetSits={resetSits} onSwap={() => { setOverlay(null); setQuick(null); update({ A: st.B, B: st.A }); }} swapIn={(id) => update({ B: { ...emptySpec(id) }, vl: 'side' })} docks={wide && capsSide ? { [capsSide]: picker(capsSide, 'dock') } : {}} />;
  } else {
    page = <FighterView A={pair.A} ruleset={ruleset} setSpec={setSpec('A')} openPicker={openPicker} qp={qp} depth={st.d} setDepth={setDepth}
      dock={wide && capsSide === 'A' ? picker('A', 'dock') : null} onForm={(id) => update({ A: fighter('A', id) })} />;
  }
  // narrower than a wide screen: the picker is a bottom sheet over the lower part of the page, with the
  // skills and Sparking and what the build changed on top, so the numbers above stay in view
  const sheetSide = !wide && capsSide;
  const chk = buildCheck(st.A.caps, ruleset);

  return (
    <BreakdownHost resetKey={st.view + addressOf(st) + (overlay ? overlay.kind : '')}>
      <PairCtx.Provider value={ctx}>
      <RulesetCtx.Provider value={{ rs: st.rs, setRs: (rs) => update({ rs }), rulesets: meta.rulesets }}>
        {/* the site's shared bar (packages/ui) carries the page title; the calculator's own bar under it is
            just the view tabs (on a phone they are at the bottom). The ruleset is picked where builds are made. */}
        <NavBar current="calculator" title="Character Calculator" />
        <div className={`B app${phone ? ' ph' : ''}${two && wide ? ' vw' : ''}${sheetSide ? ' lsopen' : ''}`}>
          {!phone && (
            <div className="top">
              <div className="tabs" role="tablist">
                {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={st.view === k} className={st.view === k ? 'on' : ''} onClick={() => go(k)}>{l}</button>)}
              </div>
              <CopyLink />
            </div>
          )}
          <main><Boundary at={st.view}>{page}</Boundary></main>
          {/* the old calculator's credit, kept (the league, 2026-10-13): the one place the UI names a data source */}
          <footer className="credit">
            <a href="https://discord.gg/RgpaPb6jbz" target="_blank" rel="noopener noreferrer" title="Kame House Discord">
              <span>Data gathered in collaboration with</span><b>Kame House</b>
              <img src={`${import.meta.env.BASE_URL}general_imgs/KameHouseIcon.png`} alt="" />
            </a>
          </footer>
          {sheetSide && (
            <div className="lsheet" role="dialog" aria-label="Loadout">
              <div className="lsh"><b>Loadout</b><small>{pair[sheetSide].c.name}</small><button className="x" onClick={closeCaps}>Done</button></div>
              <BuildDelta side={pair[sheetSide]} base={ctx.base[sheetSide]} />
              <div className="lsb">
                <div className="lsk"><SkillSwitches side={pair[sheetSide]} onChange={setSpec(sheetSide)} /></div>
                {picker(sheetSide, 'sheet')}
              </div>
            </div>
          )}
          {phone && st.view === 'fighter' && !sheetSide && (
            <button className="lobar" onClick={() => openPicker('caps', 'A')}>
              <b>Loadout</b><span>{chk.caps.length ? `${chk.caps.length} capsule${chk.caps.length === 1 ? '' : 's'}, ${chk.cost} of ${ruleset.totalCost}` : 'No capsules'}{st.A.sparking ? ', Sparking!' : ''}</span><i>Edit</i>
            </button>
          )}
          {phone && (
            <nav className="phtabs">
              {TABS.map(([k, l]) => <button key={k} className={st.view === k ? 'on' : ''} onClick={() => go(k)}>{l}</button>)}
              <CopyLink phone />
            </nav>
          )}
        </div>
      </RulesetCtx.Provider>
      </PairCtx.Provider>
    </BreakdownHost>
  );
}

export default App;
