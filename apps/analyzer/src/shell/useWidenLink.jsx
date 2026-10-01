import React from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useQueryUpdate } from './useQueryUpdate.js';
import { parseScope, writeScope } from './scopeModel.js';
import { isSandboxPath } from '../routes.js';
import baseline from '../config/style-baseline.json';

/**
 * "Little data here. Widen to the last 2 seasons, Ultra (1,350 matches)": for
 * a view whose figures mostly rest on too little data (`thin`), a link that
 * widens the scope to the league reference's window (style-baseline.json's
 * basis) by setting those chips, so the change is in the scope bar for anyone
 * to see and undo (the league's choice, 2026-09-30, over changing the site's
 * default scope or pinning the figures to that window). Nothing when the
 * scope is already that window, or in the Sandbox (uploads have no seasons).
 * Meta's AI strategies and the Character page's Transformations tab show it.
 *
 * A hook rather than a component, so a caller can tell whether there is a
 * link (and leave out the row that would hold it).
 */
export function useWidenLink(thin) {
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const update = useQueryUpdate();
  const basis = baseline.basis;
  const scope = parseScope(params);
  const onWindow = !scope.matchType && (scope.difficulty || []).join() === basis.difficulty
    && [...(scope.seasonNumber || [])].sort().join() === [...basis.seasons].sort().join();
  if (!thin || onWindow || isSandboxPath(pathname)) return null;
  return (
    <span className="text-[12.5px] text-slate-400">
      Little data here.{' '}
      <button type="button" className="cursor-pointer bg-transparent p-0 text-[12.5px] text-orange-400 hover:underline"
        title={`Sets the Season chip to ${basis.seasons.map(s => `Season ${s}`).join(' and ')}, Difficulty to ${basis.difficulty}, and clears Match type`}
        onClick={() => update(p => writeScope(p, { ...parseScope(p), seasonNumber: basis.seasons, difficulty: [basis.difficulty], matchType: [] }))}>
        Widen to the last {basis.seasonWindow} seasons, {basis.difficulty} ({Math.round(basis.matches).toLocaleString('en-US')} matches)
      </button>
    </span>
  );
}
