import React, { useMemo } from 'react';
import FormBreakdown from '../../components/FormBreakdown.jsx';
import { useIsPhone } from '../../shell/useMediaQuery.js';
import { averageForms } from '../../utils/formBreakdown.js';
import { formSlug } from './characterCuts.js';

/**
 * The Character page's per-form averages, the last part of its
 * Transformations tab (CharacterTransformations.jsx; this was the Forms tab
 * until 2026-10-01): the Match page's forms display
 * (components/FormBreakdown.jsx) over every match the character changed form
 * in, each form's figures averaged over the matches that reached it
 * (utils/formBreakdown.js averageForms()), with a "Reached" row for how often
 * each was. A fused form's figures are the fusion's whole output, as on the
 * Match page. It replaced PerFormStatsDisplay's table.
 *
 * `character` is the page's row under every cut but the form, so every form
 * stays listed. A form is a filter: picking one cuts the whole page to it
 * (`?form=`, `selected` here, a slug) and picking it again removes it
 * (`onPick`), as the Match page's form picker does for one match.
 */
export default function CharacterForms({ character, selected = null, onPick = null }) {
  const isPhone = useIsPhone();
  const { forms, transformed, usable } = useMemo(() => averageForms(character.matches), [character]);
  const index = selected ? forms.findIndex(f => formSlug(f.name) === selected) : -1;

  if (!forms.length) {
    return <p className="m-0 text-[12.5px] text-slate-400">No per-form figures here: it did not change form in this scope, or the files keep none for it.</p>;
  }
  return (
    <div>
      {/* "Reached" only when it tells the forms apart: with every form reached every time it is noise. */}
      <FormBreakdown forms={forms} of={forms.some(f => f.reached < usable) ? usable : null} isPhone={isPhone} defaultOpen
        selected={index >= 0 ? index : null} onSelect={onPick ? i => onPick(i === null ? selected : formSlug(forms[i].name)) : null} />
      <p className="mb-0 mt-3 text-xs text-slate-500">
        Each form's figures are averages per match that reached it, over the {usable} match{usable === 1 ? '' : 'es'} it changed form in
        {transformed > usable ? ` (${transformed - usable} more keep no per-form figures for it)` : ''}.
      </p>
    </div>
  );
}
