// Capture screenshot Play Store via Edge headless: 1080x1920, hash deep-link per layar.
// Pola yang terbukti: spawn Edge background (dengan user-data-dir segar per shot),
// polling file screenshot sampai ada + stabil, lalu taskkill tree.
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = 'http://localhost:8081/';
const OUT = __dirname + '\\screenshots';

const SHOTS = [
  { name: '01-home',          hash: '',                                            wait: 12000 },
  { name: '02-surah-list',    hash: '#/SurahList',                                 wait: 12000 },
  { name: '03-para',          hash: '#/SurahList?initialTab=para',                 wait: 12000 },
  { name: '04-surah-detail',  hash: '#/SurahDetail?nomor=18&nama_latin=Al-Kahf',   wait: 15000 },
  { name: '05-doa',           hash: '#/DoaList',                                   wait: 12000 },
  { name: '06-sholat',        hash: '#/SholatJadwal',                              wait: 15000 },
  { name: '07-ulama',         hash: '#/UlamaList',                                 wait: 18000 },
  { name: '08-sanad',         hash: '#/SanadChain?scholarId=7685',                 wait: 15000 },
  { name: '09-settings',      hash: '#/Settings',                                  wait: 10000 },
];

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function shoot(name, url, minWait) {
  return new Promise((resolve) => {
    const out = `${OUT}\\${name}.png`;
    try { fs.unlinkSync(out); } catch {}
    const profile = path.join(os.tmpdir(), `edge-shot-${name}-${Date.now()}`);
    const args = [
      '--headless=new', '--disable-gpu', '--hide-scrollbars',
      '--force-device-scale-factor=1', '--window-size=1080,1920',
      `--screenshot=${out}`, `--user-data-dir=${profile}`,
      '--virtual-time-budget=18000', '--timeout=60000',
      '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-sync',
      url,
    ];
    const started = Date.now();
    const p = spawn(EDGE, args, { stdio: 'ignore' });
    let lastSize = -1;
    const timer = setInterval(() => {
      let size = 0;
      try { size = fs.statSync(out).size; } catch {}
      const elapsed = Date.now() - started;
      const stable = size > 30000 && size === lastSize; // ada file & tidak berubah
      if ((stable && elapsed >= minWait) || elapsed > 70000) {
        clearInterval(timer);
        try { execSync(`taskkill /PID ${p.pid} /T /F`, { stdio: 'ignore' }); } catch {}
        try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
        console.log(`${size > 30000 ? 'OK  ' : 'FAIL'} ${name}.png (${size} bytes)`);
        resolve(size);
        return;
      }
      lastSize = size;
    }, 1500);
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  try { fs.unlinkSync(`${OUT}\\probe.png`); } catch {}
  let ok = 0;
  const results = [];
  for (const s of SHOTS) {
    const size = await shoot(s.name, BASE + s.hash, s.wait);
    results.push([s.name, size]);
    if (size > 30000) ok++;
  }
  // deteksi konten identik via md5
  const hashes = {};
  for (const [name] of results) {
    try {
      const buf = fs.readFileSync(`${OUT}\\${name}.png`);
      const h = crypto.createHash('md5').update(buf).digest('hex').slice(0, 10);
      hashes[h] = (hashes[h] || []).concat(name);
    } catch {}
  }
  const dups = Object.values(hashes).filter((v) => v.length > 1);
  if (dups.length) console.log('PERINGATAN konten identik:', dups.map((d) => d.join('+')).join(', '));
  console.log(`\n${ok}/${SHOTS.length} screenshot di playstore/screenshots/`);
  process.exit(ok === SHOTS.length && !dups.length ? 0 : 1);
})();
