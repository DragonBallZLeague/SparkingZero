/**
 * Capsule rulesets (referencedata/capsule-rules.yaml, published in meta.json):
 * the selected ruleset sets the cost budget, hides its banned capsules, and caps
 * the total cost of some capsule groups (e.g. Rush/Smash/Blast Attack Boost <= 6).
 *
 * Provided once by App through RulesContext; builders read it with useRules().
 */
import { createContext, useContext } from 'react';

export const DEFAULT_BUDGET = 20;

export const RulesContext = createContext({
  ruleset: null,
  rulesets: [],
  budget: DEFAULT_BUDGET,
  setRuleset: () => {},
});

export function useRules() {
  return useContext(RulesContext);
}

/** Capsule cost for budget sums; an empty slot counts 0. */
export function capsuleCost(c) {
  return typeof c?.cost === 'number' ? c.cost : 0;
}

export function totalCost(equipped) {
  return (equipped || []).reduce((sum, c) => sum + capsuleCost(c), 0);
}

/** Groups whose equipped cost exceeds the ruleset's cap: [{ names, cost, maxCost }]. */
export function groupOverages(equipped, ruleset, capsules) {
  if (!ruleset?.groups?.length) return [];
  const byId = new Map((capsules || []).map(c => [c.id, c]));
  const out = [];
  for (const g of ruleset.groups) {
    const ids = new Set(g.ids);
    const inGroup = (equipped || []).filter(c => c && ids.has(c.id));
    const cost = inGroup.reduce((s, c) => s + capsuleCost(c), 0);
    if (cost > g.maxCost) {
      const families = [...new Set(g.ids.map(id => byId.get(id)?.name?.replace(/\s+\d+$/, '')).filter(Boolean))];
      out.push({ names: families, cost, maxCost: g.maxCost });
    }
  }
  return out;
}

/** Equipped capsules the ruleset bans. */
export function bannedEquipped(equipped, ruleset) {
  if (!ruleset) return [];
  const banned = new Set(ruleset.banned);
  return (equipped || []).filter(c => c && banned.has(c.id));
}
