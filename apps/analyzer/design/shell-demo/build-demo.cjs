// Inlines demo-data.json and portraits.json into the page template, producing
// shell-demo.html. Run demo-data.mjs and portraits.mjs first (see README.md).
const fs = require('fs');
const t = fs.readFileSync(__dirname + '/shell-demo.template.html', 'utf8');
const d = fs.readFileSync(__dirname + '/demo-data.json', 'utf8');
const p = fs.readFileSync(__dirname + '/portraits.json', 'utf8');
// Function replacers, so a "$" in the data is never read as a pattern.
const html = t.replace('/*DATA*/null', () => d).replace('/*PORTRAITS*/null', () => p);
fs.writeFileSync(__dirname + '/shell-demo.html', html);
console.log(`wrote shell-demo.html (${Math.round(html.length / 1024)} KB)`);
