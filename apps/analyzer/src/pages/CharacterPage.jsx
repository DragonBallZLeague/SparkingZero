import React, { useMemo } from 'react';
import {
  AlertCircle, ArrowLeft, BarChart3, Clock, Flame, Heart, Layers, Loader2, Map as MapIcon,
  Shield, Star, Swords, Target, Trophy, Users, Zap,
} from 'lucide-react';
import TierPlate from '../components/TierPlate.jsx';
import ShareButton from '../components/ShareButton.jsx';
import { PerFormStatsDisplayAggregated } from '../components/PerFormStatsDisplay.jsx';
import { tierForScore, isProvisionalTier, tierMatchCount, PROVISIONAL_BELOW_MATCHES } from '../utils/performanceTier.js';
import { tierPillColors } from '../utils/tierPlateSvg.js';
import { getBuildTypeColor } from '../utils/buildComposition.js';

/**
 * One character's detail page, behind /characters/<name-slug>.
 *
 * This is the first page in the redesign that exists to be LINKED TO rather than
 * navigated to, which drives two decisions that look unusual next to the rest of
 * the app:
 *
 *  - **It is purely presentational.** Every number here is already computed by
 *    utils/aggregation/characterAggregation.js; nothing is recalculated. If a
 *    stat looks wrong the bug is upstream, not here. scripts/verify-character-page.mjs
 *    asserts the fields this file reads actually exist on a real aggregated row,
 *    because the failure mode of a rename is a silently blank stat, not a crash.
 *
 *  - **The data scope is stated on the page.** Someone arriving from a pasted
 *    link has not touched the filters and has no idea what the numbers cover, so
 *    the scope is spelled out and the way back to changing it is one click away.
 *
 * Ranking note: `rank` is position within the CURRENT scope and is described as
 * such. The TIER beside it is absolute, from the frozen cutoffs - those two must
 * not be conflated, which is why they are labelled differently.
 */

const nf = (n, digits = 0) =>
  (n === null || n === undefined || Number.isNaN(n)) ? '—' : Number(n).toLocaleString(undefined, {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  });

const pct = (n, digits = 1) =>
  (n === null || n === undefined || Number.isNaN(n)) ? '—' : `${Number(n).toFixed(digits)}%`;

const secs = (n) => {
  if (!n && n !== 0) return '—';
  const m = Math.floor(n / 60);
  const s = Math.round(n % 60);
  return m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
};

/** One headline number. Deliberately flat - no bars, no colour coding. */
function StatCard({ icon: Icon, label, value, sub = null, darkMode }) {
  return (
    <div className={`rounded-xl p-4 border border-solid ${
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide mb-2 ${
        darkMode ? 'text-gray-400' : 'text-gray-500'
      }`}>
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className={`text-2xl font-bold leading-none ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        {value}
      </div>
      {sub && (
        <div className={`text-xs mt-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{sub}</div>
      )}
    </div>
  );
}

function Section({ icon: Icon, title, subtitle = null, children, darkMode }) {
  return (
    <section className={`rounded-2xl p-6 border border-solid ${
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center gap-3 mb-4">
        <Icon className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
        <div>
          <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{title}</h2>
          {subtitle && (
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

/** Small key/value row used for the context block. */
function Fact({ label, value, darkMode }) {
  return (
    <div>
      <div className={`text-xs uppercase tracking-wide font-semibold ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
        {label}
      </div>
      <div className={`text-sm font-medium mt-0.5 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
        {value || '—'}
      </div>
    </div>
  );
}

export default function CharacterPage({
  character,
  missingLabel = null,
  pending = false,
  rank = null,
  totalInScope = null,
  scopeLabel = null,
  darkMode = false,
  onBack = null,
  onOpenMatch = null,
}) {
  // These two run on EVERY render, including the not-found one below: a hook
  // cannot sit behind an early return, or navigating from a real character to an
  // unknown one would change the hook count and React would throw.
  //
  // Position split. positionAggregation.js answers a different question (every
  // character by position, for lineup planning); here it is just this
  // character's own record, so grouping the match list is the cheaper read.
  const byPosition = useMemo(() => {
    const groups = new Map();
    for (const m of character?.matches || []) {
      const key = m.position || 'Unknown';
      if (!groups.has(key)) groups.set(key, { position: key, played: 0, won: 0, damage: 0, taken: 0 });
      const g = groups.get(key);
      g.played += 1;
      if (m.won) g.won += 1;
      g.damage += m.damageDone || 0;
      g.taken += m.damageTaken || 0;
    }
    const order = { Lead: 0, Middle: 1, Anchor: 2 };
    return [...groups.values()].sort((a, b) =>
      (order[a.position] ?? 9) - (order[b.position] ?? 9));
  }, [character]);

  // Newest last in the corpus, so reverse for "most recent first".
  const recentMatches = useMemo(
    () => [...(character?.matches || [])].reverse().slice(0, 10),
    [character]
  );

  // Still loading. Kept distinct from "not found" on purpose - see the
  // deepLinkedCharacter memo in App.jsx for why the difference matters.
  if (pending) {
    return (
      <div className={`rounded-2xl p-6 border border-solid mb-6 ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className={`flex items-center gap-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">
            Loading match data for {missingLabel || 'this character'}…
          </span>
        </div>
      </div>
    );
  }

  // The route accepts any segment, and the catch-all means a typo - or a link to
  // a character absent from the current data scope - lands here rather than
  // 404ing. Say which, and say the likely reason: the visitor did not choose the
  // filters and has no way to guess that the scope is why the page is empty.
  if (!character) {
    return (
      <div className={`rounded-2xl p-6 border border-solid mb-6 ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-start gap-3">
          <AlertCircle className={`w-6 h-6 shrink-0 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
          <div>
            <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              No data for {missingLabel || 'this character'}
            </h1>
            <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Either the name in the link is not a character, or it has no matches in the
              data currently in scope{scopeLabel ? <> — <span className="font-semibold">{scopeLabel}</span></> : null}.
              Widening the filters on the character leaderboard may bring it back.
            </p>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className={`inline-flex items-center gap-2 mt-4 px-3 py-1.5 rounded-lg border border-solid text-sm font-semibold cursor-pointer transition-colors ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                All characters
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const matches = character.activeMatchCount || character.matchCount || 0;
  const tier = tierForScore(character.combatPerformanceScore);
  const provisional = isProvisionalTier(character);
  const tierMatches = tierMatchCount(character);
  const topBuilds = (character.topBuilds || []).slice(0, 3);

  const headline = [
    { icon: Star, label: 'Combat score', value: nf(character.combatPerformanceScore, 1),
      sub: `Tier ${tier}${provisional ? ' (provisional)' : ''}` },
    { icon: Trophy, label: 'Win rate', value: pct(character.winRate),
      sub: `${nf(character.wins)}W – ${nf(character.losses)}L` },
    { icon: Zap, label: 'Avg damage dealt', value: nf(character.avgDamage),
      sub: `${nf(character.totalDamage)} total` },
    { icon: Shield, label: 'Avg damage taken', value: nf(character.avgTaken),
      sub: `${nf(character.totalTaken)} total` },
    { icon: Target, label: 'Damage efficiency', value: nf(character.efficiency, 2),
      sub: 'Dealt per point taken' },
    { icon: Flame, label: 'Damage per second', value: nf(character.dps, 1),
      sub: `${secs(character.avgBattleTime)} average battle` },
    { icon: Heart, label: 'Survival rate', value: pct(character.survivalRate),
      sub: `${nf(character.survivalCount)} of ${nf(character.matchCount)} matches survived` },
    { icon: Swords, label: 'Avg KOs', value: nf(character.avgKills, 2),
      sub: `${nf(character.totalKills)} total` },
  ];

  return (
    <div className="space-y-6 mb-6">
      {/* ---- Identity header ------------------------------------------------ */}
      <header className={`rounded-2xl p-6 border border-solid ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <TierPlate score={character.combatPerformanceScore} character={character} size="large" />
            <div className="min-w-0">
              <h1 className={`text-2xl sm:text-3xl font-bold leading-tight break-words ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {character.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border border-solid whitespace-nowrap"
                  style={tierPillColors(tier)}
                >
                  <Star className="w-3 h-3" />
                  Score: {Math.round(character.combatPerformanceScore)}
                </span>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-solid ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}>
                  <BarChart3 className="w-3 h-3" />
                  {nf(matches)} active match{matches === 1 ? '' : 'es'}
                </span>
                {rank != null && (
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-solid ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                    title="Position on the leaderboard as currently filtered. Unlike the tier, this changes with the filters."
                  >
                    <Trophy className="w-3 h-3" />
                    #{rank}{totalInScope ? ` of ${totalInScope}` : ''} in this view
                  </span>
                )}
              </div>
              {provisional && (
                <p className={`text-xs mt-2 ${darkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                  Provisional tier — {tierMatches} match{tierMatches === 1 ? '' : 'es'} on record,
                  fewer than the {PROVISIONAL_BELOW_MATCHES} needed for a settled tier.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ShareButton darkMode={darkMode} />
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-solid text-sm font-semibold cursor-pointer transition-colors ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                All characters
              </button>
            )}
          </div>
        </div>

        {/* The scope has to be visible: whoever opened this from a pasted link
            never chose the filters and would otherwise read these numbers as if
            they covered everything. */}
        {scopeLabel && (
          <p className={`text-xs mt-4 pt-4 border-t border-solid ${
            darkMode ? 'text-gray-400 border-gray-700' : 'text-gray-500 border-gray-200'
          }`}>
            Calculated from <span className="font-semibold">{scopeLabel}</span>. Change the data scope
            from the filters on the character leaderboard.
          </p>
        )}
      </header>

      {/* ---- Headline stats -------------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {headline.map(s => <StatCard key={s.label} {...s} darkMode={darkMode} />)}
      </div>

      {/* ---- Where and how it played ---------------------------------------- */}
      <Section icon={Users} title="Usage" subtitle="How this character was actually fielded" darkMode={darkMode}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Fact label="Most used by" value={character.primaryTeam} darkMode={darkMode} />
          <Fact label="Usual position" value={character.primaryPosition} darkMode={darkMode} />
          <Fact label="Usual AI strategy" value={character.primaryAIStrategy} darkMode={darkMode} />
          <Fact label="Most played map" value={character.primaryMap} darkMode={darkMode} />
          <Fact label="Teams" value={`${(character.teamsUsed || []).length} team${(character.teamsUsed || []).length === 1 ? '' : 's'}`} darkMode={darkMode} />
          <Fact label="Maps" value={`${(character.mapsUsed || []).length} map${(character.mapsUsed || []).length === 1 ? '' : 's'}`} darkMode={darkMode} />
          <Fact label="AI strategies" value={`${(character.aiStrategiesUsed || []).length}`} darkMode={darkMode} />
          <Fact label="HP retention" value={pct(character.hpRetention)} darkMode={darkMode} />
        </div>
        {(character.teamsUsed || []).length > 1 && (
          <div className={`mt-4 pt-4 border-t border-solid ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`text-xs uppercase tracking-wide font-semibold mb-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              All teams
            </div>
            <div className="flex flex-wrap gap-1.5">
              {character.teamsUsed.map(t => (
                <span key={t} className={`text-xs px-2 py-0.5 rounded-full border border-solid ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}>{t}</span>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* ---- Position split -------------------------------------------------- */}
      {byPosition.length > 0 && (
        <Section
          icon={Layers}
          title="By team position"
          subtitle="Lead, Middle and Anchor face different matchups, so the same character reads differently in each"
          darkMode={darkMode}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {byPosition.map(p => (
              <div key={p.position} className={`rounded-xl p-4 border border-solid ${
                darkMode ? 'bg-gray-900/40 border-gray-700' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className={`font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{p.position}</div>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Played</dt>
                    <dd className={darkMode ? 'text-gray-200' : 'text-gray-800'}>{nf(p.played)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Win rate</dt>
                    <dd className={darkMode ? 'text-gray-200' : 'text-gray-800'}>
                      {pct((p.won / p.played) * 100)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Avg damage</dt>
                    <dd className={darkMode ? 'text-gray-200' : 'text-gray-800'}>{nf(p.damage / p.played)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Avg taken</dt>
                    <dd className={darkMode ? 'text-gray-200' : 'text-gray-800'}>{nf(p.taken / p.played)}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ---- Forms ----------------------------------------------------------- */}
      {character.hasMultipleForms && (character.formStatsArray || []).length > 0 && (
        <Section
          icon={Flame}
          title="Per-form breakdown"
          subtitle={character.formHistory || 'Stats split across the forms this character transformed through'}
          darkMode={darkMode}
        >
          <PerFormStatsDisplayAggregated
            formStatsArray={character.formStatsArray}
            formChangeHistoryText={character.formHistory}
            darkMode={darkMode}
          />
        </Section>
      )}

      {/* ---- Builds ---------------------------------------------------------- */}
      {topBuilds.length > 0 && (
        <Section
          icon={Target}
          title="Most used builds"
          subtitle="Capsule loadout and AI strategy combinations, by how often they were fielded"
          darkMode={darkMode}
        >
          <div className="space-y-3">
            {topBuilds.map((b, i) => (
              <div key={i} className={`rounded-xl p-4 border border-solid ${
                darkMode ? 'bg-gray-900/40 border-gray-700' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* buildComposition is an object ({ primary, label, type,
                        breakdown }), so .label is the display string - and
                        getBuildTypeColor is the same tint the leaderboard's build
                        pills use, so the two surfaces agree. */}
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium border border-solid whitespace-nowrap ${
                      getBuildTypeColor(b.buildComposition, darkMode)
                    }`}>
                      {b.buildComposition?.label || 'No Build'}
                    </span>
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {b.aiStrategy || 'Default'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`px-2 py-0.5 rounded-full border border-solid ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-white border-gray-200 text-gray-600'
                    }`}>
                      {nf(b.count)} match{b.count === 1 ? '' : 'es'}
                    </span>
                    {b.avgPerformanceScore != null && (
                      <span
                        className="px-2 py-0.5 rounded-full border border-solid font-semibold"
                        style={tierPillColors(tierForScore(b.avgPerformanceScore))}
                      >
                        Score: {Math.round(b.avgPerformanceScore)}
                      </span>
                    )}
                  </div>
                </div>
                {(b.equippedCapsules || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {b.equippedCapsules.map((c, j) => (
                      <span key={j} className={`text-xs px-2 py-0.5 rounded-full border border-solid ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-white border-gray-200 text-gray-600'
                      }`}>
                        {c?.name || c?.capsule?.name || c?.id || '—'}
                        {c?.capsule?.cost != null && (
                          <span className={darkMode ? 'text-yellow-400 ml-1' : 'text-yellow-600 ml-1'}>
                            {c.capsule.cost}
                          </span>
                        )}
                      </span>
                    ))}
                    {b.totalCapsuleCost > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border border-solid ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-gray-400' : 'bg-white border-gray-200 text-gray-500'
                      }`}>
                        {nf(b.totalCapsuleCost)} cost
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ---- Recent matches -------------------------------------------------- */}
      {recentMatches.length > 0 && (
        <Section
          icon={Clock}
          title="Recent matches"
          subtitle={`Latest ${recentMatches.length} of ${nf(character.matchCount)} on record`}
          darkMode={darkMode}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`text-left text-xs uppercase tracking-wide ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  <th className="pb-2 pr-3 font-semibold">Result</th>
                  <th className="pb-2 pr-3 font-semibold">Team</th>
                  <th className="pb-2 pr-3 font-semibold">Opponent</th>
                  <th className="pb-2 pr-3 font-semibold">Pos</th>
                  <th className="pb-2 pr-3 font-semibold text-right">Dealt</th>
                  <th className="pb-2 pr-3 font-semibold text-right">Taken</th>
                  <th className="pb-2 font-semibold">Map</th>
                </tr>
              </thead>
              <tbody>
                {recentMatches.map((m, i) => (
                  <tr
                    key={i}
                    className={`border-t border-solid ${darkMode ? 'border-gray-700' : 'border-gray-200'} ${
                      onOpenMatch && m.fileName ? 'cursor-pointer ' + (darkMode ? 'hover:bg-gray-700/40' : 'hover:bg-gray-50') : ''
                    }`}
                    onClick={onOpenMatch && m.fileName ? () => onOpenMatch(m.fileName) : undefined}
                    title={onOpenMatch && m.fileName ? 'Open this match' : undefined}
                  >
                    <td className="py-2 pr-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        m.won
                          ? (darkMode ? 'bg-green-900/60 text-green-300' : 'bg-green-100 text-green-700')
                          : (darkMode ? 'bg-red-900/60 text-red-300' : 'bg-red-100 text-red-700')
                      }`}>
                        {m.won ? 'W' : 'L'}
                      </span>
                    </td>
                    <td className={`py-2 pr-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{m.team || '—'}</td>
                    <td className={`py-2 pr-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{m.opponentTeam || '—'}</td>
                    <td className={`py-2 pr-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{m.position || '—'}</td>
                    <td className={`py-2 pr-3 text-right ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{nf(m.damageDone)}</td>
                    <td className={`py-2 pr-3 text-right ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{nf(m.damageTaken)}</td>
                    <td className={`py-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <span className="inline-flex items-center gap-1">
                        <MapIcon className="w-3 h-3" />
                        {m.map || m.mapId || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}
