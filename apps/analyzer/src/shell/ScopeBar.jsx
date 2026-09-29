import React, { useMemo, useState } from 'react';
import { Download, SlidersHorizontal, ChevronRight } from 'lucide-react';
import ChipMenu, { Sheet, multiLabel } from './ChipMenu.jsx';
import { SCOPE_DIMS, dimValues, valueCounts, formatValue } from './scopeModel.js';
import { useIsPhone } from './useMediaQuery.js';

/** The navbar's height: 4px accent + 56px bar + 1px rule (packages/ui NavBar.css). */
export const NAV_H = 61;
/** This bar's height. Sticky table headers sit at NAV_H + SCOPE_H. */
export const SCOPE_H = 52;

/**
 * The one-line, sticky scope bar every page shares ("Visual direction",
 * decision 2, in the redesign plan). It replaced the mode and view panels, the
 * tag-filter panel and the leaderboard's 751px filter form.
 *
 * - The data scope as chips: Season, Match type, Difficulty and Team always;
 *   Season phase and Match size through "+ Filter", and once set. A set chip is
 *   tinted, so what narrows the data is always visible.
 * - Then the page's own chips (`pageChips`, built with the same shape), after a
 *   divider.
 * - The match count and the full Excel workbook, right-aligned.
 * - On a phone: a "Filters (n)" button opens a sheet listing every chip, and
 *   the chips still show on one scrolling line.
 *
 * `scope` is what useScope() returns. In the Sandbox, `uploads` replaces the
 * chips with a note, since uploaded files have no scope to pick.
 */
export default function ScopeBar({ scope, pageChips = [], matchCount = null, onExcel = null, uploads = null }) {
  const isPhone = useIsPhone();
  const [openId, setOpenId] = useState(null);
  const [listOpen, setListOpen] = useState(false);
  const [added, setAdded] = useState([]);   // secondary dimensions added with "+ Filter"

  const { tagsIndex, scope: current, setDim } = scope;

  const scopeChips = useMemo(() => {
    if (!tagsIndex) return [];
    return SCOPE_DIMS
      .filter(d => d.primary || (current[d.key] || []).length || added.includes(d.key))
      .map(d => {
        const selected = current[d.key] || [];
        const counts = valueCounts(tagsIndex, current, d.key);
        return {
          id: d.key,
          name: d.name,
          multi: true,
          selected,
          set: selected.length > 0,
          label: multiLabel(d.name, selected, v => formatValue(d.key, v)),
          allLabel: d.all,
          search: d.key === 'team',
          options: dimValues(tagsIndex, d.key).map(v => ({
            v, l: formatValue(d.key, v), cnt: (counts.get(v) || 0).toLocaleString('en-US'), dis: !counts.get(v),
          })),
          onChange: next => setDim(d.key, next),
        };
      });
  }, [tagsIndex, current, added, setDim]);

  const hidden = SCOPE_DIMS.filter(d => !scopeChips.some(c => c.id === d.key));
  const addChip = {
    id: '__add',
    name: 'Add a filter',
    label: '+ Filter',
    set: false,
    multi: false,
    selected: '',
    options: hidden.map(d => ({ v: d.key, l: d.name })),
    note: hidden.length ? null : 'Every filter is already in the bar.',
    onChange: key => { setAdded(a => [...a, key]); setOpenId(key); },
  };

  const all = [...scopeChips, ...pageChips];
  const setCount = all.filter(c => c.set).length;
  // A single-choice list closes on its pick; a multi-select one stays open.
  const menu = c => (
    <ChipMenu key={c.id} chip={c.multi ? c : { ...c, onChange: v => { c.onChange(v); setOpenId(null); } }}
      isPhone={isPhone} open={openId === c.id} onOpenChange={o => setOpenId(o ? c.id : null)} />
  );

  return (
    <div className="sticky z-40 border-0 border-b border-solid border-gray-700 bg-gray-900/[.96] backdrop-blur" style={{ top: NAV_H }}>
      <div className="px-4 sm:px-6"><div className="max-w-page mx-auto flex items-center gap-2.5" style={{ height: SCOPE_H }}>
        {uploads ? (
          <span className="flex-1 min-w-0 truncate text-[13px] text-slate-300">{uploads}</span>
        ) : (
          <>
            <button type="button" data-shell="filters" onClick={() => setListOpen(true)}
              className={`sm:hidden h-8 px-[11px] inline-flex flex-none items-center gap-1.5 rounded-[8px] border border-solid text-[13px] font-medium cursor-pointer ${
                setCount ? 'bg-brand/[.12] border-brand/[.55] text-white' : 'bg-transparent border-gray-700 text-slate-200'}`}>
              <SlidersHorizontal className="w-3.5 h-3.5" />Filters{setCount ? ` (${setCount})` : ''}
            </button>
            <div className="flex flex-1 min-w-0 items-center gap-1.5 overflow-x-auto pr-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ WebkitMaskImage: 'linear-gradient(to right, #000 calc(100% - 28px), transparent)', maskImage: 'linear-gradient(to right, #000 calc(100% - 28px), transparent)' }}>
              {scopeChips.map(menu)}
              {pageChips.length > 0 && <span className="mx-0.5 h-5 w-px flex-none bg-gray-700" aria-hidden="true" />}
              {pageChips.map(menu)}
              {hidden.length > 0 && <ChipMenu chip={addChip} isPhone={isPhone} open={openId === addChip.id}
                onOpenChange={o => setOpenId(o ? addChip.id : null)} className="!bg-transparent !border-dashed" caret={false} />}
            </div>
          </>
        )}
        <div className="flex flex-none items-center gap-2.5 text-[13px]">
          {matchCount !== null && <span className="hidden sm:inline text-slate-400 tabular-nums">{matchCount.toLocaleString('en-US')} matches</span>}
          {onExcel && (
            <button type="button" onClick={onExcel} title="Download all data for this scope (.xlsx)"
              className="hidden sm:inline-flex h-8 px-[11px] items-center gap-1.5 rounded-[8px] border border-solid border-gray-700 bg-transparent text-slate-200 text-[13px] font-medium cursor-pointer hover:border-slate-400/[.35]">
              <Download className="w-3.5 h-3.5" />Excel
            </button>
          )}
        </div>
      </div></div>

      {listOpen && isPhone && (
        <Sheet title="Filters" hint={matchCount !== null ? `${matchCount.toLocaleString('en-US')} matches` : null} onClose={() => setListOpen(false)}>
          {all.map(c => (
            <button key={c.id} type="button" onClick={() => { setListOpen(false); setOpenId(c.id); }}
              className="flex w-full items-center justify-between min-h-[48px] px-1.5 border-0 border-b border-solid border-gray-700/50 bg-transparent text-[15px] text-slate-100 cursor-pointer">
              <span>{c.name}</span>
              <span className={`inline-flex items-center gap-1 ${c.set ? 'text-orange-400' : 'text-slate-400'}`}>
                {c.set ? c.label : (c.multi ? c.allLabel : (c.options.find(o => String(o.v) === String(c.selected)) || {}).l)}
                <ChevronRight className="w-4 h-4" />
              </span>
            </button>
          ))}
          {hidden.length > 0 && (
            <button type="button" onClick={() => { setListOpen(false); setOpenId(addChip.id); }}
              className="flex w-full items-center min-h-[48px] px-1.5 border-0 bg-transparent text-[15px] text-slate-300 cursor-pointer">
              + Add a filter
            </button>
          )}
          {onExcel && (
            <button type="button" onClick={() => { setListOpen(false); onExcel(); }}
              className="mt-3.5 flex w-full h-11 items-center justify-center gap-1.5 rounded-[8px] border border-solid border-gray-700 bg-transparent text-slate-200 font-medium cursor-pointer">
              <Download className="w-4 h-4" />Download all data (.xlsx)
            </button>
          )}
        </Sheet>
      )}
    </div>
  );
}
