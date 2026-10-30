#!/usr/bin/env node
/* ============================================================
 * check-parse — pastikan semua file JS app masih bisa diparse Babel.
 * (node_modules dikecualikan; menangkap sintaks rusak lebih cepat
 *  daripada menunggu error bundling Expo / Metro.)
 * Jalankan:  npm run check:parse
 * ============================================================ */
const fs = require('fs');
const path = require('path');
let parse;
try { ({ parse } = require('@babel/parser')); }
catch {
  const { execSync } = require('child_process');
  console.log('@babel/parser belum ada — memasang sementara via npx…');
  execSync('npm i --no-save @babel/parser', { stdio: 'inherit' });
  ({ parse } = require(require.resolve('@babel/parser', { paths: [process.cwd(), path.join(process.cwd(), 'node_modules')] })));
}

const ROOT = path.join(__dirname, '..');
const files = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (f.name === 'node_modules' || f.name === '.git' || f.name === 'scripts') continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p);
    else if (f.name.endsWith('.js') || f.name.endsWith('.jsx')) files.push(p);
  }
})(ROOT);

const bad = [];
for (const p of files) {
  try {
    parse(fs.readFileSync(p, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
  } catch (e) {
    bad.push(`${path.relative(ROOT, p)}: ${e.message}`);
  }
}
if (bad.length) {
  console.error(`❌ ${bad.length} file gagal diparse:\n${bad.join('\n')}`);
  process.exit(1);
}
console.log(`✔ ${files.length} file JS app parse OK`);
