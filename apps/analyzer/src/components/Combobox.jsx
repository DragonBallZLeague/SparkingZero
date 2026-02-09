import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFloating, offset, flip, shift, size, autoUpdate } from '@floating-ui/react-dom';

// Accessible Combobox component with keyboard navigation, filtering, and smart positioning
export const Combobox = ({
  valueId,
  items,
  placeholder,
  onSelect, // (id, name)
  getName = (it) => it.name,
  disabled = false,
  renderItemRight = null,
  renderValueRight = null,
  showTooltip = false, // Disabled by default for analyzer
  darkMode = false,
  focusColor = 'purple', // 'purple' | 'blue' | 'orange'
}) => {
  const [input, setInput] = useState(() => {
    const found = items.find((it) => it.id === valueId);
    return found ? getName(found) : "";
  });

  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [isPositioned, setIsPositioned] = useState(false); // Track if dropdown is positioned
  const [showDropdown, setShowDropdown] = useState(false); // Delayed show for smooth positioning
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const found = items.find((it) => it.id === valueId);
    // If we have a matching item, show its name; otherwise clear the input so stale names don't persist
    setInput(found ? getName(found) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueId, items]);

  const filtered = input
    ? items.filter((it) => getName(it).toLowerCase().includes(input.toLowerCase()))
    : items.slice(0, 50);

  const selectedItem = items.find((it) => it.id === valueId);
  
  // Tooltip state for showing item effects on hover/focus
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [tooltipContent, setTooltipContent] = useState("");
  const tooltipTimer = useRef(null);
  const blurTimer = useRef(null);
  const selectedHoverNodeRef = useRef(null);
  const lastShowRef = useRef(0);
  const currentTooltipRef = useRef(null);
  const myComboboxId = useRef(typeof window !== 'undefined' ? (window.__combobox_id_counter = (window.__combobox_id_counter || 0) + 1) : Math.random());
  
  const { refs: tRefs, floatingStyles: tFloatingStyles, update: tUpdate } = useFloating({
    placement: 'top',
    middleware: [offset(8), flip()],
    whileElementsMounted: autoUpdate,
  });

  const showTooltipFor = (el, content) => {
    // Force any other combobox instances to hide their tooltips immediately
    try { if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('combobox:hide-all')); } catch(e){}
    if (!el) return;
    // Always clear any pending tooltip timers immediately
    if (tooltipTimer.current) {
      clearTimeout(tooltipTimer.current);
      tooltipTimer.current = null;
    }
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
    // choose a stable DOM node to anchor the tooltip
    const node = (el && (el.nodeType ? el : (el.current || null))) || null;
    const attached = node && typeof document !== 'undefined' && document.body.contains(node);
    const refNode = attached ? node : (inputRef.current || node);
    currentTooltipRef.current = refNode;
    // mark this combobox as the globally active tooltip owner
    try { if (typeof window !== 'undefined') window.__combobox_activeId = myComboboxId.current; } catch (e) {}
    setTooltipContent(content || "");
    lastShowRef.current = Date.now();
    try { tRefs.setReference(refNode); } catch (e) {}
    setTooltipOpen(true);
    // schedule update after refs settle
    try { if (typeof tUpdate === 'function') setTimeout(() => { try { tUpdate(); } catch(e){} }, 0); } catch(e){}
  };

  // Listen for a global 'hide all' event so any combobox can force other
  // instances to immediately hide their tooltips. This is used to prevent
  // overlapping tooltips when quickly moving the pointer across controls.
  useEffect(() => {
    const handler = () => { try { hideTooltipNow(); } catch(e){} };
    try { document.addEventListener('combobox:hide-all', handler); } catch(e){}
    return () => { try { document.removeEventListener('combobox:hide-all', handler); } catch(e){} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for the global 'close all comboboxes' event to ensure only one combobox is open at a time
  useEffect(() => {
    const handler = (event) => {
      try {
        if (event.detail?.except !== myComboboxId.current) {
          closeList();
        }
      } catch(e){}
    };
    try { window.addEventListener('close-all-comboboxes', handler); } catch(e){}
    return () => { try { window.removeEventListener('close-all-comboboxes', handler); } catch(e){} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hideTooltipSoon = (delay = 120) => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => {
      // if another combobox has become active since this hide was scheduled, allow hide immediately
      try { if (typeof window !== 'undefined' && window.__combobox_activeId && window.__combobox_activeId !== myComboboxId.current) {
        // another combobox is active; proceed to hide
      } } catch(e){}
      // If the selected-value is currently hovered, and it's the same node the tooltip
      // is anchored to, abort hiding to avoid flicker
      if (selectedHoverNodeRef.current) {
        if (currentTooltipRef.current && currentTooltipRef.current === selectedHoverNodeRef.current) {
          tooltipTimer.current = null;
          return;
        }
      }
      // If a tooltip was shown very recently, avoid hiding immediately (anti-flicker)
      const now = Date.now();
      if (lastShowRef.current && (now - lastShowRef.current) < 300) {
        tooltipTimer.current = null;
        return;
      }
      setTooltipOpen(false);
      setTooltipContent("");
      currentTooltipRef.current = null;
      tooltipTimer.current = null;
    }, delay);
  };

  const hideTooltipNow = () => {
    if (tooltipTimer.current) { clearTimeout(tooltipTimer.current); tooltipTimer.current = null; }
    if (blurTimer.current) { clearTimeout(blurTimer.current); blurTimer.current = null; }
    currentTooltipRef.current = null;
    try { if (typeof window !== 'undefined' && window.__combobox_activeId === myComboboxId.current) window.__combobox_activeId = null; } catch(e){}
    setTooltipOpen(false);
    setTooltipContent("");
  };

  // Floating UI: robust positioning, flipping, and auto-updates
  const { refs, update, floatingStyles, x, y, strategy, placement: currentPlacement } = useFloating({
    placement: 'bottom-start',
    strategy: 'fixed', // Use fixed positioning to avoid scroll issues
    middleware: [
      offset(({ placement }) => {
        // Different offsets based on whether dropdown is above or below
        return placement.startsWith('top') ? 16 : -16;
      }),
      flip(),
      shift(),
      size({
        apply({ rects, availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            width: `${rects.reference.width}px`,
            maxHeight: `${Math.min(availableHeight, 400)}px`,
            overflow: 'auto',
          });
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const openList = () => {
    if (!disabled) {
      // Close any other open comboboxes before opening this one
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('close-all-comboboxes', { detail: { except: myComboboxId.current } }));
      }
      setOpen(true);
    }
  };

  const closeList = () => {
    setOpen(false);
    setHighlight(-1);
  };

  const commitSelection = (item) => {
    if (item) {
      setInput(getName(item));
      onSelect(item.id, getName(item));
    } else {
      // no match -> clear
      setInput("");
      onSelect('', '');
    }
    closeList();
    // hide tooltip immediately on selection to avoid dangling/tooltips at 0,0
    try { hideTooltipNow(); } catch (e) {}
    inputRef.current?.blur();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      openList();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      openList();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && highlight >= 0 && highlight < filtered.length) {
        commitSelection(filtered[highlight]);
      } else {
        // try exact match
        const exact = items.find((it) => getName(it).toLowerCase() === input.toLowerCase());
        commitSelection(exact || null);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeList();
    }
  };

  // keep floating position updated when open
  useEffect(() => {
    if (!open) return;
    // ensure reference is registered
    try { refs.setReference?.(inputRef.current); } catch (e) {}
    // update() will be called automatically by autoUpdate, but call once to be sure
    if (typeof update === 'function') update();
  }, [open, refs, update]);

  // Track when dropdown is positioned to prevent flash
  useEffect(() => {
    if (open && x !== null && y !== null) {
      // Set positioned immediately when coordinates are available
      setIsPositioned(true);
      setShowDropdown(true);
    } else if (!open) {
      // Reset states when closed
      setIsPositioned(false);
      setShowDropdown(false);
    }
  }, [open, x, y]);

  // When highlight changes due to keyboard navigation, ensure the highlighted
  // list item is scrolled into view and (if enabled) show the tooltip for it.
  useEffect(() => {
    if (!open || highlight < 0) {
      if (showTooltip) hideTooltipSoon();
      return;
    }
    // find the rendered list container (portal floating or inline listRef)
    const container = (refs && refs.floating && refs.floating.current) || listRef.current;
    if (!container) return;
    const item = container.querySelector(`[data-idx="${highlight}"]`);
    if (item) {
      try {
        // scroll highlighted item into view within the container
        item.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      } catch (e) {}
      if (showTooltip) {
        try {
          const node = item.querySelector('.combobox-item-name');
          if (node) showTooltipFor(node, (filtered[highlight] && (filtered[highlight].effect || filtered[highlight].Effect)) || '');
        } catch (e) {}
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlight, open, showTooltip, filtered]);

  // Color classes based on focus color and dark mode
  const getFocusColorClasses = () => {
    const colors = {
      purple: darkMode 
        ? 'focus:border-purple-500 focus:ring-purple-500/50' 
        : 'focus:border-purple-500 focus:ring-purple-500/50',
      blue: darkMode 
        ? 'focus:border-blue-500 focus:ring-blue-500/50' 
        : 'focus:border-blue-500 focus:ring-blue-500/50',
      orange: darkMode 
        ? 'focus:border-orange-400 focus:ring-orange-400/50' 
        : 'focus:border-orange-400 focus:ring-orange-400/50',
    };
    return colors[focusColor] || colors.purple;
  };

  const getCaretColor = () => {
    const colors = {
      purple: '#a855f7',
      blue: '#3b82f6',
      orange: '#fb923c',
    };
    return colors[focusColor] || colors.purple;
  };

  const inputClasses = `w-full px-3 py-2 border rounded text-xs font-medium focus:outline-none focus:ring-2 transition-all ${
    darkMode 
      ? 'bg-gray-800 text-white border-gray-600 placeholder-gray-400' 
      : 'bg-white text-gray-900 border-gray-300 placeholder-gray-500'
  } ${getFocusColorClasses()} ${disabled ? 'opacity-60' : ''}`;

  const dropdownClasses = darkMode
    ? 'bg-gray-800 border-gray-600'
    : 'bg-white border-gray-300';

  const itemClasses = (isHighlighted) => darkMode
    ? `px-3 py-2 cursor-pointer text-sm ${isHighlighted ? 'bg-gray-700 text-white' : 'text-gray-200 hover:bg-gray-700'}`
    : `px-3 py-2 cursor-pointer text-sm ${isHighlighted ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`;

  return (
    <div className="relative" onKeyDown={onKeyDown}>
      <div className="relative" onPointerLeave={() => { if (showTooltip) hideTooltipNow(); }}>
        <input
          ref={(el) => { inputRef.current = el; }}
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); openList(); }}
          onFocus={(e) => { openList(); if (showTooltip && selectedItem) showTooltipFor(e.currentTarget, selectedItem.effect || selectedItem.Effect); }}
          onBlur={(e) => {
            if (blurTimer.current) clearTimeout(blurTimer.current);
            blurTimer.current = setTimeout(() => { closeList(); if (showTooltip) hideTooltipNow(); blurTimer.current = null; }, 200);
          }}
          onMouseEnter={(e) => { if (showTooltip && selectedItem) showTooltipFor(e.currentTarget, selectedItem.effect || selectedItem.Effect); }}
          onMouseLeave={() => { if (showTooltip) hideTooltipSoon(); }}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={placeholder}
          className={inputClasses}
          style={{ caretColor: getCaretColor() }}
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {renderValueRight && selectedItem ? (
          <div
            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-auto"
            onMouseEnter={(e) => { if (blurTimer.current) { clearTimeout(blurTimer.current); blurTimer.current = null; } selectedHoverNodeRef.current = e.currentTarget; if (showTooltip && selectedItem) { showTooltipFor(e.currentTarget, selectedItem.effect || selectedItem.Effect); try { if (typeof tUpdate === 'function') tUpdate(); } catch (err) {} } }}
            onMouseLeave={() => { selectedHoverNodeRef.current = null; if (showTooltip) hideTooltipNow(); }}
            onFocus={(e) => { if (showTooltip && selectedItem) { showTooltipFor(e.currentTarget, selectedItem.effect || selectedItem.Effect); try { if (typeof tUpdate === 'function') tUpdate(); } catch (err) {} } }}
            onBlur={() => { if (showTooltip) hideTooltipNow(); }}
            tabIndex={-1}
          >
            {renderValueRight(selectedItem)}
          </div>
        ) : null}
      {open && filtered.length > 0 && (
          (typeof document !== 'undefined')
          ? createPortal(
            <ul 
              ref={(el) => { try { refs.setFloating?.(el); } catch(e){} }} 
              role="listbox" 
              onPointerLeave={() => { if (showTooltip) hideTooltipNow(); }} 
              className={`max-h-96 overflow-auto border rounded shadow-lg transition-opacity duration-150 ease-in ${dropdownClasses}`}
              style={{
                ...floatingStyles,
                opacity: isPositioned ? 1 : 0,
                zIndex: 100000
              }}
            >
              {filtered.map((it, idx) => (
                <li
                  data-idx={idx}
                  key={it.id || idx}
                  onMouseDown={(ev) => { ev.preventDefault(); commitSelection(it); }}
                  onMouseEnter={(e) => { try { hideTooltipNow(); } catch(e){}; setHighlight(idx); try { const node = e.currentTarget.querySelector('.combobox-item-name'); if (node && showTooltip) showTooltipFor(node, (it && (it.effect || it.Effect)) || ''); } catch(e){} }}
                  onMouseLeave={() => { if (showTooltip) hideTooltipNow(); }}
                  className={itemClasses(highlight === idx)}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate mr-4 combobox-item-name" tabIndex={0} onFocus={(e) => { if (showTooltip) showTooltipFor(e.currentTarget, (it && (it.effect || it.Effect)) || ''); }} onBlur={() => { if (showTooltip) hideTooltipSoon(); }}>{getName(it)}</span>
                    {renderItemRight ? renderItemRight(it) : ((typeof it === 'object' && (it.cost || it.Cost)) ? (
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'}`}>{Number(it.cost || it.Cost || 0)}</span>
                    ) : null)}
                  </div>
                </li>
              ))}
            </ul>,
            document.body
          ) : (
            <ul 
              ref={listRef} 
              onPointerLeave={() => { if (showTooltip) hideTooltipNow(); }} 
              className={`absolute z-50 w-full overflow-auto border rounded shadow-lg transition-opacity duration-150 ease-in ${dropdownClasses}`}
              style={{ 
                maxHeight: '24rem',
                opacity: isPositioned ? 1 : 0
              }}
            >
              {filtered.map((it, idx) => (
                <li
                  data-idx={idx}
                  key={it.id || idx}
                  onMouseDown={(ev) => { ev.preventDefault(); commitSelection(it); }}
                  onMouseEnter={(e) => { try { hideTooltipNow(); } catch(e){}; setHighlight(idx); try { const node = e.currentTarget.querySelector('.combobox-item-name'); if (node && showTooltip) showTooltipFor(node, (it && (it.effect || it.Effect)) || ''); } catch(e){} }}
                  onMouseLeave={() => { if (showTooltip) hideTooltipNow(); }}
                  className={itemClasses(highlight === idx)}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate mr-4 combobox-item-name" tabIndex={0} onFocus={(e) => { if (showTooltip) showTooltipFor(e.currentTarget, (it && (it.effect || it.Effect)) || ''); }} onBlur={() => { if (showTooltip) hideTooltipSoon(); }}>{getName(it)}</span>
                    {renderItemRight ? renderItemRight(it) : ((typeof it === 'object' && (it.cost || it.Cost)) ? (
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'}`}>{Number(it.cost || it.Cost || 0)}</span>
                    ) : null)}
                  </div>
                </li>
              ))}
            </ul>
          )
      )}

      {/* Tooltip portal */}
      {tooltipOpen && showTooltip && (typeof document !== 'undefined') ? createPortal(
        <div 
          ref={(el) => { try { tRefs.setFloating?.(el); } catch(e){} }} 
          style={tFloatingStyles} 
          className={`z-[10000] pointer-events-none max-w-xs sm:max-w-sm md:max-w-lg lg:max-w-xl xl:max-w-2xl text-sm p-2 rounded shadow-lg whitespace-pre-wrap ${
            darkMode ? 'text-gray-100 bg-gray-900' : 'text-gray-800 bg-white border border-gray-300'
          }`}
        >
          {tooltipContent}
        </div>,
        document.body
      ) : null}
    </div>
  </div>
  );
};
