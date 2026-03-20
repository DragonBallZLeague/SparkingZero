import React, { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { totalCapsuleCost, CAPSULE_BUDGET } from '../utils/calculator.js';

const COST_COLORS = ['', 'text-gray-400', 'text-blue-400', 'text-yellow-400', 'text-orange-400', 'text-red-500'];

function Stars({ cost }) {
  return <span className={`font-bold text-sm ${COST_COLORS[cost] ?? 'text-gray-400'}`}>{cost}★</span>;
}

function SlotTable({ equippedCapsules, activeSlot, onSlotClick, onRemove, label }) {
  const totalCost = totalCapsuleCost(equippedCapsules);
  const overBudget = totalCost > CAPSULE_BUDGET;
  const pct = Math.min(100, (totalCost / CAPSULE_BUDGET) * 100);

  return (
    <div className="flex flex-col">
      {/* Budget bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-sz-border">
        <span className="text-xs text-gray-500 font-semibold">{label}</span>
        <span className={`text-xs font-mono font-bold ml-auto ${overBudget ? 'text-red-400' : 'text-sz-orange'}`}>
          {totalCost}/{CAPSULE_BUDGET}
        </span>
      </div>
      <div className="h-1 bg-sz-border">
        <div
          className={`h-full transition-all ${overBudget ? 'bg-red-500' : 'bg-sz-orange'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <table className="w-full">
        <tbody>
          {equippedCapsules.map((cap, i) => {
            const isActive = activeSlot === i;
            return (
              <tr
                key={i}
                onClick={() => onSlotClick(isActive ? null : i)}
                className={`border-b border-sz-border/30 cursor-pointer transition-colors ${
                  isActive ? 'bg-orange-950/40' : cap ? 'hover:bg-gray-800/50' : 'hover:bg-gray-900/40'
                }`}
              >
                <td className={`py-1.5 px-2 text-xs font-mono ${isActive ? 'text-sz-orange' : 'text-gray-600'}`}>{i + 1}</td>
                <td className="py-1.5 px-1.5 text-xs truncate max-w-0 w-full">
                  {cap
                    ? <span className="text-gray-200">{cap.name}</span>
                    : <span className="text-gray-700 italic">empty</span>
                  }
                </td>
                <td className="py-1.5 px-1.5 text-right">
                  {cap ? <Stars cost={cap.cost} /> : <span className="text-xs text-gray-700">—</span>}
                </td>
                <td className="py-1.5 px-1 w-5">
                  {cap && (
                    <button
                      onClick={e => { e.stopPropagation(); onRemove(i); }}
                      className="text-gray-700 hover:text-red-400 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * CompareCapsuleBuilder — single panel with A/B tab to manage both builds.
 * Used on tablet and mobile where space is limited.
 */
export default function CompareCapsuleBuilder({
  capsules,
  equippedCapsulesA,
  equippedCapsulesB,
  activeSlotA,
  activeSlotB,
  onSlotClickA,
  onSlotClickB,
  onEquipA,
  onEquipB,
  onRemoveA,
  onRemoveB,
  onClearA,
  onClearB,
}) {
  const [tab, setTab] = useState('A');
  const [search, setSearch] = useState('');
  const [costFilter, setCostFilter] = useState('');

  const equippedCapsules = tab === 'A' ? equippedCapsulesA : equippedCapsulesB;
  const activeSlot = tab === 'A' ? activeSlotA : activeSlotB;
  const onSlotClick = tab === 'A' ? onSlotClickA : onSlotClickB;
  const onEquip = tab === 'A' ? onEquipA : onEquipB;
  const onClear = tab === 'A' ? onClearA : onClearB;

  const equippedNames = useMemo(() =>
    new Set(equippedCapsules.filter(Boolean).map(c => c.name)),
    [equippedCapsules]
  );

  const filteredCapsules = useMemo(() => {
    let list = capsules;
    if (costFilter) list = list.filter(c => c.cost === parseInt(costFilter));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [capsules, costFilter, search]);

  return (
    <div className="flex flex-col h-full">
      {/* Header with A/B tabs */}
      <div className="px-3 py-2 border-b border-sz-border bg-sz-panel/80 flex items-center justify-between flex-shrink-0">
        <div className="flex gap-1">
          {['A', 'B'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                tab === t
                  ? 'bg-sz-orange text-black'
                  : 'bg-sz-border text-gray-400 hover:text-white'
              }`}
            >
              Char {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Capsules</span>
          {equippedCapsules.some(Boolean) && (
            <button onClick={onClear} className="text-xs text-gray-600 hover:text-red-400 transition-colors">Clear</button>
          )}
        </div>
      </div>

      {/* Slot table for active tab */}
      <div className="flex-shrink-0">
        <SlotTable
          equippedCapsules={equippedCapsules}
          activeSlot={activeSlot}
          onSlotClick={onSlotClick}
          onRemove={tab === 'A' ? onRemoveA : onRemoveB}
          label={`Character ${tab} Build`}
        />
      </div>

      {activeSlot !== null && (
        <div className="px-3 py-1.5 text-xs text-sz-orange/70 bg-orange-950/20 border-b border-sz-border flex-shrink-0">
          Slot {activeSlot + 1} selected — click a capsule to place it here
        </div>
      )}

      {/* Search bar */}
      <div className="flex gap-1.5 px-2 py-1.5 border-b border-sz-border flex-shrink-0">
        <div className="relative flex-1">
          <Search size={10} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search capsules…"
            className="w-full pl-6 pr-2 py-1.5 bg-sz-border rounded text-xs text-gray-200 placeholder-gray-600 outline-none focus:ring-1 focus:ring-sz-orange"
          />
        </div>
        <select
          value={costFilter}
          onChange={e => setCostFilter(e.target.value)}
          className="bg-sz-border rounded text-xs text-gray-300 px-2 outline-none"
        >
          <option value="">All</option>
          {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}★</option>)}
        </select>
      </div>

      {/* Capsule list */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <table className="w-full">
          <tbody>
            {filteredCapsules.map(cap => {
              const alreadyEquipped = equippedNames.has(cap.name);
              return (
                <tr
                  key={cap.name}
                  onClick={() => !alreadyEquipped && onEquip(cap)}
                  className={`border-b border-sz-border/20 transition-colors ${
                    alreadyEquipped
                      ? 'opacity-40 cursor-not-allowed'
                      : 'cursor-pointer hover:bg-gray-800/40'
                  }`}
                >
                  <td className="py-1.5 px-2 text-xs text-gray-200 leading-tight max-w-0 w-full truncate">
                    {cap.name}
                  </td>
                  <td className="py-1.5 px-1.5 text-right">
                    <Stars cost={cap.cost} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
