import React, { useMemo } from 'react';
import FormBreakdown from '../../components/FormBreakdown.jsx';
import { useIsPhone } from '../../shell/useMediaQuery.js';
import { averageForms } from '../../utils/formBreakdown.js';
import { formSlug } from './characterCuts.js';

/**
 * The Character page's Forms tab: the Match page's forms display
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
  const total = (character.matches || []).length;
  const index = selected ? forms.findIndex(f => formSlug(f.name) === selected) : -1;

  if (!forms.length) {
    return <p className="m-0 text-[14px] text-slate-400">No per-form figures for its matches in this scope.</p>;
  }
  return (
    <div>
      <p className="m-0 mb-4 text-[13px] text-slate-400">
        Changed form in <b className="font-semibold text-white">{transformed}</b> of {total} match{total === 1 ? '' : 'es'}.
        Figures are averages per match that reached the form.
      </p>
      {/* "Reached" only when it tells the forms apart: with every form reached every time it is noise. */}
      <FormBreakdown forms={forms} of={forms.some(f => f.reached < usable) ? usable : null} isPhone={isPhone} defaultOpen
        selected={index >= 0 ? index : null} onSelect={onPick ? i => onPick(i === null ? selected : formSlug(forms[i].name)) : null} />
      {transformed > usable && (
        <p className="mb-0 mt-3 text-xs text-slate-500">
          {transformed - usable} of them left out: their files keep no per-form figures for this character.
        </p>
      )}
    </div>
  );
}
