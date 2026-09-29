import React from 'react';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import CharacterTabs from './character/CharacterTabs.jsx';

/**
 * One character's detail page, behind /characters/<name-slug>.
 *
 * This file owns the four states the route can be in and nothing else; the
 * content lives in character/CharacterBlocks.jsx and its arrangement in
 * character/CharacterTabs.jsx.
 *
 * The page computes nothing of its own - the tabs read the aggregated row
 * characterAggregation.js produced, and the Overview derives its figures from
 * that row's matches through utils/characterOverview.js, the code that also
 * builds the league reference. scripts/verify-character-page.mjs asserts the
 * fields it reads exist on real rows, because the failure mode of a rename is a
 * silently blank stat rather than a crash.
 *
 * `rank` is position within the CURRENT data scope and is labelled as such. The
 * TIER beside it is absolute, from the frozen cutoffs. Those two must not be
 * conflated, which is why they never share a label.
 */
export default function CharacterPage({
  character,
  missingLabel = null,
  // 'loading' | 'empty-scope' | 'not-found' - only read when there is no
  // character. They are kept apart because they send someone to three different
  // places: wait, widen the filters, or check the name.
  reason = 'not-found',
  rank = null,
  totalInScope = null,
  scopeLabel = null,
  darkMode = false,
  onBack = null,
  // Where the back button goes, when the page knows (shell/useCameFrom.js):
  // "Budokai", "Meta". Without it the button offers the character list.
  backLabel = null,
  // The id its portrait is filed under (public/portraits/<id>.webp).
  portraitId = null,
  onOpenMatch = null,
  // id -> name, for form names on a build-filtered row (filterAggregatedData).
  charMap = {},
}) {
  const notice = (icon, title, body) => (
    <div className={`rounded-[10px] p-6 border border-solid mb-6 ${
      darkMode ? 'bg-shell-panel border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-start gap-3">
        {icon}
        <div>
          <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h1>
          <p className={`text-sm mt-2 ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>{body}</p>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className={`inline-flex items-center gap-1.5 mt-4 h-8 px-[11px] rounded-[8px] border border-solid text-[13px] font-medium whitespace-nowrap cursor-pointer transition-colors ${
                darkMode
                  ? 'bg-transparent border-gray-700 text-slate-200 hover:border-slate-400/[.35]'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              {backLabel || 'All characters'}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Only a fetch actually in flight counts as loading.
  //
  // This used to key off "is the aggregated list empty?", which was wrong in a
  // way that never resolved: a tag filter matching no files (S1 + Season is
  // empty today - every Season 1 file is tagged Test) leaves it empty forever,
  // so the spinner ran until the tab was closed. App.jsx decides now, from the
  // real signals.
  if (reason === 'loading') {
    return (
      <div className={`rounded-[10px] p-6 border border-solid mb-6 ${
        darkMode ? 'bg-shell-panel border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className={`flex items-center gap-3 ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">
            Loading match data for {missingLabel || 'this character'}…
          </span>
        </div>
      </div>
    );
  }

  const warn = <AlertCircle className={`w-6 h-6 shrink-0 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />;

  // The filters match nothing at all. Distinct from a missing character, because
  // the fix is different and the visitor did not choose these filters if they
  // arrived from a pasted link.
  if (!character && reason === 'empty-scope') {
    return notice(warn, 'No matches in this data scope', (
      <>
        The current filters{scopeLabel ? <> — <span className="font-semibold">{scopeLabel}</span></> : null} match
        no match files at all, so there is nothing to show for {missingLabel || 'any character'}.
        Widen the tag filters to bring data back.
      </>
    ));
  }

  // The route accepts any segment, and the catch-all means a typo lands here
  // rather than 404ing.
  if (!character) {
    return notice(warn, `No data for ${missingLabel || 'this character'}`, (
      <>
        Either the name in the link is not a character, or it has no matches in the
        data currently in scope{scopeLabel ? <> — <span className="font-semibold">{scopeLabel}</span></> : null}.
        Widening the filters on the character leaderboard may bring it back.
      </>
    ));
  }

  return (
    <CharacterTabs
      character={character}
      rank={rank}
      totalInScope={totalInScope}
      scopeLabel={scopeLabel}
      darkMode={darkMode}
      onBack={onBack}
      backLabel={backLabel}
      portraitId={portraitId}
      onOpenMatch={onOpenMatch}
      charMap={charMap}
    />
  );
}
