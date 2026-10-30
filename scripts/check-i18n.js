#!/usr/bin/env node
/* ============================================================
 * check-i18n — jaga kesehatan sistem dwibahasa (ID/EN)
 * Cek 4 hal yang paling sering "bledas diam-diam":
 *   1. i18nDb.json valid & tidak ada kunci duplikat
 *   2. Setiap kunci punya 'id' dan 'en' (tidak ada EN kosong)
 *   3. Kunci yang dipakai di kode (t/tr/tNow/translate) ADA di kamus
 *      (kunci dinamis seperti `prayer.${x}` dicek via prefix)
 *   4. Kunci kamus yang tidak pernah dipakai (info saja, boleh diabaikan)
 *
 * Jalankan:  npm run check:i18n   (atau: node scripts/check-i18n.js)
 * Keluar  :  exit 0 bila bersih; exit 1 bila ada masalah keras.
 * ============================================================ */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(ROOT, 'src', 'api', 'i18nDb.json');
const SRC_DIRS = ['src', '.'].map((d) => path.join(ROOT, d));

const KNOWN_NS = [
  'app', 'nav', 'home', 'daily', 'tile', 'prayer', 'sholat', 'settings',
  'quran', 'surah', 'page', 'hadits', 'doa', 'ulama', 'sanad', 'qibla',
  'cal', 'calendar', 'auth', 'onboarding', 'login', 'user', 'llm',
  'common', 'store', 'notif',
];

let soft = [];   // peringatan (tidak menggagalkan)
let hard = [];   // masalah (exit 1)

// ---------- 1) JSON valid + duplikat ----------
const raw = fs.readFileSync(DB_PATH, 'utf8');
let db;
try { db = JSON.parse(raw); } catch (e) {
  console.error('❌ i18nDb.json TIDAK VALID:', e.message);
  process.exit(1);
}
// Duplikat: JSON.parse hanya menyimpan yang terakhir, jadi deteksi lewat teks mentah
const seen = new Map(); const dupes = [];
const keyRe = /"([A-Za-z0-9_.-]+)"\s*:\s*\{\s*"id"/g;
let m;
while ((m = keyRe.exec(raw))) {
  if (seen.has(m[1])) dupes.push(m[1]);
  else seen.set(m[1], true);
}
if (dupes.length) hard.push(`Kunci DUPLIKAT di i18nDb.json (yang terakhir menang saat parse): ${dupes.join(', ')}`);

// ---------- kumpulkan file JS app ----------
const jsFiles = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (f.name === 'node_modules' || f.name === '.git' || f.name === 'scripts') continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p);
    else if (f.name.endsWith('.js') || f.name.endsWith('.jsx')) jsFiles.push(p);
  }
}
walk(SRC_DIRS[0]);
const appEntry = path.join(ROOT, 'App.js');
if (fs.existsSync(appEntry) && !fs.statSync(appEntry).isDirectory()) jsFiles.push(appEntry);

// ---------- 2) 'en' lengkap ----------
const missingEn = Object.entries(db)
  .filter(([, v]) => !v || typeof v !== 'object' || !String(v.en || '').trim() || !String(v.id || '').trim())
  .map(([k]) => k);
if (missingEn.length) soft.push(`Kunci tanpa teks ID/EN lengkap (${missingEn.length}): ${missingEn.join(', ')}`);

// ---------- 3) kunci dipakai vs kamus ----------
// Static keys: t('x.y'), tr('x.y'), tNow('x.y'), translate(lang, 'x.y')
const staticRe = /\b(?:t|tr|tNow|translate)\(\s*(?:lang\s*,\s*)?['"]([A-Za-z0-9_]+(?:\.[A-Za-z0-9_-]+)+)['"]/g;
// Dynamic keys: t(`ns.${...}`) / tNow(`ns.${...}`)
const dynRe = /\b(?:t|tr|tNow|translate)\(\s*(?:lang\s*,\s*)?`([A-Za-z0-9_]+)\.\$\{/g;
const used = new Set(); const dynPrefixes = new Set(); const badFormat = [];
for (const file of jsFiles) {
  const src = fs.readFileSync(file, 'utf8');
  while ((m = staticRe.exec(src))) used.add(m[1]);
  while ((m = dynRe.exec(src))) dynPrefixes.add(m[1]);
  // panggilan t('x') tanpa titik = hampir pasti salah (kunci selalu ber-namespaced)
  const bareRe = /\b(?:t|tr|tNow)\(\s*['"]([A-Za-z0-9_]+)['"]\s*[,)]/g;
  while ((m = bareRe.exec(src))) {
    if (!KNOWN_NS.includes(m[1])) badFormat.push(`${path.relative(ROOT, file)}: t(${m[1]})`);
  }
}
const missingKeys = [...used].filter((k) => !db[k]);
if (missingKeys.length) hard.push(`Kunci dipakai di kode tapi TIDAK ADA di kamus (${missingKeys.length}):\n    ${missingKeys.join('\n    ')}`);
// Dyn prefixes harus valid namespace
const badDyn = [...dynPrefixes].filter((p) => !KNOWN_NS.includes(p));
if (badDyn.length) hard.push(`Kunci dinamis memakai prefix asing: ${badDyn.join(', ')}`);

// ---------- 4) kunci tak terpakai (info) ----------
// Deteksi "dipakai via variabel/array": string kunci lengkap muncul di
// kode (contoh: ['app.Jan_M1',...].map(k => t(k)) di HomeScreen).
// Karena itu, kunci yang literalnya ada di source tidak dianggap mati.
let allSrc = '';
for (const file of jsFiles) allSrc += fs.readFileSync(file, 'utf8');
const unused = Object.keys(db).filter((k) => {
  if (used.has(k)) return false;
  if (allSrc.includes(k)) return false; // dipakai lewat variabel/array/TEXTS
  // kunci yang dipanggil dinamis dianggap terpakai
  const ns = k.split('.')[0];
  const leafish = k.split('.').slice(1).length > 0;
  if (dynPrefixes.has(ns) && leafish) return false;
  // kunci per-prayer / per-hari sangat mungkin dinamis: pra-izinkan pola umum
  if (/^(prayer|cal|surah|settings|home)\./.test(k)) return false;
  return true;
});

// ---------- laporan ----------
const count = Object.keys(db).length;
console.log(`\n=== check-i18n ===`);
console.log(`Kunci di i18nDb.json : ${count}`);
console.log(`Kunci terpakai statis: ${used.size}`);
console.log(`Prefix dinamis       : ${[...dynPrefixes].join(', ') || '(tidak ada)'}`);
if (unused.length) console.log(`ℹ️  Kunci tak terdeteksi pemakaian (${unused.length}, boleh diabaikan bila dipanggil dinamis): ${unused.slice(0, 30).join(', ')}${unused.length > 30 ? ', …' : ''}`);
for (const s of soft) console.log(`⚠️  ${s}`);
for (const h of hard) console.error(`❌ ${h}`);
if (badFormat.length) console.error(`❌ Panggilan t() tanpa namespace (pasti salah): ${badFormat.join(', ')}`);
console.log(hard.length ? '\n hasil: TIDAK lolos' : '\n hasil: OK ✔');
process.exit(hard.length ? 1 : 0);
