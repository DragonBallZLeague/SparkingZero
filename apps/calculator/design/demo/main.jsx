// The demo shell: the site's shared bar, the view tabs under it (Characters, Fighter, Versus; round 23), the
// phone's tab bar, the quick fighter list, the capsule picker (docked beside the numbers on a wide screen, a
// bottom sheet otherwise), and the state in the URL. See README.md.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { evaluatePair, evaluate, emptySpec, rulesetOf, meta, baseView, buildCheck } from './model.js';
import { parse, serialize } from './state.js';
import { BreakdownHost, PairCtx, RulesetCtx, usePhone, useWide } from './ui.jsx';
import { FighterView, BuildDelta } from './fighter.jsx';
import { VersusView } from './versus.jsx';
import { SkillSwitches } from './sheet.jsx';
import { CharacterPicker, CapsulePicker, QuickPick } from './pickers.jsx';
import { NavBar } from '../../../../packages/ui/src/index.js';

const TABS = [['roster', 'Characters', 'Roster'], ['fighter', 'Fighter', 'Fighter'], ['versus', 'Versus', 'Versus']];

class Boundary extends React.Component {
  constructor(p) { super(p); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidUpdate(prev) { if (prev.at !== this.props.at && this.state.error) this.setState({ error: null }); }
  render() {
    if (!this.state.error) return this.props.children;
    return <div className="plate" style={{ margin: 18 }}><h5>This view failed</h5><pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{String(this.state.error.stack || this.state.error)}</pre></div>;
  }
}

/** The no-build version of a pair, for marking changed numbers and starting breakdowns. */
function basePairOf(pair) {
  const b = (s) => s && { ...s, view: baseView(s.c.id), applied: [] };
  return { A: b(pair.A), B: b(pair.B) };
}

function App() {
  const [st, setSt] = useState(parse);
  const [overlay, setOverlay] = useState(null); // { kind: 'caps', side: 'A' | 'B' }: the capsule picker open for a side
  const [quick, setQuick] = useState(null);     // the quick list open on side 'A' | 'B'
  const [hov, setHov] = useState(null);         // the capsule under the pointer in the open picker
  const closeQuick = useCallback(() => setQuick(null), []);
  const phone = usePhone();
  const wide = useWide();
  useEffect(() => {
    const f = () => setSt(parse());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  const update = (patch, push = false) => {
    const next = { ...st, ...patch };
    if (push) location.hash = serialize(next).slice(1);
    else history.replaceState(null, '', serialize(next));
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
  const openPicker = (kind, side) => {
    if (kind === 'char') { setQuick(q => (q === side ? null : side)); return; }
    setOverlay({ kind, side }); setQuick(null); setHov(null);
    // as a bottom sheet, bring the Fighter page's numbers (its pinned headline strip) above it
    if (!wide && st.view === 'fighter') {
      const sh = document.querySelector('.fpage .sheet');
      if (sh && sh.getBoundingClientRect().top > 0) window.scrollTo({ top: sh.getBoundingClientRect().top + window.scrollY - parseFloat(getComputedStyle(sh.querySelector('.fhd')).top) });
    }
  };
  const closeCaps = () => { setOverlay(null); setHov(null); };
  /** The quick list for a side, when it is open there (the views place it). */
  const qp = (side, mode = 'dd') => (quick === side ? (
    <QuickPick current={st[side].id} side={side} mode={phone ? 'sheet' : mode} onClose={closeQuick} onBrowse={() => go('roster')}
      title={side === 'B' ? (match ? 'Change opponent' : 'Change the right side') : 'Change fighter'}
      onPick={(id, keep) => { if (id !== st[side].id) update({ [side]: fighter(side, id) }); if (!keep) setQuick(null); }} />
  ) : null);

  const capsSide = overlay?.kind === 'caps' && st.view !== 'roster' && pair[overlay.side] ? overlay.side : null;
  const picker = (side, mode) => <CapsulePicker side={pair[side]} ruleset={ruleset} onClose={closeCaps} onChange={setSpec(side)} who={side} mode={mode} onHover={setHov} />;
  // the hovered capsule's effect on the Fighter page's headline numbers
  const preview = useMemo(() => (capsSide === 'A' && hov && !st.A.caps.includes(hov) && !two ? evaluate({ ...st.A, caps: [...st.A.caps, hov] }).view : null), [capsSide, hov, st.A, two]);
  const setDepth = (d) => update({ d });

  let page;
  if (st.view === 'roster') {
    page = <CharacterPicker current={st.A.id} side="A" view="roster" onPick={(id) => go('fighter', { A: fighter('A', id) })}
      onCompare={(id) => go('versus', { B: emptySpec(id), vl: 'side' })} onVs={(id) => go('versus', { B: emptySpec(id), vl: 'match' })} />;
  } else if (two) {
    page = <VersusView pair={pair} lens={st.vl} setLens={(vl) => update({ vl })} depth={st.d} setDepth={setDepth} setSpec={setSpec} openPicker={openPicker} qp={qp}
      ruleset={ruleset} resetSits={resetSits} swapIn={(id) => update({ B: { ...emptySpec(id) }, vl: 'side' })} docks={wide && capsSide ? { [capsSide]: picker(capsSide, 'dock') } : {}} />;
  } else {
    page = <FighterView A={pair.A} ruleset={ruleset} setSpec={setSpec('A')} openPicker={openPicker} qp={qp} depth={st.d} setDepth={setDepth}
      dock={wide && capsSide === 'A' ? picker('A', 'dock') : null} preview={preview} onForm={(id) => update({ A: fighter('A', id) })} editing={capsSide === 'A'} />;
  }
  // narrower than a wide screen: the picker is a bottom sheet over the lower part of the page, with the
  // skills and Sparking and what the build changed on top, so the numbers above stay in view
  const sheetSide = !wide && capsSide;
  const chk = buildCheck(st.A.caps, ruleset);

  return (
    <BreakdownHost resetKey={serialize(st) + (overlay ? overlay.kind : '')}>
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
            </div>
          )}
          <main><Boundary at={st.view}>{page}</Boundary></main>
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
              {TABS.map(([k, , s]) => <button key={k} className={st.view === k ? 'on' : ''} onClick={() => go(k)}>{s}</button>)}
            </nav>
          )}
        </div>
      </RulesetCtx.Provider>
      </PairCtx.Provider>
    </BreakdownHost>
  );
}

document.title = 'Calculator demo';
createRoot(document.getElementById('root')).render(<App />);
