// Number formats, in the league's wording: "per", never "a"; defenses as + (takes less) or − (takes more).
const n = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? (+v.toFixed(d)).toLocaleString('en-US', { maximumFractionDigits: d }) : '');

/** "bar" when the number as shown is exactly 1, else "bars". */
export const barUnit = (shown) => (String(shown).replace(/<[^>]*>/g, '').trim() === '1' ? 'bar' : 'bars');
/** ki in bars with its unit: "1 bar", "2.5 bars" */
export const barsText = (v, d = 2) => { const s = n(v, d); return `${s} ${barUnit(s)}`; };

export const F = {
  int: (v) => n(Math.round(v ?? NaN)),
  dec: (v) => n(v, 3),
  dec2: (v) => (typeof v === 'number' ? v.toFixed(2) : ''),
  bars: (v) => n(v, 3),
  secs: (v) => (typeof v === 'number' ? `${n(v, 2)}s` : ''),
  s1: (v) => (typeof v === 'number' ? `${v.toFixed(1)}s` : ''),
  hits: (v) => (typeof v === 'number' ? `${v} hit${v === 1 ? '' : 's'}` : ''),
  count: (v) => (v == null ? '' : v >= 999 ? 'No limit' : String(v)),
  /** a damage-taken multiplier: 0.9 takes 10% less = "+10%"; 1 = "Base" */
  def: (v) => {
    if (typeof v !== 'number') return '';
    const p = +((1 - v) * 100).toFixed(1);
    return Math.abs(p) < 0.05 ? 'Base' : `${p > 0 ? '+' : '−'}${Math.abs(p)}%`;
  },
  armor: (v) => (v > 0 ? `${Math.round(v * 100)}%` : 'None'),
  yes: (v) => (v ? 'Yes' : 'No'),
  pct: (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(+(v * 100).toFixed(1))}%`,
  /** a change against the usual (Sparking's charge speed and duration): 0 = "Normal", 0.2 = "+20%" */
  rel: (v) => (typeof v !== 'number' ? '' : Math.abs(v) < 0.0005 ? 'Normal' : `${v > 0 ? '+' : '−'}${Math.abs(+(v * 100).toFixed(1))}%`),
};

/** A part of a breakdown: "+63", "−5%". */
export function delta(v, kind = 'int') {
  if (typeof v !== 'number') return '';
  const sign = v > 0 ? '+' : v < 0 ? '−' : '';
  if (kind === 'def' || kind === 'rel') return `${sign}${Math.abs(+(v * 100).toFixed(1))}%`;
  if (kind === 'int') return `${sign}${Math.abs(Math.round(v)).toLocaleString('en-US')}`;
  return `${sign}${Math.abs(+v.toFixed(3))}`;
}
