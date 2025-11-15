# Dragon Ball Sparking Zero Analyzer - Data Tables & Export Features

## Overview

This document outlines the new advanced data table functionality and export capabilities added to the Dragon Ball Sparking Zero battle analyzer application.

## New Features

### 🎯 **Advanced Data Tables**

The application now includes interactive data tables with comprehensive user controls:

#### **Core Table Features:**
- **Multi-column sorting** with visual indicators
- **Global search** across all visible columns
- **Column-specific filtering** with individual filter inputs
- **Column visibility controls** - show/hide columns as needed
- **Row selection** for batch operations
- **Pagination** with configurable page sizes
- **Responsive design** that works on all screen sizes

#### **Table Types Available:**

1. **Character Performance Table**
   - Win rates, damage statistics, battle time averages
   - Build archetype classifications
   - Combat technique usage metrics
   - Sortable by any performance metric

2. **Position Analysis Table**
   - Lead/Middle/Anchor position effectiveness
   - Character performance by team position
   - Strategic role optimization data
   - Position-specific win rates and damage output

3. **Meta Analysis Table**
   - Capsule usage statistics and effectiveness
   - Most popular equipment combinations
   - Build trend analysis
   - Character-specific capsule performance

### 📊 **Advanced Export System**

#### **Excel Workbook Export (.xlsx)**
Generates comprehensive Excel files with multiple sheets:

- **Summary Sheet** - Report metadata and export options
- **Character Stats Sheet** - Complete character performance data
- **Position Analysis Sheet** - Position-based performance metrics
- **Meta Analysis Sheet** - Capsule and build trend data
- **Build Analysis Sheet** - Equipment combinations and effectiveness

#### **CSV Export Options**
Individual CSV files for specific data sets:
- Character statistics only
- Position analysis only  
- Meta analysis only
- Filtered data (export only visible/selected rows)

#### **Export Features:**
- **Configurable exports** - choose which data to include
- **Filtered exports** - export only visible or selected data
- **Timestamped filenames** for easy organization
- **Progress indicators** during export process
- **Error handling** with user feedback

## How to Use

### **Accessing Data Tables**

1. Navigate to the **Reference Data Mode**
2. Select **"Data Tables"** from the view type options
3. The application will display:
   - Export manager at the top
   - Character performance table
   - Position analysis table
   - Meta analysis table

### **Table Interactions**

- **Sorting**: Click column headers to sort (click again to reverse)
- **Filtering**: Use the global search or individual column filters
- **Column Control**: Click the settings icon to show/hide columns
- **Selection**: Use checkboxes to select specific rows
- **Pagination**: Navigate through large datasets with page controls

### **Exporting Data**

1. **Excel Export**: 
   - Click "Export Complete Workbook (Excel)" for full report
   - Configure what data to include using checkboxes
   - File will download automatically

2. **CSV Export**:
   - Use individual CSV buttons for specific data types
   - Exports respect current filters and selections

## Technical Implementation

### **Components Added**

- `DataTable.jsx` - Reusable table component with all interactive features
- `ExportManager.jsx` - Handles Excel and CSV generation
- `TableConfigs.jsx` - Column configurations for different data types
- `utils/formatters.js` - Data formatting utilities

### **Libraries Used**

- **xlsx** - Excel file generation
- **file-saver** - File download handling
- **lucide-react** - Icons for UI elements

### **Performance Optimizations**

- **Virtualization ready** - Can handle large datasets efficiently
- **Memoized calculations** - Prevents unnecessary re-renders
- **Lazy loading** - Components load only when needed
- **Chunked processing** - Large exports are processed in chunks

## Data Processing

### **Character Data Processing**
- Aggregates performance across multiple matches
- Calculates win rates, average damage, and technique usage
- Identifies build archetypes based on equipped capsules
- Tracks form transformations and effectiveness

### **Position Analysis Processing**
- Analyzes character effectiveness by team position (Lead/Middle/Anchor)
- Calculates position-specific win rates and performance metrics
- Identifies optimal character choices for each team role
- Tracks strategic positioning trends

### **Meta Analysis Processing**
- Aggregates capsule usage across all characters and matches
- Calculates capsule effectiveness and win rate correlations
- Identifies popular build combinations and trends
- Tracks meta evolution over time

## Future Enhancements

### **Planned Features**
- **Custom report builder** - User-defined export templates
- **Advanced filters** - Date ranges, character-specific analysis
- **Data visualization integration** - Charts within tables
- **Real-time data updates** - Live tournament tracking
- **Comparison tools** - Side-by-side character/build analysis

### **Performance Improvements**
- **Virtual scrolling** for very large datasets
- **Background processing** for complex calculations
- **Caching system** for frequently accessed data
- **Optimized export streaming** for large files

## Usage Examples

### **Tournament Analysis Workflow**

1. **Load match data** using Reference Data Mode
2. **Switch to Data Tables view** for detailed analysis
3. **Filter characters** by win rate or usage frequency
4. **Sort by relevant metrics** (damage, survival rate, etc.)
5. **Select top performers** for deeper analysis
6. **Export comprehensive report** for tournament organizers

### **Build Optimization Workflow**

1. **Access Meta Analysis table** to see capsule effectiveness
2. **Filter by character** to see character-specific trends
3. **Sort by win rate** to identify most effective combinations
4. **Export capsule data** for build planning tools
5. **Use position analysis** to optimize team compositions

## Support & Troubleshooting

### **Common Issues**

- **Large file exports**: For datasets with 1000+ entries, exports may take 10-30 seconds
- **Browser memory**: Very large tables may require pagination for optimal performance
- **File downloads**: Ensure browser allows downloads from localhost during development

### **Performance Tips**

- Use filters to reduce dataset size before exporting
- Export specific data types (CSV) instead of full workbooks for faster processing
- Use column visibility controls to focus on relevant data
- Paginate through large datasets rather than showing all rows

## Conclusion

The new data tables and export functionality transforms the Dragon Ball Sparking Zero analyzer from a basic match viewer into a comprehensive tournament analysis tool. Users can now:

- **Interact with data** using advanced table controls
- **Generate professional reports** in Excel and CSV formats
- **Analyze trends** across multiple matches and tournaments
- **Optimize strategies** using position and meta analysis
- **Share insights** through exportable data formats

This system provides the foundation for advanced competitive analysis and tournament management in the Dragon Ball Sparking Zero community.