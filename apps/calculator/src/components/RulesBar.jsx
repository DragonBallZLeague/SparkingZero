import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useRules, groupOverages, bannedEquipped } from '../utils/rules.js';

/** Ruleset picker (optional) plus warnings for one loadout under the selected ruleset. */
export default function RulesBar({ equipped, capsules, showPicker = false }) {
  const { ruleset, rulesets, setRuleset } = useRules();
  const over = groupOverages(equipped, ruleset, capsules);
  const banned = bannedEquipped(equipped, ruleset);
  const unknownCost = (equipped || []).filter(c => c && typeof c.cost !== 'number');
  if (!showPicker && !over.length && !banned.length && !unknownCost.length) return null;
  return (
    <div className="border-b border-sz-border">
      {showPicker && rulesets.length > 1 && (
        <div className="flex items-center gap-2 px-3 py-1.5">
          <span className="text-xs text-gray-500">Ruleset</span>
          <select
            value={ruleset?.name ?? ''}
            onChange={e => setRuleset(e.target.value)}
            className="flex-1 bg-sz-border rounded text-xs text-gray-200 px-2 py-1 outline-none"
            title="Capsule ruleset (league capsule-rules.yaml): budget, bans and group caps"
          >
            {rulesets.map(r => <option key={r.name} value={r.name}>{r.name} · {r.totalCost} pts</option>)}
          </select>
        </div>
      )}
      {over.map((g, i) => (
        <div key={i} className="flex items-start gap-1.5 px-3 py-1 text-xs text-red-300 bg-red-950/30">
          <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
          <span>{g.names.join(' / ')}: {g.cost} pts equipped, {ruleset.name} allows {g.maxCost}</span>
        </div>
      ))}
      {banned.length > 0 && (
        <div className="flex items-start gap-1.5 px-3 py-1 text-xs text-red-300 bg-red-950/30">
          <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
          <span>Banned in {ruleset.name}: {banned.map(c => c.name).join(', ')}</span>
        </div>
      )}
      {unknownCost.length > 0 && (
        <div className="flex items-start gap-1.5 px-3 py-1 text-xs text-amber-300 bg-amber-950/20">
          <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
          <span>Cost not confirmed (counted as 0): {unknownCost.map(c => c.name).join(', ')}</span>
        </div>
      )}
    </div>
  );
}
