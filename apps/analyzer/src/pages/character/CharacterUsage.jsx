import React, { useMemo, useState } from 'react';
import HeaderFigure from '../../components/HeaderFigure.jsx';
import TeamLogo from '../../components/TeamLogo.jsx';
import TierScorePill from '../../components/TierScorePill.jsx';
import ChipMenu from '../../shell/ChipMenu.jsx';
import StatTable from '../../shell/StatTable.jsx';
import { useIsPhone, useTableSize, PICKED_COLUMNS, pickedWidth } from '../../shell/useMediaQuery.js';
import { usePickedColumns, pickerChip } from '../../shell/usePickedColumns.js';
import { filterAggregatedData } from '../../utils/aggregation/filterAggregated.js';
import { isProvisionalTier, fadesThinSamples } from '../../utils/performanceTier.js';
import { POSITION_NAMES, positionLabel } from '../../utils/positions.js';
import { teamName } from '../../utils/teams.js';
import { CHAR_STATS, DEFAULT_PHONE_STATS, statByKey } from '../characters/characterRows.js';

/** The same picks as the Characters table: one choice per viewer. */
const PHONE_COLS_KEY = 'szl.analyzer.characters.phoneCols';
/** From here every column fits; narrower, picked columns (two on a phone, four on a tablet). */
const FULL_FROM = 900;

const TITLE = 'mb-2 text-[11px] font-semibold uppercase leading-4 tracking-wider text-slate-400';

/**
 * The Character page's Usage tab: how the character was fielded. Four facts
 * (the team that used it most, its usual position, AI strategy and map), then
 * its figures by position and by team as the Characters table draws them
 * (shell/StatTable.jsx, the same columns, win % last), each row recomputed by
 * the leaderboard's own filter from that position's or team's matches, so the
 * numbers are the ones the Characters table would show for that cut.
 *
 * A row cuts the whole page to it and a second click removes the cut: a
 * position (`pos=`) or a team (`for=`, the scope bar chip's filter), with the
 * picked row marked and a strip at the top of the page (CharacterTabs.jsx).
 * Each list keeps all its rows while cut: `positionsRow` is the character
 * under every cut but the position, `teamsRow` under every cut but the team.
 * The four facts are the page's own row (`character`, every cut). It replaced
 * two plain tables and a row of team tags.
 */
export default function CharacterUsage({
  character, positionsRow = character, teamsRow = character, charMap = {},
  pos = null, onPos = null, team = null, onTeam = null,
}) {
  const isPhone = useIsPhone();
  const size = useTableSize(FULL_FROM);
  const compact = size !== 'full';
  const n = PICKED_COLUMNS[size] || 0;
  const [picked, setPicked] = usePickedColumns(PHONE_COLS_KEY, DEFAULT_PHONE_STATS, statByKey);
  const [pickerOpen, setPickerOpen] = useState(null);

  const cut = (base, keep, extra) => {
    const matches = ((base || {}).matches || []).filter(keep);
    if (!matches.length) return null;
    const row = filterAggregatedData([{ ...base, matches }], { charMap })[0];
    return row ? { ...row, ...extra } : null;
  };
  const positions = useMemo(
    () => [1, 2, 3].map(p => cut(positionsRow, m => Number(m.position) === p, { id: `pos${p}`, pos: p, label: POSITION_NAMES[p] })).filter(Boolean),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [positionsRow, charMap]);
  const teams = useMemo(() => {
    const tags = [...new Set(((teamsRow || {}).matches || []).map(m => m.team).filter(Boolean))];
    return tags.map(tag => cut(teamsRow, m => m.team === tag, { id: `team-${tag}`, tag, label: teamName(tag) })).filter(Boolean)
      .sort((a, b) => (b.matchCount || 0) - (a.matchCount || 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamsRow, charMap]);

  const stats = compact ? picked.slice(0, n).map(statByKey).filter(Boolean) : CHAR_STATS;
  const columns = (first, cell) => {
    const fade = rows => fadesThinSamples(rows);
    return rows => [
      { key: first, label: first === 'pos' ? 'Position' : 'Team', align: 'left', sort: false,
        width: compact ? 'minmax(0,1fr)' : 'minmax(150px,1.6fr)', cell },
      { key: 'score', label: 'Score', width: compact ? '56px' : '66px', sort: false,
        cell: r => <div className="flex justify-end"><TierScorePill score={r.combatPerformanceScore} provisional={fade(rows) && isProvisionalTier(r)} /></div> },
      ...stats.map(s => ({ ...s, sort: false, width: compact ? pickedWidth(size) : 'minmax(56px,1fr)' })),
    ];
  };
  const posColumns = columns('pos', r => <div className="text-[14px] font-semibold text-slate-50">{r.label}</div>);
  const teamColumns = columns('team', r => (
    <div className="flex min-w-0 items-center gap-2.5">
      <TeamLogo tag={r.tag} size={26} rounded={6} />
      <span className="truncate text-[14px] font-semibold text-slate-50">{r.label}</span>
    </div>
  ));
  const thin = rows => (fadesThinSamples(rows) ? isProvisionalTier : null);

  return (
    <div>
      <div className={isPhone ? 'mb-5 grid grid-cols-2 gap-x-3 gap-y-3' : 'mb-5 flex flex-wrap gap-x-8 gap-y-3'}>
        {[
          ['Most used by', teamName(character.primaryTeam)],
          ['Usual position', positionLabel(character.primaryPosition)],
          ['Usual AI', character.primaryAIStrategy],
          ['Top map', character.primaryMap],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <HeaderFigure label={label}>
              <span className={`truncate ${isPhone ? 'text-[14px]' : 'text-base'}`} title={value || ''}>{value || '–'}</span>
            </HeaderFigure>
          </div>
        ))}
      </div>

      {compact && (
        <div className="mb-3 flex justify-end gap-1.5">
          {[...Array(n).keys()].map(slot => (
            <ChipMenu key={slot} isPhone={isPhone} open={pickerOpen === slot} onOpenChange={o => setPickerOpen(o ? slot : null)}
              chip={pickerChip({ slot, shown: n, cols: picked, stats: CHAR_STATS, onPick: (i, v) => { setPicked(i, v); setPickerOpen(null); } })} />
          ))}
        </div>
      )}

      {/* A row is a filter: a single row can only be picked away, so it still
          toggles, which is how a cut from elsewhere is removed here too. */}
      <div className={TITLE}>By position</div>
      <StatTable columns={posColumns(positions)} rows={positions} isPhone={compact} faded={thin(positions)}
        onPick={onPos ? r => onPos(r.pos) : null} selected={pos ? `pos${pos}` : null} />

      {teams.length > 0 && (
        <>
          <div className={`${TITLE} mt-5`}>By team</div>
          <StatTable columns={teamColumns(teams)} rows={teams} isPhone={compact} faded={thin(teams)}
            onPick={onTeam ? r => onTeam(r.tag) : null} selected={team ? `team-${team}` : null} />
        </>
      )}
    </div>
  );
}
