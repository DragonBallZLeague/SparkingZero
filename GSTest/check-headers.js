const fs = require('fs');
const content = fs.readFileSync('d:/DBZL/SZLeague/GitHub/SparkingZero/GSTest/Blast_Data.csv', 'utf8');

let field = '', inQ = false, row = [];
for (let i = 0; i < content.length; i++) {
  const c = content[i];
  if (c === '"') {
    if (inQ && content[i+1] === '"') { field += '"'; i++; }
    else inQ = !inQ;
  } else if (c === ',' && !inQ) {
    row.push(field); field = '';
  } else if ((c === '\r' || c === '\n') && !inQ) {
    row.push(field); break;
  } else {
    field += c;
  }
}
row.forEach((h, i) => console.log(i, JSON.stringify(h.replace(/[\r\n]+/g, ' ').trim())));
