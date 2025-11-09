# Combobox Implementation Comparison

## Quick Visual Comparison

### Matchbuilder: Component-Based Architecture
```
┌─────────────────────────────────────────┐
│         Combobox Component              │
│  (Reusable, Self-Contained)             │
├─────────────────────────────────────────┤
│ ✓ Props Interface                       │
│ ✓ Internal State Management             │
│ ✓ Floating UI Integration               │
│ ✓ Portal Rendering                      │
│ ✓ Tooltip System                        │
│ ✓ Keyboard Navigation                   │
│ ✓ Global Coordination                   │
└─────────────────────────────────────────┘
          ↓ Used in
┌──────────┬──────────┬──────────┐
│ Capsule  │ Character│ Costume  │
│ Selector │ Selector │ Selector │
└──────────┴──────────┴──────────┘
```

### Analyzer: Inline Implementation Pattern
```
┌─────────────────────────────────────────┐
│           App.jsx (6861 lines)          │
├─────────────────────────────────────────┤
│                                         │
│  Character Filter (inline ~150 lines)   │
│  ┌─────────────────────────┐           │
│  │ • State: searchInput     │           │
│  │ • Input + Manual Dropdown│           │
│  │ • No Floating UI         │           │
│  │ • No Portal              │           │
│  └─────────────────────────┘           │
│                                         │
│  Team Filter (inline ~150 lines)        │
│  ┌─────────────────────────┐           │
│  │ • State: teamSearch      │           │
│  │ • Input + Manual Dropdown│           │
│  │ • No Floating UI         │           │
│  │ • No Portal              │           │
│  └─────────────────────────┘           │
│                                         │
│  AI Strategy Filter (inline ~150 lines) │
│  ┌─────────────────────────┐           │
│  │ • State: aiStrategySearch│           │
│  │ • Input + Manual Dropdown│           │
│  │ • No Floating UI         │           │
│  │ • No Portal              │           │
│  └─────────────────────────┘           │
│                                         │
│  Header File Selector (~200 lines)      │
│  ┌─────────────────────────┐           │
│  │ • State: 6 variables     │           │
│  │ • Manual positioning     │           │
│  │ • Custom event listeners │           │
│  │ • Portal (custom logic)  │           │
│  │ • Keyboard nav (custom)  │           │
│  └─────────────────────────┘           │
└─────────────────────────────────────────┘
```

---

## Feature Matrix

| Feature | Matchbuilder Combobox | Analyzer (Current) |
|---------|----------------------|-------------------|
| **Component Reusability** | ✅ Single component | ❌ Inline per instance |
| **Floating UI** | ✅ Auto-positioning | ❌ Manual or none |
| **Portal Rendering** | ✅ Document.body | ⚠️ Only header |
| **Tooltip Support** | ✅ Built-in | ❌ None |
| **Keyboard Navigation** | ✅ Full (↑↓←→ Enter Esc) | ⚠️ Partial (header only) |
| **Global Coordination** | ✅ Event-based | ❌ Independent |
| **Dark Mode** | ❌ Needs adaptation | ✅ Already supported |
| **Multi-select** | ❌ Single only | ✅ Custom per filter |
| **Accessibility** | ✅ ARIA labels | ⚠️ Partial |
| **Code Lines** | ~400 (reusable) | ~650 (duplicated) |
| **Dependencies** | @floating-ui/react-dom | @floating-ui/react |

---

## State Management Comparison

### Matchbuilder Combobox Internal State
```javascript
const [input, setInput] = useState('');           // Search input
const [open, setOpen] = useState(false);          // Dropdown visibility
const [highlight, setHighlight] = useState(-1);   // Keyboard selection
const [tooltipOpen, setTooltipOpen] = useState(false);
const [tooltipContent, setTooltipContent] = useState('');
const listRef = useRef(null);
const inputRef = useRef(null);
const myComboboxId = useRef(Math.random());
```
**Total:** 7 state variables, 3 refs (all internal)

### Analyzer Header File Selector State
```javascript
const [headerFileInput, setHeaderFileInput] = useState('');
const [headerDropdownOpen, setHeaderDropdownOpen] = useState(false);
const [headerHighlightedIndex, setHeaderHighlightedIndex] = useState(-1);
const [headerDropdownPos, setHeaderDropdownPos] = useState(null);
const headerInputRef = useRef(null);
const headerDropdownRef = useRef(null);

// Plus effects:
useEffect(() => { /* Outside click handler */ }, []);
useEffect(() => { /* Position update + resize/scroll listeners */ }, [headerDropdownOpen]);
```
**Total:** 4 state variables, 2 refs, 2 effects (all in App.jsx)

### Analyzer Character Filter State
```javascript
const [characterSearchInput, setCharacterSearchInput] = useState('');
// No refs, no effects, but manual dropdown logic inline
```
**Total:** 1 state variable (in App.jsx)

---

## Positioning Comparison

### Matchbuilder: Floating UI
```javascript
const { floatingStyles } = useFloating({
  placement: 'bottom-start',
  middleware: [
    offset(6),      // Space from input
    flip(),         // Flip if no space below
    shift(),        // Shift to stay in viewport
    size({          // Constrain size
      apply({ rects, availableHeight, elements }) {
        Object.assign(elements.floating.style, {
          width: `${rects.reference.width}px`,
          maxHeight: `${Math.min(availableHeight, 400)}px`
        });
      }
    })
  ],
  whileElementsMounted: autoUpdate  // Auto-update on scroll/resize
});
```

**Benefits:**
- Automatically flips if near bottom of viewport
- Automatically shifts if near edges
- Constrains height to available space
- Matches input width
- Updates on scroll/resize automatically

### Analyzer: Manual Positioning (Header Only)
```javascript
const updateHeaderDropdownPos = () => {
  const el = headerInputRef.current;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const newPos = { 
    top: rect.bottom + window.scrollY, 
    left: rect.left + window.scrollX, 
    width: rect.width 
  };
  setHeaderDropdownPos(newPos);
};

useEffect(() => {
  if (!headerDropdownOpen) return;
  updateHeaderDropdownPos();
  window.addEventListener('resize', updateHeaderDropdownPos);
  window.addEventListener('scroll', updateHeaderDropdownPos, true);
  return () => {
    window.removeEventListener('resize', updateHeaderDropdownPos);
    window.removeEventListener('scroll', updateHeaderDropdownPos, true);
  };
}, [headerDropdownOpen]);
```

**Issues:**
- No automatic flipping (can go off-screen)
- No edge detection (can overflow)
- Manual event listeners
- More code to maintain

### Analyzer: No Positioning (Character/Team/AI Filters)
```javascript
<div className="absolute z-10 w-full mt-1 ...">
  {/* Dropdown items */}
</div>
```

**Issues:**
- Fixed `absolute` positioning
- Can be cut off by parent overflow
- No scroll handling
- No viewport awareness

---

## Keyboard Navigation Comparison

### Matchbuilder
```javascript
const onKeyDown = (e) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    openList();
    setHighlight(h => Math.min(h + 1, filtered.length - 1));
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    openList();
    setHighlight(h => Math.max(h - 1, 0));
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (open && highlight >= 0) {
      commitSelection(filtered[highlight]);
    } else {
      const exact = items.find(it => 
        getName(it).toLowerCase() === input.toLowerCase()
      );
      commitSelection(exact || null);
    }
  } else if (e.key === 'Escape') {
    e.preventDefault();
    closeList();
  }
};

// Auto-scroll highlighted item into view
useEffect(() => {
  if (!open || highlight < 0) return;
  const item = container.querySelector(`[data-idx="${highlight}"]`);
  if (item) {
    item.scrollIntoView({ block: 'nearest' });
  }
}, [highlight, open]);
```

**Features:**
- Full arrow key navigation
- Enter to select
- Escape to close
- Auto-scrolls highlighted item into view
- Exact match on Enter if no highlight

### Analyzer Header
```javascript
const handleHeaderKeyDown = (e, options) => {
  if (!options || options.length === 0) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    setHeaderDropdownOpen(true);
    setHeaderHighlightedIndex(prev => Math.min(prev + 1, options.length - 1));
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    setHeaderHighlightedIndex(prev => Math.max(prev - 1, 0));
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const idx = headerHighlightedIndex >= 0 ? headerHighlightedIndex : 0;
    const sel = options[idx];
    if (sel) {
      handleHeaderFileSelect(sel.name || sel);
      setHeaderFileInput((sel.name || sel).replace(/\.json$/i, ''));
      setHeaderDropdownOpen(false);
      setHeaderHighlightedIndex(-1);
    }
  } else if (e.key === 'Escape') {
    setHeaderDropdownOpen(false);
    setHeaderHighlightedIndex(-1);
  }
};
```

**Features:**
- Basic arrow navigation
- Enter to select
- Escape to close
- No auto-scroll (can lose sight of highlighted item)

### Analyzer Filters (Character/Team/AI)
```javascript
// NO KEYBOARD NAVIGATION
// Only mouse clicks work
```

---

## Global Coordination

### Matchbuilder: Event-Based System
```javascript
// Open this combobox, close all others
const openList = () => {
  if (!disabled) {
    window.dispatchEvent(new CustomEvent('close-all-comboboxes', { 
      detail: { except: myComboboxId.current } 
    }));
    setOpen(true);
  }
};

// Listen for close-all event
useEffect(() => {
  const handler = (event) => {
    if (event.detail?.except !== myComboboxId.current) {
      closeList();
    }
  };
  window.addEventListener('close-all-comboboxes', handler);
  return () => window.removeEventListener('close-all-comboboxes', handler);
}, []);

// Tooltip coordination
useEffect(() => {
  const handler = () => hideTooltipNow();
  document.addEventListener('combobox:hide-all', handler);
  return () => document.removeEventListener('combobox:hide-all', handler);
}, []);
```

**Benefits:**
- Only one combobox open at a time
- Smooth tooltip transitions
- No conflicting interactions

### Analyzer: No Coordination
```javascript
// Each combobox is independent
// Multiple dropdowns can be open simultaneously
// No communication between instances
```

**Issues:**
- Confusing UX when multiple dropdowns open
- No way to close all on certain actions
- Harder to manage focus

---

## Migration Path Visualization

```
BEFORE (Analyzer)
─────────────────
App.jsx (6861 lines)
├── Character Filter Logic (~150 lines)
├── Team Filter Logic (~150 lines)
├── AI Strategy Filter Logic (~150 lines)
└── Header File Selector Logic (~200 lines)
    Total: ~650 lines of combobox code


AFTER (Migrated)
────────────────
components/
├── Combobox.jsx (~400 lines)
│   └── Reusable base component
├── AnalyzerCombobox.jsx (~50 lines)
│   └── Themed wrapper for analyzer
└── MultiSelectCombobox.jsx (~100 lines)
    └── Multi-select wrapper

App.jsx (reduced by ~500 lines)
├── <AnalyzerCombobox ... /> (1 line)
├── <MultiSelectCombobox ... /> (1 line)
├── <MultiSelectCombobox ... /> (1 line)
└── <AnalyzerCombobox ... /> (1 line)
    Total: ~4 lines of usage

NET RESULT: 
- ~550 lines moved to reusable components
- ~500 lines removed (duplicated logic)
- Better organization
- Easier to maintain
```

---

## Code Examples

### Current: Character Filter (Analyzer)
```jsx
// STATE (in App.jsx)
const [characterSearchInput, setCharacterSearchInput] = useState('');

// JSX (inline ~150 lines)
<div className="relative">
  <input
    type="text"
    placeholder="Search and select characters..."
    value={characterSearchInput}
    onChange={(e) => setCharacterSearchInput(e.target.value)}
    className="w-full pl-10 pr-10 py-2 rounded-lg border ..."
  />
  {characterSearchInput && (
    <div className="absolute z-10 w-full mt-1 rounded-lg border shadow-lg max-h-60 overflow-y-auto ...">
      {availableCharacters
        .filter(char => 
          char.toLowerCase().includes(characterSearchInput.toLowerCase()) &&
          !selectedCharacters.includes(char)
        )
        .slice(0, 50)
        .map(character => (
          <button
            key={character}
            onClick={() => {
              setSelectedCharacters(prev => [...prev, character]);
              setCharacterSearchInput('');
            }}
            className="w-full text-left px-4 py-2 text-sm ..."
          >
            {character}
          </button>
        ))
      }
    </div>
  )}
</div>
```

### After: Character Filter (Migrated)
```jsx
// NO STATE NEEDED (managed by Combobox)

// JSX (1 component call)
<MultiSelectCombobox
  items={availableCharacters.map(name => ({ id: name, name }))}
  selectedIds={selectedCharacters}
  placeholder="Search and select characters..."
  onAdd={(id) => setSelectedCharacters(prev => [...prev, id])}
  darkMode={darkMode}
  focusColor="purple"
/>
```

**Reduction:** 150 lines → 8 lines

---

## Summary Table

| Aspect | Matchbuilder | Analyzer (Current) | After Migration |
|--------|--------------|-------------------|-----------------|
| **Lines of Code** | 400 (component) | 650 (inline x4) | 550 (components) + 4 (usage) |
| **Reusability** | ✅ High | ❌ None | ✅ High |
| **Maintainability** | ✅ Single source | ❌ 4 copies | ✅ Single source |
| **Positioning** | ✅ Smart (Floating UI) | ⚠️ Basic/None | ✅ Smart |
| **Keyboard Nav** | ✅ Full | ⚠️ Partial | ✅ Full |
| **Tooltips** | ✅ Yes | ❌ No | ✅ Yes (optional) |
| **Coordination** | ✅ Global events | ❌ None | ✅ Global events |
| **Dark Mode** | ❌ Needs work | ✅ Yes | ✅ Yes |
| **Bundle Size** | +@floating-ui/react-dom | +@floating-ui/react | +@floating-ui/react-dom |

---

## Conclusion

The matchbuilder's Combobox is significantly more robust and feature-complete. Migrating the analyzer to use this pattern will:

1. **Reduce code by ~500 lines** (duplicated logic)
2. **Improve UX** with better positioning and keyboard navigation
3. **Enable future features** like tooltips
4. **Simplify maintenance** with a single source of truth
5. **Provide consistency** across the application

The migration is straightforward and can be done incrementally with minimal risk.
