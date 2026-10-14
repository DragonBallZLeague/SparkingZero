/**
 * The league's own builds, from the website's lineups (apps/website/public/content/lineups/), for the opponent's
 * build on Vs opponent. Only lineups the website's season and event pages link (`lineup_file`) count, in their
 * order: each season's schedule (preseason, season, playoffs) as listed, then that season's events.
 *
 * A build is a character's capsule set (the AI strategy is listed but does not split builds: it changes no stat).
 * Each character keeps its top 6 (the league, 2026-10-11, top 3; 6 since 2026-10-13 for the Fighter page): the newest season first, then the most used there, then
 * the most used overall, then the most recent.
 */
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export const LEAGUE_BUILDS_SHOWN = 6;

/**
 * Every lineup a parsed season or event document links, in document order: `lineup_file` and the playoffs'
 * `lineup_file_week1`, `lineup_file_week2`... Each carries the two teams the schedule names around it (a match's
 * home and away, or a series' team_a and team_b), which are more reliable than the lineup's own hand-typed text.
 */
function lineupRefs(node, out = [], sides = null) {
  if (Array.isArray(node)) for (const v of node) lineupRefs(v, out, sides);
  else if (node && typeof node === 'object') {
    const here = node.home && node.away ? [node.home, node.away] : node.team_a && node.team_b ? [node.team_a, node.team_b] : sides;
    for (const [k, v] of Object.entries(node)) {
      // an empty lineup_file is a match not played yet (Season 1's final and third-place match, 2026-10-14)
      if (/^lineup_file/.test(k) && typeof v === 'string') { if (v.trim()) out.push({ file: v.trim(), sides: here }); }
      else lineupRefs(v, out, here);
    }
  }
  return out;
}

/** The sides of one lineup file: [{ team, entries: [{ character, capsules: [name], ai }] }]. */
function sidesOf(doc) {
  const entries = (list) => (list || []).map(m => ({
    character: String(m.character ?? '').trim(),
    capsules: (m.capsules || []).map(c => String(c).replace(/\s*\(\d+\)\s*$/, '').trim()).filter(Boolean),
    ai: m.ai ? String(m.ai).trim() : null,
  })).filter(e => e.character);
  if (doc.members) return [{ team: doc.teamName, entries: entries(doc.members) }];
  return [{ team: doc.team1Name, entries: entries(doc.team1) }, { team: doc.team2Name, entries: entries(doc.team2) }];
}

/**
 * @param root repo root
 * @param resolveName character name -> id (null if unknown)
 * @param capsuleIdByName capsule name -> id
 * @param teamName a lineup's team text -> display name
 */
export function loadLeagueBuilds(root, { resolveName, capsuleIdByName, teamName }) {
  const content = path.join(root, 'apps', 'website', 'public', 'content');
  const seasonOf = (doc) => Number(String(doc.season ?? doc.label ?? '').match(/(\d+)/)?.[1] ?? NaN);
  const docs = [];
  for (const dir of ['seasons', 'events']) {
    const d = path.join(content, dir);
    for (const f of fs.readdirSync(d).filter(f => /\.ya?ml$/.test(f))) {
      const doc = yaml.load(fs.readFileSync(path.join(d, f), 'utf8'));
      docs.push({ season: seasonOf(doc), kind: dir, refs: lineupRefs(doc) });
    }
  }
  // seasons in order; within one, its schedule before its events
  docs.sort((a, b) => a.season - b.season || (a.kind === 'seasons' ? -1 : 1));
  const problems = { missingFiles: [], unknownCharacters: new Set(), unknownCapsules: new Set() };
  const byChar = new Map(); // id -> Map(key -> build)
  const lineupCount = new Map();
  let order = 0;
  const seen = new Set();
  for (const d of docs) for (const { file, sides } of d.refs) {
    if (seen.has(file)) continue;
    seen.add(file);
    const p = path.join(content, 'lineups', file);
    if (!fs.existsSync(p)) { problems.missingFiles.push(file); continue; }
    order++;
    const parsed = sidesOf(yaml.load(fs.readFileSync(p, 'utf8')) || {});
    for (const [i, side] of parsed.entries()) {
      // a two-sided lineup's teams come from the schedule when it names them (team1 is home / team_a)
      const team = teamName(parsed.length === 2 && sides ? sides[i] : side.team) ?? teamName(side.team);
      for (const e of side.entries) {
        const id = resolveName(e.character);
        if (!id) { problems.unknownCharacters.add(e.character); continue; }
        const ids = [];
        for (const n of e.capsules) { const c = capsuleIdByName(n); if (c) ids.push(c); else problems.unknownCapsules.add(n); }
        if (!ids.length) continue;
        lineupCount.set(id, (lineupCount.get(id) || 0) + 1);
        const key = [...ids].sort().join('|');
        const builds = byChar.get(id) || new Map();
        const b = builds.get(key) || { capsules: ids, uses: 0, bySeason: {}, teams: {}, ais: {}, last: 0, season: -1 };
        b.uses++;
        b.bySeason[d.season] = (b.bySeason[d.season] || 0) + 1;
        if (team) b.teams[team] = (b.teams[team] || 0) + 1;
        if (e.ai) b.ais[e.ai] = (b.ais[e.ai] || 0) + 1;
        b.last = Math.max(b.last, order);
        b.season = Math.max(b.season, d.season);
        builds.set(key, b);
        byChar.set(id, builds);
      }
    }
  }
  const ranked = (counts) => Object.entries(counts).sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).map(([k]) => k);
  const out = new Map();
  for (const [id, builds] of byChar) {
    const list = [...builds.values()].sort((x, y) => y.season - x.season || y.bySeason[y.season] - x.bySeason[x.season] || y.uses - x.uses || y.last - x.last);
    out.set(id, {
      lineups: lineupCount.get(id),
      builds: list.length,
      top: list.slice(0, LEAGUE_BUILDS_SHOWN).map(b => ({
        capsules: b.capsules, uses: b.uses, season: b.season, teams: ranked(b.teams), ais: ranked(b.ais),
      })),
    });
  }
  return { byCharacter: out, files: seen.size, problems };
}
