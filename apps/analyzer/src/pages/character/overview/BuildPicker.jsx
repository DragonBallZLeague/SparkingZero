import React, { useState } from 'react';
import {
  useFloating, autoUpdate, offset, flip, shift, size,
  useClick, useDismiss, useRole, useInteractions, FloatingPortal,
} from '@floating-ui/react';
import { ChevronDown } from 'lucide-react';
import { buildTypeColor } from '../../../utils/overviewPalette.js';
import { ScorePill } from './parts.jsx';
import { fadesThinSamples } from '../../../utils/performanceTier.js';

/**
 * Builds sharing a build type AND an AI read identically in the menu's four
 * fields. For those only, name the capsules each has that the others in its group
 * do not all share (at most three, then "+N more").
 */
function lookalikeNotes(builds) {
  const groups = {};
  builds.forEach((b, i) => (groups[`${b.label}|${b.aiName}`] ??= []).push(i));
  const notes = {};
  for (const idx of Object.values(groups)) {
    if (idx.length < 2) continue;
    const sets = idx.map(i => builds[i].capsules.map(c => c.name));
    const common = sets[0].filter(n => sets.every(s => s.includes(n)));
    idx.forEach((i, j) => {
      const own = sets[j].filter(n => !common.includes(n));
      notes[i] = own.length
        ? own.slice(0, 3).join(', ') + (own.length > 3 ? `, +${own.length - 3} more` : '')
        : 'Only the shared capsules';
    });
  }
  return notes;
}

/** `compact` is the table-row size (Meta Builds): smaller, lighter, and it truncates. */
export function BuildPill({ label, compact = false, className = '' }) {
  const c = buildTypeColor(label);
  if (compact) {
    return (
      <span className={`inline-block max-w-full truncate align-middle text-[11px] font-semibold leading-[1.45] px-[7px] py-px rounded-full border border-solid whitespace-nowrap ${className}`}
        style={{ color: c, borderColor: `${c}66`, background: `${c}14` }}>
        {label}
      </span>
    );
  }
  return (
    <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-full border border-solid whitespace-nowrap"
      style={{ color: c, borderColor: c, background: `${c}1f` }}>
      {label}
    </span>
  );
}

/**
 * The build filter. Four things per build, as agreed: build type, AI strategy,
 * uses and performance score - plus a fifth line only for look-alikes. Scores of
 * builds with under 5 uses are dimmed, like a provisional tier plate.
 */
export default function BuildPicker({ builds, selected, allRow, onSelect }) {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'bottom-start',
    middleware: [
      offset(6), flip(), shift({ padding: 8 }),
      size({ apply({ availableHeight, elements }) { elements.floating.style.maxHeight = `${Math.max(200, Math.min(430, availableHeight - 8))}px`; } }),
    ],
    whileElementsMounted: autoUpdate,
  });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useClick(context), useDismiss(context), useRole(context, { role: 'listbox' }),
  ]);
  const notes = lookalikeNotes(builds);
  // Every build thin (a narrow scope): fading them all says nothing.
  const fade = fadesThinSamples(builds, b => b.provisional);
  const muted = 'text-slate-400';

  const choose = code => { onSelect(code); setOpen(false); };
  const option = (key, isSelected, first, pill, second, uses, note, code) => (
    <button key={key} type="button" role="option" aria-selected={isSelected} onClick={() => choose(code)}
      className={`w-full grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 items-center text-left px-2.5 py-2 bg-transparent border-0 border-solid cursor-pointer rounded-md text-slate-200 hover:bg-slate-400/10 ${isSelected ? ('bg-brand/[.12] shadow-[inset_3px_0_0_#f97316]') : ''}`}>
      <span className="min-w-0">{first}</span>
      <span className="justify-self-end">{pill}</span>
      <span className={`text-xs ${muted}`}>{second}</span>
      <span className={`text-xs tabular-nums justify-self-end whitespace-nowrap ${muted}`}>{uses}</span>
      {note && <span className="col-span-2 text-xs text-slate-500">{note}</span>}
    </button>
  );

  return (
    <div>
      <div className={`text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${muted}`}>Build</div>
      <button ref={refs.setReference} type="button" {...getReferenceProps()}
        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-[8px] border border-solid text-sm text-left cursor-pointer bg-gray-800 text-slate-100 ${selected ? 'border-orange-500 shadow-[inset_0_0_0_1px_#f97316]' : ('border-gray-700 hover:border-slate-400/[.35]')}`}>
        <span className="flex-1 flex items-center gap-2 min-w-0">
          {selected
            ? <><BuildPill label={selected.label} /><ScorePill score={selected.score} provisional={fade && selected.provisional} /></>
            : <>All builds <span className={`text-xs ${muted}`}>({builds.length})</span></>}
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 ${muted}`} />
      </button>
      {open && (
        <FloatingPortal>
          <div ref={refs.setFloating} style={{ ...floatingStyles, width: 'min(390px, calc(100vw - 32px))' }} {...getFloatingProps()}
            className="z-50 overflow-auto rounded-[10px] border border-solid p-1.5 bg-shell-pop border-gray-700 shadow-[0_16px_36px_-10px_rgba(0,0,0,.7)]">
            {option('all', !selected, <b>All builds</b>, <ScorePill score={allRow.combatPerformanceScore} />,
              `${builds.length} builds`, `${allRow.matchCount} uses`, null, null)}
            {builds.map((b, i) => option(b.code, selected?.code === b.code,
              <BuildPill label={b.label} />,
              <ScorePill score={b.score} provisional={fade && b.provisional} />,
              b.aiName, `${b.count} use${b.count === 1 ? '' : 's'}`, notes[i], b.code))}
          </div>
        </FloatingPortal>
      )}
    </div>
  );
}
