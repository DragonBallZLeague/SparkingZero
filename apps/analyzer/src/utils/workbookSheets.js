import { filterAggregatedData } from './aggregation/filterAggregated.js';
import { tierMatchCount } from './performanceTier.js';
import { POSITION_NAMES } from './positions.js';
import { aiStrategyRows } from '../pages/meta/aiRows.js';
import { capsuleRows } from '../pages/meta/capsuleRows.js';

/**
 * The workbook's plainer sheets (utils/excelExport.js `extraSheets`), made
 * from the same rows the pages show, so a sheet and its page cannot disagree:
 *
 *   Position       a row per character per position: the Character page
 *                  Usage tab's "By position", for everyone. It was the Data
 *                  Tables page's position table.
 *   AI Strategies  Meta's AI strategies tab (meta/aiRows.js).
 *   Capsules       Meta's Capsules tab (meta/capsuleRows.js).
 *
 * They are what let the Data Tables page go (2026-09-29): the workbook holds
 * everything it had. Each sheet is { name, columns: [{ header, width, numFmt,
 * get(row) }], rows }. `aggregated` is the scope's raw character rows.
 */

const round = (v, d = 0) => (Number.isFinite(v) ? Math.round(v * 10 ** d) / 10 ** d : null);

/** The Characters table's figures, in its order, win % last. */
const FIGURES = [
  { header: 'Score', width: 9, numFmt: '0.0', get: r => round(r.combatPerformanceScore, 1) },
  { header: 'Matches', width: 9, get: r => tierMatchCount(r) },
  { header: 'Avg damage', width: 12, numFmt: '#,##0', get: r => round(r.avgDamage) },
  { header: 'Dmg / sec', width: 10, numFmt: '#,##0', get: r => round(r.dps) },
  { header: 'Efficiency', width: 10, numFmt: '0.00', get: r => round(r.efficiency, 2) },
  { header: 'Survival %', width: 10, numFmt: '0', get: r => round(r.survivalRate) },
  { header: 'Avg taken', width: 11, numFmt: '#,##0', get: r => round(r.avgTaken) },
  { header: 'Battle time (s)', width: 14, numFmt: '0', get: r => round(r.avgBattleTime) },
  { header: 'Win %', width: 8, numFmt: '0', get: r => round(r.winRate) },
];

export function positionSheet(aggregated, charMap = {}) {
  const rows = [];
  for (const c of aggregated || []) {
    for (const p of [1, 2, 3]) {
      const matches = (c.matches || []).filter(m => Number(m.position) === p);
      if (!matches.length) continue;
      const row = filterAggregatedData([{ ...c, matches }], { charMap })[0];
      if (row) rows.push({ ...row, character: c.name, position: POSITION_NAMES[p], slot: p });
    }
  }
  rows.sort((a, b) => a.character.localeCompare(b.character) || a.slot - b.slot);
  return {
    name: 'Position',
    columns: [
      { header: 'Character', width: 30, get: r => r.character },
      { header: 'Position', width: 10, get: r => r.position },
      ...FIGURES,
    ],
    rows,
  };
}

export function aiStrategySheet(aggregated, charMap = {}) {
  return {
    name: 'AI Strategies',
    columns: [
      { header: 'AI strategy', width: 34, get: r => r.name },
      { header: 'Type', width: 10, get: r => r.type },
      { header: 'Characters', width: 11, get: r => r.characters },
      ...FIGURES,
    ],
    rows: aiStrategyRows(aggregated, { chars: [], types: [] }, charMap),
  };
}

export function capsuleSheet(aggregated, charMap = {}) {
  return {
    name: 'Capsules',
    columns: [
      { header: 'Capsule', width: 30, get: r => r.name },
      { header: 'Type', width: 14, get: r => r.type },
      { header: 'Cost', width: 6, get: r => r.cost },
      { header: 'Characters', width: 11, get: r => r.characters },
      ...FIGURES,
      { header: 'Effect', width: 60, get: r => r.effect },
    ],
    rows: capsuleRows(aggregated, { chars: [], types: [], ais: [] }, charMap),
  };
}

/** Every extra sheet, in workbook order. */
export const workbookSheets = (aggregated, charMap) => [
  positionSheet(aggregated, charMap),
  aiStrategySheet(aggregated, charMap),
  capsuleSheet(aggregated, charMap),
];
