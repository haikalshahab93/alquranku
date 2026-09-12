// Logika rantai sanad (guru → murid) untuk dataset ulama.
// Dataset menyimpan relasi guru sebagai id di raw.teachers_inds ("1, 5, 7").
const ULAMA = require('../data/ulama.json');

const ULAMA_BY_ID = new Map(ULAMA.map((u) => [String(u.id), u]));

export function getScholar(id) {
  return ULAMA_BY_ID.get(String(id)) || null;
}

export function parseInds(v) {
  return String(v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// Semua guru ter-resolve dari seorang ulama
export function teachersOf(scholar) {
  if (!scholar || !scholar.raw) return [];
  return parseInds(scholar.raw.teachers_inds)
    .map((id) => ULAMA_BY_ID.get(id))
    .filter(Boolean);
}

// Semua murid ter-resolve (dipakai untuk konteks tambahan bila perlu)
export function studentsOf(scholar) {
  if (!scholar || !scholar.raw) return [];
  return parseInds(scholar.raw.students_inds)
    .map((id) => ULAMA_BY_ID.get(id))
    .filter(Boolean);
}

const YEAR_RE = /-?\d{1,3}/;
// Tahun wafat Hijriah sebagai angka (null bila tidak tersedia)
export function deathYearOf(scholar) {
  const s = String((scholar && scholar.death_hijri) ?? '');
  const m = s.match(YEAR_RE);
  return m ? parseInt(m[0], 10) : null;
}

// Nama tanpa bagian arab dalam tanda kurung, untuk label ringkas
export function shortName(scholar) {
  const n = String((scholar && scholar.name) || '').trim();
  return n.split('(')[0].trim() || n;
}

// Bangun rantai sanad: mulai dari ulama, naik ke guru, hingga maxDepth generasi.
// - Anti-siklus: satu orang hanya muncul sekali dalam rantai.
// - prefs: daftar { at, preferId } — paksa hop dari node index `at` melewati guru `preferId`
//   (dipakai chip "lewat guru ini"); bisa beberapa sekaligus untuk beberapa posisi.
// - Urutan kandidat: guru terdahulu (tahun wafat paling kecil = paling dekat ke Nabi ﷺ).
export function buildTeacherChain(startId, { maxDepth = 8, prefs = [] } = {}) {
  const start = ULAMA_BY_ID.get(String(startId));
  if (!start) return [];

  const prefByAt = new Map();
  (prefs || []).forEach((p) => {
    if (p && p.at >= 0 && p.preferId != null) prefByAt.set(p.at, String(p.preferId));
  });

  const chain = [{ scholar: start, viaOtherTeachers: 0 }];
  const visited = new Set([String(start.id)]);
  let current = start;

  while (chain.length <= maxDepth) {
    const teachers = teachersOf(current).filter((t) => !visited.has(String(t.id)));
    if (!teachers.length) break;

    const hopIndex = chain.length - 1; // hop ini memilih guru untuk node berikutnya
    const forced = prefByAt.get(hopIndex) || null;
    let pick = forced ? teachers.find((t) => String(t.id) === forced) || null : null;
    if (!pick) {
      const sorted = [...teachers].sort((a, b) => {
        const ya = deathYearOf(a);
        const yb = deathYearOf(b);
        if (ya !== null && yb !== null) return ya - yb;
        if (ya !== null) return -1;
        if (yb !== null) return 1;
        return String(a.name).localeCompare(String(b.name));
      });
      pick = sorted[0];
    }

    const viaOtherTeachers = teachers.length - 1;
    visited.add(String(pick.id));
    chain.push({ scholar: pick, viaOtherTeachers, viaForced: !!forced });
    current = pick;
  }

  return chain;
}

// Label era berdasarkan tahun wafat paling awal dalam rantai
export function eraLabelForChain(chain) {
  const years = chain.map((c) => deathYearOf(c.scholar)).filter((y) => y !== null);
  if (!years.length) return null;
  const min = Math.min(...years);
  if (min <= 11) return 'Zaman Nabi ﷺ';
  if (min <= 32) return 'Zaman Sahabat';
  if (min <= 99) return "Zaman Tabi'in";
  if (min <= 180) return "Zaman Tabi' al-Tabi'in";
  const abad = Math.floor(min / 100) + 1;
  return `Abad ke-${abad} H`;
}
