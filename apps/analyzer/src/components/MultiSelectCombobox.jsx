import React from 'react';
import { Combobox } from './Combobox';

/**
 * MultiSelectCombobox - Wrapper around Combobox for multi-selection use case
 * Used for filters where users can select multiple items from a list
 */
export const MultiSelectCombobox = ({
  items,
  selectedIds = [],
  placeholder,
  onAdd, // (id) => void - called when an item is selected
  getName = (it) => it.name,
  darkMode = false,
  focusColor = 'purple',
  renderItemRight = null,
}) => {
  // Filter out already selected items
  const availableItems = items.filter(item => !selectedIds.includes(item.id));

  const handleSelect = (id, name) => {
    if (id && onAdd) {
      onAdd(id);
    }
  };

  return (
    <Combobox
      valueId="" // Always empty for multi-select (clears after each selection)
      items={availableItems}
      placeholder={placeholder}
      onSelect={handleSelect}
      getName={getName}
      darkMode={darkMode}
      focusColor={focusColor}
      renderItemRight={renderItemRight}
      showTooltip={false}
    />
  );
};
