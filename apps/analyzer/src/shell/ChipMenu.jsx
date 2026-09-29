import React, { useEffect, useRef, useState } from 'react';
import {
  useFloating, autoUpdate, offset, flip, shift, size,
  useClick, useDismiss, useRole, useInteractions, FloatingPortal,
} from '@floating-ui/react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * One filter chip and its option list: a popover on a desktop, a bottom sheet
 * on a phone. Controlled - the scope bar keeps one chip open at a time, and on
 * a phone opens a chip from its Filters list.
 *
 * `chip`:
 *   id, name        identity and dimension name ("Team")
 *   label           what the chip says; `set` tints it (the data is narrowed)
 *   multi           checkboxes (OR within the chip) vs a single choice
 *   options         [{ v, l, cnt?, dis?, img? }]
 *   selected        string[] when multi, a value otherwise
 *   allLabel        the multi list's first row, which clears the chip
 *   onChange        (next) => void; a multi list stays open while ticking
 *   search          a search box, for long lists
 *   note            a line under the list
 *
 * `caret={false}` drops the chip's chevron (the "+ Filter" chip has none).
 */
export default function ChipMenu({ chip, open, onOpenChange, isPhone, className = '', caret = true }) {
  const { refs, floatingStyles, context } = useFloating({
    open: open && !isPhone,
    onOpenChange,
    placement: 'bottom-start',
    middleware: [
      offset(6), flip(), shift({ padding: 8 }),
      size({ apply({ availableHeight, elements }) {
        elements.floating.style.maxHeight = `${Math.max(180, Math.min(availableHeight - 8, window.innerHeight * 0.6))}px`;
      } }),
    ],
    whileElementsMounted: autoUpdate,
  });
  // On a phone the chip opens a sheet through onOpenChange directly; floating-ui
  // only drives the desktop popover.
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useClick(context, { enabled: !isPhone }),
    useDismiss(context, { enabled: !isPhone }),
    useRole(context, { role: 'listbox' }),
  ]);

  const chipClass = chip.set
    ? 'bg-brand/[.12] border-brand/[.55] text-white'
    : 'bg-gray-800 border-gray-700 text-slate-400 hover:border-slate-400/[.35]';

  return (
    <>
      <button
        ref={refs.setReference}
        type="button"
        aria-haspopup="listbox"
        data-chip={chip.id}
        aria-expanded={open}
        {...getReferenceProps({ onClick: isPhone ? () => onOpenChange(!open) : undefined })}
        className={`h-[30px] sm:h-8 pl-2.5 pr-2 sm:pl-[11px] sm:pr-[9px] inline-flex flex-none items-center gap-1.5 rounded-[8px] border border-solid text-[12.5px] sm:text-[13px] font-medium whitespace-nowrap cursor-pointer ${chipClass} ${className}`}
      >
        {chip.label}
        {caret && <ChevronDown className="w-2.5 h-2.5 opacity-70" strokeWidth={3} aria-hidden="true" />}
      </button>
      {open && !isPhone && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-[60] min-w-[220px] max-w-[320px] overflow-auto rounded-[10px] border border-solid border-gray-700 bg-shell-pop p-1.5 shadow-[0_16px_36px_-10px_rgba(0,0,0,.7)]"
          >
            <OptionList chip={chip} autoFocusSearch />
          </div>
        </FloatingPortal>
      )}
      {open && isPhone && (
        <Sheet title={chip.name} hint={chip.multi ? 'Pick any number' : null} onClose={() => onOpenChange(false)}>
          <OptionList chip={chip} big />
          {chip.multi && (
            <button type="button" onClick={() => onOpenChange(false)}
              className="mt-2.5 block w-full h-11 rounded-[8px] border-0 bg-brand text-gray-900 font-bold cursor-pointer">
              Done
            </button>
          )}
        </Sheet>
      )}
    </>
  );
}

/** The chip label for a multi-select: its values, or the first and a count. */
export function multiLabel(name, values, labelOf, fmt) {
  if (!values.length) return name;
  if (fmt) return fmt(values);
  const ls = values.map(labelOf);
  const joined = ls.join(', ');
  return joined.length <= 26 ? joined : `${ls[0]} +${ls.length - 1}`;
}

function OptionList({ chip, big = false, autoFocusSearch = false }) {
  const [q, setQ] = useState('');
  const searchRef = useRef(null);
  useEffect(() => { if (autoFocusSearch && searchRef.current) searchRef.current.focus(); }, [autoFocusSearch]);

  const isOn = o => (chip.multi ? chip.selected.includes(String(o.v)) : String(chip.selected) === String(o.v));
  const query = q.trim().toLowerCase();
  let opts = query ? chip.options.filter(o => o.l.toLowerCase().includes(query)) : chip.options;
  // In a long list the picked values rise to the top, so they stay in view.
  if (chip.multi && chip.search) opts = [...opts.filter(isOn), ...opts.filter(o => !isOn(o))];

  const pick = o => {
    if (!chip.multi) { chip.onChange(o.v); return; }
    const v = String(o.v);
    chip.onChange(chip.selected.includes(v) ? chip.selected.filter(x => x !== v) : [...chip.selected, v]);
  };
  const row = `w-full flex items-center gap-2 px-2.5 rounded-md border-0 bg-transparent text-left cursor-pointer hover:bg-slate-400/10 disabled:cursor-default disabled:text-slate-500 disabled:hover:bg-transparent ${
    big ? 'min-h-[44px] text-[15px]' : 'min-h-[36px] py-[7px] text-[13.5px]'} text-slate-200`;

  return (
    <div>
      {chip.search && (
        <input ref={searchRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Search…"
          className="mb-1 h-[34px] w-full rounded-[7px] border border-solid border-gray-700 bg-gray-900 px-2.5 text-[13px] text-white outline-none focus:border-brand/[.55]" />
      )}
      {chip.multi && !query && (
        <button type="button" role="option" aria-selected={!chip.selected.length} className={row} onClick={() => chip.onChange([])}>
          <span className="w-[15px] flex-none text-brand font-bold">{!chip.selected.length ? <Check className="w-3.5 h-3.5" /> : null}</span>
          <span>{chip.allLabel}</span>
        </button>
      )}
      {opts.map(o => {
        const on = isOn(o);
        return (
          <button key={String(o.v)} type="button" role="option" aria-selected={on} disabled={!!o.dis && !on} className={row} onClick={() => pick(o)}>
            {chip.multi ? (
              <span className={`w-[15px] h-[15px] flex-none rounded inline-flex items-center justify-center border-[1.5px] border-solid ${
                on ? 'bg-brand border-brand text-gray-900' : 'border-slate-500'}`}>
                {on && <Check className="w-3 h-3" strokeWidth={3.5} />}
              </span>
            ) : (
              <span className="w-[15px] flex-none text-brand">{on ? <Check className="w-3.5 h-3.5" /> : null}</span>
            )}
            {o.img}
            <span className="min-w-0 truncate">{o.l}</span>
            {o.cnt !== undefined && <span className="ml-auto pl-3 text-xs tabular-nums text-slate-500">{o.cnt}</span>}
          </button>
        );
      })}
      {!opts.length && <div className="px-2.5 py-2 text-[13px] text-slate-500">Nothing matches.</div>}
      {chip.note && <div className="mt-1 border-0 border-t border-solid border-gray-700/50 px-2.5 pb-1 pt-1.5 text-xs text-slate-500">{chip.note}</div>}
    </div>
  );
}

/** A bottom sheet over a dimmed page (the phone's popover). */
export function Sheet({ title, hint = null, onClose, children }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <FloatingPortal>
      <div className="fixed inset-0 z-[60] bg-black/50" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-label={title}
        className="fixed inset-x-0 bottom-0 z-[61] max-h-[78vh] overflow-auto rounded-t-[14px] border-0 border-t border-solid border-gray-700 bg-shell-pop px-3 pb-[18px] pt-1.5">
        <div className="mx-auto mb-2 mt-1 h-1 w-9 rounded-sm bg-slate-600" />
        <div className="flex items-baseline justify-between px-1.5 pb-2.5 pt-1">
          <span className="text-[15px] font-bold text-white">{title}</span>
          {hint && <span className="text-xs text-slate-400">{hint}</span>}
        </div>
        {children}
      </div>
    </FloatingPortal>
  );
}
