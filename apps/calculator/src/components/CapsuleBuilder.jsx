import React, { useState, useMemo } from 'react';
import { X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { totalCapsuleCost, CAPSULE_BUDGET } from '../utils/calculator.js';

const COST_COLORS = ['', 'text-gray-400', 'text-blue-400', 'text-yellow-400', 'text-orange-400', 'text-red-500'];

function Stars({ cost }) {
  return <span className={`font-bold text-sm ${COST_COLORS[cost] ?? 'text-gray-400'}`}>{cost}★</span>;
}

export default function CapsuleBuilder({
  capsules,
  equippedCapsules,
  activeSlot,
  onSlotClick,
  onEquip,
  onRemove,
  onClear,
  onCollapse,
  budget,
  collapseDirection = 'right',
}) {
  const [search, setSearch] = useState('');
  const [costFilter, setCostFilter] = useState('');

  const totalCost = totalCapsuleCost(equippedCapsules);
  const overBudget = totalCost > budget;
  const pct = Math.min(100, (totalCost / budget) * 100);

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
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-sz-border bg-sz-panel/80 flex items-center justify-between">
        <span className="text-sm font-bold uppercase tracking-widest text-gray-400">Capsules</span>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-mono font-bold ${overBudget ? 'text-red-400' : 'text-sz-orange'}`}>
            {totalCost}/{budget}
          </span>
          {equippedCapsules.some(Boolean) && (
            <button onClick={onClear} className="text-sm text-gray-600 hover:text-red-400 transition-colors">Clear</button>
          )}
          <button onClick={onCollapse} className="flex items-center gap-1 px-2 py-0.5 rounded bg-sz-border hover:bg-gray-600 text-gray-400 hover:text-white transition-colors text-xs font-medium" title="Collapse">
            {collapseDirection === 'right' ? (
              <><span>Hide</span><ChevronRight size={13} /></>
            ) : (
              <><ChevronLeft size={13} /><span>Hide</span></>
            )}
          </button>
        </div>
      </div>

      {/* Budget bar */}
      <div className="h-1.5 bg-sz-border">
        <div
          className={`h-full transition-all ${overBudget ? 'bg-red-500' : 'bg-sz-orange'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Slot table */}
      <table className="w-full">
        <thead>
          <tr className="border-b border-sz-border">
            <th className="py-1.5 px-2 text-sm text-gray-600 font-medium text-left w-6">#</th>
            <th className="py-1.5 px-1.5 text-sm text-gray-600 font-medium text-left">Capsule</th>
            <th className="py-1.5 px-1.5 text-sm text-gray-600 font-medium text-right w-10">Cost</th>
            <th className="w-6"></th>
          </tr>
        </thead>
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
                <td className={`py-1.5 px-2 text-sm font-mono ${isActive ? 'text-sz-orange' : 'text-gray-600'}`}>{i + 1}</td>
                <td className="py-1.5 px-1.5 text-sm truncate max-w-0 w-full">
                  {cap
                    ? <span className="text-gray-200">{cap.name}</span>
                    : <span className="text-gray-700 italic">empty</span>
                  }
                </td>
                <td className="py-1.5 px-1.5 text-right">
                  {cap ? <Stars cost={cap.cost} /> : <span className="text-sm text-gray-700">—</span>}
                </td>
                <td className="py-1.5 px-1">
                  {cap && (
                    <button
                      onClick={e => { e.stopPropagation(); onRemove(i); }}
                      className="text-gray-700 hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {activeSlot !== null && (
        <div className="px-3 py-2 text-sm text-sz-orange/70 bg-orange-950/20 border-b border-sz-border">
          Slot {activeSlot + 1} selected — click a capsule to place it here
        </div>
      )}

      {/* Picker search */}
      <div className="flex gap-1.5 px-2 py-1.5 border-b border-sz-border">
        <div className="relative flex-1">
          <Search size={10} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full pl-6 pr-2 py-2 bg-sz-border rounded text-sm text-gray-200 placeholder-gray-600 outline-none focus:ring-1 focus:ring-sz-orange"
          />
        </div>
        <select
          value={costFilter}
          onChange={e => setCostFilter(e.target.value)}
          className="bg-sz-border rounded text-sm text-gray-300 px-2 outline-none"
        >
          <option value="">All</option>
          {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}★</option>)}
        </select>
      </div>

      {/* Capsule list table */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-sz-panel z-10">
            <tr className="border-b border-sz-border">
              <th className="py-1.5 px-2 text-sm text-gray-600 font-medium text-left">Name</th>
              <th className="py-1.5 px-1.5 text-sm text-gray-600 font-medium text-right w-10">★</th>
            </tr>
          </thead>
          <tbody>
            {filteredCapsules.map(cap => {
              const equipped = equippedNames.has(cap.name);
              const hasOpenSlot = equippedCapsules.some(c => c === null);
              const canSelect = !equipped && (activeSlot !== null || hasOpenSlot);
              const slotCost = activeSlot !== null ? (equippedCapsules[activeSlot]?.cost ?? 0) : 0;
              const wouldExceed = canSelect && (totalCost - slotCost + cap.cost > budget);

              return (
                <tr
                  key={cap.name}
                  onClick={() => canSelect && onEquip(cap)}
                  className={`border-b border-sz-border/20 group ${
                    equipped
                      ? 'opacity-40 cursor-not-allowed'
                      : !canSelect
                      ? 'cursor-default opacity-50'
                      : wouldExceed
                      ? 'cursor-pointer hover:bg-red-950/30'
                      : 'cursor-pointer hover:bg-gray-800/60'
                  }`}
                >
                  <td className="py-1.5 px-2">
                    <div className="text-sm text-gray-200 leading-tight">{cap.name}</div>
                    {cap.description && (
                      <div className="text-sm text-gray-500 leading-tight mt-0.5 line-clamp-2">{cap.description}</div>
                    )}
                  </td>
                  <td className="py-1.5 px-1.5 text-right align-top pt-1.5">
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
