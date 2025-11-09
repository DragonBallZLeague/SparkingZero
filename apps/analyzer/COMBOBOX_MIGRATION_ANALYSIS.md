# Combobox Migration Analysis

## Overview
This document analyzes the differences between the matchbuilder and analyzer combobox implementations and outlines what would be needed to standardize all analyzer comboboxes to use the matchbuilder pattern.

---

## Current State

### Matchbuilder Combobox
**Location:** `apps/matchbuilder/src/App.jsx` (lines 1419-1819)

**Key Features:**
1. **Reusable Component** - Single `Combobox` component with props
2. **Floating UI Integration** - Uses `@floating-ui/react-dom` for smart positioning
3. **Portal Rendering** - Dropdown renders in document.body to avoid overflow issues
4. **Tooltip Support** - Shows item effects on hover/focus with advanced tooltip management
5. **Global State Management** - Uses window events to coordinate multiple comboboxes
6. **Accessibility** - Full keyboard navigation (Arrow keys, Enter, Escape)
7. **Smart Filtering** - Filters items based on input, limits to 50 results
8. **Auto-positioning** - Automatically adjusts dropdown position (flip, shift, size)

**Props Interface:**
```javascript
{
  valueId,              // Current selected item ID
  items,                // Array of items to select from
  placeholder,          // Input placeholder text
  onSelect,             // Callback: (id, name) => void
  getName,              // Function to extract display name from item
  disabled,             // Whether combobox is disabled
  renderItemRight,      // Custom renderer for right side of items
  renderValueRight,     // Custom renderer for right side of selected value
  showTooltip           // Whether to show effect tooltips
}
```

**Dependencies:**
- `@floating-ui/react-dom` v2.1.6
- `lucide-react` for icons
- React portals (`createPortal`)

**Global Coordination Features:**
- `window.__combobox_id_counter` - Unique ID generation
- `window.__combobox_activeId` - Tracks which combobox has active tooltip
- `combobox:hide-all` event - Force all tooltips to hide
- `close-all-comboboxes` event - Ensure only one dropdown open at a time

---

### Analyzer Combobox Implementations
**Location:** `apps/analyzer/src/App.jsx`

#### Pattern 1: Character Search (line ~4062)
```javascript
// State
const [characterSearchInput, setCharacterSearchInput] = useState('');

// Inline implementation
<input type="text" ... />
<div className="absolute z-10 ...">
  {availableCharacters.filter(...).map(character => (
    <button onClick={...}>{character}</button>
  ))}
</div>
```

#### Pattern 2: Team Search (line ~4281)
Similar inline pattern with team-specific state

#### Pattern 3: AI Strategy Search (line ~4396)
Similar inline pattern with AI strategy-specific state

#### Pattern 4: Header File Search (line ~5329)
```javascript
// State
const [headerFileInput, setHeaderFileInput] = useState('');
const [headerDropdownOpen, setHeaderDropdownOpen] = useState(false);
const [headerHighlightedIndex, setHeaderHighlightedIndex] = useState(-1);
const [headerDropdownPos, setHeaderDropdownPos] = useState(null);
const headerInputRef = useRef(null);
const headerDropdownRef = useRef(null);

// Manual position tracking with resize/scroll listeners
// Portal rendering with custom positioning logic
// Keyboard navigation with handleHeaderKeyDown
```

**Current Issues:**
1. **Code Duplication** - Each combobox reimplements the same logic
2. **Inconsistent UX** - Different behaviors across different comboboxes
3. **Manual Positioning** - Header combobox manually calculates position
4. **No Tooltip Support** - Cannot show additional info on hover
5. **Limited Accessibility** - Some comboboxes lack full keyboard support
6. **No Global Coordination** - Multiple comboboxes can be open simultaneously
7. **Maintenance Burden** - Changes require updating multiple locations

**Dependencies:**
- `@floating-ui/react` v0.27.16 (different package than matchbuilder!)
- React portals (only in header combobox)
- Manual positioning calculations

---

## Migration Requirements

### 1. Dependency Alignment

**Issue:** Analyzer uses `@floating-ui/react` while matchbuilder uses `@floating-ui/react-dom`

**Solution Options:**
- **Option A (Recommended):** Migrate analyzer to `@floating-ui/react-dom` v2.1.6
  - Simpler API, matches matchbuilder
  - Less bundle size
  
- **Option B:** Adapt matchbuilder Combobox to use `@floating-ui/react`
  - Analyzer already has this installed
  - More features but larger bundle

**Recommendation:** Option A - Use `@floating-ui/react-dom` for consistency

---

### 2. Component Extraction

**Create:** `apps/analyzer/src/components/Combobox.jsx`

**Steps:**
1. Copy matchbuilder Combobox component
2. Adjust imports for analyzer's project structure
3. Ensure compatibility with analyzer's styling (Tailwind config)
4. Add any analyzer-specific customizations

**Potential Customizations:**
- Dark mode support (matchbuilder doesn't have this)
- Different color schemes (purple/blue vs orange)
- Integration with analyzer's existing theme system

---

### 3. Component Instances to Replace

#### Instance 1: Character Filter Combobox
**Location:** Line ~4062
**Current State Variables:**
- `characterSearchInput`

**Migration:**
```jsx
<Combobox
  valueId=""
  items={availableCharacters.map(name => ({ id: name, name }))}
  placeholder="Search and select characters..."
  onSelect={(id, name) => {
    if (id && !selectedCharacters.includes(id)) {
      setSelectedCharacters(prev => [...prev, id]);
    }
  }}
  getName={(item) => item.name}
  showTooltip={false}
/>
```

**State to Remove:**
- `characterSearchInput` (managed internally by Combobox)

---

#### Instance 2: Team Filter Combobox
**Location:** Line ~4281
**Current State Variables:**
- `teamSearchInput`

**Migration:**
```jsx
<Combobox
  valueId=""
  items={availableTeams.map(name => ({ id: name, name }))}
  placeholder="Search and select teams..."
  onSelect={(id, name) => {
    if (id && !selectedTeams.includes(id)) {
      setSelectedTeams(prev => [...prev, id]);
    }
  }}
  getName={(item) => item.name}
  showTooltip={false}
/>
```

**State to Remove:**
- `teamSearchInput`

---

#### Instance 3: AI Strategy Filter Combobox
**Location:** Line ~4396
**Current State Variables:**
- `aiStrategySearchInput`

**Migration:**
```jsx
<Combobox
  valueId=""
  items={availableAIStrategies.map(name => ({ 
    id: name, 
    name: name === 'Com' ? 'Computer' : name === 'Player' ? 'Player' : name 
  }))}
  placeholder="Search and select AI strategies..."
  onSelect={(id, name) => {
    if (id && !selectedAIStrategies.includes(id)) {
      setSelectedAIStrategies(prev => [...prev, id]);
    }
  }}
  getName={(item) => item.name}
  showTooltip={false}
/>
```

**State to Remove:**
- `aiStrategySearchInput`

---

#### Instance 4: Header File Selector Combobox
**Location:** Line ~5329
**Current State Variables:**
- `headerFileInput`
- `headerDropdownOpen`
- `headerHighlightedIndex`
- `headerDropdownPos`
- `headerInputRef`
- `headerDropdownRef`

**Migration:**
```jsx
<Combobox
  valueId={analysisSelectedFilePath?.[0] || ''}
  items={mode === 'manual' 
    ? manualFiles.filter(f => !f.error).map(f => ({ id: f.name, name: f.name }))
    : Array.isArray(fileContent) 
      ? fileContent.filter(fc => fc.name).map(fc => ({ id: fc.name, name: fc.name }))
      : []
  }
  placeholder="Search match to analyze..."
  onSelect={(id, name) => handleHeaderFileSelect(id)}
  getName={(item) => getFileNameFromPath(item.name)}
  showTooltip={false}
/>
```

**State to Remove:**
- `headerFileInput`
- `headerDropdownOpen`
- `headerHighlightedIndex`
- `headerDropdownPos`
- `headerInputRef`
- `headerDropdownRef`

**Effects to Remove:**
- Outside click listener (lines ~2702-2710)
- Position update effect (lines ~2712-2728)
- `updateHeaderDropdownPos` function (lines ~2715-2723)

**Handlers to Remove:**
- `handleHeaderKeyDown` function (replaced by internal Combobox logic)

---

### 4. Styling Considerations

**Matchbuilder Style:**
```css
border-slate-500, bg-slate-800, text-white
focus:border-orange-400, focus:ring-orange-400/50
```

**Analyzer Style:**
```css
border-gray-600, bg-gray-800, text-white (dark mode)
focus:border-purple-500, focus:ring-purple-500/50
```

**Solution:**
Create a styled wrapper or extend Combobox with theme props:

```jsx
// Add to Combobox props
{
  theme: {
    focusColor: 'purple',  // 'orange' | 'purple' | 'blue'
    darkMode: true
  }
}
```

Or create analyzer-specific styled variant:
```jsx
// apps/analyzer/src/components/AnalyzerCombobox.jsx
export const AnalyzerCombobox = (props) => {
  const { darkMode, focusColor = 'purple', ...rest } = props;
  
  const inputClassName = `w-full px-3 py-2 border rounded text-xs font-medium 
    ${darkMode ? 'bg-gray-800 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}
    focus:outline-none focus:border-${focusColor}-400 focus:ring-1 focus:ring-${focusColor}-400/50
    transition-all ${rest.disabled ? 'opacity-60' : ''}`;
  
  return <Combobox {...rest} customInputClassName={inputClassName} />;
};
```

---

### 5. Additional Enhancements

#### A. Dark Mode Support
Matchbuilder Combobox needs dark mode awareness:
```jsx
const Combobox = ({ darkMode = false, ...props }) => {
  // Apply conditional classes based on darkMode
}
```

#### B. Multi-Select Support
Analyzer's character/team/AI filters use multi-select pattern:
```jsx
const MultiSelectCombobox = ({ selectedIds, onAdd, onRemove, ...props }) => {
  // Wrapper around Combobox that:
  // 1. Shows selected items as chips
  // 2. Clears input after selection
  // 3. Filters out already-selected items
}
```

#### C. Tooltip Content
If analyzer wants to show tooltips in the future:
- Character descriptions
- Team information
- AI strategy details

This is already supported by matchbuilder Combobox via `showTooltip` prop.

---

## Implementation Plan

### Phase 1: Setup (1-2 hours)
1. ✅ Install `@floating-ui/react-dom` v2.1.6 in analyzer
2. ✅ Remove `@floating-ui/react` if not used elsewhere
3. ✅ Create `apps/analyzer/src/components/` directory
4. ✅ Copy Combobox component from matchbuilder
5. ✅ Adapt styling for analyzer theme system

### Phase 2: Create Wrapper Components (2-3 hours)
1. ✅ Create `AnalyzerCombobox.jsx` with dark mode support
2. ✅ Create `MultiSelectCombobox.jsx` for filter use cases
3. ✅ Test wrapper components in isolation

### Phase 3: Migration (3-4 hours per instance)
1. ✅ Migrate header file selector (most complex)
2. ✅ Migrate character filter
3. ✅ Migrate team filter
4. ✅ Migrate AI strategy filter

### Phase 4: Cleanup (1 hour)
1. ✅ Remove old state variables
2. ✅ Remove old effect hooks
3. ✅ Remove old helper functions
4. ✅ Test all combobox instances
5. ✅ Verify keyboard navigation works
6. ✅ Verify dropdown positioning is correct

### Phase 5: Testing (2-3 hours)
1. ✅ Test in both light and dark modes
2. ✅ Test keyboard navigation (arrows, enter, escape)
3. ✅ Test with long lists (50+ items)
4. ✅ Test dropdown positioning at screen edges
5. ✅ Test multiple comboboxes opening/closing
6. ✅ Test filter functionality
7. ✅ Test selection persistence

**Total Estimated Time:** 9-13 hours

---

## Benefits

### Code Quality
- ✅ Eliminate ~200+ lines of duplicated code
- ✅ Single source of truth for combobox behavior
- ✅ Consistent UX across the application
- ✅ Easier to maintain and update

### User Experience
- ✅ Consistent keyboard navigation
- ✅ Better dropdown positioning (no edge cutoffs)
- ✅ Smoother interactions (global coordination)
- ✅ Potential for tooltips in future
- ✅ Faster filtering with optimized logic

### Developer Experience
- ✅ Reusable component for future features
- ✅ Clear API with TypeScript-ready props
- ✅ Less cognitive load when working with selectors
- ✅ Easier to add new filter types

---

## Potential Challenges

### 1. Different Package Versions
**Risk:** Floating UI behavior differences
**Mitigation:** Test thoroughly, use matchbuilder's proven version

### 2. Styling Conflicts
**Risk:** Tailwind classes may conflict with existing styles
**Mitigation:** Use wrapper component with theme customization

### 3. Selection Model Differences
**Risk:** Analyzer uses multi-select, matchbuilder uses single-select
**Mitigation:** Create MultiSelectCombobox wrapper component

### 4. State Management
**Risk:** Current state is spread across App.jsx
**Mitigation:** Plan state cleanup carefully, migrate one at a time

---

## Recommendation

**Proceed with migration** using the phased approach outlined above.

**Priority Order:**
1. Start with header file selector (highest complexity, biggest win)
2. Migrate filter comboboxes (character, team, AI) together
3. Clean up and optimize

**Success Criteria:**
- All combobox instances use the shared component
- No visual regressions
- Keyboard navigation works consistently
- Code is cleaner and more maintainable

---

## Files to Create/Modify

### New Files:
- `apps/analyzer/src/components/Combobox.jsx`
- `apps/analyzer/src/components/AnalyzerCombobox.jsx` (optional wrapper)
- `apps/analyzer/src/components/MultiSelectCombobox.jsx` (optional wrapper)

### Modified Files:
- `apps/analyzer/package.json` (add @floating-ui/react-dom)
- `apps/analyzer/src/App.jsx` (replace all combobox instances)

### Files to Reference:
- `apps/matchbuilder/src/App.jsx` (source Combobox implementation)

---

## Conclusion

Migrating the analyzer app to use the matchbuilder's Combobox pattern is highly recommended. The matchbuilder implementation is more robust, better tested, and provides a superior user experience. The migration effort is moderate (9-13 hours) but will significantly improve code quality and maintainability.

The phased approach minimizes risk and allows for incremental testing and validation.
