import React, { useMemo } from 'react';
import baseline from '../../../config/style-baseline.json';
import { overviewFromMatches, placeOverview } from '../../../utils/characterOverview.js';
import { HeadlineTiles, MoveCards } from './Headline.jsx';
import StyleBand from './StyleBand.jsx';

/**
 * The Character page's Overview tab: headline tiles, move cards, then the style
 * band (build, fighting style, how it fights).
 *
 * `viewRow` is what is being shown - the character, or one build of it when the
 * build picker has one selected - and everything here is computed from its
 * per-match rows by the same code that built the league reference
 * (src/config/style-baseline.json), so a rank means the same thing on every page.
 * The spec is docs/ANALYZER_REDESIGN_PLAN.md, "Overview tab: approved design".
 *
 * `formView` ({ slices, shares }, character/characterCuts.js formSlices) is
 * one picked form: the figures are that form's own in each match that reached
 * it, and the tiles and cards show its amounts as a share of all its forms.
 */
export default function OverviewTab({ viewRow, allRow, builds, selected, onSelectBuild, darkMode, formView = null }) {
  const matches = formView ? formView.slices : viewRow.matches;
  const overview = useMemo(() => overviewFromMatches(matches), [matches]);
  const place = useMemo(() => placeOverview(overview, baseline), [overview]);
  const shares = formView ? formView.shares : null;
  return (
    <div>
      <HeadlineTiles overview={overview} place={place} baseline={baseline} darkMode={darkMode} shares={shares} />
      <MoveCards overview={overview} place={place} baseline={baseline} darkMode={darkMode} shares={shares} />
      <StyleBand
        overview={overview}
        place={place}
        baseline={baseline}
        builds={builds}
        selected={selected}
        allRow={allRow}
        onSelectBuild={onSelectBuild}
        darkMode={darkMode}
      />
    </div>
  );
}
