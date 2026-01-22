const fs = require('fs');
const path = require('path');
const { readDataStructure } = require('../src/utils/readDataStructure');

const brDataDir = path.resolve(__dirname, '..', 'BR_Data');
const outFile = path.resolve(__dirname, '..', 'public', 'br-data-structure.json');
const outDataDir = path.resolve(__dirname, '..', 'public', 'BR_Data');

function main() {
  try {
    const structure = readDataStructure(brDataDir);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify(structure, null, 2), 'utf8');
    console.log('Wrote br-data-structure.json to', outFile);
    // Copy BR_Data folder into public so the static site can fetch raw files
    try {
      if (fs.existsSync(outDataDir)) {
        // remove existing copy to avoid stale files
        fs.rmSync(outDataDir, { recursive: true, force: true });
      }
      // Node 16.7+ supports fs.cpSync
      if (fs.cpSync) {
        fs.cpSync(brDataDir, outDataDir, { recursive: true });
      } else {
        // Fallback: simple recursive copy
        const copyRecursive = (src, dest) => {
          const stats = fs.statSync(src);
          if (stats.isDirectory()) {
            fs.mkdirSync(dest, { recursive: true });
            const entries = fs.readdirSync(src);
            entries.forEach(e => copyRecursive(path.join(src, e), path.join(dest, e)));
          } else {
            fs.copyFileSync(src, dest);
          }
        };
        copyRecursive(brDataDir, outDataDir);
      }
      console.log('Copied BR_Data to', outDataDir);
    } catch (copyErr) {
      console.error('Failed to copy BR_Data into public:', copyErr);
      console.error('Aborting build because BR_Data could not be copied.');
      process.exit(1);
    }
    // Validation: ensure br-data-structure.json exists and BR_Data contains at least one .json
    try {
      const stat = fs.statSync(outFile);
      if (!stat || stat.size === 0) {
        console.error('br-data-structure.json is empty or missing at', outFile);
        process.exit(1);
      }
    } catch (e) {
      console.error('br-data-structure.json missing after generation:', e);
      process.exit(1);
    }

    const findJsonFiles = (dir) => {
      let count = 0;
      if (!fs.existsSync(dir)) return 0;
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        const p = path.join(dir, entry);
        const st = fs.statSync(p);
        if (st.isDirectory()) {
          count += findJsonFiles(p);
        } else if (st.isFile() && entry.endsWith('.json')) {
          count += 1;
        }
      }
      return count;
    };

    const jsonCount = findJsonFiles(outDataDir);
    if (jsonCount === 0) {
      console.warn('No .json files found in public/BR_Data after copy. Continuing build.');
    }
  } catch (err) {
    console.error('Failed to generate br-data-structure.json:', err);
    process.exit(1);
  }
}

main();
