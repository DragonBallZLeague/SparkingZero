import React, { useMemo } from 'react';
import {
  ArrowLeft, Clock, Layers, Map as MapIcon, Target, Users,
} from 'lucide-react';
import TierPlate from '../../components/TierPlate.jsx';
import Portrait from '../../components/Portrait.jsx';
import HeaderFigure from '../../components/HeaderFigure.jsx';
import { useIsPhone } from '../../shell/useMediaQuery.js';
import ShareButton from '../../components/ShareButton.jsx';
import { PerFormStatsDisplayAggregated } from '../../components/PerFormStatsDisplay.jsx';
import { BuildTypeTooltipWrapper } from '../../components/build/index.js';
import {
  tierForScore, isProvisionalTier, tierMatchCount, PROVISIONAL_BELOW_MATCHES,
} from '../../utils/performanceTier.js';
import { tierPillColors, tierPillClass } from '../../utils/tierPlateSvg.js';
import { POSITION_NAMES, positionSlot, positionLabel } from '../../utils/positions.js';
import { teamName } from '../../utils/teams.js';

/**
 * The character page's CONTENT, with no opinion about arrangement.
 *
 * Split out from layout so the three candidate layouts show identical content
 * and the comparison is about arrangement alone. Whichever layout wins, these
 * blocks are what it keeps.
 *
 * Everything here is presentational - each number already exists on the
 * aggregated row that characterAggregation.js produced. A wrong figure is an
 * upstream bug, not a bug here.
 */

// ---- formatting -------------------------------------------------------------

export const nf = (n, digits = 0) =>
  (n === null || n === undefined || Number.isNaN(n)) ? '—' : Number(n).toLocaleString(undefined, {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  });

export const pct = (n, digits = 1) =>
  (n === null || n === undefined || Number.isNaN(n)) ? '—' : `${Number(n).toFixed(digits)}%`;

export const secs = (n) => {
  if (!n && n !== 0) return '—';
  // Rounded before splitting, so 119.6 reads 2m 00s rather than 1m 60s.
  const t = Math.round(n);
  const m = Math.floor(t / 60);
  const s = t % 60;
  return m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
};

// ---- shared chrome ----------------------------------------------------------

/**
 * A section is a heading and a rule, not a card.
 *
 * The first version of this page wrapped every section in its own bordered,
 * rounded, padded container, and nesting those inside the page's own container
 * is what made it read as sprawling. One line of separation does the same job
 * in a fraction of the vertical space.
 */
export function Section({ icon: Icon, title, hint = null, children, darkMode, className = '' }) {
  return (
    <section className={className}>
      <div className={`flex items-baseline gap-2 pb-1.5 mb-3 border-0 border-b border-solid ${
        darkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        {Icon && <Icon className={`w-4 h-4 self-center ${darkMode ? 'text-slate-500' : 'text-gray-400'}`} />}
        <h2 className={`text-sm font-bold uppercase tracking-wide ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
          {title}
        </h2>
        {hint && (
          <span className={`text-xs font-normal ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>{hint}</span>
        )}
      </div>
      {children}
    </section>
  );
}

/** Label over value, no box. The unit of the dense stat strip. */
export function Stat({ label, value, sub = null, darkMode, align = 'left' }) {
  return (
    <div className={align === 'right' ? 'text-right' : ''}>
      <div className={`text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap ${
        darkMode ? 'text-slate-500' : 'text-gray-500'
      }`}>
        {label}
      </div>
      <div className={`text-lg font-bold leading-tight tabular-nums ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        {value}
      </div>
      {sub && (
        <div className={`text-[11px] leading-tight ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>{sub}</div>
      )}
    </div>
  );
}

/** Inline key/value, for the usage grid. */
export function Fact({ label, value, darkMode }) {
  return (
    <div className="min-w-0">
      <div className={`text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>
        {label}
      </div>
      <div className={`text-sm font-medium truncate ${darkMode ? 'text-slate-200' : 'text-gray-800'}`} title={value || ''}>
        {value || '—'}
      </div>
    </div>
  );
}

// ---- derived ----------------------------------------------------------------

/** Everything the blocks below need, computed once. */
export function useCharacterView(character) {
  const byPosition = useMemo(() => {
    const groups = new Map();
    for (const m of character?.matches || []) {
      const slot = positionSlot(m.position);
      const key = slot ?? 'unknown';
      if (!groups.has(key)) groups.set(key, { slot, position: positionLabel(m.position), played: 0, won: 0, damage: 0, taken: 0 });
      const g = groups.get(key);
      g.played += 1;
      if (m.won) g.won += 1;
      g.damage += m.damageDone || 0;
      g.taken += m.damageTaken || 0;
    }
    return [...groups.values()].sort((a, b) => (a.slot ?? 9) - (b.slot ?? 9));
  }, [character]);

  // Newest last in the corpus, so reverse for "most recent first".
  const recentMatches = useMemo(
    () => [...(character?.matches || [])].reverse().slice(0, 12),
    [character]
  );

  return { byPosition, recentMatches };
}

// ---- blocks -----------------------------------------------------------------


export function IdentityBlock({
  character, rank, totalInScope, scopeLabel, darkMode, onBack, backLabel = null, portraitId = null, compact = false,
}) {
  const isPhone = useIsPhone();
  const matches = character.activeMatchCount || character.matchCount || 0;
  const tier = tierForScore(character.combatPerformanceScore);
  const provisional = isProvisionalTier(character);
  const tierMatches = tierMatchCount(character);

  const score = Math.round(character.combatPerformanceScore);
  const name = (
    <h1 className={`m-0 min-w-0 ${compact ? 'text-xl' : 'text-2xl sm:text-3xl'} font-bold leading-tight break-words ${
      darkMode ? 'text-white' : 'text-gray-900'}`}>
      {character.name}
    </h1>
  );
  // Tier, score, rank and matches as four equal figures, each a small label
  // over its value, as the Overview tiles below have them. The score keeps its
  // tier pill (Z's breathes).
  const figures = (
    <div className={isPhone ? 'mt-3 grid grid-cols-4 gap-2' : 'mt-2.5 flex flex-wrap items-end gap-x-6 gap-y-2'}>
      <HeaderFigure label="Tier">
        <TierPlate score={character.combatPerformanceScore} character={character} size="small" />
      </HeaderFigure>
      <HeaderFigure label="Score">
        <span className={`inline-flex h-[26px] items-center rounded-full border border-solid px-2.5 text-base font-bold ${tierPillClass(tier)}`}
          style={tierPillColors(tier, darkMode)}>
          {score}
        </span>
      </HeaderFigure>
      {rank != null && (
        <HeaderFigure label="Rank" title="Position on the leaderboard as currently filtered. Unlike the tier, this moves with the filters.">
          #{rank}
          {totalInScope ? <span className={`ml-1 font-medium text-slate-500 ${isPhone ? 'text-xs' : 'text-sm'}`}>/ {totalInScope}</span> : null}
        </HeaderFigure>
      )}
      <HeaderFigure label="Matches">{nf(matches)}</HeaderFigure>
    </div>
  );

  return (
    <div>
      <div className={`flex flex-wrap items-start justify-between gap-3 ${compact ? '' : 'mb-2'}`}>
        {/* The portrait leads, as the logo does on a Team page. On a phone the
            name shares its row and the figures run under both, full width. */}
        {isPhone ? (
          <div className="min-w-0 w-full">
            <div className="flex items-center gap-3.5">
              <Portrait id={portraitId} name={character.name} size={56} rounded={12} />
              {name}
            </div>
            {figures}
          </div>
        ) : (
          <div className="flex items-center gap-4 min-w-0">
            <Portrait id={portraitId} name={character.name} size={compact ? 56 : 80} rounded={12} />
            <div className="min-w-0">{name}{figures}</div>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <ShareButton darkMode={darkMode} />
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className={`inline-flex items-center gap-1.5 h-8 px-[11px] rounded-[8px] border border-solid text-[13px] font-medium whitespace-nowrap cursor-pointer transition-colors ${
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

      {provisional && (
        <p className={`text-xs mt-1 ${darkMode ? 'text-amber-300' : 'text-amber-700'}`}>
          Provisional tier — {tierMatches} match{tierMatches === 1 ? '' : 'es'} on record, fewer than
          the {PROVISIONAL_BELOW_MATCHES} needed for a settled tier.
        </p>
      )}

      {/* Whoever opened this from a pasted link never chose the filters, and
          would otherwise read these numbers as covering everything. */}
      {scopeLabel && (
        <p className={`text-xs mt-2 ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>
          From <span className="font-semibold">{scopeLabel}</span>
        </p>
      )}
    </div>
  );
}

/** The headline numbers as one strip of label/value pairs, not a grid of cards. */
export function HeadlineBlock({ character, darkMode, columns = 4 }) {
  const stats = [
    { label: 'Win rate', value: pct(character.winRate), sub: `${nf(character.wins)}W · ${nf(character.losses)}L` },
    { label: 'Avg damage', value: nf(character.avgDamage), sub: `${nf(character.totalDamage)} total` },
    { label: 'Avg taken', value: nf(character.avgTaken), sub: `${nf(character.totalTaken)} total` },
    { label: 'Efficiency', value: nf(character.efficiency, 2), sub: 'dealt per taken' },
    { label: 'Damage/sec', value: nf(character.dps, 1), sub: `${secs(character.avgBattleTime)} avg battle` },
    { label: 'Survival', value: pct(character.survivalRate), sub: `${nf(character.survivalCount)} of ${nf(character.matchCount)}` },
    { label: 'Avg KOs', value: nf(character.avgKills, 2), sub: `${nf(character.totalKills)} total` },
    { label: 'HP retention', value: pct(character.hpRetention), sub: 'left at match end' },
  ];

  const cols = { 2: 'grid-cols-2', 4: 'grid-cols-2 sm:grid-cols-4', 8: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-8' };

  return (
    <div className={`grid ${cols[columns] || cols[4]} gap-x-4 gap-y-3`}>
      {stats.map(s => <Stat key={s.label} {...s} darkMode={darkMode} />)}
    </div>
  );
}

export function UsageBlock({ character, darkMode, columns = 4 }) {
  const teams = character.teamsUsed || [];
  const cols = columns === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4';
  return (
    <Section icon={Users} title="Usage" hint="how it was fielded" darkMode={darkMode}>
      <div className={`grid ${cols} gap-x-4 gap-y-3`}>
        <Fact label="Most used by" value={teamName(character.primaryTeam)} darkMode={darkMode} />
        <Fact label="Usual position" value={positionLabel(character.primaryPosition)} darkMode={darkMode} />
        <Fact label="Usual AI" value={character.primaryAIStrategy} darkMode={darkMode} />
        <Fact label="Top map" value={character.primaryMap} darkMode={darkMode} />
      </div>
      {teams.length > 1 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {teams.map(t => (
            <span key={t} className={`text-[11px] px-1.5 py-0.5 rounded border border-solid ${
              darkMode ? 'bg-gray-800 border-gray-700 text-slate-300' : 'bg-gray-50 border-gray-200 text-gray-600'
            }`}>{teamName(t)}</span>
          ))}
        </div>
      )}
    </Section>
  );
}

/** Positions as a table. Three cards for three rows was never worth the space. */
export function PositionBlock({ byPosition, darkMode }) {
  if (!byPosition.length) return null;
  const th = `text-left text-[10px] font-semibold uppercase tracking-wider pb-1 ${darkMode ? 'text-slate-500' : 'text-gray-500'}`;
  const td = `py-1.5 text-sm tabular-nums ${darkMode ? 'text-slate-200' : 'text-gray-800'}`;
  return (
    <Section icon={Layers} title="By position" hint={`${POSITION_NAMES[1]}, Middle and Anchor face different matchups`} darkMode={darkMode}>
      <table className="w-full">
        <thead>
          <tr>
            <th className={th}>Position</th>
            <th className={th + ' text-right'}>Played</th>
            <th className={th + ' text-right'}>Win rate</th>
            <th className={th + ' text-right'}>Avg dealt</th>
            <th className={th + ' text-right'}>Avg taken</th>
          </tr>
        </thead>
        <tbody>
          {byPosition.map(p => (
            <tr key={p.slot ?? p.position} className={`border-0 border-t border-solid ${darkMode ? 'border-gray-700/50' : 'border-gray-100'}`}>
              <td className={td + ' font-semibold'}>{p.position}</td>
              <td className={td + ' text-right'}>{nf(p.played)}</td>
              <td className={td + ' text-right'}>{pct((p.won / p.played) * 100)}</td>
              <td className={td + ' text-right'}>{nf(p.damage / p.played)}</td>
              <td className={td + ' text-right'}>{nf(p.taken / p.played)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}

export function FormsBlock({ character, darkMode }) {
  if (!character.hasMultipleForms || !(character.formStatsArray || []).length) return null;
  return (
    <Section icon={Target} title="Per-form breakdown" hint={character.formHistory || null} darkMode={darkMode}>
      <PerFormStatsDisplayAggregated
        formStatsArray={character.formStatsArray}
        formChangeHistoryText={character.formHistory}
        darkMode={darkMode}
      />
    </Section>
  );
}

/**
 * Builds, drawn with BuildTypeTooltipWrapper.
 *
 * The first version of this page hand-rolled its own build display rather than
 * reuse this one, because this one was locked inside App.jsx and reusing it
 * meant extracting it first. It is the canonical build visual in this app: the
 * colour-coded build-type pill, with the cost breakdown and the capsule list
 * on hover.
 */
export function BuildsBlock({ character, darkMode, limit = 3 }) {
  const builds = (character.topBuilds || []).slice(0, limit);
  if (!builds.length) return null;
  return (
    <Section icon={Target} title="Most used builds" hint="by how often fielded" darkMode={darkMode}>
      <div className="space-y-2">
        {builds.map((b, i) => (
          <div
            key={i}
            className={`flex items-start justify-between gap-3 py-2 ${
              i > 0 ? 'border-0 border-t border-solid ' + (darkMode ? 'border-gray-700/50' : 'border-gray-100') : ''
            }`}
          >
            <div className="min-w-0 flex-1">
              <BuildTypeTooltipWrapper
                buildComposition={b.buildComposition}
                aiStrategy={b.aiStrategy}
                count={b.count}
                equippedCapsules={b.equippedCapsules}
                totalCapsuleCost={b.totalCapsuleCost}
                darkMode={darkMode}
                tooltipKey={`char-build-${i}`}
                characterName={character.name}
              />
            </div>
            <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
              <span className={`text-[11px] px-1.5 py-0.5 rounded border border-solid whitespace-nowrap ${
                darkMode ? 'bg-gray-800 border-gray-700 text-slate-300' : 'bg-gray-50 border-gray-200 text-gray-600'
              }`}>
                {nf(b.count)}×
              </span>
              {b.avgPerformanceScore != null && (
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-full border border-solid font-semibold whitespace-nowrap ${tierPillClass(tierForScore(b.avgPerformanceScore))}`}
                  style={tierPillColors(tierForScore(b.avgPerformanceScore), darkMode)}
                >
                  {Math.round(b.avgPerformanceScore)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function MatchesBlock({ character, recentMatches, darkMode, onOpenMatch }) {
  if (!recentMatches.length) return null;
  const th = `text-left text-[10px] font-semibold uppercase tracking-wider pb-1 ${darkMode ? 'text-slate-500' : 'text-gray-500'}`;
  return (
    <Section
      icon={Clock}
      title="Recent matches"
      hint={`latest ${recentMatches.length} of ${nf(character.matchCount)}`}
      darkMode={darkMode}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className={th}>R</th>
              <th className={th}>Team</th>
              <th className={th}>Opponent</th>
              <th className={th}>Pos</th>
              <th className={th + ' text-right'}>Dealt</th>
              <th className={th + ' text-right'}>Taken</th>
              <th className={th}>Map</th>
            </tr>
          </thead>
          <tbody>
            {recentMatches.map((m, i) => {
              const clickable = onOpenMatch && m.fileName;
              return (
                <tr
                  key={i}
                  className={`border-0 border-t border-solid ${darkMode ? 'border-gray-700/50' : 'border-gray-100'} ${
                    clickable ? 'cursor-pointer ' + (darkMode ? 'hover:bg-slate-400/5' : 'hover:bg-gray-50') : ''
                  }`}
                  onClick={clickable ? () => onOpenMatch(m.fileName) : undefined}
                  title={clickable ? 'Open this match' : undefined}
                >
                  <td className="py-1.5 pr-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      m.won
                        ? (darkMode ? 'bg-green-900/60 text-green-300' : 'bg-green-100 text-green-700')
                        : (darkMode ? 'bg-red-900/60 text-red-300' : 'bg-red-100 text-red-700')
                    }`}>
                      {m.won ? 'W' : 'L'}
                    </span>
                  </td>
                  <td className={`py-1.5 pr-3 text-sm truncate max-w-[10rem] ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{teamName(m.team) || '—'}</td>
                  <td className={`py-1.5 pr-3 text-sm truncate max-w-[10rem] ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{teamName(m.opponentTeam) || '—'}</td>
                  <td className={`py-1.5 pr-3 text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{positionLabel(m.position)}</td>
                  <td className={`py-1.5 pr-3 text-sm text-right tabular-nums ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>{nf(m.damageDone)}</td>
                  <td className={`py-1.5 pr-3 text-sm text-right tabular-nums ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>{nf(m.damageTaken)}</td>
                  <td className={`py-1.5 text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                      <MapIcon className="w-3 h-3" />
                      {m.map || m.mapId || '—'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
