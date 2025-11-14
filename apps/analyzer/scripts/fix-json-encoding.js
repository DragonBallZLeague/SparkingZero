#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Automated JSON file encoding fixer for BR_Data directory
 * This script handles UTF-16 LE files with BOM and converts them to clean UTF-8
 */

const BR_DATA_DIR = path.join(__dirname, '..', 'BR_Data');

function detectAndFixEncoding(filePath) {
  try {
    // Read file as buffer to detect encoding
    const buffer = fs.readFileSync(filePath);
    
    // Check for UTF-16 LE BOM (FF FE)
    if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
      console.log(`🔧 Fixing UTF-16 LE encoding: ${path.basename(filePath)}`);
      
      // Decode UTF-16 LE
      const content = buffer.toString('utf16le');
      
      // Remove any BOM characters that might remain
      const cleanContent = content.replace(/^\uFEFF/, '');
      
      // Validate JSON
      try {
        const parsed = JSON.parse(cleanContent);
        
        // Write back as properly formatted UTF-8
        fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), 'utf8');
        
        console.log(`✅ Successfully fixed: ${path.basename(filePath)}`);
        return true;
      } catch (jsonError) {
        console.error(`❌ Invalid JSON in ${path.basename(filePath)}: ${jsonError.message}`);
        return false;
      }
    }
    
    // Check for UTF-8 BOM (EF BB BF)
    if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      console.log(`🔧 Removing UTF-8 BOM: ${path.basename(filePath)}`);
      
      // Remove BOM and re-save
      const content = buffer.toString('utf8').replace(/^\uFEFF/, '');
      
      try {
        const parsed = JSON.parse(content);
        fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), 'utf8');
        console.log(`✅ Successfully cleaned: ${path.basename(filePath)}`);
        return true;
      } catch (jsonError) {
        console.error(`❌ Invalid JSON in ${path.basename(filePath)}: ${jsonError.message}`);
        return false;
      }
    }
    
    // File appears to be clean UTF-8, just validate JSON
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      JSON.parse(content);
      console.log(`✅ File already clean: ${path.basename(filePath)}`);
      return true;
    } catch (error) {
      console.error(`❌ File has issues: ${path.basename(filePath)} - ${error.message}`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Error processing ${path.basename(filePath)}: ${error.message}`);
    return false;
  }
}

function formatWithPrettier(filePath) {
  try {
    execSync(`prettier --write "${filePath}"`, { stdio: 'pipe' });
    console.log(`🎨 Formatted with Prettier: ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    console.error(`❌ Prettier formatting failed for ${path.basename(filePath)}: ${error.message}`);
    return false;
  }
}

function findJsonFilesRecursively(dir) {
  let jsonFiles = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively search subdirectories
        jsonFiles = jsonFiles.concat(findJsonFilesRecursively(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        jsonFiles.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`❌ Error reading directory ${dir}: ${error.message}`);
  }
  
  return jsonFiles;
}

function processJsonFiles() {
  if (!fs.existsSync(BR_DATA_DIR)) {
    console.error(`❌ BR_Data directory not found: ${BR_DATA_DIR}`);
    return;
  }
  
  console.log('🚀 Starting JSON file encoding check and fix...\n');
  console.log(`📁 Searching for JSON files in ${BR_DATA_DIR} and subdirectories...\n`);
  
  const files = findJsonFilesRecursively(BR_DATA_DIR);
  
  if (files.length === 0) {
    console.log('ℹ️  No JSON files found in BR_Data directory or subdirectories');
    return;
  }
  
  console.log(`📁 Found ${files.length} JSON files to process\n`);
  
  let fixedCount = 0;
  let formattedCount = 0;
  
  for (const filePath of files) {
    const relativePath = path.relative(BR_DATA_DIR, filePath);
    console.log(`\n📄 Processing: ${relativePath}`);
    
    // Fix encoding issues first
    if (detectAndFixEncoding(filePath)) {
      fixedCount++;
      
      // Then format with Prettier
      if (formatWithPrettier(filePath)) {
        formattedCount++;
      }
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Files processed: ${files.length}`);
  console.log(`   Encoding fixed: ${fixedCount}`);
  console.log(`   Prettier formatted: ${formattedCount}`);
  
  if (fixedCount === files.length && formattedCount === files.length) {
    console.log('\n✅ All files successfully processed!');
  } else {
    console.log('\n⚠️  Some files had issues. Check the log above for details.');
  }
}

// Run if called directly
if (require.main === module) {
  processJsonFiles();
}

module.exports = { processJsonFiles, detectAndFixEncoding, formatWithPrettier, findJsonFilesRecursively };