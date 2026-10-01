import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Portrait from './Portrait.jsx';
import { useElementWidth } from '../shell/useMediaQuery.js';

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
 * Written for one match; the Character page's Transformations tab passes averages over
 * many matches into the same fields (utils/formBreakdown.js averageForms()),
 * with `of` (how many matches it transformed in, with figures) so a "Reached"
 * row can say how often each form was ("Starting form" for the one it began
 * in: that one is not reached), and `defaultOpen`: there the figures
 * are the point. Averaged counts show one decimal.
 *
 * EVERY FORM STAYS IN VIEW (the league, 2026-10-01). It is laid out by its
 * own width (useElementWidth), not the screen's: it sits in a full-width tab,
 * a narrow detail panel and a phone. The forms share that width. A form is
 * named without the part every form's name shares ("Frieza (Z) 4th Form" is
 * "4th Form"; the page or row already names the character), and the room
 * each gets picks its header:
 *   wide      (WIDE_FROM+ px) the portrait beside the name, fixed columns
 *   stacked   the portrait over the name
 *   tight     (under STACK_FROM) the same, in the community's short forms
 *             (SSGSS, SSG, SS2, UI)
 * The full name is always in the header's tooltip. Before, each form took a
 * fixed 210px column off a phone, and in a narrower panel the later forms
 * scrolled out of sight with no sign they were there. A timeline label that
 * would run into the one before it is left out (a short first form put
 * "0:00" and "0:08" on top of each other); its segment's tooltip has it.
 */

/** Room per form, in px, from which a form's header is the wide one. */
const WIDE_FROM = 180;
/** Room per form under which names take their short forms. */
const STACK_FROM = 100;
/** A timeline time label's room, in px: one closer than this to the last, or to the end's, is left out. */
const LABEL_W = 40;

/** The community's short forms, longest first: Super Saiyan God Super Saiyan is SSGSS, not SSG SS. */
const ABBREVIATIONS = [
  [/Super Saiyan God Super Saiyan/g, 'SSGSS'],
  [/Super Saiyan God/g, 'SSG'],
  [/Super Saiyan (\d)/g, 'SS$1'],
  [/Super Saiyan/g, 'SS'],
  [/Ultra Instinct/g, 'UI'],
];

/**
 * Form names without the words every one of them starts with: "Frieza (Z)
 * 1st Form" ... "Frieza (Z) 4th Form" are "1st Form" ... "4th Form". A name
 * that is only those words keeps them ("Vegeta (Super)", the form its "Super
 * Saiyan" and "Super Saiyan God" start from). Names with nothing in common (a
 * fusion: "Goku Black Super Saiyan Rosé" -> "Fused Zamasu") stay whole.
 * `abbreviate` also gives the short forms (ABBREVIATIONS).
 */
export function shortFormNames(names, abbreviate = false) {
  const words = names.map(n => String(n || '').split(' '));
  let k = 0;
  if (new Set(names).size > 1) {
    while (words.every(w => w.length > k && w[k] === words[0][k])) k++;
  }
  return words.map(w => {
    const name = w.length > k && k > 0 ? w.slice(k).join(' ') : w.join(' ');
    return abbreviate ? ABBREVIATIONS.reduce((s, [re, to]) => s.replace(re, to), name) : name;
  });
}

// Form colours: they only tie a form to its timeline segment, so they need to
// be told apart at a glance, and the league wants them of one family
// (2026-10-01: grey steps were too alike, unrelated hues too loud). A ramp
// from blue to purple, the starting form palest and each later form deeper:
// sky 200, sky 400, indigo 400, purple 400, fuchsia 400. None is the ranks'
// green and red or the picked form's orange.
const SHADES = ['#bae6fd', '#38bdf8', '#818cf8', '#c084fc', '#e879f9'];
export const PICKED = '#f97316';

const int = v => Math.round(v || 0).toLocaleString('en-US');
// A count, or an average of counts (one decimal unless it is whole).
const num = v => (Math.abs((v || 0) - Math.round(v || 0)) < 1e-9 ? int(v) : v.toFixed(1));
const mmss = s => {
  const t = Math.round(s || 0);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};
const pair = ([hit, thrown]) => (!thrown ? '–' : hit === null ? `${num(thrown)} thrown` : `${num(hit)}/${num(thrown)}`);

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
  ['Ki blasts', f => num(f.kiFired), null, false, f => !f.kiFired],
  ['Skills', f => num(f.skills), null, false, f => !f.skills],
  ['KOs', f => num(f.kills), null, true],
  ['HP left', f => (f.hpLeft === null ? '–' : int(f.hpLeft)), null, true],
];

export default function FormBreakdown({
  forms, complete = true, reason = null, isPhone = false, selected = null, onSelect = null, of = null, defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [ref, measured] = useElementWidth();
  if (!forms || !forms.length) return null;
  const total = forms.reduce((s, f) => s + (f.seconds || 0), 0);

  // The room each form gets, from the measured width (the screen's guess
  // until it is measured, and on the server).
  const width = measured ?? (isPhone ? 358 : 960);
  const n = forms.length;
  const narrow = width < 520;
  const labelW = narrow ? 70 : 116;
  const gap = narrow ? 10 : 16;
  const per = (width - labelW - gap * n) / n;
  const mode = per >= WIDE_FROM ? 'wide' : per >= STACK_FROM ? 'stacked' : 'tight';
  const names = shortFormNames(forms.map(f => f.name), mode === 'tight');
  const bars = per >= 130;
  // Wide: fixed columns, so values stay near their labels. Narrower: shares.
  const colW = mode === 'wide' ? 'minmax(0,210px)' : 'minmax(0,1fr)';
  const grid = { gridTemplateColumns: `${labelW}px repeat(${n}, ${colW})`, columnGap: gap };
  const lineW = mode === 'wide' ? Math.min(width, labelW + n * (210 + gap)) : width;
  const shownRows = of ? [['Reached', f => (f.start ? 'Starting form' : `${f.reached} of ${of}`), null, true], ...ROWS] : ROWS;
  const rows = complete && open ? shownRows.filter(([, , , core, zero]) => core || forms.some(f => !zero(f))) : [];
  const pickable = complete && !!onSelect;
  // By form, not position: a form taken twice (Goku, Super Saiyan, Goku) keeps its colour.
  const order = [...new Set(forms.map(f => f.id))];
  const colour = i => (selected === i ? PICKED : SHADES[order.indexOf(forms[i].id) % SHADES.length]);

  // Where each form began: 0:00, then every change, unless it would run into
  // the label before it or the end's.
  const starts = forms.map((f, i) => forms.slice(0, i).reduce((s, g) => s + g.seconds, 0));
  let last = 0;
  const labelled = starts.map((at, i) => {
    if (i === 0) return true;
    const x = total > 0 ? (at / total) * lineW : 0;
    const keep = x - last >= LABEL_W && lineW - x >= LABEL_W;
    if (keep) last = x;
    return keep;
  });

  return (
    <div ref={ref} className="min-w-0">
      <div className="text-[11px] font-semibold uppercase leading-4 tracking-wider text-slate-400">Forms</div>

      {complete && total > 0 && (
        <div className="mt-2.5" style={{ maxWidth: mode === 'wide' ? lineW : undefined }}>
          <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
            {forms.map((f, i) => (
              <span key={`${f.id}-${i}`} title={`${f.name}: ${mmss(f.seconds)}, from ${mmss(starts[i])}`}
                style={{ flex: Math.max(f.seconds, total * 0.02), background: colour(i) }} />
            ))}
          </div>
          <div className="relative mt-1 h-4 text-[11px] tabular-nums text-slate-500">
            {forms.map((f, i) => labelled[i] && (
              <span key={`${f.id}-${i}`} className="absolute top-0 whitespace-nowrap"
                style={{ left: `${(starts[i] / total) * 100}%`, transform: i === 0 ? 'none' : 'translateX(-50%)' }}>{mmss(starts[i])}</span>
            ))}
            <span className="absolute right-0 top-0">{mmss(total)}</span>
          </div>
        </div>
      )}

      <div className="-mx-1 mt-1.5 overflow-x-auto px-1">
        <div className="grid w-full items-center" style={grid}>
          {complete ? (
            <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
              className="inline-flex cursor-pointer items-center gap-1 self-center justify-self-start whitespace-nowrap border-0 bg-transparent p-0 text-[12px] font-semibold text-orange-400 hover:text-orange-300">
              {narrow ? 'Figures' : open ? 'Hide figures' : 'Show figures'}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
          ) : <span />}
          {forms.map((f, i) => {
            const on = selected === i;
            const Head = pickable ? 'button' : 'div';
            const fusion = f.fusion ? (mode === 'tight' ? 'Fusion' : `Fusion${f.fusion.partnerName ? ` with ${f.fusion.partnerName}` : ''}`) : null;
            return (
              <Head key={`${f.id}-${i}`}
                {...(pickable ? { type: 'button', 'aria-pressed': on, onClick: () => onSelect(on ? null : i) } : null)}
                title={pickable ? (on ? `${f.name}: show all forms` : `Show ${f.name} alone`) : f.name}
                className={`flex min-w-0 gap-2 rounded-[8px] border border-solid text-left ${mode === 'tight' ? 'p-1' : 'p-1.5'} ${
                  mode === 'wide' ? 'items-center' : 'flex-col items-start self-stretch'} ${
                  on ? 'border-brand/[.55] bg-brand/[.12]' : `border-transparent bg-transparent ${pickable ? 'hover:bg-slate-400/[.07]' : ''}`} ${
                  pickable ? 'cursor-pointer' : ''}`}>
                <span className="relative flex-none">
                  <Portrait id={f.id} name={f.name} size={mode === 'wide' ? 34 : mode === 'stacked' ? 28 : 24} />
                  <i className="absolute -bottom-1 -right-1 block h-3 w-3 rounded-[3px] border-2 border-solid border-[color:var(--surface)]"
                    style={{ background: colour(i) }} />
                </span>
                <span className="min-w-0 max-w-full">
                  <span className={`line-clamp-2 break-words font-semibold leading-[1.25] ${on ? 'text-white' : 'text-slate-100'} ${
                    mode === 'wide' ? 'text-[13px]' : mode === 'stacked' ? 'text-[12px]' : 'text-[11.5px]'}`}>{names[i]}</span>
                  {fusion && (
                    <span className="block truncate text-[11px] leading-[1.4] text-slate-400"
                      title="The whole fusion's figures. The character's own totals take half; its partner takes the other half.">
                      {fusion}
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
                <span className={`${line} text-slate-400 ${narrow ? 'text-[12px]' : 'text-[13px]'}`}>
                  {narrow && phoneLabel ? phoneLabel : label}
                </span>
                {forms.map((f, i) => (
                  <span key={`${f.id}-${i}`} className={`${line} flex min-w-0 items-center gap-2.5`}>
                    <span className={`tabular-nums ${mode === 'tight' ? 'text-[12px]' : 'text-[13px]'} ${selected === i ? 'font-semibold text-white' : 'text-slate-100'}`}>{text(f)}</span>
                    {bar && bars && (
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
