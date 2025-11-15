# Combobox Migration Quick Reference

## TL;DR

**What:** Migrate analyzer's 4 inline combobox implementations to use matchbuilder's reusable Combobox component

**Why:** Reduce ~500 lines of duplicated code, improve UX, enable tooltips, better positioning, full keyboard navigation

**Effort:** 9-13 hours

**Risk:** Low (incremental migration, well-tested source component)

---

## Key Differences at a Glance

### Matchbuilder ✅
- Reusable component
- Floating UI (smart positioning)
- Portal rendering (no overflow issues)
- Full keyboard navigation
- Tooltip support
- Global coordination (one dropdown at a time)
- 400 lines, used everywhere

### Analyzer ❌
- Inline implementation (copy-paste)
- Manual positioning or none
- No portals (except header)
- Limited/no keyboard navigation
- No tooltips
- No coordination
- 650 lines total, 4 separate implementations

---

## What Needs to Change

### 1. Install Dependency
```bash
npm install @floating-ui/react-dom@^2.1.6
```

### 2. Create Component File
Copy `apps/matchbuilder/src/App.jsx` lines 1419-1819 to:
```
apps/analyzer/src/components/Combobox.jsx
```

### 3. Replace 4 Instances

#### Instance 1: Character Filter
**Location:** `App.jsx` line ~4062  
**State to remove:** `characterSearchInput`  
**Lines saved:** ~145

#### Instance 2: Team Filter
**Location:** `App.jsx` line ~4281  
**State to remove:** `teamSearchInput`  
**Lines saved:** ~145

#### Instance 3: AI Strategy Filter
**Location:** `App.jsx` line ~4396  
**State to remove:** `aiStrategySearchInput`  
**Lines saved:** ~145

#### Instance 4: Header File Selector
**Location:** `App.jsx` line ~5329  
**State to remove:** 
- `headerFileInput`
- `headerDropdownOpen`
- `headerHighlightedIndex`
- `headerDropdownPos`
- `headerInputRef`
- `headerDropdownRef`
- Position update effect
- Outside click effect
- `handleHeaderKeyDown` function
- `updateHeaderDropdownPos` function

**Lines saved:** ~215

---

## Migration Steps

### Step 1: Setup (30 min)
```bash
cd apps/analyzer
npm install @floating-ui/react-dom@^2.1.6
mkdir -p src/components
```

### Step 2: Create Base Component (1 hour)
1. Copy Combobox from matchbuilder
2. Add dark mode support
3. Adjust styling for analyzer theme

### Step 3: Create Wrapper (Optional, 1 hour)
Create `MultiSelectCombobox.jsx` for filter use cases

### Step 4: Migrate Header Selector (2-3 hours)
- Most complex
- Has portal, positioning, keyboard nav
- Test thoroughly

### Step 5: Migrate Filters (2-3 hours)
- Character filter
- Team filter
- AI Strategy filter
- All similar, can be done together

### Step 6: Cleanup (1 hour)
- Remove old state
- Remove old effects
- Remove old handlers
- Test everything

---

## Testing Checklist

- [ ] Dark mode works
- [ ] Light mode works
- [ ] Keyboard navigation (↑↓ arrows)
- [ ] Enter key selects
- [ ] Escape key closes
- [ ] Dropdown positions correctly at screen edges
- [ ] Dropdown flips when near bottom
- [ ] Only one dropdown open at a time
- [ ] Search filtering works
- [ ] Selection works
- [ ] Multi-select (filters) works
- [ ] Single-select (header) works
- [ ] No console errors
- [ ] No visual regressions

---

## Code Snippets

### Basic Usage
```jsx
import { Combobox } from './components/Combobox';

<Combobox
  valueId={selectedId}
  items={itemsArray}
  placeholder="Search..."
  onSelect={(id, name) => handleSelect(id)}
  getName={(item) => item.name}
  darkMode={darkMode}
/>
```

### Multi-Select Pattern
```jsx
<Combobox
  valueId=""
  items={allItems.filter(item => !selectedIds.includes(item.id))}
  placeholder="Search and select..."
  onSelect={(id, name) => {
    if (id) setSelectedIds(prev => [...prev, id]);
  }}
  getName={(item) => item.name}
  darkMode={darkMode}
/>
```

### With Custom Rendering
```jsx
<Combobox
  valueId={selectedId}
  items={itemsArray}
  placeholder="Search..."
  onSelect={(id, name) => handleSelect(id)}
  getName={(item) => item.name}
  renderItemRight={(item) => (
    <span className="text-xs bg-gray-700 px-2 py-0.5 rounded">
      {item.cost}
    </span>
  )}
  darkMode={darkMode}
/>
```

---

## Props Reference

```typescript
interface ComboboxProps {
  valueId: string;           // Current selected item ID
  items: Array<any>;         // Array of items to select from
  placeholder: string;       // Input placeholder text
  onSelect: (id: string, name: string) => void;
  getName?: (item: any) => string;  // Extract name from item
  disabled?: boolean;        // Whether combobox is disabled
  renderItemRight?: (item: any) => ReactNode;  // Custom right content
  renderValueRight?: (item: any) => ReactNode; // Custom right content for selected
  showTooltip?: boolean;     // Whether to show tooltips (default: true)
  darkMode?: boolean;        // Dark mode support (analyzer-specific)
}
```

---

## Common Patterns

### Pattern 1: Single Selection
```jsx
const [selectedId, setSelectedId] = useState('');

<Combobox
  valueId={selectedId}
  items={items}
  onSelect={(id) => setSelectedId(id)}
  ...
/>
```

### Pattern 2: Multi-Selection (Add-Only)
```jsx
const [selectedIds, setSelectedIds] = useState([]);

<Combobox
  valueId=""
  items={items.filter(item => !selectedIds.includes(item.id))}
  onSelect={(id) => {
    if (id) setSelectedIds(prev => [...prev, id]);
  }}
  ...
/>

{/* Render selected as chips */}
{selectedIds.map(id => (
  <Chip 
    key={id} 
    label={items.find(i => i.id === id)?.name}
    onDelete={() => setSelectedIds(prev => prev.filter(i => i !== id))}
  />
))}
```

### Pattern 3: File/Resource Selection
```jsx
<Combobox
  valueId={currentFilePath}
  items={files.map(f => ({ id: f.path, name: f.name, ...f }))}
  onSelect={(path) => loadFile(path)}
  getName={(file) => file.name.replace(/\.json$/, '')}
  ...
/>
```

---

## Troubleshooting

### Dropdown appears at wrong position
- Check that `@floating-ui/react-dom` is installed
- Verify portal is rendering in document.body
- Check for CSS that might interfere with positioning

### Keyboard navigation not working
- Ensure `onKeyDown` handler is attached to input
- Check that `highlight` state is updating
- Verify `scrollIntoView` is not throwing errors

### Multiple dropdowns open
- Ensure global event listeners are set up
- Check that `myComboboxId` is unique
- Verify `close-all-comboboxes` event is dispatched

### Styling looks wrong
- Adjust theme colors in Combobox
- Pass `darkMode` prop
- Check Tailwind classes are not being purged

### Items not filtering
- Verify `input` state is updating
- Check `getName` function returns correct value
- Ensure `items` array is correctly formatted

---

## Files to Modify

### Create
- ✅ `apps/analyzer/src/components/Combobox.jsx`
- ⚠️ `apps/analyzer/src/components/MultiSelectCombobox.jsx` (optional)

### Modify
- ✅ `apps/analyzer/package.json` (add dependency)
- ✅ `apps/analyzer/src/App.jsx` (replace all instances)

### Reference
- 📖 `apps/matchbuilder/src/App.jsx` (source)

---

## Decision Tree

```
Do you need to select from a list?
│
├─ YES → Use Combobox
│  │
│  ├─ Single selection? → valueId + onSelect
│  └─ Multi selection? → valueId="" + filter items + onSelect adds
│
└─ NO → Use regular input or other control
```

---

## Success Metrics

- [ ] Code reduction: ~500 lines removed
- [ ] State reduction: ~10 state variables removed
- [ ] Effect reduction: ~4 useEffect hooks removed
- [ ] Consistency: All comboboxes behave identically
- [ ] UX improvement: Better positioning, keyboard nav
- [ ] Maintainability: Single source of truth

---

## Rollback Plan

If migration fails:
1. Revert `App.jsx` changes
2. Keep Combobox component for future use
3. Can migrate incrementally (one at a time)

No breaking changes to external API or data flow.

---

## Next Steps After Migration

### Potential Enhancements
1. Add tooltips for character descriptions
2. Add tooltips for AI strategy details
3. Add tooltips for team information
4. Add search highlighting (matched text bold)
5. Add recent selections (MRU list)
6. Add keyboard shortcuts (Ctrl+K to open)

### Future Use Cases
- Season selector
- Event selector
- Export format selector
- Any new filter or selection UI

---

## Contact

For questions about matchbuilder's Combobox implementation:
- See: `apps/matchbuilder/src/App.jsx` lines 1419-1819
- Dependencies: `@floating-ui/react-dom`, `lucide-react`

For questions about this migration:
- See: `COMBOBOX_MIGRATION_ANALYSIS.md`
- See: `COMBOBOX_COMPARISON.md`
