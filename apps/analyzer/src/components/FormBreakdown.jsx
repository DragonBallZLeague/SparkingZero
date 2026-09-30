import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Portrait from './Portrait.jsx';

/**
 * A character's forms, side by side: a timeline of how long it spent in each,
 * the forms in the order it took them, and, opened from the "Show figures"
 * toggle, a row per figure with a column per form, so reading across a row
 * compares the forms. The figures start closed: the timeline and the forms
 * already tell the story, and the rows are long.
 *
 * Each form is a button when `onSelect` is given: picking one shows that form
 * alone in the section above (the Match page's character detail), and picking
 * it again shows them all. The picked form's swatch, frame and timeline
 * segment turn the accent orange, the colour the Character page's "Showing
 * one build" filter uses.
 *
 * It replaced a ten-column table with a row per form, which could not be read
 * across and did not fit a phone. Forms as columns stay narrow however many
 * figures there are, and a character rarely has more than two or three forms
 * (825 of the 894 transformations in the corpus are a single change).
 *
 * `forms` are utils/formBreakdown.js matchForms()'s. A row whose figure is
 * zero in every form is left out (most characters never use a skill), apart
 * from the core figures. A fused form's figures are the fusion's whole output,
 * which its column says under the name.
 *
 * Written for one match, and shaped so the Character page's Forms tab can pass
 * averages into the same fields.
 */

// Form colours: neutral steps, since colour here only ties a form to its
// timeline segment; green and red are for ranks, orange for the picked form.
const SHADES = ['#cbd5e1', '#7c8aa3', '#4a5568', '#a3b0c4'];
export const PICKED = '#f97316';

const int = v => Math.round(v || 0).toLocaleString('en-US');
const mmss = s => {
  const t = Math.round(s || 0);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};
const pair = ([hit, thrown]) => (!thrown ? '–' : hit === null ? `${int(thrown)} thrown` : `${int(hit)}/${int(thrown)}`);

/** [label, text, value for the bar or null, core (always shown), zero test, phone label] */
const ROWS = [
  ['Time', f => mmss(f.seconds), null, true],
  ['Damage', f => int(f.damageDone), f => f.damageDone, true],
  ['Taken', f => int(f.damageTaken), f => f.damageTaken, true],
  ['Efficiency', f => `${(f.efficiency || 0).toFixed(2)}×`, null, true],
  ['Damage / sec', f => int(f.dps), null, true, null, 'Dmg / sec'],
  ['Super 1', f => pair(f.s1), null, false, f => !f.s1[1]],
  ['Super 2', f => pair(f.s2), null, false, f => !f.s2[1]],
  ['Ultimate', f => pair(f.ult), null, false, f => !f.ult[1]],
  ['Ki blasts', f => int(f.kiFired), null, false, f => !f.kiFired],
  ['Skills', f => int(f.skills), null, false, f => !f.skills],
  ['KOs', f => int(f.kills), null, true],
  ['HP left', f => (f.hpLeft === null ? '–' : int(f.hpLeft)), null, true],
];

export default function FormBreakdown({ forms, complete = true, reason = null, isPhone = false, selected = null, onSelect = null }) {
  const [open, setOpen] = useState(false);
  if (!forms || !forms.length) return null;
  const total = forms.reduce((s, f) => s + (f.seconds || 0), 0);
  // A phone shares its width between the forms (three fit; a fourth scrolls),
  // with each form's portrait over its name; a wider screen gives each a fixed
  // column, so values stay near their labels.
  const labelW = isPhone ? 70 : 116;
  const colW = isPhone ? 'minmax(72px,1fr)' : '210px';
  const grid = { gridTemplateColumns: `${labelW}px repeat(${forms.length}, ${colW})` };
  const width = isPhone ? undefined : labelW + forms.length * (210 + 16);
  const rows = complete && open ? ROWS.filter(([, , , core, zero]) => core || forms.some(f => !zero(f))) : [];
  const pickable = complete && !!onSelect;
  const colour = i => (selected === i ? PICKED : SHADES[i % SHADES.length]);

  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase leading-4 tracking-wider text-slate-400">Forms</div>

      {complete && total > 0 && (
        <div className="mt-2.5" style={{ maxWidth: width }}>
          <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
            {forms.map((f, i) => (
              <span key={`${f.id}-${i}`} title={`${f.name}: ${mmss(f.seconds)}`}
                style={{ flex: Math.max(f.seconds, total * 0.02), background: colour(i) }} />
            ))}
          </div>
          {/* Where each form began: 0:00, then every change. */}
          <div className="relative mt-1 h-4 text-[11px] tabular-nums text-slate-500">
            {forms.map((f, i) => {
              const at = forms.slice(0, i).reduce((s, g) => s + g.seconds, 0);
              return (
                <span key={`${f.id}-${i}`} className="absolute top-0 whitespace-nowrap"
                  style={{ left: `${(at / total) * 100}%`, transform: i === 0 ? 'none' : 'translateX(-50%)' }}>{mmss(at)}</span>
              );
            })}
            <span className="absolute right-0 top-0">{mmss(total)}</span>
          </div>
        </div>
      )}

      <div className="-mx-1 mt-1.5 overflow-x-auto px-1">
        <div className={`grid items-center ${isPhone ? 'w-full gap-x-2.5' : 'w-max gap-x-4'}`} style={grid}>
          {complete ? (
            <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
              className="inline-flex cursor-pointer items-center gap-1 self-center justify-self-start whitespace-nowrap border-0 bg-transparent p-0 text-[12px] font-semibold text-orange-400 hover:text-orange-300">
              {isPhone ? 'Figures' : open ? 'Hide figures' : 'Show figures'}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
          ) : <span />}
          {forms.map((f, i) => {
            const on = selected === i;
            const Head = pickable ? 'button' : 'div';
            return (
              <Head key={`${f.id}-${i}`}
                {...(pickable ? {
                  type: 'button', 'aria-pressed': on, onClick: () => onSelect(on ? null : i),
                  title: on ? 'Show all forms' : `Show ${f.name} alone`,
                } : null)}
                className={`flex min-w-0 gap-2 rounded-[8px] border border-solid p-1.5 text-left ${
                  isPhone ? 'flex-col items-start self-stretch' : 'items-center'} ${
                  on ? 'border-brand/[.55] bg-brand/[.12]' : `border-transparent bg-transparent ${pickable ? 'hover:bg-slate-400/[.07]' : ''}`} ${
                  pickable ? 'cursor-pointer' : ''}`}>
                <span className="relative flex-none">
                  <Portrait id={f.id} name={f.name} size={isPhone ? 28 : 34} />
                  <i className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-[3px] border-2 border-solid border-shell-panel"
                    style={{ background: colour(i) }} />
                </span>
                <span className="min-w-0">
                  <span className={`line-clamp-2 font-semibold leading-[1.25] ${on ? 'text-white' : 'text-slate-100'} ${isPhone ? 'text-[12px]' : 'text-[13px]'}`}>{f.name}</span>
                  {f.fusion && (
                    <span className="block truncate text-[11px] leading-[1.4] text-slate-400"
                      title="The whole fusion's figures. The character's own totals take half; its partner takes the other half.">
                      Fusion{f.fusion.partnerName ? ` with ${f.fusion.partnerName}` : ''}
                    </span>
                  )}
                </span>
              </Head>
            );
          })}

          {rows.map(([label, text, bar, , , phoneLabel], r) => {
            const max = bar ? Math.max(...forms.map(bar)) : 0;
            const line = `border-0 border-t border-solid border-gray-700/50 py-[5px] ${r === 0 ? 'mt-1.5' : ''}`;
            return (
              <React.Fragment key={label}>
                <span className={`${line} text-slate-400 ${isPhone ? 'text-[12px]' : 'text-[13px]'}`}>
                  {isPhone && phoneLabel ? phoneLabel : label}
                </span>
                {forms.map((f, i) => (
                  <span key={`${f.id}-${i}`} className={`${line} flex items-center gap-2.5`}>
                    <span className={`text-[13px] tabular-nums ${selected === i ? 'font-semibold text-white' : 'text-slate-100'}`}>{text(f)}</span>
                    {bar && !isPhone && (
                      <span className="block h-[3px] w-[52px] flex-none overflow-hidden rounded-sm bg-shell-track">
                        <span className="block h-full rounded-sm"
                          style={{ width: `${max > 0 ? Math.max(2, Math.round((bar(f) / max) * 100)) : 0}%`, background: selected === i ? PICKED : '#56627a' }} />
                      </span>
                    )}
                  </span>
                ))}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      {!complete && (
        <div className="mt-1 text-[13px] text-slate-500">
          {reason === 'shared'
            ? 'Both teams fielded this character, and the file keeps one set of form figures for the two.'
            : 'This file has no per-form figures.'}
        </div>
      )}
    </div>
  );
}
