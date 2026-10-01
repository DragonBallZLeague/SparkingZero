import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, X } from 'lucide-react';
import { pathForView } from '../../routes.js';

/** The Sandbox's views, in the section tabs' order; Matches is `/sandbox` itself. */
const VIEWS = [
  { view: 'matches', label: 'Matches' },
  { view: 'aggregated', label: 'Characters' },
  { view: 'teams', label: 'Teams' },
  { view: 'meta', label: 'Meta' },
];
/** Files listed before "Show all". */
const SHOWN = 5;

const BUTTON = 'inline-flex items-center gap-1.5 h-8 px-[11px] rounded-[8px] border border-solid text-[13px] font-medium whitespace-nowrap cursor-pointer transition-colors';
const OUTLINE = `${BUTTON} bg-transparent border-gray-700 text-slate-200 hover:border-slate-400/[.35]`;
const PRIMARY = `${BUTTON} bg-brand/[.14] border-brand/[.55] text-orange-200 hover:bg-brand/[.22]`;

const isJson = f => /\.json$/i.test(f.name);

/**
 * The Sandbox's head: the uploads and the views over them, on the shell's one
 * flat panel.
 *
 * Empty, it is a drop zone. With files it lists them as rows (a valid one opens
 * its Match page, a broken one says why), each removable, then the Sandbox's
 * own views as tabs in the Character page's style: the section tabs above say
 * "Sandbox", these say which view of the uploads is open. Files can be dropped
 * anywhere on the panel; new ones join the set (a file of the same name
 * replaces its old copy).
 *
 * It replaced a card with a dashed box, a collapsible green-and-red file list
 * and a four-card "View Type" radio grid (2026-09-29).
 *
 * `files` are App's uploads ({ name, content } or { name, error }); `onAdd`
 * takes File objects, `onRemove` a file name, `onClear` nothing.
 */
export default function SandboxPanel({ files, onAdd, onRemove, onClear, view, matchLinkFor }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  const [all, setAll] = useState(false);
  const valid = files.filter(f => !f.error).length;
  const shown = all ? files : files.slice(0, SHOWN);

  const choose = () => input.current && input.current.click();
  const take = list => { const json = [...list].filter(isJson); if (json.length) onAdd(json); };
  const dropProps = {
    onDragOver: e => { e.preventDefault(); if (!over) setOver(true); },
    onDragLeave: e => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(false); },
    onDrop: e => { e.preventDefault(); setOver(false); take(e.dataTransfer.files); },
  };

  return (
    <section {...dropProps}
      className={`mb-4 rounded-[10px] border border-solid bg-shell-panel transition-colors ${over ? 'border-brand' : 'border-gray-700'}`}>
      <input ref={input} type="file" multiple accept=".json,application/json" className="hidden"
        onChange={e => { take(e.target.files); e.target.value = ''; }} />

      <div className="flex flex-wrap items-center gap-2 px-4 pt-3.5 sm:px-5">
        {/* The count goes under the title on a phone, so both buttons keep the row. */}
        <div className="mr-auto flex min-w-0 flex-col sm:flex-row sm:items-baseline sm:gap-2">
          <span className="text-[15px] font-semibold text-white">Your files</span>
          {files.length > 0 && <span className="text-[12px] font-medium tabular-nums text-slate-400 sm:text-[13px]">{valid} of {files.length} readable</span>}
        </div>
        {files.length > 0 && (
          <>
            <button type="button" className={OUTLINE} onClick={onClear}>Clear</button>
            <button type="button" className={PRIMARY} onClick={choose}><Upload className="h-4 w-4" />Add files</button>
          </>
        )}
      </div>

      {files.length === 0 ? (
        <div className="px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
          <button type="button" onClick={choose}
            className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-[8px] border border-dashed px-4 py-7 text-center cursor-pointer transition-colors ${
              over ? 'border-brand bg-brand/[.06]' : 'border-gray-600 bg-transparent hover:border-slate-400/[.5]'}`}>
            <Upload className="h-6 w-6 text-slate-400" />
            <span className="text-[14px] font-semibold text-slate-100">Drop battle-result .json files here, or choose files</span>
            <span className="text-[12.5px] text-slate-400">They never leave this browser.</span>
          </button>
        </div>
      ) : (
        <div className="px-4 pb-1 pt-2 sm:px-5">
          <ul className="m-0 list-none p-0">
            {shown.map(f => (
              <li key={f.name} className="flex min-h-[36px] items-center gap-2.5 border-0 border-t border-solid border-gray-700/50 first:border-t-0">
                <span className={`h-2 w-2 flex-none rounded-full ${f.error ? 'bg-rank-bad' : 'bg-rank-good'}`} />
                {f.error ? (
                  <span className="min-w-0 flex-1 truncate text-[13px] text-slate-300" title={f.name}>{f.name}</span>
                ) : (
                  <Link to={matchLinkFor(f.name)} title={f.name}
                    className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-100 no-underline hover:underline">{f.name}</Link>
                )}
                {f.error && <span className="flex-none text-[12px] text-rank-bad">Not a battle-result file</span>}
                <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onRemove(f.name)}
                  className="flex h-7 w-7 flex-none items-center justify-center rounded-[6px] border-0 bg-transparent text-slate-500 cursor-pointer hover:text-slate-200">
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          {files.length > SHOWN && (
            <button type="button" onClick={() => setAll(!all)}
              className="mb-1 border-0 bg-transparent p-0 py-1.5 text-[12.5px] font-semibold text-slate-400 cursor-pointer hover:text-slate-200">
              {all ? 'Show fewer' : `Show all ${files.length} files`}
            </button>
          )}
        </div>
      )}

      {valid > 0 && (
        <nav aria-label="Sandbox views"
          className="flex gap-1 overflow-x-auto border-0 border-t border-solid border-gray-700 px-2.5 sm:px-3.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {VIEWS.map(v => {
            const on = v.view === view;
            return (
              <Link key={v.view} to={pathForView(v.view, { sandbox: true })} aria-current={on ? 'page' : undefined}
                className={`px-2.5 pb-2 pt-2.5 text-sm font-semibold whitespace-nowrap no-underline border-0 border-b-2 border-solid ${
                  on ? 'text-white border-brand' : 'text-slate-400 border-transparent hover:text-slate-200'}`}>
                {v.label}
              </Link>
            );
          })}
        </nav>
      )}
    </section>
  );
}
