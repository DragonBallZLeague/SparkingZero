// Inlines demo-data.json into the page template, producing overview-demo.html.
// Run demo-data.mjs first (see README.md).
const fs = require('fs');
const t = fs.readFileSync(__dirname + '/overview-demo.template.html', 'utf8');
const d = fs.readFileSync(__dirname + '/demo-data.json', 'utf8');
fs.writeFileSync(__dirname + '/overview-demo.html', t.replace('/*DATA*/null', d));
console.log('wrote overview-demo.html');
