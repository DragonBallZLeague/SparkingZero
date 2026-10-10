// Shared demo pieces: the breakdown popover (a bottom sheet on a phone), tappable numbers,
// chip menus, the segmented control, portraits and class badges.
import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { STAT, valueOf } from './stats.js';

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
export const usePhone = () => useMedia('(max-width: 639px)');

/* ---------- breakdown popover ---------- */
const BreakdownCtx = createContext(() => {});
export const useBreakdown = () => useContext(BreakdownCtx);

export function BreakdownHost({ children }) {
  const [open, setOpen] = useState(null); // { rect, title, sub, rows }
  const phone = usePhone();
  const ref = useRef(null);
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    if (!open || phone || !ref.current) return;
    const r = open.rect, w = ref.current.offsetWidth, h = ref.current.offsetHeight;
    let left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8);
    let top = r.bottom + 6;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
    setPos({ left, top });
  }, [open, phone]);
  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === 'Escape' && setOpen(null);
    const s = () => !phone && setOpen(null);
    window.addEventListener('keydown', k);
    window.addEventListener('scroll', s, { passive: true });
    return () => { window.removeEventListener('keydown', k); window.removeEventListener('scroll', s); };
  }, [open, phone]);
  return (
    <BreakdownCtx.Provider value={setOpen}>
      {children}
      {open && (
        <>
          <div className={`backdrop${phone ? ' dim' : ''}`} onClick={() => setOpen(null)} />
          <div ref={ref} role="dialog" aria-label={open.title} className={phone ? 'sheet' : 'pop bd-pop'}
            style={phone ? undefined : { left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}>
            {phone && <div className="sheet-grip" />}
            <div className="bd-title">{open.title}{open.sub && <span>{open.sub}</span>}</div>
            <table className="bd">
              <tbody>
                {open.rows.map(([part, value, source, total], i) => (
                  <tr key={i} className={total ? 'total' : ''}>
                    <td>{part}</td>
                    <td className="num">{value}</td>
                    <td className="src">{source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {phone && <button className="pop-done" onClick={() => setOpen(null)}>Done</button>}
          </div>
        </>
      )}
    </BreakdownCtx.Provider>
  );
}

/**
 * A number that opens its breakdown. `stat` is a STAT key; `ctx` = { c, side, view }.
 * `base` (a view) marks it changed when it differs. `rows` overrides the stat's own breakdown.
 */
export function Num({ stat, ctx, base, className = '', rows, title, children, valueOverride }) {
  const open = useBreakdown();
  const def = STAT[stat];
  const v = valueOverride !== undefined ? valueOverride : valueOf(stat, ctx.view);
  const changed = base && valueOf(stat, base) !== v;
  const text = children ?? (def ? def.fmt(v) : String(v ?? '—'));
  return (
    <button type="button" className={`numbtn${changed ? ' changed' : ''} ${className}`}
      onClick={(e) => open({
        rect: e.currentTarget.getBoundingClientRect(),
        title: title || def?.label || stat,
        sub: ctx.c?.name,
        rows: rows || def.explain(ctx.c, ctx.side, ctx.view),
      })}>
      {text}
    </button>
  );
}

/** Opens any breakdown rows (moves, skills). */
export function Explain({ title, sub, rows, className = '', children }) {
  const open = useBreakdown();
  return (
    <button type="button" className={`numbtn ${className}`}
      onClick={(e) => open({ rect: e.currentTarget.getBoundingClientRect(), title, sub, rows })}>
      {children}
    </button>
  );
}

/* ---------- segmented control ---------- */
export function Seg({ options, value, onChange, small }) {
  return (
    <div className={`seg${small ? ' small' : ''}`} role="group">
      {options.map(([v, label]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>{label}</button>
      ))}
    </div>
  );
}

/* ---------- chip menu (multi or single select) ---------- */
export function ChipMenu({ label, options, selected, onChange, multi = true, search = false, render }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const btn = useRef(null);
  const phone = usePhone();
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    if (open && !phone && btn.current) {
      const r = btn.current.getBoundingClientRect();
      setPos({ left: Math.min(r.left, window.innerWidth - 330), top: r.bottom + 6 });
    }
  }, [open, phone]);
  const set = multi ? selected : (selected ? [selected] : []);
  const shown = options.filter(([, l]) => !q || l.toLowerCase().includes(q.toLowerCase()));
  const toggle = (v) => {
    if (!multi) { onChange(v === selected ? null : v); setOpen(false); return; }
    onChange(set.includes(v) ? set.filter(x => x !== v) : [...set, v]);
  };
  const summary = !set.length ? label : set.length === 1 ? (options.find(([v]) => v === set[0])?.[1] ?? label) : `${label} · ${set.length}`;
  return (
    <>
      <button ref={btn} type="button" className={`chip${set.length ? ' set' : ''}`} onClick={() => setOpen(true)}>
        {summary}
        <svg viewBox="0 0 10 10"><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
      </button>
      {open && (
        <>
          <div className={`backdrop${phone ? ' dim' : ''}`} onClick={() => { setOpen(false); setQ(''); }} />
          <div className={phone ? 'sheet' : 'pop'} style={phone ? undefined : { left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}>
            {phone && <div className="sheet-grip" />}
            {phone && <div className="sheet-title">{label}{set.length > 0 && <button className="linkbtn" onClick={() => onChange(multi ? [] : null)}>Clear</button>}</div>}
            {search && <input className="pop-search" placeholder="Search" value={q} autoFocus={!phone} onChange={e => setQ(e.target.value)} />}
            {shown.map(([v, l, extra]) => (
              <button key={v} type="button" className="opt" role={multi ? 'menuitemcheckbox' : 'menuitemradio'} aria-checked={set.includes(v)} onClick={() => toggle(v)}>
                {multi ? <span className="box">{set.includes(v) ? '✓' : ''}</span> : <span className="tick">{set.includes(v) ? '✓' : ''}</span>}
                {render ? render(v, l) : <span>{l}</span>}
                {extra != null && <span className="cnt">{extra}</span>}
              </button>
            ))}
            {!phone && set.length > 0 && multi && <button className="opt clear" onClick={() => onChange([])}>Clear</button>}
            {phone && <button className="pop-done" onClick={() => { setOpen(false); setQ(''); }}>Done</button>}
          </div>
        </>
      )}
    </>
  );
}

/* ---------- portraits and badges ---------- */
export function Portrait({ id, size = 34, radius = 8 }) {
  const [bad, setBad] = useState(false);
  return bad
    ? <span className="pt" style={{ width: size, height: size, borderRadius: radius }} />
    : <img className="pt" src={`../../../analyzer/public/portraits/${id}.webp`} alt="" loading="lazy"
        style={{ width: size, height: size, borderRadius: radius }} onError={() => setBad(true)} />;
}

const CLASS_HUE = {
  'Normal': '#3b82f6', 'Super Saiyan': '#eab308', 'Super Saiyan (Vegeta)': '#facc15', 'Ki-Blast': '#a855f7', 'Ki-Blast (Vegeta)': '#c084fc',
  'Power': '#ef4444', 'Villain': '#818cf8', 'Fusion': '#0ea5e9', 'Almighty': '#f97316', 'Almighty (Vegeta)': '#fb923c', 'Rival': '#10b981',
  'Secret': '#ec4899', 'Skill-User': '#94a3b8', 'Skill-User (Yajirobe)': '#94a3b8', 'Skill-User (Mr. Satan)': '#a8a29e', 'Speed': '#06b6d4',
  'God': '#fbbf24', 'Giant': '#b45309', 'Legendary Super Saiyan': '#16a34a', 'Infinite Ki Android (Normal)': '#6366f1',
  'Infinite Ki Android (Ki-Blast)': '#7e22ce', 'Infinite Ki Android (Power)': '#be123c', 'Ki Drain Android (Normal)': '#64748b', 'Ki Drain Android (Power)': '#e11d48',
};
export const classHue = (label) => CLASS_HUE[label] || '#64748b';
export function ClassBadge({ label }) {
  const h = classHue(label);
  return <span className="cls" style={{ color: h, borderColor: h + '66', background: h + '1a' }}>{label}</span>;
}

export function Ki({ bars }) {
  return <span className="ki">{bars == null ? '—' : `${+bars.toFixed(2)}`}<em> bars</em></span>;
}
