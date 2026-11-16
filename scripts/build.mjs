import fs from 'fs';
const html = fs.readFileSync('web/index.html', 'utf8');
const pats = fs.readFileSync('web/patterns.js', 'utf8').split('/*PATSTATS*/null').join(fs.readFileSync('data/patstats.json', 'utf8'));
const out = html.split('/*PATTERNS*/').join(pats).split('/*EVENTS*/').join(fs.readFileSync('web/events.js', 'utf8')).split('/*ENGINE*/').join(fs.readFileSync('web/engine.js', 'utf8')).split('/*APP*/').join(fs.readFileSync('web/app.js', 'utf8').split('/*HIST*/null').join(fs.existsSync('data/hist.json') ? fs.readFileSync('data/hist.json', 'utf8') : 'null').split('/*LAB*/null').join(fs.readFileSync('data/lab.json', 'utf8')));
fs.mkdirSync('dist', { recursive: true }); fs.writeFileSync('dist/index.html', out);
console.log('dist/index.html', out.length, 'octets');
