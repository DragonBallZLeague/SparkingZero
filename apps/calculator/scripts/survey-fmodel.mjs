// Survey of game-file attack data the calculator doesn't use yet (findings: data/EXPANSION.md).
// For every melee action (combatives) and ki-blast action (bullets): how many characters have it, the
// game's category (from MasterDataAsset/Action), and how its Power (+ ki gain or cost) is spread over
// the roster. Also character values that vary but no field map covers. Reads the committed snapshot
// through scripts/lib/fmodelData.mjs; only the Action categories come from the export itself.
// usage (repo root): node apps/calculator/scripts/survey-fmodel.mjs apps/calculator "<FModel export>/Content/SS" survey.json
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [app, ss, out] = process.argv.slice(2);
const { loadFmodel } = await import(pathToFileURL(path.join(app, 'scripts/lib/fmodelData.mjs')).href);
const fm = loadFmodel(path.join(app, 'data'));
const ids = [...fm.characters.keys()];

const readRows = (f) => {
  const [h, ...r] = fs.readFileSync(path.join(app, 'data/snapshots/fmodel', f), 'utf8').split(/\r?\n/).filter(Boolean);
  const H = h.split(',');
  return r.map(l => { const p = l.split(','); return Object.fromEntries(H.map((k, i) => [k, p[i]])); });
};
const actionsOf = (f1, f2) => [...new Set([...readRows(f1), ...readRows(f2)].map(r => r.action))].sort();

const actionInfo = (act) => {
  const f = path.join(ss, 'MasterDataAsset/Action', `Action_${act}.json`);
  if (!fs.existsSync(f)) return {};
  const t = fs.readFileSync(f, 'utf8');
  const g = (k) => (t.match(new RegExp(`"${k}": *"[A-Za-z]+::([A-Za-z0-9_]+)"`)) || [])[1];
  return { cat: g('ActionCategoryType'), sub: g('ActionSubCategoryType'), rd: g('RushDerivativeCategoryType') };
};

function survey(kind, files, fields) {
  const res = {};
  for (const act of actionsOf(...files)) {
    const per = [];
    for (const id of ids) {
      const fl = kind === 'melee' ? fm.attackFiles(id, act) : fm.bulletFiles(id, act);
      if (!fl.length) continue;
      const vals = fields.map(fd => fl.map(f => fm.param(f, fd) ?? '').join('+'));
      const label = fm.param(fl[0], 'ArmorBreakLevel') ?? '';
      per.push({ id, vals, label, own: !fl.every(f => /Common/.test(f)) });
    }
    if (!per.length) continue;
    const dist = {};
    for (const p of per) { const k = p.vals.join(' / '); dist[k] = (dist[k] || 0) + 1; }
    const top = Object.entries(dist).sort((a, b) => b[1] - a[1]);
    res[act] = { ...actionInfo(act), chars: per.length, own: per.filter(p => p.own).length, label: per[0].label,
      distinct: top.length, common: top.slice(0, 4), goku: per.find(p => p.id === '0000_00')?.vals.join(' / ') ?? '-' };
  }
  return res;
}

const melee = survey('melee', ['combative-defaults.csv', 'combatives.csv'], ['Power', 'EnergyGain']);
const ki = survey('ki', ['bullet-defaults.csv', 'bullets.csv'], ['Power', 'ExpendEnergy', 'BeamPower']);

// character values: fields that vary across the roster and that the field map doesn't cover
const mapped = new Set(fs.readFileSync(path.join(app, 'data/fmodel-fields.csv'), 'utf8').split(/\r?\n/).slice(1).map(l => l.split(',')[2]).filter(Boolean));
const cv = {};
for (const r of readRows('character-values.csv')) {
  const k = `${r.asset}.${r.field}`;
  (cv[k] ??= { mapped: mapped.has(r.field), vals: {} }).vals[r.value] = (cv[k].vals[r.value] || 0) + 1;
}
const charVals = Object.fromEntries(Object.entries(cv).filter(([, v]) => !v.mapped && Object.keys(v.vals).length > 1)
  .map(([k, v]) => [k, { n: Object.values(v.vals).reduce((a, b) => a + b, 0), distinct: Object.keys(v.vals).length,
    top: Object.entries(v.vals).sort((a, b) => b[1] - a[1]).slice(0, 5) }]));

fs.writeFileSync(out, JSON.stringify({ melee, ki, charVals }, null, 1));
console.log('melee actions', Object.keys(melee).length, 'ki actions', Object.keys(ki).length, 'unmapped varying char fields', Object.keys(charVals).length);
