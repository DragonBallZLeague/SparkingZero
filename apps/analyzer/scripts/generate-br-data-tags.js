// Generates public/br-data-tags.json
// Maps each BR_Data relative file path → its tags object (or null if untagged).
// Usage: node scripts/generate-br-data-tags.js

const fs = require('fs');
const path = require('path');

const BR_DATA_ROOT = path.resolve(__dirname, '../BR_Data');
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const OUTPUT_FILE = path.join(PUBLIC_DIR, 'br-data-tags.json');

function readJson(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    // Strip BOM variants
    if (buf[0] === 0xFF && buf[1] === 0xFE) return JSON.parse(buf.toString('utf16le').replace(/^\uFEFF/, ''));
    if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) return JSON.parse(buf.toString('utf8').replace(/^\uFEFF/, ''));
    return JSON.parse(buf.toString('utf8'));
  } catch {
    return null;
  }
}

function walkDir(dir, base, result) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.join(base, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      walkDir(full, rel, result);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      const data = readJson(full);
      result[rel] = (data && data.tags && typeof data.tags === 'object') ? data.tags : null;
    }
  }
}

const result = {};
walkDir(BR_DATA_ROOT, '', result);

if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf8');
console.log(`✅ br-data-tags.json written with ${Object.keys(result).length} entries → ${OUTPUT_FILE}`);
