/**
 * Reads the committed FModel snapshot (data/snapshots/fmodel/, written by pull-fmodel.mjs) for
 * the build and the parity checks. Resolves what the long tables leave implicit:
 *   - a missing character value is Unreal's default, from data/fmodel-fields.csv;
 *   - an action's parameter files are the character's own rows, else the usual (default) file,
 *     in the game file's part order;
 *   - a buff, attack or bullet file's fields come from the *-params tables.
 */
import fs from 'fs';
import path from 'path';
import { readCsv } from './csv.mjs';

export function loadFmodel(dataDir) {
  const dir = path.join(dataDir, 'snapshots', 'fmodel');
  if (!fs.existsSync(path.join(dir, 'MANIFEST.json'))) return null;
  const rows = (f) => readCsv(path.join(dir, f)).rows;
  const group = (list, key) => {
    const m = new Map();
    for (const r of list) { const k = key(r); if (!m.has(k)) m.set(k, []); m.get(k).push(r); }
    return m;
  };

  const characters = new Map(rows('characters.csv').map(r => [r.id, r]));
  const values = new Map(rows('character-values.csv').map(r => [`${r.id}|${r.asset}|${r.field}`, r.value]));
  const fieldMap = new Map(readCsv(path.join(dataDir, 'fmodel-fields.csv')).rows.map(r => [r.field, r]));

  const tables = new Map(rows('tables.csv').map(r => [`${r.table}|${r.key}|${r.field}`, r.value]));
  const params = new Map();
  for (const f of ['combative-params.csv', 'bullet-params.csv', 'buff-params.csv', 'move-values.csv']) {
    for (const r of rows(f)) {
      if (!params.has(r.file)) params.set(r.file, []);
      params.get(r.file).push(r);
    }
  }
  const param = (file, field) => params.get(file)?.find(r => r.field === field)?.value;

  // An action is one part ("None") or several ("1/3発目", …): the files in the game's part order.
  function resolver(defaultsFile, ownFile) {
    const def = new Map(), own = new Map(), parts = new Map();
    const addPart = (action, part, order) => {
      if (!parts.has(action)) parts.set(action, new Map());
      if (!parts.get(action).has(part)) parts.get(action).set(part, Number(order));
    };
    for (const r of rows(defaultsFile)) { def.set(`${r.action}|${r.part}`, r.file); addPart(r.action, r.part, r.order); }
    for (const r of rows(ownFile)) { own.set(`${r.id}|${r.action}|${r.part}`, r.file); addPart(r.action, r.part, r.order); }
    return (id, action) => [...(parts.get(action) || new Map())].sort((a, b) => a[1] - b[1])
      .map(([part]) => (own.has(`${id}|${action}|${part}`) ? own.get(`${id}|${action}|${part}`) : def.get(`${action}|${part}`)) || '')
      .filter(Boolean);
  }

  const buffs = group(rows('buffs.csv'), r => r.id);
  const moves = group(rows('moves.csv'), r => r.id);
  const capsuleEffects = group(rows('capsule-effects.csv'), r => r.id);

  return {
    characters,
    /** A raw character value as exported, or undefined when Unreal left it out. */
    raw: (id, asset, field) => values.get(`${id}|${asset}|${field}`),
    /** A field-map field (fmodel-fields.csv) with Unreal's default filled in; null when unknown. */
    field(id, name) {
      const f = fieldMap.get(name);
      if (!f) throw new Error(`fmodel-fields.csv has no field "${name}"`);
      const v = values.get(`${id}|${f.asset}|${f.path}`) ?? (f.default !== '' ? f.default : undefined);
      return v === undefined ? null : Number(v);
    },
    table: (table, key, field) => tables.get(`${table}|${key}|${field}`),
    attackFiles: resolver('combative-defaults.csv', 'combatives.csv'),
    bulletFiles: resolver('bullet-defaults.csv', 'bullets.csv'),
    param,
    paramsOf: (file) => params.get(file) || [],
    buffsOf: (id) => buffs.get(id) || [],
    movesOf: (id) => moves.get(id) || [],
    capsules: new Map(rows('capsules.csv').map(r => [r.id, r])),
    capsuleEffectsOf: (id) => capsuleEffects.get(id) || [],
  };
}
