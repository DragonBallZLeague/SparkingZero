import React, { useMemo, useState } from 'react';
import { Check, X, Minus, Crown } from 'lucide-react';
import { BlockSection, EntityAvatar } from './entities';
import { MatchRow } from './MatchBlocks';

// Boss-Rush style progression: every team attempts the same ordered stages
// and stops at its first loss. `runs[].results` is ordered to match `stages`
// (index 0 = stage 1). Each result may carry video_url / lineup_file, which
// opens as a normal match (team vs stage opponent) below the table.
function summarizeRun(run, stageCount) {
  const results = run.results || [];
  let cleared = 0;
  let eliminatedAt = null;
  for (let i = 0; i < results.length; i++) {
    if (results[i]?.result === 'win') cleared = i + 1;
    else if (results[i]?.result === 'loss') { eliminatedAt = i; break; }
  }
  const finished = cleared === stageCount;
  const alive = eliminatedAt === null && !finished;
  return { cleared, eliminatedAt, finished, alive, started: results.length > 0 };
}

export function GauntletBlock({ block, blockKey, resolve, lineups, darkMode }) {
  const stages = block.stages || [];
  const [selected, setSelected] = useState(null); // { runIdx, stageIdx }

  const rows = useMemo(() => {
    const list = (block.runs || []).map((run, idx) => ({ run, idx, ...summarizeRun(run, stages.length) }));
    // Furthest progress first; among ties, finished > still running > eliminated,
    // and teams that haven't started at all sink to the bottom.
    list.sort((a, b) =>
      Number(b.started) - Number(a.started)
      || b.cleared - a.cleared
      || Number(b.finished) - Number(a.finished)
      || Number(b.alive) - Number(a.alive)
      || a.run.team.localeCompare(b.run.team)
    );
    return list;
  }, [block.runs, stages.length]);

  const selectedRow = selected ? rows.find((r) => r.idx === selected.runIdx) : null;
  const selectedResult = selectedRow?.run.results?.[selected.stageIdx];
  const selectedStage = selected ? stages[selected.stageIdx] : null;

  const progressLabel = (r) => {
    if (!r.started) return 'Not started';
    if (r.finished) return `Cleared all ${stages.length}`;
    if (r.alive) return `On ${stages[r.cleared]?.name || `Stage ${r.cleared + 1}`}`;
    return `Fell at ${stages[r.eliminatedAt]?.name || `Stage ${r.eliminatedAt + 1}`}`;
  };

  const cellBase = 'flex items-center justify-center w-full h-9 rounded-md text-xs font-bold transition-colors';

  return (
    <BlockSection title={block.title} darkMode={darkMode}>
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-sm border-separate border-spacing-y-1.5 min-w-[560px]">
          <thead>
            <tr>
              <th className={`text-left text-xs font-semibold uppercase tracking-wider pb-1 ${darkMode ? 'text-gray-500' : 'text-stone-400'}`}>Team</th>
              {stages.map((s, i) => {
                const opp = resolve(s.opponent);
                return (
                  <th key={i} className="pb-1 px-1">
                    <div className="flex flex-col items-center gap-1">
                      {opp && <EntityAvatar entity={opp} size="sm" />}
                      <span className={`text-[11px] font-semibold ${darkMode ? 'text-gray-300' : 'text-stone-600'}`}>{s.name}</span>
                      {s.opponent && (
                        <span className={`text-[10px] truncate max-w-[110px] ${darkMode ? 'text-gray-500' : 'text-stone-400'}`}>{s.opponent}</span>
                      )}
                    </div>
                  </th>
                );
              })}
              <th className={`text-right text-xs font-semibold uppercase tracking-wider pb-1 ${darkMode ? 'text-gray-500' : 'text-stone-400'}`}>Progress</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const team = resolve(r.run.team);
              return (
                <tr key={r.run.team} className={darkMode ? 'bg-gray-800/40' : 'bg-white'}>
                  <td className="rounded-l-lg px-3 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <EntityAvatar entity={team} size="sm" />
                      <span className={`font-medium truncate ${darkMode ? 'text-gray-200' : 'text-stone-800'}`}>{r.run.team}</span>
                      {r.finished && <Crown className="w-4 h-4 text-yellow-400 flex-shrink-0" />}
                    </div>
                  </td>
                  {stages.map((s, si) => {
                    const res = r.run.results?.[si];
                    const isNext = r.alive && r.started && si === r.cleared;
                    const clickable = !!(res?.lineup_file || res?.video_url);
                    const isSel = selected?.runIdx === r.idx && selected?.stageIdx === si;
                    let cls, icon;
                    if (res?.result === 'win') {
                      cls = darkMode ? 'bg-green-500/15 text-green-400' : 'bg-green-100 text-green-700';
                      icon = <Check className="w-4 h-4" />;
                    } else if (res?.result === 'loss') {
                      cls = darkMode ? 'bg-red-500/15 text-red-400' : 'bg-red-100 text-red-600';
                      icon = <X className="w-4 h-4" />;
                    } else if (isNext) {
                      cls = darkMode ? 'bg-orange-500/10 text-orange-400 border border-dashed border-orange-500/40' : 'bg-orange-50 text-orange-600 border border-dashed border-orange-300';
                      icon = <span className="text-[10px] uppercase">Next</span>;
                    } else {
                      cls = darkMode ? 'text-gray-700' : 'text-stone-300';
                      icon = <Minus className="w-4 h-4" />;
                    }
                    return (
                      <td key={si} className="px-1 py-1.5">
                        {clickable ? (
                          <button
                            onClick={() => setSelected(isSel ? null : { runIdx: r.idx, stageIdx: si })}
                            className={`${cellBase} ${cls} ${isSel ? 'ring-2 ring-purple-500' : 'hover:brightness-125'}`}
                            title="View match"
                          >{icon}</button>
                        ) : (
                          <div className={`${cellBase} ${cls}`}>{icon}</div>
                        )}
                      </td>
                    );
                  })}
                  <td className={`rounded-r-lg px-3 py-1.5 text-right text-xs whitespace-nowrap ${
                    r.finished ? 'text-yellow-400 font-semibold' : r.alive && r.started ? (darkMode ? 'text-orange-400' : 'text-orange-600') : darkMode ? 'text-gray-400' : 'text-stone-500'
                  }`}>{progressLabel(r)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedRow && selectedResult && selectedStage && (
        <div className="mt-4">
          <MatchRow
            label={`${selectedRow.run.team} · ${selectedStage.name}`}
            teamA={selectedRow.run.team}
            teamB={selectedStage.opponent}
            game={{
              ...selectedResult,
              status: 'completed',
              winner: selectedResult.result === 'win' ? selectedRow.run.team : selectedStage.opponent,
            }}
            matchKey={`${blockKey}-r${selectedRow.idx}-s${selected.stageIdx}`}
            resolve={resolve}
            lineups={lineups}
            darkMode={darkMode}
          />
        </div>
      )}
    </BlockSection>
  );
}
