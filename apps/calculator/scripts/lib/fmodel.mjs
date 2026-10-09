/**
 * Reads an FModel JSON export of the game files (Unreal Engine assets) for the
 * calculator's data pull (scripts/pull-fmodel.mjs).
 *
 * An export is one JSON file per asset: `[{Type, Name, Properties}]`. Assets point at
 * each other by `{ObjectName, ObjectPath: "/Game/SS/MasterDataAsset/Buff/Buff_0000_00.0"}`,
 * which maps to `<Content>/SS/MasterDataAsset/Buff/Buff_0000_00.json`.
 *
 * Unreal leaves out every property that equals the class default, so a missing field is
 * not "no value": it is the default (e.g. DP 5 and Life 50,000 are never written). The pull
 * keeps fields as exported; the defaults live in the build's field map.
 */
import fs from 'fs';
import path from 'path';

/** Accepts the export folder (…/Exports/SparkingZERO), its Content folder, or Content's parent. */
export function contentDir(root) {
  for (const p of [path.join(root, 'Content'), root]) {
    if (fs.existsSync(path.join(p, 'SS', 'MasterDataAsset'))) return p;
  }
  throw new Error(`FModel export not found under ${root} (expected Content/SS/MasterDataAsset)`);
}

export function openExport(root) {
  const content = contentDir(root);
  const cache = new Map();
  let loaded = 0;

  /** Load an asset by `/Game/...` object path, a `{ObjectPath}` ref, or a path relative to Content. */
  function load(ref) {
    const p = typeof ref === 'string' ? ref : ref?.ObjectPath;
    if (!p) return null;
    const rel = p.replace(/^\/Game\//, '').replace(/\.\d+$/, '').replace(/\.json$/, '');
    if (cache.has(rel)) return cache.get(rel);
    const file = path.join(content, rel + '.json');
    let asset = null;
    if (fs.existsSync(file)) {
      const j = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
      const first = Array.isArray(j) ? j.find(x => x && x.Properties) || j[0] : j;
      asset = { name: first?.Name ?? path.basename(rel), type: first?.Type ?? null, props: first?.Properties ?? {} };
      loaded++;
    }
    cache.set(rel, asset);
    return asset;
  }

  function list(dir, pattern) {
    const d = path.join(content, dir);
    if (!fs.existsSync(d)) return [];
    return fs.readdirSync(d).filter(f => f.endsWith('.json') && (!pattern || pattern.test(f))).map(f => path.posix.join(dir, f.slice(0, -5)));
  }

  return { content, load, list, stats: () => ({ loaded }) };
}

/** The asset name a ref points at ("Buff_0000_00"), or '' for none. */
export function refName(ref) {
  const p = ref?.ObjectPath;
  if (!p) return '';
  return p.split('/').pop().replace(/\.\d+$/, '');
}

/** The folder of a ref, relative to MasterDataAsset ("Buff/Skill"). */
export function refFolder(ref) {
  const p = ref?.ObjectPath || '';
  const m = p.match(/^\/Game\/SS\/MasterDataAsset\/(.+)\/[^/]+$/);
  return m ? m[1] : '';
}

const isRef = (v) => v && typeof v === 'object' && !Array.isArray(v) && 'ObjectPath' in v;

/**
 * Every scalar leaf of an object as [dotted path, value]. Refs become the asset name they
 * point at. Localized text becomes its key. `skip` (a RegExp) drops any subtree whose key
 * matches; `drop(path, value)` drops single leaves.
 */
export function leaves(obj, { skip = null, drop = null, prefix = '' } = {}) {
  const out = [];
  const walk = (v, p) => {
    if (v === null || v === undefined) return;
    if (isRef(v)) { const n = refName(v); if (n && !(drop && drop(p, n))) out.push([p, n]); return; }
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${p}[${i}]`)); return; }
    if (typeof v === 'object') {
      if ('Key' in v && ('SourceString' in v || 'TableId' in v || Object.keys(v).length === 1)) {
        if (typeof v.Key === 'string' && !(drop && drop(p, v.Key))) out.push([p, v.Key]);
        else if (typeof v.Key === 'object') walk(v.Key, p);
        return;
      }
      for (const [k, x] of Object.entries(v)) {
        if (skip && skip.test(k)) continue;
        walk(x, p ? `${p}.${k}` : k);
      }
      return;
    }
    if (drop && drop(p, v)) return;
    out.push([p, v]);
  };
  walk(obj, prefix);
  return out;
}

/** A leaf value as committed text: numbers as JavaScript prints them, booleans as true/false. */
export function text(v) {
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Number(v.toPrecision(9)));
  return String(v);
}

/** English strings: every Localization/<namespace>/en/<namespace>.json merged into one key -> text map. */
export function englishStrings(content) {
  const L = path.join(content, 'Localization');
  const map = new Map();
  if (!fs.existsSync(L)) return map;
  for (const ns of fs.readdirSync(L)) {
    const f = path.join(L, ns, 'en', `${ns}.json`);
    if (!fs.existsSync(f)) continue;
    const j = JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''));
    for (const entries of Object.values(j)) {
      if (entries && typeof entries === 'object') for (const [k, v] of Object.entries(entries)) map.set(k, v);
    }
  }
  return map;
}
