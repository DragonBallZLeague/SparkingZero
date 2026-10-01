import React, { useMemo, useState } from 'react';
import HeaderFigure from '../../components/HeaderFigure.jsx';
import StatTable from '../../shell/StatTable.jsx';
import { useIsPhone } from '../../shell/useMediaQuery.js';
import { useWidenLink } from '../../shell/useWidenLink.jsx';
import { fusionPartnerIds, onlyFuses, fusionPartners, transformationSummary } from '../../utils/transformation.js';
import { tone } from '../meta/detailParts.jsx';
import CharacterForms from './CharacterForms.jsx';
import { THIN, clock, gaugeCapsules, transformByAI } from './transformRows.js';

const TITLE = 'mb-2 text-[11px] font-semibold uppercase leading-4 tracking-wider text-slate-400';

/** A change in the rate is coloured from 5 points, as on Meta's Transformations box. */
const TONE_RATE = 0.05;
/** A first transformation this many seconds sooner (green) or later (red) is coloured, as on Meta. */
const TONE_SECONDS = 5;
/** Fewer counted matches than this offer the wider scope (aiShift.js dataQuality's Low). */
const WIDEN_UNDER = 30;

const pctOf = v => `${Math.round(v * 100)}%`;
const points = v => `${v >= 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)}`;
const matches = n => `${n} match${n === 1 ? '' : 'es'}`;
const list = xs => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`);

/**
 * The skill gauge capsules, as the box names them. The effects are the
 * capsules' own (capsules.csv), shortened; Super Transformation's says what
 * the data showed: it cannot lower a 1-count transformation, most of them.
 */
const GAUGE = {
  '00_0_0066': { name: 'Super Transformation', effect: '1 fewer skill count to transform or fuse, to no less than 1: only a 2- or 3-count form gains' },
  '00_0_0138': { name: 'Secret Measures', effect: '1 more skill count' },
  '00_0_0055': { name: 'Dragon Spirit', effect: 'The skill gauge recovers 25% faster' },
  '00_0_0149': { name: 'Dragon Heart', effect: '25% of the skill gauge back on dodging a blast with high-speed movement' },
};

/** "Why some matches are not counted", one clause per reason with any. */
function leftOut(left, partners) {
  const parts = [];
  if (left['brolys-ring']) parts.push(`${left['brolys-ring']} with Broly's Ring, which blocks transforming`);
  if (left['no-partner']) parts.push(`${left['no-partner']} without ${partners ? list(partners) : 'its partner'} on its team`);
  if (left.absorbed) parts.push(`${left.absorbed} fused in from the bench by a teammate`);
  if (left.unfought) parts.push(`${left.unfought} it never fought in`);
  if (left.cannot) parts.push(`${left.cannot} with no move the reference lists`);
  return parts;
}

/**
 * One skill gauge capsule's card: its name with the rate without → with (on
 * the same AI strategies) beside it, its effect under them, then the first
 * transformation's time, or why there is no comparison. Four across on a wide
 * screen, two on a tablet, one on a phone.
 */
function GaugeCard({ g }) {
  const { name, effect } = GAUGE[g.id];
  const solid = g.compared >= THIN;
  const dt = g.compared && g.seconds ? g.seconds.with - g.seconds.usual : null;
  const shown = dt === null ? 0 : Math.round(Math.abs(dt));
  const status = !g.uses ? 'Never run with it'
    : !g.compared ? (g.without ? 'Too few matches without it on the same AI to compare' : 'Always run with it')
      : null;
  return (
    <li className="min-w-0 rounded-[10px] border border-solid border-gray-700 px-3 py-2.5 text-[12.5px]"
      title={g.compared ? `${matches(g.compared)} with it compared with its matches without it on the same AI strategies${solid ? '' : `: under ${THIN}, too few to colour`}` : undefined}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="min-w-0 font-semibold text-slate-100">{name}</span>
        {g.compared > 0 && (
          <span className={`flex-none tabular-nums ${solid ? '' : 'opacity-60'}`}>
            <span className="text-slate-400">{pctOf(g.usual)}</span><span className="mx-1.5 text-slate-500">→</span>
            <b className="font-semibold text-slate-100">{pctOf(g.with)}</b>
            <b className={`ml-2 inline-block w-8 text-right font-semibold ${solid ? tone(g.gain, TONE_RATE) : 'text-slate-300'}`}>{points(g.gain)}</b>
          </span>
        )}
      </div>
      <div className="text-[11.5px] leading-snug text-slate-500">
        {effect}{g.uses ? ` · ${matches(g.uses)} with it` : ''}
      </div>
      {status && <div className="mt-0.5 text-[11.5px] text-slate-400">{status}</div>}
      {dt !== null && (
        <div className={`mt-0.5 text-[11.5px] tabular-nums ${solid ? tone(dt, TONE_SECONDS, -1) : 'text-slate-400 opacity-60'}`}
          title="The median time on the field before the first transformation, without → with. Sooner is better.">
          First transformation {clock(g.seconds.usual)} → {clock(g.seconds.with)}{shown ? `, ${shown}s ${dt < 0 ? 'sooner' : 'later'}` : ''}
        </div>
      )}
    </li>
  );
}

/**
 * The Character page's Transformations tab (the Forms tab until 2026-10-01;
 * `?tab=forms` still opens it), for every character that can transform or
 * fuse. Participants come here to see how often a character transforms and
 * which AI strategy and capsules get it to (the league, 2026-09-30). Every
 * count follows utils/transformation.js: fusions count for the character that
 * starts them, and the rate is over its counted matches (no Broly's Ring, not
 * fused in from the bench, its partner on its team when it can only fuse).
 *
 *   the figures   transformed (x of N), the median time on the field before
 *                 the first transformation, and fused, for a character that
 *                 can fuse; what was left out, and why
 *   By AI strategy  transformRows.js transformByAI(): matches, transform %,
 *                 first transformation, a row per strategy, under THIN
 *                 matches faded (unless all are). A row opens Meta › AI
 *                 strategies on this character with that strategy open.
 *   Skill gauge capsules  transformRows.js gaugeCapsules(): each with and
 *                 without, on the same AI strategies; Broly's Ring under it
 *   Forms         the per-form averages (CharacterForms.jsx), where a form
 *                 is picked to cut the page to it
 *
 * `character` is the page's row under every cut but the form (the form is
 * picked here). `id` is the character's id (utils/transformation.js reads
 * the reference by it), `lineups` lineupIndex() over the scope.
 */
export default function CharacterTransformations({
  character, id, lineups = null, charMap = {}, aiLinkFor = null, selected = null, onPick = null,
}) {
  const isPhone = useIsPhone();
  const ctx = useMemo(() => ({ id, lineups }), [id, lineups]);
  const all = useMemo(() => transformationSummary(character.matches, ctx), [character, ctx]);
  const byAI = useMemo(() => transformByAI(character.matches, ctx), [character, ctx]);
  const gauge = useMemo(() => gaugeCapsules(character.matches, ctx), [character, ctx]);
  const [{ sort, dir }, setSort] = useState({ sort: 'transform', dir: 'desc' });

  const partners = fusionPartnerIds(id).map(p => charMap[p] || p);
  const fuses = all.fused > 0 || fusionPartners(id).length > 0;
  const fuseOnly = onlyFuses(id);
  const thinRows = byAI.rows.filter(r => r.matches < THIN).length;
  const allThin = byAI.rows.length > 0 && thinRows === byAI.rows.length;
  // Too little to pick an AI by: under two strategies with THIN+ matches,
  // most of them thin, or under WIDEN_UNDER counted matches in all.
  const widen = useWidenLink(byAI.rows.length - thinRows < 2 || thinRows * 2 > byAI.rows.length || all.matches < WIDEN_UNDER);

  const columns = [
    {
      key: 'name', label: 'AI strategy', align: 'left', width: isPhone ? 'minmax(0,1fr)' : 'minmax(180px,2fr)',
      cell: r => {
        const [family, own] = r.name.includes(': ') ? r.name.split(': ') : [null, r.name];
        return (
          <div className="min-w-0" title={r.name}>
            <div className="truncate text-[13px] font-semibold leading-[1.25] text-slate-50 sm:text-[14px]">{own}</div>
            {family && <div className="mt-[3px] truncate text-[12px] text-slate-400">{family}</div>}
          </div>
        );
      },
    },
    {
      key: 'matches', label: 'Matches', short: 'Games', width: isPhone ? '48px' : 'minmax(56px,1fr)', dir: 0, get: r => r.matches, fmt: v => v,
      title: 'Matches it could transform in',
    },
    {
      key: 'transform', label: 'Transformed', short: 'Trans', width: isPhone ? '56px' : 'minmax(64px,1fr)', dir: 1,
      get: r => r.rate * 100, fmt: v => `${Math.round(v)}%`,
      title: `Share of its matches it transformed${fuses ? ' or fused' : ''} in`,
      cellTitle: r => `Transformed${fuses ? ' or fused' : ''} in ${r.transformed} of ${matches(r.matches)}`,
    },
    {
      key: 'first', label: 'First', short: 'First', width: isPhone ? '52px' : 'minmax(64px,1fr)', dir: -1,
      get: r => r.seconds, fmt: clock,
      title: 'The median time on the field before its first transformation. Sooner is better.',
      cellTitle: r => (r.seconds === null ? 'No per-form figures to time it' : `Median over ${matches(r.timed)}`),
    },
  ];
  const statFor = key => columns.find(c => c.key === key && c.get) || null;
  const rows = useMemo(() => {
    const sign = dir === 'asc' ? 1 : -1;
    const stat = statFor(sort);
    const has = r => stat.get(r) !== null && stat.get(r) !== undefined;
    // A thin row goes after the rest: a 1-of-1 is not the strategy to pick.
    const solid = r => (allThin || r.matches >= THIN ? 1 : 0);
    return [...byAI.rows].sort((a, b) => (sort === 'name'
      ? sign * a.name.localeCompare(b.name)
      : (solid(b) - solid(a)) || (has(b) - has(a)) || sign * (stat.get(a) - stat.get(b)) || b.matches - a.matches));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byAI, sort, dir, allThin]);
  const onSort = key => setSort(cur => ({
    sort: key,
    dir: cur.sort === key ? (cur.dir === 'asc' ? 'desc' : 'asc') : (key === 'name' || key === 'first' ? 'asc' : 'desc'),
  }));

  const notes = leftOut(all.left, partners);
  const tableNotes = [
    allThin ? `Every strategy here has under ${THIN} matches, so none is faded.` : thinRows > 0 ? `Under ${THIN} matches: faded and listed last.` : null,
    byAI.unknown > 0 ? `${matches(byAI.unknown)} whose file lost its AI strategy count above but have no row.` : null,
    aiLinkFor && rows.length > 0 ? 'A row opens it on Meta, on this character.' : null,
  ].filter(Boolean);
  const ring = all.left['brolys-ring'];

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-3 sm:gap-x-8">
        {/* A character that can only fuse: every transformation is a fusion, so one figure, called that. */}
        <HeaderFigure label={fuseOnly ? 'Fused' : 'Transformed'}
          title={`${fuseOnly ? 'Fused' : `Transformed${fuses ? ' or fused' : ''}`} in ${all.transformed} of ${matches(all.matches)}`}>
          {all.rate === null ? '–' : pctOf(all.rate)}
          <span className="ml-1.5 text-sm font-medium text-slate-500">{all.transformed} of {all.matches}</span>
        </HeaderFigure>
        <HeaderFigure label="First transformation" title={all.seconds === null ? 'No per-form figures to time it'
          : `The median time on the field before its first transformation, over ${matches(all.timed)}. Sooner is better.`}>
          {all.seconds === null ? '–' : clock(all.seconds)}
        </HeaderFigure>
        {fuses && !fuseOnly && (
          <HeaderFigure label="Fused" title={`Fused in ${all.fused} of ${matches(all.matches)}`}>
            {all.fused}<span className="ml-1.5 text-sm font-medium text-slate-500">of {all.matches}</span>
          </HeaderFigure>
        )}
      </div>

      <div className="mb-4 flex flex-col gap-1 text-[12.5px] text-slate-400">
        {fuseOnly && (
          <p className="m-0">
            It can only fuse, with {list(partners)}: a match counts when {partners.length === 1 ? 'that partner was' : 'one of them was'} on its team.
            {!all.matches && all.left['no-partner'] > 0 && <b className="font-semibold text-slate-200"> {list(partners)} {partners.length === 1 ? 'was' : 'were'} never on its team here, so there is nothing to count.</b>}
          </p>
        )}
        {notes.length > 0 && (
          <p className="m-0">Counted over {all.matches} of {matches(all.matches + Object.values(all.left).reduce((s, n) => s + n, 0))}; left out: {notes.join('; ')}.</p>
        )}
        {widen}
      </div>

      {/* Three parts, each full width (the league, 2026-10-01): the AI table,
          the capsules as a row of cards, then the forms. Side by side, the
          shorter of the table and the capsules left a gap, and the forms'
          fixed 210px columns lost their fourth form to a narrower column. */}
      <div className={TITLE}>By AI strategy</div>
      <StatTable columns={columns} rows={rows} sort={sort} dir={dir} onSort={onSort} isPhone={isPhone}
        linkFor={aiLinkFor ? r => aiLinkFor(r.id) : null}
        rowTitle={aiLinkFor ? r => `${r.name} on Meta › AI strategies, against this character's other AIs` : null}
        faded={allThin ? null : r => r.matches < THIN}
        empty="No counted matches on any AI strategy here." />
      {tableNotes.length > 0 && <p className="mb-0 mt-2 text-xs text-slate-500">{tableNotes.join(' ')}</p>}

      <div className="mt-6 flex items-baseline justify-between gap-2">
        <div className={TITLE}>Skill gauge capsules</div>
        <span className="mb-2 text-right text-[11px] text-slate-500">same AI: without → with</span>
      </div>
      <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2 xl:grid-cols-4">
        {gauge.map(g => <GaugeCard key={g.id} g={g} />)}
      </ul>
      <p className="mb-0 mt-2 text-xs text-slate-500">
        Transformations and fusions spend the skill gauge: 1 count for most, 2 or 3 for some, almost always 3 for a fusion.
        {ring > 0
          ? ` Broly's Ring blocks them: carried in ${matches(ring)}, which the figures leave out.`
          : " Broly's Ring blocks them; it was not carried here."}
      </p>

      {/* FormBreakdown carries its own "Forms" heading. */}
      <div className="mt-6">
        <CharacterForms character={character} selected={selected} onPick={onPick} />
      </div>
    </div>
  );
}
