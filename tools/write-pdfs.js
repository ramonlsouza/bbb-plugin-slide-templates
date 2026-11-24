// Writes the PDF of every template at 1600x900 into out/pdfs (run after `npx tsc` of src/templates.ts and src/pdf.ts).
const fs = require('fs');
const path = require('path');
const { TEMPLATES } = require('../out/tsc/templates');
const { pdfBytes } = require('../out/tsc/pdf');
const dir = path.join(__dirname, '..', 'out', 'pdfs');
fs.mkdirSync(dir, { recursive: true });
TEMPLATES.forEach((t) => {
  const file = path.join(dir, `${t.id}.pdf`);
  fs.writeFileSync(file, pdfBytes(1600, 900, t.draw(1600, 900)));
  console.log(file, fs.statSync(file).size);
});
