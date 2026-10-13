// The demo shell: the site's shared bar, the view tabs under it, the phone's tab bar, the pickers as
// overlays, and the state in the URL. See README.md.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { evaluatePair, evaluate, emptySpec, rulesetOf, meta, baseView } from './model.js';
import { parse, serialize } from './state.js';
import { BreakdownHost, PairCtx, RulesetCtx, usePhone } from './ui.jsx';
import { SheetView } from './sheet.jsx';
import { FullStatsView } from './fullstats.jsx';
import { CompareView } from './compare.jsx';
import { VersusView } from './versus.jsx';
import { CharacterPicker, CapsulePicker, QuickPick } from './pickers.jsx';
import { NavBar } from '../../../../packages/ui/src/index.js';

const TABS = [['roster', 'Characters', 'Roster'], ['sheet', 'Sheet', 'Sheet'], ['stats', 'Full stats', 'Stats'], ['compare', 'Compare', 'Compare'], ['vs', 'Vs opponent', 'Vs']];

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
  const [overlay, setOverlay] = useState(null); // { kind: 'caps', side: 'A' | 'B' }
  const [quick, setQuick] = useState(null);     // the quick list open on side 'A' | 'B'
  const closeQuick = useCallback(() => setQuick(null), []);
  const phone = usePhone();
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
  const exchange = st.view === 'vs';
  const pair = useMemo(() => evaluatePair(st.A, st.view === 'compare' || st.view === 'vs' ? st.B : null, { exchange }), [st.A, st.B, st.view]);
  const ctx = { pair, base: basePairOf(pair), names: { A: pair.A.c.name, B: pair.B?.c.name } };
  // 'char' opens the quick list where the fighter is shown; 'caps' opens the capsule picker
  const openPicker = (kind, side) => {
    if (kind === 'char') { setQuick(q => (q === side ? null : side)); return; }
    setOverlay({ kind, side }); setQuick(null); window.scrollTo(0, 0);
  };
  /** The quick list for a side, when it is open there (the views place it). */
  const qp = (side, mode = 'dd') => (quick === side ? (
    <QuickPick current={st[side].id} side={side} mode={phone ? 'sheet' : mode} onClose={closeQuick} onBrowse={() => go('roster')}
      title={side === 'B' ? (st.view === 'vs' ? 'Change opponent' : 'Change the right side') : 'Change fighter'}
      onPick={(id, keep) => { if (id !== st[side].id) update({ [side]: fighter(side, id) }); if (!keep) setQuick(null); }} />
  ) : null);

  let page;
  if (overlay?.kind === 'caps') {
    const side = evaluate(st[overlay.side]);
    page = <CapsulePicker side={side} ruleset={ruleset} onClose={() => setOverlay(null)} onChange={setSpec(overlay.side)} who={overlay.side} />;
  } else if (st.view === 'roster') {
    page = <CharacterPicker current={st.A.id} side="A" view="roster" onPick={(id) => go('sheet', { A: fighter('A', id) })}
      onCompare={(id) => go('compare', { B: emptySpec(id) })} onVs={(id) => go('vs', { B: emptySpec(id) })} />;
  } else if (st.view === 'stats') page = <FullStatsView A={pair.A} ruleset={ruleset} setSpec={setSpec('A')} openPicker={openPicker} qp={qp} />;
  else if (st.view === 'compare') page = <CompareView pair={pair} mode={st.cm} setMode={(cm) => update({ cm })} setSpec={setSpec} openPicker={openPicker} qp={qp} ruleset={ruleset} resetSits={resetSits} swapIn={(id) => update({ B: { ...emptySpec(id) } })} />;
  else if (st.view === 'vs') page = <VersusView pair={pair} mode={st.vm} setMode={(vm) => update({ vm })} setSpec={setSpec} openPicker={openPicker} qp={qp} ruleset={ruleset} resetSits={resetSits} />;
  else page = <SheetView A={pair.A} ruleset={ruleset} setSpec={setSpec('A')} openPicker={openPicker} qp={qp} />;

  return (
    <BreakdownHost resetKey={serialize(st) + (overlay ? overlay.kind : '')}>
      <PairCtx.Provider value={ctx}>
      <RulesetCtx.Provider value={{ rs: st.rs, setRs: (rs) => update({ rs }), rulesets: meta.rulesets }}>
        {/* the site's shared bar (packages/ui) carries the page title; the calculator's own bar under it is
            just the view tabs (on a phone they are at the bottom). The ruleset is picked where builds are made. */}
        <NavBar current="calculator" title="Character Calculator" />
        <div className={`B app${phone ? ' ph' : ''}`}>
          {!phone && (
            <div className="top">
              <div className="tabs" role="tablist">
                {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={st.view === k} className={st.view === k && !overlay ? 'on' : ''} onClick={() => go(k)}>{l}</button>)}
              </div>
            </div>
          )}
          <main><Boundary at={st.view + (overlay?.kind || '')}>{page}</Boundary></main>
          {phone && (
            <nav className="phtabs">
              {TABS.map(([k, , s]) => <button key={k} className={st.view === k && !overlay ? 'on' : ''} onClick={() => go(k)}>{s}</button>)}
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
