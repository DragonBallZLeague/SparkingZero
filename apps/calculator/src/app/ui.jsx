// Shared pieces: the breakdown (a popover with a mouse or keyboard, a bottom sheet on a phone), the
// tappable number that opens it, and small controls.
import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { breakdown, effectTiles } from './model.js';
import { F, delta } from './format.js';

export function useMedia(q) {
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const f = () => setM(mq.matches);
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, [q]);
  return m;
}
export const usePhone = () => useMedia('(max-width: 720px)');
/** Wider than a tablet (where Full stats can put sections side by side). */
export const useWide = () => useMedia('(min-width: 1101px)');

/* ------------------------------------------------------------------ the pair a number reads from */
/** { pair: {A, B}, base: {A, B} with no build, names: {A, B} } for the numbers inside. */
export const PairCtx = createContext(null);
export const usePair = () => useContext(PairCtx);

/* ------------------------------------------------------------------ the ruleset */
/** { rs, setRs, rulesets }: the ruleset is chosen where builds are made (the capsule rows and the capsule picker). */
export const RulesetCtx = createContext(null);
export function RulesetSelect() {
  const r = useContext(RulesetCtx);
  if (!r) return null;
  return (
    <label className="rsel" title="The capsule ruleset: budget, banned capsules and caps">
      <span className="sr">Ruleset</span>
      <select value={r.rs} onChange={(e) => r.setRs(e.target.value)}>
        {r.rulesets.map(x => <option key={x.name} value={x.name}>{x.name}</option>)}
      </select>
    </label>
  );
}

/* ------------------------------------------------------------------ breakdowns */
const BdCtx = createContext(null);

export function BreakdownHost({ children, resetKey }) {
  const phone = usePhone();
  const [open, setOpen] = useState(null); // { key, title, rect, pinned, content }
  // the numbers changed (a build, a view): close it rather than show stale parts
  useEffect(() => setOpen(null), [resetKey]);
  const ref = useRef(null);
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    if (!open || phone || !ref.current) { setPos(null); return; }
    const r = open.rect, w = ref.current.offsetWidth, h = ref.current.offsetHeight;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8);
    let top = r.bottom + 8;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8);
    setPos({ left, top });
  }, [open, phone]);
  useEffect(() => {
    if (!open) return;
    const k = (e) => { if (e.key === 'Escape') { open.anchor?.focus?.(); setOpen(null); } };
    const s = () => { if (!phone && !open.pinned) setOpen(null); };
    window.addEventListener('keydown', k);
    window.addEventListener('scroll', s, { passive: true });
    return () => { window.removeEventListener('keydown', k); window.removeEventListener('scroll', s); };
  }, [open, phone]);
  // a pinned popover follows its number when the page scrolls
  useEffect(() => {
    if (!open?.pinned || phone) return;
    const f = () => open.anchor && setOpen(o => o && { ...o, rect: o.anchor.getBoundingClientRect() });
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, [open?.pinned, open?.anchor, phone]);
  return (
    <BdCtx.Provider value={{ open, setOpen, phone }}>
      {children}
      {open && phone && <div className="dim fx-dim" onClick={() => setOpen(null)} />}
      {open && phone && (
        <div className="bsheet bd fx-sheet" role="dialog" aria-label={`${open.title} breakdown`}>
          <div className="pk-h"><b>{open.title}</b><button className="x" onClick={() => setOpen(null)}>Close</button></div>
          {open.content}
          <div className="hint">Tap another dotted number to switch. Tap outside to close.</div>
        </div>
      )}
      {open && !phone && (
        <div ref={ref} className="tip fx-tip" role="dialog" aria-label={`${open.title} breakdown`}
          style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}
          onMouseEnter={() => setOpen(o => o && { ...o, hoverTip: true })}
          onMouseLeave={() => setOpen(o => (o && !o.pinned ? null : o && { ...o, hoverTip: false }))}>
          <div className="th">{open.title}{open.pinned && <button className="x" onClick={() => { open.anchor?.focus?.(); setOpen(null); }}>Pinned ✕</button>}</div>
          <div className="tb">{open.content}</div>
        </div>
      )}
    </BdCtx.Provider>
  );
}

function effectLabel(effects) {
  const tiles = effectTiles(effects, { summed: true });
  const vals = [...new Set(tiles.map(t => t.value))];
  return vals.join(', ');
}

/** The rows of a breakdown: Base, each thing that changes it, then the value with this build. */
export function BreakdownRows({ bd, fmt, kind, names, extra, totalLabel = 'With this build' }) {
  return (
    <div>
      <div className="tr"><span>Base</span><span>{fmt(bd.base)}</span></div>
      {bd.rows.map((r, i) => (
        <div className="tr" key={i}>
          <span>{names && names.B && r.side === 'B' ? `${names.B}: ` : ''}{r.name}{r.effects.length > 0 && <small>{effectLabel(r.effects)}</small>}</span>
          <span>{delta(r.delta, kind)}</span>
        </div>
      ))}
      {!bd.rows.length && <div className="tr nb"><span>Nothing in this build changes it</span><span></span></div>}
      {bd.rows.length > 0 && <div className="tr t"><span>{totalLabel}</span><span>{fmt(bd.final)}</span></div>}
      {extra}
    </div>
  );
}

/**
 * A number that opens its breakdown: dotted, a Tab stop, Enter or Space opens and pins it, Esc closes;
 * with a mouse, hovering previews and clicking pins. `get(sides)` reads it from { A, B } (each with its view).
 */
export function Tap({ title, get, fmt = F.int, kind = 'int', lessIsBetter = false, mark = true, extra = null, className = '', children, as: As = 'b' }) {
  const ctx = useContext(BdCtx);
  const pc = usePair();
  const el = useRef(null);
  const hoverT = useRef(null);
  if (!pc) return <As className={className}>{children}</As>;
  let value = null, base = null;
  try { value = get(pc.pair); base = get(pc.base); } catch { /* a value a side doesn't have */ }
  const text = children ?? fmt(value);
  const changed = mark && typeof value === 'number' && typeof base === 'number' && Math.abs(value - base) > 1e-9;
  const better = changed && (lessIsBetter ? value < base : value > base);
  const key = title + '|' + text;
  const isOpen = ctx?.open?.key === key;
  const content = () => {
    const bd = breakdown(pc.pair, get);
    return <BreakdownRows bd={bd} fmt={fmt} kind={kind} names={pc.names} extra={typeof extra === 'function' ? extra(pc.pair) : extra} />;
  };
  const show = (pinned) => ctx.setOpen({ key, title, rect: el.current.getBoundingClientRect(), anchor: el.current, pinned, content: content() });
  const label = `${title}, ${text}${changed ? ` with this build, base ${fmt(base)}` : ''}. Breakdown`;
  return (
    <As ref={el} tabIndex={0} role="button" aria-expanded={isOpen} aria-label={label}
      className={`tap${changed ? (better ? ' up' : ' dn') : ''}${isOpen ? ' on' : ''} ${className}`.trim()}
      onClick={(e) => { e.stopPropagation(); if (isOpen && ctx.open.pinned) ctx.setOpen(null); else show(true); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (isOpen) ctx.setOpen(null); else show(true); } }}
      onMouseEnter={() => { if (ctx.phone || (ctx.open?.pinned)) return; clearTimeout(hoverT.current); hoverT.current = setTimeout(() => show(false), 180); }}
      onMouseLeave={() => { clearTimeout(hoverT.current); setTimeout(() => ctx.setOpen(o => (o && o.key === key && !o.pinned && !o.hoverTip ? null : o)), 120); }}>
      {text}
    </As>
  );
}

/** A value read from the pair's base (no build), for "Base 390" lines and the phone's Base column. */
export function useBase(get) {
  const pc = usePair();
  try { return pc ? get(pc.base) : null; } catch { return null; }
}
export function useValue(get) {
  const pc = usePair();
  try { return pc ? get(pc.pair) : null; } catch { return null; }
}

/** A number with "Base N" under it when the build changes it (Full stats' rows). */
export function Val({ get, fmt = F.int, ...rest }) {
  const v = useValue(get), b = useBase(get);
  const changed = typeof v === 'number' && typeof b === 'number' && Math.abs(v - b) > 1e-9;
  return <><Tap get={get} fmt={fmt} {...rest} />{changed && <small>Base {fmt(b)}</small>}</>;
}

/* ------------------------------------------------------------------ small controls */
export function Modes({ value, options, onChange, children }) {
  return (
    <div className="modes" role="tablist">
      {options.map(([k, label]) => (
        <button key={k} role="tab" aria-selected={value === k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>{label}</button>
      ))}
      {children}
    </div>
  );
}

export function Switch({ on, onChange, label, sp = false }) {
  return <button role="switch" aria-checked={on} aria-label={label} className={`sw${on ? ' on' : ''}${sp ? ' sp' : ''}`} onClick={() => onChange(!on)} />;
}

/** A name that wraps before its parenthesis (or its form name), the second part kept whole. */
export function Name({ parts, br = false }) {
  if (parts.length < 2) return <>{parts[0]}</>;
  return <>{parts[0]}{br ? <br /> : ' '}<span className="nw">{parts[1]}</span></>;
}

/** The roster bar under a stat: fills to where the character sits in the roster's range. */
export const Rk = ({ p, title }) => (p == null ? null : <i className="rk" style={{ '--p': `${Math.round(p * 100)}%` }} title={title} />);

export function Chev({ lit, kind }) {
  return <div className={`chev ${kind}`}>{Array.from({ length: 10 }, (_, i) => <i key={i} className={i < lit ? 'f' : ''} />)}</div>;
}

/**
 * A phone's section nav (Full stats, Compare's and Vs's All stats): a sticky bar naming the section being
 * read, which opens every section as a two-column grid; no sideways scrolling. `items`: [{ id, title, cls }],
 * each section's element id is prefix + id; `onJump(id)` scrolls to it; `extra` sits on the bar's right.
 */
export function PhoneSectionNav({ items, prefix, onJump, extra = null }) {
  const [here, setHere] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const f = () => {
      let at = null;
      for (const s of items) { const el = document.getElementById(prefix + s.id); if (el && el.getBoundingClientRect().top < 140) at = s.id; }
      setHere(at);
    };
    window.addEventListener('scroll', f, { passive: true });
    f();
    return () => window.removeEventListener('scroll', f);
  }, [items.map(s => s.id).join(), prefix]);
  const cur = items.find(s => s.id === here);
  const label = (s) => s.title.replace('! Mode', '!');
  return (
    <nav className={`fsnav ph${open ? ' open' : ''}`} aria-label="Sections">
      <button className={`cur ${cur?.cls || 'tough'}`} aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <i />{cur ? label(cur) : 'Sections'}<span className="chv">{open ? '▴' : '▾'}</span>
      </button>
      {extra}
      {open && (
        <div className="fsgrid">
          {items.map(s => <button key={s.id} className={`${s.cls || 'tough'}${here === s.id ? ' on' : ''}`} onClick={() => { setOpen(false); onJump(s.id); }}><i />{label(s)}</button>)}
        </div>
      )}
    </nav>
  );
}

/** A plate whose header folds it (Full stats); a closed plate keeps its headline numbers. */
export function Fold({ cls = '', title, extra = null, open, onToggle, summary, children, id, keepWidth = false }) {
  return (
    <div className={`plate ${cls}${open ? '' : ' cl'}`} id={id}>
      <h5>
        <button className="fold" aria-expanded={open} onClick={onToggle}>{title}{extra}<span className="chv" aria-hidden="true">{open ? '▾' : '▸'}</span></button>
      </h5>
      {open ? children : <div className="csum">{summary}</div>}
      {/* closed, it keeps its open width (the contents laid out at no height, hidden and inert), so folding a
          section never moves the others between lines */}
      {!open && keepWidth && <div className="fghost" aria-hidden="true" inert="">{children}</div>}
    </div>
  );
}
