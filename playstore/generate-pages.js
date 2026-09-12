// Generate src/api/mushafPages.json (format v2):
// { format: 'v2', count: 604, pages: [ [[surah,ayat],...], ... 604 entri ] }
// pages[p-1] = daftar terurut pasangan [surah, ayat] yang tepat berada di halaman p mushaf.
const fs = require('fs');
const path = require('path');
const https = require('https');

const PAGES = 604;
const pages = Array.from({ length: PAGES + 1 }, () => []);
let done = 0;

function fetchChapter(n) {
  return new Promise((resolve, reject) => {
    const url = `https://api.quran.com/api/v4/verses/by_chapter/${n}?fields=verse_key,page_number&per_page=300`;
    https.get(url, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        try {
          const j = JSON.parse(d);
          if (!Array.isArray(j?.verses)) return reject(new Error(`chapter ${n}: no verses`));
          resolve(j.verses);
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function run() {
  for (let start = 1; start <= 114; start += 5) {
    const batch = [];
    for (let n = start; n < start + 5 && n <= 114; n++) batch.push(n);
    await Promise.all(batch.map(async (n) => {
      try {
        const verses = await fetchChapter(n);
        for (const v of verses) {
          const key = String(v.verse_key || '');
          const ayat = parseInt(key.split(':')[1], 10);
          const page = v.page_number;
          if (!page || page < 1 || page > PAGES || !ayat) continue;
          pages[page].push([n, ayat]);
        }
      } catch (e) {
        console.error('FAIL chapter', n, e.message);
        process.exitCode = 1;
      }
      done++;
    }));
    process.stdout.write(`\r${done}/114 chapters`);
  }
  console.log();
  const out = [];
  for (let p = 1; p <= PAGES; p++) {
    if (!pages[p].length) { console.error('MISSING page', p); process.exitCode = 1; continue; }
    // Urutan baca mushaf = surah naik lalu ayat naik (berlaku untuk semua halaman,
    // termasuk halaman pendek Juz 30). Sortir agar tidak tergantung urutan fetch.
    out.push(pages[p].slice().sort((a, b) => (a[0] - b[0]) || (a[1] - b[1])));
  }
  fs.writeFileSync(path.join(__dirname, '..', 'src', 'api', 'mushafPages.json'), JSON.stringify({ format: 'v2', count: out.length, pages: out }));
  console.log('Wrote mushafPages.json v2 with', out.length, 'pages');
}

run();
